import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { extractToken } from '@/middleware/auth.middleware';

export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request);

    if (!token) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_TOKEN',
            message: 'No authentication token provided',
          },
        },
        { status: 400 }
      );
    }

    // Logout user
    await AuthService.logout(token);

    // Clear cookie
    const response = NextResponse.json(
      {
        message: 'Logged out successfully',
      },
      { status: 200 }
    );

    response.cookies.delete('auth_token');

    return response;
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: {
            code: 'LOGOUT_FAILED',
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
