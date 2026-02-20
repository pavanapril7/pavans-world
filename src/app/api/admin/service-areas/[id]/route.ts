import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { ServiceAreaService } from '@/services/service-area.service';
import { updateServiceAreaSchema } from '@/schemas/service-area.schema';

/**
 * GET /api/admin/service-areas/[id]
 * Get a single service area (SUPER_ADMIN only)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await authenticate(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Only super admins can access this
    if (authResult.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    // Get service area by ID
    const serviceArea = await ServiceAreaService.getServiceAreaById(id);

    if (!serviceArea) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Service area not found' } },
        { status: 404 }
      );
    }

    // Return service area
    return NextResponse.json({
      serviceArea,
    });
  } catch (error) {
    console.error('Error fetching service area:', error);

    return NextResponse.json(
      {
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch service area',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/service-areas/[id]
 * Update a service area (SUPER_ADMIN only)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await authenticate(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Only super admins can access this
    if (authResult.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    // Validate request with updateServiceAreaSchema
    const validatedData = updateServiceAreaSchema.parse(body);

    // Call ServiceAreaService.updateServiceArea
    const serviceArea = await ServiceAreaService.updateServiceArea(id, {
      name: validatedData.name,
      city: validatedData.city,
      state: validatedData.state,
      boundary: validatedData.boundary,
      pincodes: validatedData.pincodes,
      status: validatedData.status,
    });

    // Return updated service area
    return NextResponse.json({
      serviceArea,
      warnings: [],
    });
  } catch (error) {
    console.error('Error updating service area:', error);

    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.message,
          },
        },
        { status: 400 }
      );
    }

    // Handle not found errors
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

    // Handle invalid polygon errors
    if (error instanceof Error && error.message.includes('Invalid polygon')) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_POLYGON',
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    // Handle duplicate name errors
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_NAME',
            message: error.message,
          },
        },
        { status: 409 }
      );
    }

    // Handle database errors
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update service area',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/service-areas/[id]
 * Delete a service area (SUPER_ADMIN only)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await authenticate(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Only super admins can access this
    if (authResult.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    // Call ServiceAreaService.deleteServiceArea
    const result = await ServiceAreaService.deleteServiceArea(id);

    // Return success response
    return NextResponse.json({
      success: true,
      message: result.message,
      addressesUpdated: result.addressesUpdated,
    });
  } catch (error) {
    console.error('Error deleting service area:', error);

    // Handle not found errors
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

    // Handle dependent records errors
    if (
      error instanceof Error &&
      error.message.includes('Cannot delete service area with associated')
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'HAS_DEPENDENCIES',
            message: error.message,
          },
        },
        { status: 409 }
      );
    }

    // Handle database errors
    return NextResponse.json(
      {
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete service area',
        },
      },
      { status: 500 }
    );
  }
}
