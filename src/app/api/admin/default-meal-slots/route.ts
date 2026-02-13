import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth.middleware';
import { DefaultMealSlotService } from '@/services/default-meal-slot.service';
import { createMealSlotSchema } from '@/schemas/meal-slot.schema';
import { UserRole } from '@prisma/client';

/**
 * POST /api/admin/default-meal-slots
 * Create a new default meal slot (admin only)
 */
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validatedData = createMealSlotSchema.parse(body);

      // Create default meal slot
      const defaultMealSlot = await DefaultMealSlotService.createDefaultMealSlot(validatedData);

      return NextResponse.json(defaultMealSlot, { status: 201 });
    } catch (error) {
      console.error('[POST /api/admin/default-meal-slots] Error:', error);

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
  { roles: [UserRole.SUPER_ADMIN] }
);

/**
 * GET /api/admin/default-meal-slots
 * List all default meal slots (admin only)
 */
export const GET = withAuth(
  async () => {
    try {
      const defaultMealSlots = await DefaultMealSlotService.listDefaultMealSlots();

      return NextResponse.json(defaultMealSlots, { status: 200 });
    } catch (error) {
      console.error('[GET /api/admin/default-meal-slots] Error:', error);

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
  { roles: [UserRole.SUPER_ADMIN] }
);
