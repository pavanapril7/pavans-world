/**
 * WebSocket Token Endpoint
 * Returns the JWT token for WebSocket authentication
 * This is needed because the auth_token cookie is HttpOnly
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractToken } from '@/middleware/auth.middleware';

export async function GET(request: NextRequest) {
  try {
    // Extract token from HttpOnly cookie
    const token = extractToken(request);

    if (!token) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        },
        { status: 401 }
      );
    }

    // Return the token for WebSocket authentication
    return NextResponse.json({
      token,
    });
  } catch (error) {
    console.error('Error getting WebSocket token:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get WebSocket token',
        },
      },
      { status: 500 }
    );
  }
}
