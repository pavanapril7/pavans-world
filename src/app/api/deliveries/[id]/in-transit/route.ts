import { NextRequest, NextResponse } from 'next/server';
import { DeliveryService } from '@/services/delivery.service';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/deliveries/:id/in-transit
 * Mark order as in transit
 */
export async function PUT(
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

    // Verify user is a delivery partner
    if (authResult.user.role !== UserRole.DELIVERY_PARTNER) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only delivery partners can update delivery status',
          },
        },
        { status: 403 }
      );
    }

    // Get delivery partner profile
    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { userId: authResult.user.id },
    });

    if (!deliveryPartner) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Delivery partner profile not found',
          },
        },
        { status: 404 }
      );
    }

    // Mark as in transit
    const order = await DeliveryService.markInTransit(orderId, deliveryPartner.id);

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order marked as in transit',
    });
  } catch (error) {
    console.error('Error marking order as in transit:', error);
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

    if (
      errorMessage.includes('not assigned') ||
      errorMessage.includes('must be in')
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: errorMessage,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
