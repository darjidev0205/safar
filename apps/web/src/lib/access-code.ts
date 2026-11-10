import * as crypto from 'crypto';
import { prisma } from './db';
import { AccessCodePurpose, EventStatus, Role, Prisma } from '@prisma/client';

// Unambiguous 30-character alphabet excluding easily confused chars (0, O, 1, I, S, 5)
export const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRTUVWXYZ';

const HMAC_SECRET =
  process.env.ACCESS_CODE_HMAC_SECRET || 'safar-production-event-access-hmac-v1';

/**
 * Normalizes any access code input by removing hyphens, spaces,
 * special characters, and converting to uppercase.
 */
export function normalizeAccessCode(raw: string): string {
  if (!raw) return '';
  return raw.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase();
}

/**
 * Formats a normalized 10-char code as XXXXX-XXXXX for elegant display.
 * If shorter or different length, formats in chunks of 5 or returns bare.
 */
export function formatDisplayCode(raw: string): string {
  const clean = normalizeAccessCode(raw);
  if (clean.length === 10) {
    return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  }
  if (clean.length > 5 && clean.length <= 12) {
    return `${clean.slice(0, Math.ceil(clean.length / 2))}-${clean.slice(Math.ceil(clean.length / 2))}`;
  }
  return clean;
}

/**
 * Computes a keyed HMAC-SHA256 digest of the normalized code.
 * Ensures fast, constant-time database index lookups while never
 * risking digest collision with plaintext variations.
 */
export function computeCodeDigest(normalizedCode: string): string {
  return crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(normalizedCode)
    .digest('hex');
}

/**
 * Generates a cryptographically secure, human-readable code.
 * Defaults to 10 characters formatted as XXXXX-XXXXX (e.g. MK7QP-4WN8T).
 */
export function generateSecureCode(length = 10): { code: string; displayCode: string } {
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return {
    code,
    displayCode: formatDisplayCode(code),
  };
}

/**
 * Legacy 6-character generator for backward-compatibility tests or short codes.
 */
export function generateSecureAccessCode(): string {
  return generateSecureCode(6).code;
}

/**
 * Creates or registers an authoritative GUEST_EVENT access code with bounded retry
 * to prevent duplicate key collisions.
 */
export async function createGuestAccessCodeRecord(
  tx: Prisma.TransactionClient,
  params: {
    accountId: string;
    eventId: string;
    creatorId: string;
    customCode?: string;
    expiresAt?: Date | null;
  }
) {
  const { accountId, eventId, creatorId, customCode, expiresAt } = params;
  const maxRetries = 5;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { code, displayCode } = customCode && attempt === 1
      ? { code: normalizeAccessCode(customCode), displayCode: formatDisplayCode(customCode) }
      : generateSecureCode(10);

    const digest = computeCodeDigest(code);

    try {
      const record = await tx.eventAccessCode.create({
        data: {
          accountId,
          eventId,
          purpose: AccessCodePurpose.GUEST_EVENT,
          code,
          codeDigest: digest,
          displayCode,
          isActive: true,
          isSingleUse: false,
          maxUses: null,
          useCount: 0,
          expiresAt: expiresAt || null,
          createdBy: creatorId,
        },
      });

      // Synchronize legacy event columns for backward compatibility
      await tx.event.update({
        where: { id: eventId },
        data: {
          guestAccessCode: displayCode,
          joinCode: code,
        },
      });

      return record;
    } catch (err: any) {
      if (err.code === 'P2002' || err.message?.includes('E11000')) {
        if (attempt === maxRetries) {
          throw new Error('Failed to generate a unique guest access code after maximum retries. Please retry.');
        }
        continue;
      }
      throw err;
    }
  }

  throw new Error('Unexpected code generation exit.');
}

/**
 * Creates a single-use DRIVER_INVITE access code for chauffeur onboarding.
 */
