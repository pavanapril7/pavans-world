import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

async function GET(req: NextRequest) {
  try {
    // Fetch all meal slots from all vendors
    const mealSlots = await prisma.mealSlot.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        vendorId: true,
        startTime: true,
        endTime: true,
      },
      orderBy: [
        { vendorId: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: mealSlots,
    });
  } catch (error) {
    console.error('Error fetching meal slots:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch meal slots',
        },
      },
      { status: 500 }
    );
  }
}

export { GET };

// Wrap with auth middleware requiring SUPER_ADMIN role
export const dynamic = 'force-dynamic';
