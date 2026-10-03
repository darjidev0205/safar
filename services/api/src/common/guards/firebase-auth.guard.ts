import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { UserRole } from '@safar/types';

const logger = new Logger('FirebaseAdmin');
let firebaseInitialized = false;
let firebaseInitializationAttempted = false;

function initFirebase() {
  if (firebaseInitialized || firebaseInitializationAttempted || admin.apps.length > 0) {
    return;
  }
  firebaseInitializationAttempted = true;

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  const missing: string[] = [];
  if (!projectId) missing.push('FIREBASE_PROJECT_ID');
  if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!rawKey) missing.push('FIREBASE_PRIVATE_KEY');

  if (missing.length > 0) {
    const isProduction = process.env.NODE_ENV === 'production';
    const message = `Firebase configuration incomplete. Missing variable(s): ${missing.join(', ')}`;
    if (isProduction) {
      logger.error(`[CRITICAL] ${message}. Production authentication requires valid Firebase Admin credentials.`);
    } else {
      logger.warn(`${message}. Local development fallback enabled.`);
    }
    return;
  }

  // Safely normalize private key:
  // - Remove surrounding double or single quotes
  // - Convert literal "\\n" to actual newlines
  // - Strip Windows CRLF "\r"
  // - Trim leading/trailing whitespace
  const privateKey = rawKey
    ?.replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .trim();

  // Validate PEM boundaries without exposing any part of the secret
  const hasBegin = privateKey?.includes('-----BEGIN PRIVATE KEY-----');
  const hasEnd = privateKey?.includes('-----END PRIVATE KEY-----');

  if (!privateKey || !hasBegin || !hasEnd) {
    const errorMsg =
      'FIREBASE_PRIVATE_KEY is malformed. The key must contain valid PEM boundaries ("-----BEGIN PRIVATE KEY-----" and "-----END PRIVATE KEY-----"). Please verify the secret in environment variables without exposing its contents.';
    logger.error(`[CRITICAL] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    firebaseInitialized = true;
    logger.log('✅ Firebase Admin SDK initialized successfully with service account credentials');
  } catch (err: any) {
    const isProduction = process.env.NODE_ENV === 'production';
    logger.error(
      `Failed to initialize Firebase Admin SDK: ${err?.message || 'Invalid certificate configuration'}. Please verify that FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Render environment variables are valid service account credentials.`
    );
    if (isProduction) {
      throw new Error(
        'Failed to parse Firebase service account credentials. Verify FIREBASE_PRIVATE_KEY format in Render environment variables.'
      );
    } else {
      logger.warn(
        'Firebase Admin initialization deferred in non-production environment. Local development fallback will be permitted.'
      );
    }
  }
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(private readonly prisma: PrismaService) {
    initFirebase();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split('Bearer ')[1].trim();
    let firebaseUid: string;
    let email: string | null = null;
    let phoneNumber: string | null = null;
    let name: string = 'SAFAR User';

    if (admin.apps.length > 0) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        firebaseUid = decodedToken.uid;
        email = decodedToken.email || null;
        phoneNumber = decodedToken.phone_number || null;
        name = decodedToken.name || (email ? email.split('@')[0] : 'SAFAR User');
      } catch (err) {
        this.logger.error(`Firebase token verification failed: ${(err as Error).message}`);
        throw new UnauthorizedException('Invalid or expired Firebase ID token');
      }
    } else {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('Firebase Admin SDK is not initialized in production. Cannot verify authentication token.');
        throw new UnauthorizedException('Authentication service is unconfigured or unavailable');
      }

      // Development / Test fallback token parsing ONLY in non-production
      if (token.startsWith('dev_')) {
        firebaseUid = token;
        email = `${token}@safar.events`;
        name = token.replace('dev_', '').toUpperCase();
      } else {
        // Base64 decode or fallback token
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            firebaseUid = payload.sub || payload.uid || payload.user_id || 'dev_user_uid';
            email = payload.email || 'user@safar.events';
            name = payload.name || 'SAFAR User';
          } else {
            firebaseUid = `uid_${token.substring(0, 16)}`;
          }
        } catch {
          firebaseUid = `uid_${token.substring(0, 16)}`;
        }
      }
    }

    // Resolve or sync SAFAR user from database
    let user;
    try {
      user = await this.prisma.user.findUnique({
        where: { firebaseUid },
        include: {
          accountMembers: {
            include: { account: true },
          },
          eventMembers: {
            include: { event: true },
          },
          drivers: true,
          guests: true,
        },
      });

      if (!user) {
        // If not found by firebaseUid, look up existing user by email
        if (email) {
          user = await this.prisma.user.findFirst({
            where: { email: { equals: email.toLowerCase().trim(), mode: 'insensitive' } },
            include: {
              accountMembers: {
                include: { account: true },
              },
              eventMembers: {
                include: { event: true },
              },
              drivers: true,
              guests: true,
            },
          });

          if (user) {
            // Safely sync firebaseUid to existing user record
            await this.prisma.user.update({
              where: { id: user.id },
              data: { firebaseUid },
            });
            user.firebaseUid = firebaseUid;
          }
        }

        if (!user) {
          // Auto-provision user on first authenticated call only if user doesn't exist
          // Roles remain strictly backend-controlled; initial default is GUEST
          user = await this.prisma.user.create({
            data: {
              firebaseUid,
              email: email ? email.toLowerCase().trim() : null,
              phoneNumber,
              fullName: name,
              role: 'GUEST',
            },
            include: {
              accountMembers: {
                include: { account: true },
              },
              eventMembers: {
                include: { event: true },
              },
              drivers: true,
              guests: true,
            },
          });
        }
      }
    } catch (dbError: any) {
      this.logger.error(`Database error during user resolution: ${dbError?.message || dbError}`);
      throw new UnauthorizedException('Unable to resolve SAFAR user account');
    }

    request.user = user;
    return true;
  }
}
