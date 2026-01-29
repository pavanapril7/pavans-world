import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { AuthService } from '@/services/auth.service';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: string;
  };
}

/**
 * Extract token from Authorization header or cookies
 */
export function extractToken(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookie
  const token = request.cookies.get('auth_token')?.value;
  return token || null;
}

export interface AuthUser {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: string;
}

/**
 * Middleware to authenticate requests
 */
export async function authenticate(request: NextRequest): Promise<{
  authenticated: boolean;
  user?: AuthUser;
  error?: string;
}> {
  const token = extractToken(request);

  if (!token) {
    return {
      authenticated: false,
      error: 'No authentication token provided',
    };
  }

  try {
    const user = await AuthService.validateSession(token);
    return {
      authenticated: true,
      user,
    };
  } catch (error) {
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Middleware to check if user has required role
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (request: NextRequest) => {
    const auth = await authenticate(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: auth.error || 'Authentication required' } },
        { status: 401 }
      );
    }

    if (!allowedRoles.includes(auth.user.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403 }
      );
    }

    return null; // Allow request to proceed
  };
}

/**
 * Helper to create authenticated API handler
 */
export function withAuth(
  handler: (request: NextRequest, context: { user: AuthUser; params?: Record<string, string> }) => Promise<NextResponse>,
  options?: { roles?: UserRole[] }
) {
  return async (request: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => {
    const auth = await authenticate(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: auth.error || 'Authentication required' } },
        { status: 401 }
      );
    }

    // Check roles if specified
    if (options?.roles && !options.roles.includes(auth.user.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403 }
      );
    }

    // Await params if they exist
    const params = routeContext?.params ? await routeContext.params : undefined;

    return handler(request, { user: auth.user, params });
  };
}
