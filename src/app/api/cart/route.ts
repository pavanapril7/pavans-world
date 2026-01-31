import { NextRequest, NextResponse } from 'next/server';
import { CartService } from '@/services/cart.service';
import { withAuth, AuthUser } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';

/**
 * GET /api/cart
 * Get customer's active cart
 */
export const GET = withAuth(
  async (_request: NextRequest, context: { user: AuthUser }) => {
    try {
      const customerId = context.user.id;

      const cart = await CartService.getActiveCart(customerId);

      if (!cart) {
        return NextResponse.json(
          {
            success: true,
            data: null,
            message: 'No active cart found',
          },
          { status: 200 }
        );
      }

      // Calculate cart total
      const total = CartService.calculateCartTotal(cart);

      return NextResponse.json(
        {
          success: true,
          data: {
            ...cart,
            total,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error fetching cart:', error);
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch cart',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.CUSTOMER] }
);

/**
 * DELETE /api/cart
 * Clear customer's cart
 */
export const DELETE = withAuth(
  async (request: NextRequest, context: { user: AuthUser }) => {
    try {
      const customerId = context.user.id;
      const { searchParams } = new URL(request.url);
      const vendorId = searchParams.get('vendorId');

      if (!vendorId) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'vendorId is required',
            },
          },
          { status: 400 }
        );
      }

      await CartService.clearCart(customerId, vendorId);

      return NextResponse.json(
        {
          success: true,
          message: 'Cart cleared successfully',
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error clearing cart:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('not found')) {
        return NextResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: errorMessage,
            },
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to clear cart',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.CUSTOMER] }
);
