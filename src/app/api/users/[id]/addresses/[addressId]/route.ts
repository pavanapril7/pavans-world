import { NextRequest, NextResponse } from 'next/server';
import { updateAddressWithCoordinatesSchema } from '@/schemas/geolocation.schema';
import { ZodError } from 'zod';
import { AddressService } from '@/services/address.service';
import { withAuth, AuthUser } from '@/middleware/auth.middleware';

/**
 * GET /api/users/:id/addresses/:addressId
 * Get a specific address
 */
export const GET = withAuth(
  async (
    _request: NextRequest,
    context: { user: AuthUser; params?: Record<string, string> }
  ) => {
    try {
      const userId = context.params?.id;
      const addressId = context.params?.addressId;

      if (!userId || !addressId) {
        return NextResponse.json(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'User ID and Address ID are required',
            },
          },
          { status: 400 }
        );
      }

      const { user } = context;

      // Users can only view their own addresses unless they're admin
      if (user.role !== 'SUPER_ADMIN' && user.id !== userId) {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'You can only view your own addresses',
            },
          },
          { status: 403 }
        );
      }

      const address = await AddressService.getAddressById(addressId, userId);

      return NextResponse.json(
        {
          success: true,
          data: address,
        },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'Address not found') {
        return NextResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          },
          { status: 404 }
        );
      }

      console.error('Error fetching address:', error);
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch address',
          },
        },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH /api/users/:id/addresses/:addressId
 * Update an address (supports optional coordinates)
 */
export const PATCH = withAuth(
  async (
    request: NextRequest,
    context: { user: AuthUser; params?: Record<string, string> }
  ) => {
    try {
      const userId = context.params?.id;
      const addressId = context.params?.addressId;

      if (!userId || !addressId) {
        return NextResponse.json(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'User ID and Address ID are required',
            },
          },
          { status: 400 }
        );
      }

      const { user } = context;
      const body = await request.json();

      // Users can only update their own addresses unless they're admin
      if (user.role !== 'SUPER_ADMIN' && user.id !== userId) {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'You can only update your own addresses',
            },
          },
          { status: 403 }
        );
      }

      // Validate request body (supports optional coordinates)
      const validatedData = updateAddressWithCoordinatesSchema.parse(body);

      // Update address
      const address = await AddressService.updateAddress(addressId, userId, validatedData);

      return NextResponse.json(
        {
          success: true,
          data: address,
          message: 'Address updated successfully',
        },
        { status: 200 }
      );
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input data',
              details: error.issues.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
              })),
            },
          },
          { status: 400 }
        );
      }

      // Handle business logic errors
      if (error instanceof Error) {
        if (error.message === 'Address not found') {
          return NextResponse.json(
            {
              error: {
                code: 'NOT_FOUND',
                message: error.message,
              },
            },
            { status: 404 }
          );
        }

        if (
          error.message === 'Invalid coordinates provided' ||
          error.message.includes('distance exceeds 10km')
        ) {
          return NextResponse.json(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: error.message,
              },
            },
            { status: 400 }
          );
        }
      }

      // Handle other errors
      console.error('Error updating address:', error);
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update address',
          },
        },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/users/:id/addresses/:addressId
 * Delete an address
 */
export const DELETE = withAuth(
  async (
    _request: NextRequest,
    context: { user: AuthUser; params?: Record<string, string> }
  ) => {
    try {
      const userId = context.params?.id;
      const addressId = context.params?.addressId;

      if (!userId || !addressId) {
        return NextResponse.json(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'User ID and Address ID are required',
            },
          },
          { status: 400 }
        );
      }

      const { user } = context;

      // Users can only delete their own addresses unless they're admin
      if (user.role !== 'SUPER_ADMIN' && user.id !== userId) {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'You can only delete your own addresses',
            },
          },
          { status: 403 }
        );
      }

      const result = await AddressService.deleteAddress(addressId, userId);

      return NextResponse.json(
        {
          success: true,
          message: result.message,
        },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'Address not found') {
        return NextResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          },
          { status: 404 }
        );
      }

      console.error('Error deleting address:', error);
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete address',
          },
        },
        { status: 500 }
      );
    }
  }
);
