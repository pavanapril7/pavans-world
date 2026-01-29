import { NextRequest, NextResponse } from 'next/server';
import { DeliveryService } from '@/services/delivery.service';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/deliveries/active
 * Get delivery partner's active deliveries
 */
export async function GET(request: NextRequest) {
  try {
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
            message: 'Only delivery partners can access this endpoint',
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

    // Get active deliveries
    const deliveries = await DeliveryService.getActiveDeliveries(deliveryPartner.id);

    return NextResponse.json({
      success: true,
      data: deliveries,
    });
  } catch (error) {
    console.error('Error fetching active deliveries:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch active deliveries';
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
