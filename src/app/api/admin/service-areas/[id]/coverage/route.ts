import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { ServiceAreaService } from '@/services/service-area.service';

/**
 * GET /api/admin/service-areas/[id]/coverage
 * Get coverage statistics for a service area (SUPER_ADMIN only)
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

    // Call ServiceAreaService.getServiceAreaWithStats
    const serviceAreaWithStats = await ServiceAreaService.getServiceAreaWithStats(id);

    // Return coverage statistics
    return NextResponse.json({
      success: true,
      data: serviceAreaWithStats,
    });
  } catch (error) {
    console.error('Error fetching service area coverage:', error);

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

    // Handle missing center coordinates errors
    if (error instanceof Error && error.message.includes('center coordinates')) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_DATA',
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    // Handle database errors
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch service area coverage',
        },
      },
      { status: 500 }
    );
  }
}
