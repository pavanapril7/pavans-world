import { NextRequest, NextResponse } from 'next/server';
import { DeliveryService } from '@/services/delivery.service';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const reportIssueSchema = z.object({
  issue: z.string().min(1, 'Issue description is required').max(500),
});

/**
 * POST /api/deliveries/:id/issue
 * Report a delivery issue
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

    // Verify user is a delivery partner
    if (authResult.user.role !== UserRole.DELIVERY_PARTNER) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only delivery partners can report issues',
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

    // Parse and validate request body
    const body = await request.json();
    const validation = reportIssueSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { issue } = validation.data;

    // Report issue
    const order = await DeliveryService.reportIssue(
      orderId,
      deliveryPartner.id,
      issue
    );

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Issue reported successfully',
    });
  } catch (error) {
    console.error('Error reporting delivery issue:', error);
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

    if (errorMessage.includes('not assigned')) {
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