export async function createDriverInviteCodeRecord(
  tx: Prisma.TransactionClient,
  params: {
    accountId: string;
    eventId: string;
    creatorId: string;
    recipientName?: string | null;
    recipientPhone?: string | null;
    recipientEmail?: string | null;
    expiresAt?: Date | null;
    metadata?: any;
  }
) {
  const {
    accountId,
    eventId,
    creatorId,
    recipientName,
    recipientPhone,
    recipientEmail,
    expiresAt,
    metadata,
  } = params;

  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { code, displayCode } = generateSecureCode(10);
    const digest = computeCodeDigest(code);

    try {
      const record = await tx.eventAccessCode.create({
        data: {
          accountId,
          eventId,
          purpose: AccessCodePurpose.DRIVER_INVITE,
          code,
          codeDigest: digest,
          displayCode,
          isActive: true,
          isSingleUse: true,
          maxUses: 1,
          useCount: 0,
          recipientName: recipientName || null,
          recipientPhone: recipientPhone || null,
          recipientEmail: recipientEmail || null,
          expiresAt: expiresAt || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
          createdBy: creatorId,
        },
      });

      return record;
    } catch (err: any) {
      if (err.code === 'P2002' || err.message?.includes('E11000')) {
        if (attempt === maxRetries) {
          throw new Error('Failed to generate a unique driver invite code after maximum retries. Please retry.');
        }
        continue;
      }
      throw err;
    }
  }

  throw new Error('Unexpected driver invite code generation exit.');
}

/**
 * Resolves any entered code against the centralized registry.
 * Falls back gracefully to legacy Event columns (joinCode, guestAccessCode, driverAccessCode)
 * and auto-normalizes all inputs.
 */
