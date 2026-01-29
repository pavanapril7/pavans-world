import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment.service';
import { initiatePaymentSchema } from '@/schemas/payment.schema';

/**
 * POST /api/payments/initiate
 * Initiate a payment for an order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = initiatePaymentSchema.parse(body);

    // Initialize payment service
    const paymentService = new PaymentService();

    // Initiate payment
    const payment = await paymentService.initiatePayment(
      validatedData.orderId,
      validatedData.method,
      validatedData.amount
    );

    return NextResponse.json(
      {
        success: true,
        data: payment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Payment initiation error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: {
            code: 'PAYMENT_INITIATION_FAILED',
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
