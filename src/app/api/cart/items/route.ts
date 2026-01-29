import { NextRequest, NextResponse } from 'next/server';
import { CartService } from '@/services/cart.service';
import { addToCartSchema } from '@/schemas/cart.schema';
import { withAuth, AuthUser } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { ZodError } from 'zod';

/**
 * POST /api/cart/items
 * Add item to cart
 */
export const POST = withAuth(
  async (request: NextRequest, context: { user: AuthUser }) => {
    try {
      const customerId = context.user.id;
      const body = await request.json();

      // Validate request body
      const validatedData = addToCartSchema.parse(body);

      // Add to cart
      const cart = await CartService.addToCart({
        customerId,
        productId: validatedData.productId,
        quantity: validatedData.quantity,
      });

      // Calculate cart total
      const total = cart ? CartService.calculateCartTotal(cart) : 0;

      return NextResponse.json(
        {
          success: true,
          data: {
            ...cart,
            total,
          },
          message: 'Item added to cart successfully',
        },
        { status: 201 }
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
        if (
          error.message === 'Product not found' ||
          error.message === 'Product is not available' ||
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

      console.error('Error adding to cart:', error);
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to add item to cart',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.CUSTOMER] }
);
