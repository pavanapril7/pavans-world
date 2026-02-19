import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { DeliveryMatchingService } from '@/services/delivery-matching.service';

/**
 * POST /api/orders/:id/notify-delivery-partners
 * Trigger proximity-based delivery partner notifications
 */
export async function POST(
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

    // Verify user is admin or vendor
    // Vendors can trigger notifications for their own orders
    // Admins can trigger for any order
    const isAdmin = authResult.user.role === UserRole.SUPER_ADMIN;
    const isVendor = authResult.user.role === UserRole.VENDOR;

    if (!isAdmin && !isVendor) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only vendors and administrators can trigger delivery partner notifications',
          },
        },
        { status: 403 }
      );
    }

    // If vendor, verify they own the order
    if (isVendor) {
      const prisma = (await import('@/lib/prisma')).prisma;
      const vendor = await prisma.vendor.findUnique({
        where: { userId: authResult.user.id },
        select: { id: true },
      });

      if (!vendor) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } },
          { status: 404 }
        );
      }

      // Verify order belongs to this vendor
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { vendorId: true },
      });

      if (!order) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Order not found' } },
          { status: 404 }
        );
      }

      if (order.vendorId !== vendor.id) {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'You can only trigger notifications for your own orders',
            },
          },
          { status: 403 }
        );
      }
    }

    // Parse optional proximity threshold from request body
    let proximityThresholdKm = 5; // default
    try {
      const body = await request.json();
      if (body.proximityThresholdKm && typeof body.proximityThresholdKm === 'number') {
        proximityThresholdKm = body.proximityThresholdKm;
      }
    } catch {
      // If no body or invalid JSON, use default
    }

    // Notify nearby delivery partners
    const result = await DeliveryMatchingService.notifyNearbyDeliveryPartners(
      orderId,
      proximityThresholdKm
    );

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        deliveryPartnerIds: result.deliveryPartnerIds,
        notifiedCount: result.notifiedCount,
        proximityThresholdKm,
      },
      message: `Notified ${result.notifiedCount} delivery partner(s)`,
    });
  } catch (error) {
    console.error('Error notifying delivery partners:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle specific error cases
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

    if (errorMessage.includes('location not set')) {
      return NextResponse.json(
        {
          error: {
            code: 'PRECONDITION_FAILED',
            message: errorMessage,
          },
        },
        { status: 412 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to notify delivery partners',
        },
      },
      { status: 500 }
    );
  }
}
