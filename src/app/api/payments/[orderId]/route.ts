import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment.service';

/**
 * GET /api/payments/[orderId]
 * Get payment status by order ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // Initialize payment service
    const paymentService = new PaymentService();

    // Get payment by order ID
    const payment = await paymentService.getPaymentByOrderId(orderId);

    if (!payment) {
      return NextResponse.json(
        {
          error: {
            code: 'PAYMENT_NOT_FOUND',
            message: 'Payment not found for this order',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Get payment error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: {
            code: 'GET_PAYMENT_FAILED',
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}
