import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';
import { rejectOrderSchema } from '@/schemas/order.schema';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';

/**
 * POST /api/orders/:id/reject - Vendor rejects order
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

    // Only vendors can reject orders
    if (user.role !== UserRole.VENDOR) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only vendors can reject orders' } },
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

    const body = await request.json();
    const validatedData = rejectOrderSchema.parse(body);

    const { id } = await params;
    const order = await OrderService.rejectOrder(id, vendor.id, validatedData.reason);

    return NextResponse.json(order, { status: 200 });
  } catch (error: any) {
    console.error('Error rejecting order:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid rejection data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: error.message } },
        { status: 404 }
      );
    }

    if (
      error.message.includes('does not belong') ||
      error.message.includes('can only be rejected')
    ) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reject order',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
