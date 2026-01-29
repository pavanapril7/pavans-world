import { NextRequest, NextResponse } from 'next/server';
import { VendorService } from '@/services/vendor.service';
import { updateVendorSchema } from '@/schemas/vendor.schema';
import { authenticate } from '@/middleware/auth.middleware';

/**
 * GET /api/vendors/:id - Get vendor by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params;
    const vendor = await VendorService.getVendorById(vendorId);
    return NextResponse.json(vendor, { status: 200 });
  } catch (error: unknown) {
    console.error('Error getting vendor:', error);

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
          message: 'Failed to get vendor',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/vendors/:id - Update vendor
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params;
    // Authenticate user
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

    // Check if user is admin or the vendor owner
    const vendor = await VendorService.getVendorById(vendorId);
    
    const isAdmin = authResult.user.role === 'SUPER_ADMIN';
    const isOwner = vendor.userId === authResult.user.id;

    if (!isAdmin && !isOwner) {
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
    const validatedData = updateVendorSchema.parse(body);

    const updatedVendor = await VendorService.updateVendor(vendorId, validatedData);

    return NextResponse.json(updatedVendor, { status: 200 });
  } catch (error: unknown) {
    console.error('Error updating vendor:', error);

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid vendor data',
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

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update vendor',
        },
      },
      { status: 500 }
    );
  }
}
