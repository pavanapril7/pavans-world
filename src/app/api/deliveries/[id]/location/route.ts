import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { LocationTrackingService } from '@/services/location-tracking.service';

/**
 * GET /api/deliveries/:id/location
 * Get current location of delivery partner for a specific delivery
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // Verify authentication
    const authResult = await authenticate(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get order to verify ownership/assignment
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        deliveryPartner: true,
      },
    });

    if (!order) {
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

    // Verify authorization: customer who owns order or assigned delivery partner
    const isCustomer = authResult.user.role === UserRole.CUSTOMER && order.customerId === authResult.user.id;
    
    let isAssignedDeliveryPartner = false;
    if (authResult.user.role === UserRole.DELIVERY_PARTNER && order.deliveryPartner) {
      const deliveryPartner = await prisma.deliveryPartner.findUnique({
        where: { userId: authResult.user.id },
      });
      isAssignedDeliveryPartner = deliveryPartner?.id === order.deliveryPartner.id;
    }

    if (!isCustomer && !isAssignedDeliveryPartner) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot access tracking: order does not belong to user',
          },
        },
        { status: 403 }
      );
    }

    // Get delivery location
    const location = await LocationTrackingService.getDeliveryLocation(orderId);

    if (!location) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Delivery location not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: location.orderId,
        latitude: location.latitude,
        longitude: location.longitude,
        lastUpdate: location.lastUpdate,
        eta: location.eta,
      },
    });
  } catch (error) {
    console.error('Error getting delivery location:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: errorMessage,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get delivery location',
        },
      },
      { status: 500 }
    );
  }
}
