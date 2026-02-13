import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth.middleware';
import { MealSlotService } from '@/services/meal-slot.service';
import { createMealSlotSchema } from '@/schemas/meal-slot.schema';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/vendors/[vendorId]/meal-slots
 * Create a new meal slot for vendor
 */
export const POST = withAuth(
  async (request: NextRequest, { user, params }) => {
    try {
      const vendorId = params?.vendorId;

      if (!vendorId) {
        return NextResponse.json(
          { error: { code: 'INVALID_REQUEST', message: 'Vendor ID is required' } },
          { status: 400 }
        );
      }

      // Verify vendor exists and user owns it
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
      });

      if (!vendor) {
        return NextResponse.json(
          { error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' } },
          { status: 404 }
        );
      }

      // Check ownership (only vendor owner can create meal slots)
      if (user.role === UserRole.VENDOR && vendor.userId !== user.id) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'You do not have permission to manage this vendor' } },
          { status: 403 }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      const validatedData = createMealSlotSchema.parse(body);

      // Create meal slot
      const mealSlot = await MealSlotService.createMealSlot({
        vendorId,
        ...validatedData,
      });

      return NextResponse.json(mealSlot, { status: 201 });
    } catch (error) {
      console.error('[POST /api/vendors/[vendorId]/meal-slots] Error:', error);

      if (error instanceof Error && error.name === 'ZodError') {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Invalid input data', details: error } },
          { status: 400 }
        );
      }

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
  },
  { roles: [UserRole.VENDOR, UserRole.SUPER_ADMIN] }
);

/**
 * GET /api/vendors/[vendorId]/meal-slots
 * List meal slots for vendor
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) => {
  try {
    const { vendorId } = await params;

    if (!vendorId) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Vendor ID is required' } },
        { status: 400 }
      );
    }

    // Check if available filter is requested
    const { searchParams } = new URL(request.url);
    const availableOnly = searchParams.get('available') === 'true';

    let mealSlots;
    if (availableOnly) {
      mealSlots = await MealSlotService.getAvailableMealSlots(vendorId);
    } else {
      mealSlots = await MealSlotService.getMealSlotsByVendorId(vendorId);
    }

    return NextResponse.json(mealSlots, { status: 200 });
  } catch (error) {
    console.error('[GET /api/vendors/[vendorId]/meal-slots] Error:', error);

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
};
