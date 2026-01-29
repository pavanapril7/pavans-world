import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';
import { cancelOrderSchema } from '@/schemas/order.schema';
import { authenticate } from '@/middleware/auth.middleware';

/**
 * POST /api/orders/:id/cancel - Cancel order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { user } = authResult;

    const body = await request.json().catch(() => ({}));
    const validatedData = cancelOrderSchema.parse(body);

    const { id } = await params;
    const order = await OrderService.cancelOrder(id, user.id, user.role, validatedData.reason);

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    console.error('Error cancelling order:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid cancellation data',
            details: 'errors' in error ? error.errors : undefined,
          },
        },
        { status: 400 }
      );
    }

    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: errorMessage } },
        { status: 404 }
      );
    }

    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('cannot be cancelled')
    ) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: errorMessage } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel order',
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
