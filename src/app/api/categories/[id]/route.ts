import { NextRequest, NextResponse } from 'next/server';
import { CategoryService } from '@/services/category.service';
import { updateCategorySchema } from '@/schemas/vendor.schema';
import { authenticate } from '@/middleware/auth.middleware';

/**
 * GET /api/categories/:id - Get category by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await CategoryService.getCategoryById(id);
    return NextResponse.json(category, { status: 200 });
  } catch (error: unknown) {
    console.error('Error getting category:', error);

    if (error instanceof Error && error.message === 'Category not found') {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get category',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/categories/:id - Update category (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const validatedData = updateCategorySchema.parse(body);

    const category = await CategoryService.updateCategory(id, validatedData);

    return NextResponse.json(category, { status: 200 });
  } catch (error: unknown) {
    console.error('Error updating category:', error);

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid category data',
            details: 'errors' in error ? error.errors : undefined,
          },
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Category not found') {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found',
          },
        },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: error.message,
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update category',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories/:id - Delete category (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    await CategoryService.deleteCategory(id);

    return NextResponse.json({ message: 'Category deleted successfully' }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error deleting category:', error);

    if (error instanceof Error && error.message === 'Category not found') {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found',
          },
        },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message.includes('Cannot delete')) {
      return NextResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: error.message,
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete category',
        },
      },
      { status: 500 }
    );
  }
}
