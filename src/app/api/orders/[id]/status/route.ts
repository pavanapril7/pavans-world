import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';
import { OrderStatusService } from '@/services/order-status.service';
import { updateOrderStatusSchema } from '@/schemas/order.schema';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';

/**
 * PUT /api/orders/:id/status - Update order status
 */
export async function PUT(
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

    // Only super admin and delivery partners can use this generic status update
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.DELIVERY_PARTNER) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Use specific endpoints for vendor actions (accept, reject, ready)',
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateOrderStatusSchema.parse(body);

    const { id } = await params;

    // Get current order
    const currentOrder = await OrderService.getOrderById(id);

    // Validate status transition
    OrderStatusService.validateTransition(currentOrder.status, validatedData.status);

    // For delivery partners, verify they own this order
    if (user.role === UserRole.DELIVERY_PARTNER) {
      const prisma = (await import('@/lib/prisma')).prisma;
      const deliveryPartner = await prisma.deliveryPartner.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!deliveryPartner) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Delivery partner profile not found' } },
          { status: 404 }
        );
      }

      if (currentOrder.deliveryPartner?.id !== deliveryPartner.id) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Order not assigned to you' } },
          { status: 403 }
        );
      }

      // Verify delivery partner can update to this status
      if (!OrderStatusService.canDeliveryPartnerUpdate(currentOrder.status)) {
        return NextResponse.json(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'Cannot update order status in current state',
            },
          },
          { status: 400 }
        );
      }
    }

    const order = await OrderService.updateOrderStatus(
      id,
      validatedData.status,
      validatedData.notes
    );

    // Return full order details
    const updatedOrder = await OrderService.getOrderById(order.id);

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error: any) {
    console.error('Error updating order status:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status update data',
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

    if (error.message.includes('Invalid status transition')) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update order status',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
