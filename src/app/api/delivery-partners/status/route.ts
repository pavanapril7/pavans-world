import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole, DeliveryPartnerStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.nativeEnum(DeliveryPartnerStatus),
});

/**
 * PATCH /api/delivery-partners/status
 * Update delivery partner's availability status
 */
export async function PATCH(request: NextRequest) {
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
            message: 'Only delivery partners can update status',
          },
        },
        { status: 403 }
      );
    }

    // Get delivery partner profile
    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { userId: authResult.user.id },
      include: {
        orders: {
          where: {
            status: {
              in: ['ASSIGNED_TO_DELIVERY', 'PICKED_UP', 'IN_TRANSIT'],
            },
          },
          take: 1,
        },
      },
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

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateStatusSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { status } = validationResult.data;

    // Prevent going OFFLINE or AVAILABLE if there's an active delivery
    if (deliveryPartner.orders.length > 0 && status !== DeliveryPartnerStatus.BUSY) {
      return NextResponse.json(
        {
          error: {
            code: 'ACTIVE_DELIVERY',
            message: 'Cannot change status while you have an active delivery',
          },
        },
        { status: 400 }
      );
    }

    // Update status
    const updated = await prisma.deliveryPartner.update({
      where: { id: deliveryPartner.id },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      data: {
        status: updated.status,
      },
      message: `Status updated to ${status}`,
    });
  } catch (error) {
    console.error('Error updating delivery partner status:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update status',
        },
      },
      { status: 500 }
    );
  }
}