export async function resolveAccessCode(
  rawInput: string,
  expectedPurpose?: AccessCodePurpose
): Promise<{
  isValid: boolean;
  codeRecord?: any | null;
  event?: any | null;
  purpose?: AccessCodePurpose | null;
  error?: string;
  isLegacy?: boolean;
}> {
  const normalized = normalizeAccessCode(rawInput);
  if (!normalized) {
    return { isValid: false, error: 'Access code cannot be empty.' };
  }

  const digest = computeCodeDigest(normalized);
  const now = new Date();

  // 1. Primary Lookup in centralized EventAccessCode registry by unique codeDigest
  let accessCode = await prisma.eventAccessCode.findUnique({
    where: { codeDigest: digest },
    include: {
      event: {
        include: {
          account: true,
          functions: {
            where: { status: { not: 'ARCHIVED' } },
            orderBy: { startTime: 'asc' },
          },
          places: true,
          transportRequirements: true,
        },
      },
    },
  });

  // Also check plain code match if HMAC secret differed
  if (!accessCode) {
    accessCode = await prisma.eventAccessCode.findFirst({
      where: {
        OR: [
          { code: normalized },
          { displayCode: rawInput.trim().toUpperCase() },
        ],
      },
      include: {
        event: {
          include: {
            account: true,
            functions: {
              where: { status: { not: 'ARCHIVED' } },
              orderBy: { startTime: 'asc' },
            },
            places: true,
            transportRequirements: true,
          },
        },
      },
    });
  }

  if (accessCode) {
    // Verification of active status
    if (!accessCode.isActive) {
      return {
        isValid: false,
        purpose: accessCode.purpose,
        error: accessCode.revokedAt
          ? 'This access code has been revoked by the host.'
          : 'This access code is no longer active.',
      };
    }

    // Expiration check
    if (accessCode.expiresAt && accessCode.expiresAt < now) {
      return {
        isValid: false,
        purpose: accessCode.purpose,
        error: 'This access code has expired.',
      };
    }

    // Redemption check for single-use invites
    if (accessCode.isSingleUse && accessCode.redeemedAt) {
      return {
        isValid: false,
        purpose: accessCode.purpose,
        error: 'This one-time invitation code has already been redeemed.',
      };
    }

    // Purpose verification if requested
    if (expectedPurpose && accessCode.purpose !== expectedPurpose) {
      if (expectedPurpose === AccessCodePurpose.DRIVER_INVITE) {
        return {
          isValid: false,
          purpose: accessCode.purpose,
          error: 'This is a Guest Access Code. Chauffeurs must enter a Driver Invitation Code.',
        };
      }
      if (expectedPurpose === AccessCodePurpose.GUEST_EVENT) {
        return {
          isValid: false,
          purpose: accessCode.purpose,
          error: 'This is a Driver Invitation Code. Guests must enter the Wedding Guest Code.',
        };
      }
    }

    // Check parent event status
    if (accessCode.event.status === EventStatus.ARCHIVED || accessCode.event.status === EventStatus.COMPLETED) {
      return {
        isValid: false,
        purpose: accessCode.purpose,
        error: `This event is currently ${accessCode.event.status.toLowerCase()} and not accepting new access.`,
      };
    }

    return {
      isValid: true,
      codeRecord: accessCode,
      event: accessCode.event,
      purpose: accessCode.purpose,
      isLegacy: false,
    };
  }

  // 2. Fallback: Search legacy Event records (joinCode, guestAccessCode, driverAccessCode)
  const legacyEvent = await prisma.event.findFirst({
    where: {
      OR: [
        { joinCode: normalized },
        { guestAccessCode: normalized },
        { guestAccessCode: rawInput.trim() },
        { guestAccessCode: rawInput.trim().toUpperCase() },
        { driverAccessCode: normalized },
        { driverAccessCode: rawInput.trim() },
        { driverAccessCode: rawInput.trim().toUpperCase() },
        { eventCodes: { some: { code: normalized, isActive: true } } },
        { eventCodes: { some: { code: rawInput.trim().toUpperCase(), isActive: true } } },
      ],
    },
    include: {
      account: true,
      functions: {
        where: { status: { not: 'ARCHIVED' } },
        orderBy: { startTime: 'asc' },
      },
      places: true,
      transportRequirements: true,
    },
  });

  if (legacyEvent) {
    if (legacyEvent.status === EventStatus.ARCHIVED || legacyEvent.status === EventStatus.COMPLETED) {
      return {
        isValid: false,
        error: `This event is currently ${legacyEvent.status.toLowerCase()} and not accepting new access.`,
      };
    }

    // Infer purpose from matched legacy field
    const isDriver =
      legacyEvent.driverAccessCode === normalized ||
      legacyEvent.driverAccessCode === rawInput.trim() ||
      legacyEvent.driverAccessCode === rawInput.trim().toUpperCase();

    const inferredPurpose = isDriver ? AccessCodePurpose.DRIVER_INVITE : AccessCodePurpose.GUEST_EVENT;

    if (expectedPurpose && inferredPurpose !== expectedPurpose) {
      if (expectedPurpose === AccessCodePurpose.DRIVER_INVITE) {
        return {
          isValid: false,
          purpose: inferredPurpose,
          error: 'This is a Guest Access Code. Chauffeurs must enter a Driver Invitation Code.',
        };
      }
      return {
        isValid: false,
        purpose: inferredPurpose,
        error: 'This is a Driver Invitation Code. Guests must enter the Wedding Guest Code.',
      };
    }

    return {
      isValid: true,
      codeRecord: null,
      event: legacyEvent,
      purpose: inferredPurpose,
      isLegacy: true,
    };
  }

  return {
    isValid: false,
    error: 'Wedding event code not found. Please verify with the host.',
  };
}

/**
 * Regenerates the active GUEST_EVENT access code for an event.
 * Atomically invalidates previous active guest codes and generates a fresh 10-char code.
 */
export async function regenerateGuestAccessCode(
  eventId: string,
  hostUserId: string,
  accountId: string
): Promise<{
  newCode: string;
  displayCode: string;
  record: any;
}> {
  return await prisma.$transaction(
    async (tx) => {
      // 1. Verify event ownership
    const event = await tx.event.findFirst({
      where: { id: eventId, accountId },
    });

    if (!event) {
      throw new Error('Event not found or unauthorized.');
    }

    const now = new Date();

    // 2. Revoke all previous active guest access codes
    await tx.eventAccessCode.updateMany({
      where: {
        eventId,
        purpose: AccessCodePurpose.GUEST_EVENT,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: now,
        revokedBy: hostUserId,
      },
    });

    // 3. Generate fresh GUEST_EVENT code
    const record = await createGuestAccessCodeRecord(tx, {
      accountId,
      eventId,
      creatorId: hostUserId,
    });

    return {
      newCode: record.code,
      displayCode: record.displayCode,
      record,
    };
  }, { timeout: 30000, maxWait: 20000 });
}

/**
 * Revokes any specific access code by ID.
 */
