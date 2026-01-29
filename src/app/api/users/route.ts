import { NextRequest, NextResponse } from 'next/server';
import { createUserSchema } from '@/schemas/user.schema';
import { ZodError } from 'zod';
import { UserService } from '@/services/user.service';
import { withAuth } from '@/middleware/auth.middleware';
import { UserRole, UserStatus } from '@prisma/client';

/**
 * GET /api/users
 * List all users with optional filtering (admin only)
 * Query params: role, status, search
 */
export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      
      const filters = {
        role: searchParams.get('role') as UserRole | undefined,
        status: searchParams.get('status') as UserStatus | undefined,
        search: searchParams.get('search') || undefined,
      };

      const users = await UserService.getUsers(filters);

      return NextResponse.json({
        success: true,
        data: users,
      }, { status: 200 });
    } catch (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch users',
        },
      }, { status: 500 });
    }
  },
  { roles: [UserRole.SUPER_ADMIN] }
);

/**
 * POST /api/users
 * Create a new user (admin only)
 */
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      
      // Validate request body
      const validatedData = createUserSchema.parse(body);
      
      // Create user
      const user = await UserService.createUser(validatedData);
      
      return NextResponse.json({
        success: true,
        data: user,
        message: 'User created successfully',
      }, { status: 201 });
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
      console.error('Error creating user:', error);
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create user',
        },
      }, { status: 500 });
    }
  },
  { roles: [UserRole.SUPER_ADMIN] }
);
