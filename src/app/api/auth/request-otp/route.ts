import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { requestOTPSchema } from '@/schemas/auth.schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = requestOTPSchema.parse(body);

    // Request OTP
    const result = await AuthService.requestOTP(validatedData);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      // Zod validation error
      if (error.name === 'ZodError') {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input data',
              details: error,
            },
          },
          { status: 400 }
        );
      }

      // Business logic error
      return NextResponse.json(
        {
          error: {
            code: 'OTP_REQUEST_FAILED',
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    // Unknown error
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}