export async function revokeAccessCode(
  codeId: string,
  hostUserId: string,
  accountId: string
) {
  const code = await prisma.eventAccessCode.findFirst({
    where: { id: codeId, accountId },
  });

  if (!code) {
    throw new Error('Access code record not found or unauthorized.');
  }

  return await prisma.eventAccessCode.update({
    where: { id: codeId },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedBy: hostUserId,
    },
  });
}

/**
 * Atomically redeems a DRIVER_INVITE code, verifies driver identity,
 * creates driver-event membership, and marks the code redeemed.
 */
export async function redeemDriverInvite(
  rawCode: string,
  caller: { id: string; fullName: string; email?: string | null; phoneNumber?: string | null; role?: Role }
): Promise<{
  success: boolean;
  event: any;
  driver: any;
  driverEvent: any;
  message: string;
}> {
  const normalized = normalizeAccessCode(rawCode);
  if (!normalized) {
    throw new Error('Driver invitation code is required.');
  }

  const resolution = await resolveAccessCode(normalized, AccessCodePurpose.DRIVER_INVITE);
  if (!resolution.isValid || !resolution.event) {
    throw new Error(resolution.error || 'Invalid driver invitation code.');
  }

  const event = resolution.event;

  return await prisma.$transaction(async (tx) => {
    const now = new Date();

    // 1. If not legacy, atomically mark single-use code redeemed
    if (resolution.codeRecord && !resolution.isLegacy) {
      const codeRecord = await tx.eventAccessCode.findUnique({
        where: { id: resolution.codeRecord.id },
      });

      if (!codeRecord || !codeRecord.isActive || codeRecord.redeemedAt) {
        throw new Error('This driver invitation code has already been redeemed or is no longer active.');
      }

      await tx.eventAccessCode.update({
        where: { id: codeRecord.id },
        data: {
          isActive: false,
          redeemedAt: now,
          redeemedByUserId: caller.id,
          useCount: { increment: 1 },
        },
      });
    }

    // 2. Ensure Driver profile exists for this caller
    let driver = await tx.driver.findFirst({
      where: { userId: caller.id },
    });

    if (!driver) {
      driver = await tx.driver.create({
        data: {
          accountId: event.accountId,
          userId: caller.id,
          licenseNumber: `DL-${caller.phoneNumber ? caller.phoneNumber.slice(-6) : caller.id.slice(-6).toUpperCase()}`,
          isVerified: true,
          approvalStatus: 'APPROVED',
          dutyStatus: 'AVAILABLE',
          eventId: event.id,
        },
      });
    } else {
      driver = await tx.driver.update({
        where: { id: driver.id },
        data: {
          eventId: event.id,
          isVerified: true,
          approvalStatus: 'APPROVED',
        },
      });
    }

    // 3. Atomically upsert DriverEvent relationship with APPROVED status
    let driverEvent = await tx.driverEvent.findFirst({
      where: {
        driverId: driver.id,
        eventId: event.id,
      },
    });

    if (!driverEvent) {
      driverEvent = await tx.driverEvent.create({
        data: {
          driverId: driver.id,
          eventId: event.id,
          status: 'APPROVED',
          approvedAt: now,
          approvedBy: event.creatorId,
          requestedAt: now,
        },
      });
    } else {
      driverEvent = await tx.driverEvent.update({
        where: { id: driverEvent.id },
        data: {
          status: 'APPROVED',
          approvedAt: now,
        },
      });
    }

    // Also update caller role to DRIVER if not already
    await tx.user.update({
      where: { id: caller.id },
      data: { role: Role.DRIVER },
    });

    return {
      success: true,
      event,
      driver,
      driverEvent,
      message: `Chauffeur onboarding complete. You are now authorized for ${event.name}.`,
    };
  }, { timeout: 30000, maxWait: 20000 });
}

/**
 * Backward compatibility helper for existing code that called generateUniqueEventAccessCodes().
 */
export async function generateUniqueEventAccessCodes(): Promise<{
  driverAccessCode: string;
  guestAccessCode: string;
}> {
  const guest = generateSecureCode(10);
  const driver = generateSecureCode(10);
  return {
    guestAccessCode: guest.displayCode,
    driverAccessCode: driver.displayCode,
  };
}
