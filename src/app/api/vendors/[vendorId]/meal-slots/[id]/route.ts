import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth.middleware';
import { MealSlotService } from '@/services/meal-slot.service';
import { updateMealSlotSchema } from '@/schemas/meal-slot.schema';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/vendors/[vendorId]/meal-slots/[id]
 * Update a meal slot
 */
export const PATCH = withAuth(
  async (request: NextRequest, { user, params }) => {
    try {
      const vendorId = params?.vendorId;
      const mealSlotId = params?.id;

      if (!vendorId || !mealSlotId) {
        return NextResponse.json(
          { error: { code: 'INVALID_REQUEST', message: 'Vendor ID and Meal Slot ID are required' } },
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

      // Check ownership
      if (user.role === UserRole.VENDOR && vendor.userId !== user.id) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'You do not have permission to manage this vendor' } },
          { status: 403 }
        );
      }

      // Verify meal slot belongs to vendor
      const mealSlot = await MealSlotService.getMealSlotById(mealSlotId);
      if (mealSlot.vendorId !== vendorId) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Meal slot does not belong to this vendor' } },
          { status: 403 }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      const validatedData = updateMealSlotSchema.parse(body);

      // Update meal slot
      const updatedMealSlot = await MealSlotService.updateMealSlot(mealSlotId, validatedData);

      return NextResponse.json(updatedMealSlot, { status: 200 });
    } catch (error) {
      console.error('[PATCH /api/vendors/[vendorId]/meal-slots/[id]] Error:', error);

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
 * DELETE /api/vendors/[vendorId]/meal-slots/[id]
 * Deactivate a meal slot
 */
export const DELETE = withAuth(
  async (request: NextRequest, { user, params }) => {
    try {
      const vendorId = params?.vendorId;
      const mealSlotId = params?.id;

      if (!vendorId || !mealSlotId) {
        return NextResponse.json(
          { error: { code: 'INVALID_REQUEST', message: 'Vendor ID and Meal Slot ID are required' } },
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

      // Check ownership
      if (user.role === UserRole.VENDOR && vendor.userId !== user.id) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'You do not have permission to manage this vendor' } },
          { status: 403 }
        );
      }

      // Verify meal slot belongs to vendor
      const mealSlot = await MealSlotService.getMealSlotById(mealSlotId);
      if (mealSlot.vendorId !== vendorId) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Meal slot does not belong to this vendor' } },
          { status: 403 }
        );
      }

      // Deactivate meal slot
      await MealSlotService.deactivateMealSlot(mealSlotId);

      return NextResponse.json(
        { message: 'Meal slot deactivated successfully' },
        { status: 200 }
      );
    } catch (error) {
      console.error('[DELETE /api/vendors/[vendorId]/meal-slots/[id]] Error:', error);

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
