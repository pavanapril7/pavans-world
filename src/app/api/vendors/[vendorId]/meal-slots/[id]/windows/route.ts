import { NextRequest, NextResponse } from 'next/server';
import { MealSlotService } from '@/services/meal-slot.service';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/vendors/[vendorId]/meal-slots/[id]/windows
 * Get delivery time windows for a meal slot
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string; id: string }> }
) {
  try {
    const { vendorId, id: mealSlotId } = await params;

    if (!vendorId || !mealSlotId) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Vendor ID and Meal Slot ID are required' } },
        { status: 400 }
      );
    }

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' } },
        { status: 404 }
      );
    }

    // Verify meal slot exists and belongs to vendor
    const mealSlot = await MealSlotService.getMealSlotById(mealSlotId);
    if (mealSlot.vendorId !== vendorId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Meal slot does not belong to this vendor' } },
        { status: 403 }
      );
    }

    // Get delivery time windows
    const windows = await MealSlotService.getDeliveryTimeWindows(mealSlotId);

    return NextResponse.json(windows, { status: 200 });
  } catch (error) {
    console.error('[GET /api/vendors/[vendorId]/meal-slots/[id]/windows] Error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
