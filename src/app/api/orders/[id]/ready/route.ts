import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';

/**
 * POST /api/orders/:id/ready - Vendor marks order as ready for pickup
 */
export async function POST(
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

    // Only vendors can mark orders as ready
    if (user.role !== UserRole.VENDOR) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only vendors can mark orders as ready' } },
        { status: 403 }
      );
    }

    // Get vendor ID for this user
    const prisma = (await import('@/lib/prisma')).prisma;
    const vendor = await prisma.vendor.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } },
        { status: 404 }
      );
    }

    const { id } = await params;
    const order = await OrderService.markOrderReady(id, vendor.id);

    // Trigger proximity-based delivery partner notifications
    try {
      // Call the notify-delivery-partners endpoint internally
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const notifyUrl = `${apiUrl}/api/orders/${id}/notify-delivery-partners`;
      
      console.log(`🔔 Triggering delivery partner notifications for order ${id}...`);
      
      const notifyResponse = await fetch(notifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
      });

      if (!notifyResponse.ok) {
        const errorText = await notifyResponse.text();
        console.error(`❌ Failed to notify delivery partners (${notifyResponse.status}):`, errorText);
        // Continue execution - notification failure shouldn't block the response
      } else {
        const result = await notifyResponse.json();
        console.log(`✅ Delivery partner notifications sent:`, result);
      }
    } catch (notifyError) {
      console.error('❌ Error triggering delivery partner notifications:', notifyError);
      // Continue execution - notification failure shouldn't block the response
    }

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    console.error('Error marking order as ready:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: errorMessage } },
        { status: 404 }
      );
    }

    if (
      errorMessage.includes('does not belong') ||
      errorMessage.includes('must be in')
    ) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: errorMessage } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to mark order as ready',
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
