import crypto from 'crypto';
import { prisma } from './db';

// Unambiguous 28-character alphabet excluding 0, O, 1, I, S, 5
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';

/**
 * Generates a secure, unambiguous 6-character random access code.
 */
export function generateSecureAccessCode(): string {
  let result = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return result;
}

/**
 * Generates guaranteed unique driver and guest access codes.
 */
export async function generateUniqueEventAccessCodes(): Promise<{
  driverAccessCode: string;
  guestAccessCode: string;
}> {
  let driverAccessCode = '';
  let guestAccessCode = '';

  // Generate unique driver code
  for (let i = 0; i < 10; i++) {
    const candidate = generateSecureAccessCode();
    const existing = await prisma.event.findFirst({
      where: {
        OR: [
          { driverAccessCode: candidate },
          { guestAccessCode: candidate },
          { joinCode: candidate },
        ],
      },
    });
    if (!existing) {
      driverAccessCode = candidate;
      break;
    }
  }

  // Generate unique guest code (must differ from driver code)
  for (let i = 0; i < 10; i++) {
    const candidate = generateSecureAccessCode();
    if (candidate === driverAccessCode) continue;
    const existing = await prisma.event.findFirst({
      where: {
        OR: [
          { driverAccessCode: candidate },
          { guestAccessCode: candidate },
          { joinCode: candidate },
        ],
      },
    });
    if (!existing) {
      guestAccessCode = candidate;
      break;
    }
  }

  if (!driverAccessCode) driverAccessCode = generateSecureAccessCode();
  if (!guestAccessCode) guestAccessCode = generateSecureAccessCode();

  return { driverAccessCode, guestAccessCode };
}
