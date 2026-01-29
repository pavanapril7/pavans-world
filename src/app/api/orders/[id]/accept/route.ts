import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';

/**
 * POST /api/orders/:id/accept - Vendor accepts order
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

    // Only vendors can accept orders
    if (user.role !== UserRole.VENDOR) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only vendors can accept orders' } },
        { status: 403 }
      );
    }

    // Get vendor ID for this user
    const prisma = (await import('@/lib/prisma')).prisma;
    const vendor = await prisma.vendor.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } },
        { status: 404 }
      );
    }

    const { id } = await params;
    const order = await OrderService.acceptOrder(id, vendor.id);

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    console.error('Error accepting order:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: errorMessage } },
        { status: 404 }
      );
    }

    if (
      errorMessage.includes('does not belong') ||
      errorMessage.includes('can only be accepted')
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
          message: 'Failed to accept order',
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
