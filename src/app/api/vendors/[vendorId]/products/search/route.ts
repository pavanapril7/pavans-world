import { NextRequest, NextResponse } from 'next/server';
import { ProductSearchService } from '@/services/product-search.service';
import { z } from 'zod';

const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * GET /api/vendors/:vendorId/products/search - Search products within a vendor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params;
    const { searchParams } = new URL(request.url);

    const query = {
      q: searchParams.get('q') || '',
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    // Validate query parameters
    const validatedQuery = searchQuerySchema.parse(query);

    const result = await ProductSearchService.searchVendorProducts(
      vendorId,
      validatedQuery.q,
      validatedQuery.page,
      validatedQuery.limit
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error('Error searching products:', error);

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid search parameters',
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
          message: 'Failed to search products',
        },
      },
      { status: 500 }
    );
  }
}
