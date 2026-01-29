import { NextRequest, NextResponse } from 'next/server';
import { VendorService } from '@/services/vendor.service';
import { createVendorSchema, vendorFiltersSchema } from '@/schemas/vendor.schema';
import { authenticate } from '@/middleware/auth.middleware';

/**
 * GET /api/vendors - List vendors with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      categoryId: searchParams.get('categoryId') || undefined,
      serviceAreaId: searchParams.get('serviceAreaId') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    // Validate filters
    const validatedFilters = vendorFiltersSchema.parse(filters);

    const result = await VendorService.listVendors(
      {
        categoryId: validatedFilters.categoryId,
        serviceAreaId: validatedFilters.serviceAreaId,
        status: validatedFilters.status,
        search: validatedFilters.search,
      },
      validatedFilters.page,
      validatedFilters.limit
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error('Error listing vendors:', error);
    
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid filter parameters',
            details: 'errors' in error ? error.errors : undefined,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list vendors',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vendors - Create a new vendor (admin only)
 */
export async function POST(request: NextRequest) {
  try {
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
    const validatedData = createVendorSchema.parse(body);

    const vendor = await VendorService.createVendor(validatedData);

    return NextResponse.json(vendor, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating vendor:', error);

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

    if (error instanceof Error && (error.message.includes('not found') || error.message.includes('already has'))) {
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
          message: 'Failed to create vendor',
        },
      },
      { status: 500 }
    );
  }
}
