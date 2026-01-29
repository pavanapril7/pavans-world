import { NextRequest, NextResponse } from 'next/server';
import { updateUserSchema } from '@/schemas/user.schema';
import { ZodError } from 'zod';
import { UserService } from '@/services/user.service';
import { withAuth, AuthUser } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';

/**
 * GET /api/users/:id
 * Get a single user by ID
 * Users can access their own data, admins can access any user
 */
export const GET = withAuth(
  async (_request: NextRequest, context: { user: AuthUser; params?: Record<string, string> }) => {
    try {
      const userId = context.params?.id;
      if (!userId) {
        return NextResponse.json(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'User ID is required',
            },
          },
          { status: 400 }
        );
      }

      // Check if user is accessing their own data or is an admin
      if (context.user.id !== userId && context.user.role !== UserRole.SUPER_ADMIN) {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'You can only access your own user data',
            },
          },
          { status: 403 }
        );
      }

      const user = await UserService.getUserById(userId);

      return NextResponse.json({
        success: true,
        data: user,
      }, { status: 200 });
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return NextResponse.json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        }, { status: 404 });
      }

      console.error('Error fetching user:', error);
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user',
        },
      }, { status: 500 });
    }
  }
);

/**
 * PUT /api/users/:id
 * Update a user
 */
export const PUT = withAuth(
  async (request: NextRequest, context: { user: AuthUser; params?: Record<string, string> }) => {
    try {
      const userId = context.params?.id;
      if (!userId) {
        return NextResponse.json(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'User ID is required',
            },
          },
          { status: 400 }
        );
      }
      const body = await request.json();
      
      // Validate request body
      const validatedData = updateUserSchema.parse(body);
      
      // Update user
      const user = await UserService.updateUser(userId, validatedData);
      
      return NextResponse.json({
        success: true,
        data: user,
        message: 'User updated successfully',
      }, { status: 200 });
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        return NextResponse.json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.issues.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
        }, { status: 400 });
      }
      
      // Handle business logic errors
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return NextResponse.json({
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          }, { status: 404 });
        }
        
        if (error.message.includes('already exists')) {
          return NextResponse.json({
            error: {
              code: 'CONFLICT',
              message: error.message,
            },
          }, { status: 409 });
        }
      }
      
      // Handle other errors
      console.error('Error updating user:', error);
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user',
        },
      }, { status: 500 });
    }
  },
  { roles: [UserRole.SUPER_ADMIN] }
);

/**
 * DELETE /api/users/:id
 * Deactivate a user
 */
export const DELETE = withAuth(
  async (_request: NextRequest, context: { user: AuthUser; params?: Record<string, string> }) => {
    try {
      const userId = context.params?.id;
      if (!userId) {
        return NextResponse.json(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'User ID is required',
            },
          },
          { status: 400 }
        );
      }
      const user = await UserService.deactivateUser(userId);

      return NextResponse.json({
        success: true,
        data: user,
        message: 'User deactivated successfully',
      }, { status: 200 });
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return NextResponse.json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        }, { status: 404 });
      }

      console.error('Error deactivating user:', error);
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to deactivate user',
        },
      }, { status: 500 });
    }
  },
  { roles: [UserRole.SUPER_ADMIN] }
);
