import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';
import { updateProductSchema } from '@/schemas/product.schema';
import { authenticate } from '@/middleware/auth.middleware';

/**
 * GET /api/vendors/:vendorId/products/:productId - Get product details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string; productId: string }> }
) {
  try {
    const { productId } = await params;

    const product = await ProductService.getProductById(productId);

    return NextResponse.json(product, { status: 200 });
  } catch (error: unknown) {
    console.error('Error getting product:', error);

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
          message: 'Failed to get product',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/vendors/:vendorId/products/:productId - Update product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string; productId: string }> }
) {
  try {
    const { vendorId, productId } = await params;

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
              message: 'You can only update products for your own vendor account',
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
    const validatedData = updateProductSchema.parse(body);

    const product = await ProductService.updateProduct(
      productId,
      vendorId,
      validatedData
    );

    return NextResponse.json(product, { status: 200 });
  } catch (error: unknown) {
    console.error('Error updating product:', error);

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

    if (error instanceof Error && error.message.includes('does not belong')) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: error.message,
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update product',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/vendors/:vendorId/products/:productId - Delete product (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string; productId: string }> }
) {
  try {
    const { vendorId, productId } = await params;

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
              message: 'You can only delete products for your own vendor account',
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

    const product = await ProductService.deleteProduct(productId, vendorId);

    return NextResponse.json(
      {
        message: 'Product deleted successfully',
        product,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error deleting product:', error);

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

    if (error instanceof Error && error.message.includes('does not belong')) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: error.message,
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete product',
        },
      },
      { status: 500 }
    );
  }
}
