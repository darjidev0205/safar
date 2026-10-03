import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Generate clean template with predefined columns and exemplary guidance rows
    const headers = [
      'Family Name',
      'Guest Name',
      'Relation',
      'Mobile Number',
      'Email',
      'Members',
      'Guest Category',
      'Pickup Location',
      'Drop Location',
      'Hotel',
      'Special Requirements',
      'Notes',
    ];

    const sampleRows = [
      [
        'Shah Family',
        'Raj Shah',
        'Groom Family',
        '9876543210',
        'raj@email.com',
        4,
        'Family',
        'Ahmedabad Airport',
        'Grand Bhagwati',
        'Hyatt Regency',
        'Vegetarian, Elderly assistance',
        'VIP Guest - Car 1',
      ],
      [
        'Patel Family',
        'Neha Patel',
        'Bride Family',
        '9876543211',
        'neha@email.com',
        2,
        'Family',
        'Gandhinagar Station',
        'Grand Bhagwati',
        'Hyatt Regency',
        'None',
        'Arriving 2 PM',
      ],
      [
        'Mehta Family',
        'Aarav Mehta',
        'Friends',
        '9876543212',
        'aarav@email.com',
        1,
        'VIP',
        'Courtyard Marriott',
        'Grand Bhagwati',
        'Courtyard Marriott',
        'Requires child seat',
        '-',
      ],
    ];

    const wsData = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths for comfortable editing
    ws['!cols'] = [
      { wch: 18 }, // Family Name
      { wch: 22 }, // Guest Name
      { wch: 16 }, // Relation
      { wch: 16 }, // Mobile Number
      { wch: 24 }, // Email
      { wch: 10 }, // Members
      { wch: 16 }, // Guest Category
      { wch: 24 }, // Pickup Location
      { wch: 24 }, // Drop Location
      { wch: 20 }, // Hotel
      { wch: 28 }, // Special Requirements
      { wch: 24 }, // Notes
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Guest List Template');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="safar_guest_template.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Error generating Excel template:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to generate Excel template' } },
      { status: 500 }
    );
  }
}
