import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../../lib/auth-server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

interface RawGuestRow {
  rowNumber: number;
  familyName?: string;
  guestName?: string;
  relation?: string;
  mobileNumber?: string;
  email?: string;
  members?: string | number;
  guestCategory?: string;
  pickupLocation?: string;
  dropLocation?: string;
  hotel?: string;
  specialRequirements?: string;
  notes?: string;
}

function cleanPhone(phone: any): string {
  if (!phone) return '';
  return String(phone).replace(/[^\d+]/g, '').trim();
}

function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function isValidEmail(email: string): boolean {
  if (!email) return true; // Optional
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// POST /api/events/:id/guests/import - Handles both validation preview and confirmed import
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { mode, rows, duplicateResolutions } = body;

    // MODE 1: VALIDATE (Preview before inserting)
    if (mode === 'validate') {
      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json(
          { success: false, error: { message: 'No rows provided for validation.' } },
          { status: 400 }
        );
      }

      // Query all existing guests in host's account for duplicate matching
      const existingGuests = await prisma.guest.findMany({
        where: { accountId: context.account.id },
        include: {
          family: true,
          eventGuests: { where: { eventId } },
        },
      });

      const validRows: any[] = [];
      const invalidRows: { rowNumber: number; row: any; reason: string }[] = [];
      const duplicates: {
        rowNumber: number;
        uploaded: any;
        existing: any;
        matchingField: string;
      }[] = [];

      const seenInBatchPhones = new Set<string>();
      const seenInBatchEmails = new Set<string>();

      rows.forEach((row: RawGuestRow, index: number) => {
        const rowNum = row.rowNumber || index + 2; // +2 considering 1-indexed header

        const guestName = (row.guestName || '').trim();
        const familyName = (row.familyName || '').trim();
        const rawPhone = cleanPhone(row.mobileNumber);
        const email = (row.email || '').trim().toLowerCase();
        const members = parseInt(String(row.members || 1), 10);

        // Validation Checks
        if (!guestName) {
          invalidRows.push({ rowNumber: rowNum, row, reason: 'Guest Name is missing.' });
          return;
        }

        if (!familyName) {
          invalidRows.push({ rowNumber: rowNum, row, reason: 'Family Name is missing.' });
          return;
        }

        if (!rawPhone || !isValidPhone(rawPhone)) {
          invalidRows.push({
            rowNumber: rowNum,
            row,
            reason: `Mobile number '${row.mobileNumber || ''}' is invalid (must be 7-15 digits).`,
          });
          return;
        }

        if (email && !isValidEmail(email)) {
          invalidRows.push({
            rowNumber: rowNum,
            row,
            reason: `Email format '${row.email}' is invalid.`,
          });
          return;
        }

        if (isNaN(members) || members < 1) {
          invalidRows.push({
            rowNumber: rowNum,
            row,
            reason: 'Number of members must be a positive number.',
          });
          return;
        }

        // Duplicate checks against database
        const duplicatePhone = existingGuests.find(
          (g: any) => g.phoneNumber && cleanPhone(g.phoneNumber) === rawPhone
        );
        const duplicateEmail = email ? existingGuests.find((g: any) => g.email && g.email.toLowerCase() === email) : null;
        const duplicateNameFamily = existingGuests.find(
          (g: any) =>
            g.fullName.toLowerCase() === guestName.toLowerCase() &&
            g.familyName?.toLowerCase() === familyName.toLowerCase()
        );

        const matchedExisting = duplicatePhone || duplicateEmail || duplicateNameFamily;

        const preparedRow = {
          rowNumber: rowNum,
          fullName: guestName,
          familyName,
          relation: (row.relation || 'Family').trim(),
          phoneNumber: rawPhone,
          email: email || null,
          memberCount: members,
          category: (row.guestCategory || 'General').trim(),
          pickupLocation: (row.pickupLocation || '').trim() || null,
          dropLocation: (row.dropLocation || '').trim() || null,
          hotelRoom: (row.hotel || '').trim() || null,
          specialRequirements: (row.specialRequirements || '').trim() || null,
          notes: (row.notes || '').trim() || null,
          status: 'CONFIRMED',
        };

        if (matchedExisting) {
          const matchingField = duplicatePhone
            ? 'Mobile number'
            : duplicateEmail
            ? 'Email'
            : 'Guest & Family Name';

          duplicates.push({
            rowNumber: rowNum,
            uploaded: preparedRow,
            existing: {
              id: matchedExisting.id,
              fullName: matchedExisting.fullName,
              familyName: matchedExisting.familyName,
              phoneNumber: matchedExisting.phoneNumber,
              email: matchedExisting.email,
              memberCount: matchedExisting.memberCount,
              category: matchedExisting.category,
              isAlreadyInEvent: matchedExisting.eventGuests.length > 0,
            },
            matchingField,
          });
        } else {
          validRows.push(preparedRow);
        }

        if (rawPhone) seenInBatchPhones.add(rawPhone);
        if (email) seenInBatchEmails.add(email);
      });

      return NextResponse.json({
        success: true,
        summary: {
          totalRows: rows.length,
          validCount: validRows.length,
          duplicateCount: duplicates.length,
          invalidCount: invalidRows.length,
        },
        validRows,
        duplicates,
        invalidRows,
      });
    }

    // MODE 2: COMMIT IMPORT (Database insertion)
    if (mode === 'commit') {
      const itemsToImport: any[] = body.items || [];
      const resolutions: Record<number, 'skip' | 'update' | 'import_new'> = duplicateResolutions || {};

      if (!Array.isArray(itemsToImport) || itemsToImport.length === 0) {
        return NextResponse.json(
          { success: false, error: { message: 'No guest items provided to import.' } },
          { status: 400 }
        );
      }

      let importedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      await prisma.$transaction(async (tx: any) => {
        for (const item of itemsToImport) {
          const resolution = resolutions[item.rowNumber] || 'import_new';

          if (resolution === 'skip') {
            skippedCount++;
            continue;
          }

          // Ensure Family record exists in host's account
          let family = null;
          if (item.familyName) {
            family = await tx.family.findFirst({
              where: {
                accountId: context.account.id,
                name: { equals: item.familyName, mode: 'insensitive' },
              },
            });
            if (!family) {
              family = await tx.family.create({
                data: {
                  accountId: context.account.id,
                  name: item.familyName,
                  relation: item.relation || null,
                },
              });
            }
          }

          // Check if updating existing guest
          if (resolution === 'update' && item.existingGuestId) {
            const updated = await tx.guest.update({
              where: { id: item.existingGuestId },
              data: {
                fullName: item.fullName,
                familyName: item.familyName,
                familyId: family?.id || undefined,
                relation: item.relation,
                phoneNumber: item.phoneNumber,
                email: item.email || undefined,
                memberCount: item.memberCount || 1,
                category: item.category,
                pickupLocation: item.pickupLocation || undefined,
                dropLocation: item.dropLocation || undefined,
                hotelRoom: item.hotelRoom || undefined,
                specialRequirements: item.specialRequirements || undefined,
                notes: item.notes || undefined,
              },
            });

            // Upsert EventGuest record
            await tx.eventGuest.upsert({
              where: {
                eventId_guestId: {
                  eventId,
                  guestId: updated.id,
                },
              },
              create: {
                eventId,
                guestId: updated.id,
                status: 'CONFIRMED',
                pickupLocation: item.pickupLocation || null,
                dropLocation: item.dropLocation || null,
                hotelRoom: item.hotelRoom || null,
                specialRequirements: item.specialRequirements || null,
                notes: item.notes || null,
              },
              update: {
                pickupLocation: item.pickupLocation || undefined,
                dropLocation: item.dropLocation || undefined,
                hotelRoom: item.hotelRoom || undefined,
                specialRequirements: item.specialRequirements || undefined,
                notes: item.notes || undefined,
              },
            });

            updatedCount++;
          } else {
            // New guest creation
            const newGuest = await tx.guest.create({
              data: {
                accountId: context.account.id,
                eventId: eventId,
                familyId: family?.id || null,
                familyName: item.familyName,
                relation: item.relation || 'Guest',
                fullName: item.fullName,
                phoneNumber: item.phoneNumber,
                email: item.email || null,
                memberCount: item.memberCount || 1,
                category: item.category || 'General',
                pickupLocation: item.pickupLocation || null,
                dropLocation: item.dropLocation || null,
                hotelRoom: item.hotelRoom || null,
                specialRequirements: item.specialRequirements || null,
                notes: item.notes || null,
                status: 'CONFIRMED',
              },
            });

            // Associate with event
            await tx.eventGuest.create({
              data: {
                eventId,
                guestId: newGuest.id,
                status: 'CONFIRMED',
                pickupLocation: item.pickupLocation || null,
                dropLocation: item.dropLocation || null,
                hotelRoom: item.hotelRoom || null,
                specialRequirements: item.specialRequirements || null,
                notes: item.notes || null,
              },
            });

            importedCount++;
          }
        }
      });

      return NextResponse.json({
        success: true,
        summary: {
          importedCount,
          updatedCount,
          skippedCount,
          totalProcessed: itemsToImport.length,
        },
        message: `Successfully processed ${itemsToImport.length} guests: ${importedCount} imported, ${updatedCount} updated, ${skippedCount} skipped.`,
      });
    }

    return NextResponse.json(
      { success: false, error: { message: "Invalid mode. Use 'validate' or 'commit'." } },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error importing guests:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database error during Excel import' } },
      { status: 500 }
    );
  }
}
