import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';
import { createProductSchema, productFiltersSchema } from '@/schemas/product.schema';
import { authenticate } from '@/middleware/auth.middleware';

/**
 * GET /api/vendors/:vendorId/products - List products for a vendor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params;
    const { searchParams } = new URL(request.url);

    const filters = {
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      minPrice: searchParams.get('minPrice') || undefined,
      maxPrice: searchParams.get('maxPrice') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    // Validate filters
    const validatedFilters = productFiltersSchema.parse(filters);

    const result = await ProductService.listVendorProducts(
      vendorId,
      {
        status: validatedFilters.status,
        category: validatedFilters.category,
        search: validatedFilters.search,
        minPrice: validatedFilters.minPrice,
        maxPrice: validatedFilters.maxPrice,
      },
      validatedFilters.page,
      validatedFilters.limit
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error('Error listing products:', error);

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

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list products',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vendors/:vendorId/products - Create a new product
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params;

    // Authenticate and require VENDOR or SUPER_ADMIN role
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

    // Check if user is the vendor owner or super admin
    if (authResult.user.role === 'VENDOR') {
      // Verify the vendor belongs to the authenticated user
      const { VendorService } = await import('@/services/vendor.service');
      const vendor = await VendorService.getVendorByUserId(authResult.user.id);
      
      if (!vendor || vendor.id !== vendorId) {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'You can only create products for your own vendor account',
            },
          },
          { status: 403 }
        );
      }
    } else if (authResult.user.role !== 'SUPER_ADMIN') {
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
    const validatedData = createProductSchema.parse(body);

    const product = await ProductService.createProduct({
      vendorId,
      ...validatedData,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating product:', error);

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid product data',
            details: 'errors' in error ? error.errors : undefined,
          },
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message.includes('must be active')) {
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
          message: 'Failed to create product',
        },
      },
      { status: 500 }
    );
  }
}
