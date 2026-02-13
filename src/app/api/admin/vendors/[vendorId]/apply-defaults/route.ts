import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth.middleware';
import { DefaultMealSlotService } from '@/services/default-meal-slot.service';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/vendors/[vendorId]/apply-defaults
 * Apply default meal slots to a vendor (admin only)
 */
export const POST = withAuth(
  async (request: NextRequest, { params }) => {
    try {
      const vendorId = params?.vendorId;

      if (!vendorId) {
        return NextResponse.json(
          { error: { code: 'INVALID_REQUEST', message: 'Vendor ID is required' } },
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

      // Apply default meal slots to vendor
      const createdMealSlots = await DefaultMealSlotService.applyDefaultMealSlotsToVendor(vendorId);

      return NextResponse.json(
        {
          message: 'Default meal slots applied successfully',
          mealSlots: createdMealSlots,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('[POST /api/admin/vendors/[vendorId]/apply-defaults] Error:', error);

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
