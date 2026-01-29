import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { registerSchema } from '@/schemas/auth.schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = registerSchema.parse(body);

    // Register user
    const user = await AuthService.register(validatedData);

    return NextResponse.json(
      {
        message: 'User registered successfully',
        user,
      },
      { status: 201 }
    );
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
            code: 'REGISTRATION_FAILED',
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
