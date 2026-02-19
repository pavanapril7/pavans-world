import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { LocationTrackingService } from '@/services/location-tracking.service';

/**
 * GET /api/deliveries/:id/route
 * Get location history (route) for a delivery
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

    // Verify authorization: customer who owns order, assigned delivery partner, or admin
    const isCustomer = authResult.user.role === UserRole.CUSTOMER && order.customerId === authResult.user.id;
    const isAdmin = authResult.user.role === UserRole.SUPER_ADMIN;
    
    let isAssignedDeliveryPartner = false;
    if (authResult.user.role === UserRole.DELIVERY_PARTNER && order.deliveryPartner) {
      const deliveryPartner = await prisma.deliveryPartner.findUnique({
        where: { userId: authResult.user.id },
      });
      isAssignedDeliveryPartner = deliveryPartner?.id === order.deliveryPartner.id;
    }

    if (!isCustomer && !isAssignedDeliveryPartner && !isAdmin) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot access route: insufficient permissions',
          },
        },
        { status: 403 }
      );
    }

    // Get delivery route
    const route = await LocationTrackingService.getDeliveryRoute(orderId);

    // Calculate total distance
    const totalDistanceKm = await LocationTrackingService.calculateTotalDistance(orderId);

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        route: route.map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude,
          timestamp: point.timestamp,
        })),
        totalDistanceKm,
      },
    });
  } catch (error) {
    console.error('Error getting delivery route:', error);
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
          message: 'Failed to get delivery route',
        },
      },
      { status: 500 }
    );
  }
}
