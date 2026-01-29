import { NextRequest, NextResponse } from 'next/server';
import { updateAddressSchema } from '@/schemas/user.schema';
import { ZodError } from 'zod';
import { AddressService } from '@/services/address.service';
import { withAuth, AuthUser } from '@/middleware/auth.middleware';

/**
 * GET /api/addresses/:id
 * Get a single address by ID
 */
export const GET = withAuth(
  async (_request: NextRequest, context: { user: AuthUser; params?: Record<string, string> }) => {
    try {
      const addressId = context.params?.id;
      if (!addressId) {
        return NextResponse.json(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'Address ID is required',
            },
          },
          { status: 400 }
        );
      }
      const { user } = context;

      const address = await AddressService.getAddressById(addressId, user.id);

      return NextResponse.json({
        success: true,
        data: address,
      }, { status: 200 });
    } catch (error) {
      if (error instanceof Error && error.message === 'Address not found') {
        return NextResponse.json({
          error: {
            code: 'NOT_FOUND',
            message: 'Address not found',
          },
        }, { status: 404 });
      }

      console.error('Error fetching address:', error);
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch address',
        },
      }, { status: 500 });
    }
  }
);

/**
 * PUT /api/addresses/:id
 * Update an address
 */
export const PUT = withAuth(
  async (request: NextRequest, context: { user: AuthUser; params?: Record<string, string> }) => {
    try {
      const addressId = context.params?.id;
      if (!addressId) {
        return NextResponse.json(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'Address ID is required',
            },
          },
          { status: 400 }
        );
      }
      const { user } = context;
      const body = await request.json();

      // Validate request body
      const validatedData = updateAddressSchema.parse(body);

      // Update address
      const address = await AddressService.updateAddress(addressId, user.id, validatedData);

      return NextResponse.json({
        success: true,
        data: address,
        message: 'Address updated successfully',
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
      if (error instanceof Error && error.message === 'Address not found') {
        return NextResponse.json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        }, { status: 404 });
      }

      // Handle other errors
      console.error('Error updating address:', error);
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update address',
        },
      }, { status: 500 });
    }
  }
);

/**
 * DELETE /api/addresses/:id
 * Delete an address
 */
export const DELETE = withAuth(
  async (_request: NextRequest, context: { user: AuthUser; params?: Record<string, string> }) => {
    try {
      const addressId = context.params?.id;
      if (!addressId) {
        return NextResponse.json(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'Address ID is required',
            },
          },
          { status: 400 }
        );
      }
      const { user } = context;

      const result = await AddressService.deleteAddress(addressId, user.id);

      return NextResponse.json({
        success: true,
        message: result.message,
      }, { status: 200 });
    } catch (error) {
      if (error instanceof Error && error.message === 'Address not found') {
        return NextResponse.json({
          error: {
            code: 'NOT_FOUND',
            message: 'Address not found',
          },
        }, { status: 404 });
      }

      console.error('Error deleting address:', error);
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete address',
        },
      }, { status: 500 });
    }
  }
);
