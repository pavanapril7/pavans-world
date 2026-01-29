import { NextRequest, NextResponse } from 'next/server';
import { VendorService } from '@/services/vendor.service';
import { updateVendorStatusSchema } from '@/schemas/vendor.schema';
import { authenticate } from '@/middleware/auth.middleware';

/**
 * PUT /api/vendors/:id/status - Update vendor status (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params;
    // Authenticate and require SUPER_ADMIN role
    const authResult = await authenticate(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    if (authResult.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateVendorStatusSchema.parse(body);

    const vendor = await VendorService.updateVendorStatus(vendorId, validatedData.status);

    return NextResponse.json(vendor, { status: 200 });
  } catch (error: unknown) {
    console.error('Error updating vendor status:', error);

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status data',
            details: 'errors' in error ? error.errors : undefined,
          },
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Vendor not found') {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Vendor not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update vendor status',
        },
      },
      { status: 500 }
    );
  }
}
