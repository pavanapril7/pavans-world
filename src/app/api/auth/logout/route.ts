import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { extractToken } from '@/middleware/auth.middleware';

export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request);

    // Always clear the cookie, even if there's no token or it's invalid
    const response = NextResponse.json(
      {
        message: 'Logged out successfully',
      },
      { status: 200 }
    );

    response.cookies.delete('auth_token');

    // If there's a token, try to delete the session from database
    if (token) {
      try {
        await AuthService.logout(token);
      } catch (error) {
        // Ignore errors - session might already be expired/deleted
        console.log('Session cleanup failed (may already be expired):', error);
      }
    }

    return response;
  } catch (error) {
    // Even on error, try to clear the cookie
    const response = NextResponse.json(
      {
        message: 'Logged out successfully',
      },
      { status: 200 }
    );

    response.cookies.delete('auth_token');

    return response;
  }
}
