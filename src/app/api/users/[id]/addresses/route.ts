import { NextRequest, NextResponse } from 'next/server';
import { addressWithCoordinatesSchema } from '@/schemas/geolocation.schema';
import { ZodError } from 'zod';
import { AddressService } from '@/services/address.service';
import { withAuth, AuthUser } from '@/middleware/auth.middleware';

/**
 * GET /api/users/:id/addresses
 * Get all addresses for a user
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
      const { user } = context;

      // Users can only view their own addresses unless they're admin
      if (user.role !== 'SUPER_ADMIN' && user.id !== userId) {
        return NextResponse.json({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only view your own addresses',
          },
        }, { status: 403 });
      }

      const addresses = await AddressService.getUserAddresses(userId);

      return NextResponse.json({
        success: true,
        data: addresses,
      }, { status: 200 });
    } catch (error) {
      console.error('Error fetching addresses:', error);
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch addresses',
        },
      }, { status: 500 });
    }
  }
);

/**
 * POST /api/users/:id/addresses
 * Create a new address for a user
 */
export const POST = withAuth(
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
      const { user } = context;
      const body = await request.json();

      // Users can only create addresses for themselves unless they're admin
      if (user.role !== 'SUPER_ADMIN' && user.id !== userId) {
        return NextResponse.json({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only create addresses for yourself',
          },
        }, { status: 403 });
      }

      // Validate request body (now supports optional coordinates)
      const validatedData = addressWithCoordinatesSchema.parse(body);

      // Create address
      const address = await AddressService.createAddress(userId, validatedData);

      return NextResponse.json({
        success: true,
        data: address,
        message: 'Address created successfully',
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
      if (error instanceof Error && error.message === 'User not found') {
        return NextResponse.json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        }, { status: 404 });
      }

      // Handle other errors
      console.error('Error creating address:', error);
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create address',
        },
      }, { status: 500 });
    }
  }
);
