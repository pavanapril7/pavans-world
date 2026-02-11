import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { adminActionRateLimit } from '@/middleware/rate-limit.middleware';
import { UserRole } from '@prisma/client';
import { AdminOrderService } from '@/services/admin-order.service';
import { AuditLogService } from '@/services/audit-log.service';
import { adminAddNoteSchema } from '@/schemas/admin-order.schema';
import { ZodError } from 'zod';

/**
 * POST /api/admin/orders/:id/notes - Add an admin note to an order
 * Requirements: 6.3
 */
export async function POST(
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
    const validatedData = adminAddNoteSchema.parse(body);

    // Add the note
    const note = await AdminOrderService.addNote(orderId, validatedData.content);

    // Log the action
    await AuditLogService.log({
      userId: authResult.user.id,
      action: 'ADD_ORDER_NOTE',
      entityType: 'Order',
      entityId: orderId,
      details: {
        noteContent: validatedData.content,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: { note },
    });
  } catch (error) {
    console.error('Error adding admin note:', error);

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

    if (error instanceof Error && error.message === 'Order not found') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: error.message } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to add note',
        },
      },
      { status: 500 }
    );
  }
}
