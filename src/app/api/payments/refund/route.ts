import { NextRequest, NextResponse } from 'next/server';
import { RefundService } from '@/services/refund.service';
import { refundPaymentSchema } from '@/schemas/payment.schema';

/**
 * POST /api/payments/refund
 * Process a refund for a payment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = refundPaymentSchema.parse(body);

    // Initialize refund service
    const refundService = new RefundService();

    // Process refund
    const refund = await refundService.processRefund(
      validatedData.paymentId,
      validatedData.reason,
      validatedData.amount
    );

    return NextResponse.json(
      {
        success: true,
        data: refund,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Refund processing error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: {
            code: 'REFUND_PROCESSING_FAILED',
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
