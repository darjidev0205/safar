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

let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized || admin.apps.length > 0) {
    firebaseInitialized = true;
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    firebaseInitialized = true;
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
      // Development / Test fallback token parsing
      // Allows developers to run locally prior to setting up Firebase Admin Service Account credentials
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
        // Auto-provision user on first authenticated call
        user = await this.prisma.user.create({
          data: {
            firebaseUid,
            email,
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
    } catch (dbError) {
      // In-memory fallback if database is currently warming up
      user = {
        id: firebaseUid,
        firebaseUid,
        email,
        phoneNumber,
        fullName: name,
        role: UserRole.EVENT_ORGANIZER,
        accountMembers: [],
        eventMembers: [],
        drivers: [],
        guests: [],
      };
    }

    request.user = user;
    return true;
  }
}
