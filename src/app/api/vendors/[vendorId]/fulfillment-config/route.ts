import { NextRequest, NextResponse } from 'next/server';
import { FulfillmentService } from '@/services/fulfillment.service';
import { withAuth } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { updateFulfillmentConfigSchema } from '@/schemas/fulfillment.schema';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/vendors/[vendorId]/fulfillment-config
 * Get fulfillment configuration for a vendor
 * Public access for customers, vendor ownership check for vendors
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

    // Get fulfillment config (creates default if doesn't exist)
    const config = await FulfillmentService.getFulfillmentConfig(vendorId);

    return NextResponse.json(config, { status: 200 });
  } catch (error) {
    console.error('[GET /api/vendors/[vendorId]/fulfillment-config] Error:', error);

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

/**
 * PATCH /api/vendors/[vendorId]/fulfillment-config
 * Update fulfillment configuration for a vendor
 * Requires vendor ownership or SUPER_ADMIN role
 */
export const PATCH = withAuth(
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

      // Check ownership (only vendor owner can update config)
      if (user.role === UserRole.VENDOR && vendor.userId !== user.id) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'You do not have permission to manage this vendor' } },
          { status: 403 }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      const validatedData = updateFulfillmentConfigSchema.parse(body);

      // Update fulfillment config
      const config = await FulfillmentService.updateFulfillmentConfig(
        vendorId,
        validatedData
      );

      return NextResponse.json(config, { status: 200 });
    } catch (error) {
      console.error('[PATCH /api/vendors/[vendorId]/fulfillment-config] Error:', error);

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
