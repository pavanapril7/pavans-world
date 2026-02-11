import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { adminActionRateLimit } from '@/middleware/rate-limit.middleware';
import { UserRole } from '@prisma/client';
import { AdminOrderService } from '@/services/admin-order.service';
import { AuditLogService } from '@/services/audit-log.service';
import { adminReassignDeliverySchema } from '@/schemas/admin-order.schema';
import { ZodError } from 'zod';

/**
 * PUT /api/admin/orders/:id/reassign-delivery - Reassign delivery partner (admin only)
 * Requirements: 6.5
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await adminActionRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Verify authentication
    const authResult = await authenticate(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Only super admins can access this
    if (authResult.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Get order ID from params
    const params = await context.params;
    const orderId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = adminReassignDeliverySchema.parse(body);

    // Get the order before reassignment to log the old delivery partner
    const oldOrder = await AdminOrderService.getOrderById(orderId);

    // Reassign delivery partner
    const order = await AdminOrderService.reassignDeliveryPartner(
      orderId,
      validatedData.deliveryPartnerId
    );

    // Log the action
    await AuditLogService.log({
      userId: authResult.user.id,
      action: 'REASSIGN_DELIVERY_PARTNER',
      entityType: 'Order',
      entityId: orderId,
      details: {
        oldDeliveryPartnerId: oldOrder.deliveryPartnerId,
        newDeliveryPartnerId: validatedData.deliveryPartnerId,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error('Error reassigning delivery partner:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === 'Order not found' || error.message === 'Delivery partner not found') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: error.message } },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to reassign delivery partner',
        },
      },
      { status: 500 }
    );
  }
}
