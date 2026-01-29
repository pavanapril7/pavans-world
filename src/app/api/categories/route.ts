import { NextRequest, NextResponse } from 'next/server';
import { CategoryService } from '@/services/category.service';
import { createCategorySchema } from '@/schemas/vendor.schema';
import { authenticate } from '@/middleware/auth.middleware';

/**
 * GET /api/categories - List all vendor categories
 */
export async function GET() {
  try {
    const categories = await CategoryService.listCategories();
    return NextResponse.json(categories, { status: 200 });
  } catch (error: unknown) {
    console.error('Error listing categories:', error);

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list categories',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories - Create a new category (admin only)
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
    const validatedData = createCategorySchema.parse(body);

    const category = await CategoryService.createCategory(validatedData);

    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating category:', error);

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
          message: 'Failed to create category',
        },
      },
      { status: 500 }
    );
  }
}
