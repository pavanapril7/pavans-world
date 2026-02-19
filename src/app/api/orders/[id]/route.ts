import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';

/**
 * GET /api/orders/:id - Get order details
 */
export async function GET(
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
    const { id } = await params;

    const order = await OrderService.getOrderById(id);

    // Verify user has permission to view this order
    const hasPermission =
      user.role === UserRole.SUPER_ADMIN ||
      order.customerId === user.id ||
      (user.role === UserRole.VENDOR && order.vendor.id === (await getVendorId(user.id))) ||
      (user.role === UserRole.DELIVERY_PARTNER &&
        order.deliveryPartner?.id === (await getDeliveryPartnerId(user.id)));

    if (!hasPermission) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: order }, { status: 200 });
  } catch (error) {
    console.error('Error getting order:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: errorMessage } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get order',
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}

// Helper functions to get vendor/delivery partner IDs
async function getVendorId(userId: string): Promise<string | null> {
  const prisma = (await import('@/lib/prisma')).prisma;
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  });
  return vendor?.id || null;
}

async function getDeliveryPartnerId(userId: string): Promise<string | null> {
  const prisma = (await import('@/lib/prisma')).prisma;
  const deliveryPartner = await prisma.deliveryPartner.findUnique({
    where: { userId },
    select: { id: true },
  });
  return deliveryPartner?.id || null;
}
