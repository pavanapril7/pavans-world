import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment.service';
import { checkoutTotalSchema } from '@/schemas/payment.schema';

/**
 * POST /api/payments/calculate-total
 * Calculate checkout total including tax and delivery fee
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = checkoutTotalSchema.parse(body);

    // Initialize payment service
    const paymentService = new PaymentService();

    // Calculate checkout total
    const total = paymentService.calculateCheckoutTotal(
      validatedData.subtotal,
      validatedData.deliveryFee,
      validatedData.taxRate
    );

    return NextResponse.json({
      success: true,
      data: total,
    });
  } catch (error) {
    console.error('Calculate total error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: {
            code: 'CALCULATE_TOTAL_FAILED',
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
