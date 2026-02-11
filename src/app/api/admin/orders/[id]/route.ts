import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { adminApiRateLimit } from '@/middleware/rate-limit.middleware';
import { UserRole } from '@prisma/client';
import { AdminOrderService } from '@/services/admin-order.service';

/**
 * GET /api/admin/orders/:id - Get detailed order information (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await adminApiRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

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

    const { id } = await params;

    // Fetch order details
    const order = await AdminOrderService.getOrderById(id);

    return NextResponse.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error('Error fetching order details:', error);

    if (error instanceof Error && error.message === 'Order not found') {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Order not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch order details',
        },
      },
      { status: 500 }
    );
  }
}
