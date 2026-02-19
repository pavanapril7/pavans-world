/**
 * Authentication Module
 * 
 * Handles JWT validation and user authentication
 */

import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

export interface AuthResult {
  success: boolean;
  userId?: string;
  role?: UserRole;
  error?: string;
}

interface JWTPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Validate JWT token and extract user information
 */
export async function validateToken(token: string): Promise<AuthResult> {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error('JWT_SECRET not configured');
    return {
      success: false,
      error: 'Server configuration error',
    };
  }

  try {
    // Verify and decode token
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Validate required fields
    if (!decoded.userId || !decoded.role) {
      return {
        success: false,
        error: 'Invalid token payload',
      };
    }

    // Validate role is a valid UserRole
    if (!Object.values(UserRole).includes(decoded.role)) {
      return {
        success: false,
        error: 'Invalid user role',
      };
    }

    return {
      success: true,
      userId: decoded.userId,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: 'Token expired',
      };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        error: 'Invalid token',
      };
    }

    console.error('Token validation error:', error);
    return {
      success: false,
      error: 'Authentication failed',
    };
  }
}

/**
 * Extract token from authorization header or message
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  // Handle "Bearer <token>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Handle plain token
  return authHeader;
}
