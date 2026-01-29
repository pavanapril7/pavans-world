import { NextRequest, NextResponse } from 'next/server';
import { CartService } from '@/services/cart.service';
import { updateCartItemSchema } from '@/schemas/cart.schema';
import { withAuth, AuthUser } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { ZodError } from 'zod';

/**
 * PUT /api/cart/items/:itemId
 * Update cart item quantity
 */
export const PUT = withAuth(
  async (
    request: NextRequest,
    context: { user: AuthUser; params?: Record<string, string> }
  ) => {
    try {
      const customerId = context.user.id;
      const itemId = context.params?.itemId;

      if (!itemId) {
        return NextResponse.json(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'Cart item ID is required',
            },
          },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const validatedData = updateCartItemSchema.parse(body);

      // Update cart item
      const cart = await CartService.updateCartItem(
        customerId,
        itemId,
        validatedData
      );

      // Calculate cart total
      const total = cart ? CartService.calculateCartTotal(cart) : 0;

      return NextResponse.json(
        {
          success: true,
          data: {
            ...cart,
            total,
          },
          message: 'Cart item updated successfully',
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
        if (error.message === 'Cart item not found') {
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
          error.message === 'Cart item does not belong to this customer' ||
          error.message === 'Product is no longer available' ||
          error.message === 'Vendor is not currently active' ||
          error.message.includes('Quantity must be')
        ) {
          return NextResponse.json(
            {
              error: {
                code: 'BAD_REQUEST',
                message: error.message,
              },
            },
            { status: 400 }
          );
        }
      }

      console.error('Error updating cart item:', error);
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update cart item',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.CUSTOMER] }
);

/**
 * DELETE /api/cart/items/:itemId
 * Remove item from cart
 */
export const DELETE = withAuth(
  async (
    _request: NextRequest,
    context: { user: AuthUser; params?: Record<string, string> }
  ) => {
    try {
      const customerId = context.user.id;
      const itemId = context.params?.itemId;

      if (!itemId) {
        return NextResponse.json(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'Cart item ID is required',
            },
          },
          { status: 400 }
        );
      }

      // Remove cart item
      const cart = await CartService.removeCartItem(customerId, itemId);

      // Calculate cart total if cart still exists
      const total = cart ? CartService.calculateCartTotal(cart) : 0;

      return NextResponse.json(
        {
          success: true,
          data: cart
            ? {
                ...cart,
                total,
              }
            : null,
          message: 'Cart item removed successfully',
        },
        { status: 200 }
      );
    } catch (error) {
      // Handle business logic errors
      if (error instanceof Error) {
        if (error.message === 'Cart item not found') {
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

        if (error.message === 'Cart item does not belong to this customer') {
          return NextResponse.json(
            {
              error: {
                code: 'BAD_REQUEST',
                message: error.message,
              },
            },
            { status: 400 }
          );
        }
      }

      console.error('Error removing cart item:', error);
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to remove cart item',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.CUSTOMER] }
);
