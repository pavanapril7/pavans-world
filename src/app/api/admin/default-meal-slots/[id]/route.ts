import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth.middleware';
import { DefaultMealSlotService } from '@/services/default-meal-slot.service';
import { updateMealSlotSchema } from '@/schemas/meal-slot.schema';
import { UserRole } from '@prisma/client';

/**
 * PATCH /api/admin/default-meal-slots/[id]
 * Update a default meal slot (admin only)
 */
export const PATCH = withAuth(
  async (request: NextRequest, { params }) => {
    try {
      const defaultMealSlotId = params?.id;

      if (!defaultMealSlotId) {
        return NextResponse.json(
          { error: { code: 'INVALID_REQUEST', message: 'Default meal slot ID is required' } },
          { status: 400 }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      const validatedData = updateMealSlotSchema.parse(body);

      // Update default meal slot
      const updatedDefaultMealSlot = await DefaultMealSlotService.updateDefaultMealSlot(
        defaultMealSlotId,
        validatedData
      );

      return NextResponse.json(updatedDefaultMealSlot, { status: 200 });
    } catch (error) {
      console.error('[PATCH /api/admin/default-meal-slots/[id]] Error:', error);

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
