import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { adminApiRateLimit } from '@/middleware/rate-limit.middleware';
import { UserRole } from '@prisma/client';
import { AdminOrderService } from '@/services/admin-order.service';
import { adminOrderStatsFiltersSchema } from '@/schemas/admin-order.schema';
import { ZodError } from 'zod';

/**
 * GET /api/admin/orders/stats - Get order statistics with filters (admin only)
 */
export async function GET(request: NextRequest) {
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const rawParams = {
      status: searchParams.get('status') || undefined,
      vendorId: searchParams.get('vendorId') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    const filters = adminOrderStatsFiltersSchema.parse(rawParams);

    // Fetch statistics
    const stats = await AdminOrderService.getOrderStats(filters);

    return NextResponse.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error('Error fetching order statistics:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch statistics',
        },
      },
      { status: 500 }
    );
  }
}
