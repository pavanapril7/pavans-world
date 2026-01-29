import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment.service';
import { verifyPaymentSchema } from '@/schemas/payment.schema';

/**
 * POST /api/payments/verify
 * Verify a payment transaction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = verifyPaymentSchema.parse(body);

    // Initialize payment service
    const paymentService = new PaymentService();

    // Verify payment
    const payment = await paymentService.verifyPayment(
      validatedData.paymentId,
      validatedData.gatewayTransactionId,
      validatedData.gatewayResponse
    );

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Payment verification error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: {
            code: 'PAYMENT_VERIFICATION_FAILED',
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
