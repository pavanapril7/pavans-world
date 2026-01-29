import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { verifyOTPSchema } from '@/schemas/auth.schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = verifyOTPSchema.parse(body);

    // Verify OTP and login
    const result = await AuthService.verifyOTP(validatedData);

    // Set cookie
    const response = NextResponse.json(
      {
        message: 'OTP verified successfully',
        user: result.user,
        token: result.token,
        expiresAt: result.expiresAt,
      },
      { status: 200 }
    );

    // Set HTTP-only cookie
    response.cookies.set('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: result.expiresAt,
      path: '/',
    });

    return response;
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
            code: 'OTP_VERIFICATION_FAILED',
            message: error.message,
          },
        },
        { status: 401 }
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
