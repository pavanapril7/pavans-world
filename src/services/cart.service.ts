import { prisma } from '@/lib/prisma';
import { ProductStatus } from '@prisma/client';

export interface AddToCartInput {
  customerId: string;
  productId: string;
  quantity: number;
}

export interface UpdateCartItemInput {
  quantity: number;
}

export class CartService {
  /**
   * Get customer's cart for a specific vendor
   * Returns null if cart doesn't exist
   */
  static async getCart(customerId: string, vendorId: string) {
    const cart = await prisma.cart.findUnique({
      where: {
        customerId_vendorId: {
          customerId,
          vendorId,
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor: {
                  select: {
                    id: true,
                    businessName: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
      },
    });

    return cart;
  }

  /**
   * Get customer's active cart (any vendor)
   * Returns the most recently updated cart
   */
  static async getActiveCart(customerId: string) {
    const carts = await prisma.cart.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor: {
                  select: {
                    id: true,
                    businessName: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 1,
    });

    return carts[0] || null;
  }

  /**
   * Calculate cart total
   */
  static calculateCartTotal(cart: {
    items: Array<{
      quantity: number;
      product: { price: number | { toNumber: () => number } };
    }>;
  }): number {
    return cart.items.reduce((total, item) => {
      const price =
        typeof item.product.price === 'number'
          ? item.product.price
          : Number(item.product.price);
      return total + price * item.quantity;
    }, 0);
  }

  /**
   * Validate cart items (check product availability and vendor consistency)
   */
  static async validateCart(cartId: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor: true,
              },
            },
          },
        },
        vendor: true,
      },
    });

    if (!cart) {
      return { valid: false, errors: ['Cart not found'] };
    }

    const errors: string[] = [];

    // Check vendor is active
    if (cart.vendor.status !== 'ACTIVE') {
      errors.push('Vendor is not currently active');
    }

    // Check each product
    for (const item of cart.items) {
      // Check product availability
      if (item.product.status !== ProductStatus.AVAILABLE) {
        errors.push(
          `Product "${item.product.name}" is not available`
        );
      }

      // Check vendor consistency
      if (item.product.vendorId !== cart.vendorId) {
        errors.push(
          `Product "${item.product.name}" does not belong to the cart vendor`
        );
      }

      // Check product's vendor is active
      if (item.product.vendor.status !== 'ACTIVE') {
        errors.push(
          `Vendor for product "${item.product.name}" is not active`
        );
      }

      // Check quantity is positive
      if (item.quantity <= 0) {
        errors.push(
          `Invalid quantity for product "${item.product.name}"`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Add item to cart
   * Creates cart if it doesn't exist
   * Updates quantity if item already exists
   */
  static async addToCart(data: AddToCartInput) {
    const { customerId, productId, quantity } = data;

    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    // Get product and verify it exists and is available
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        vendor: true,
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.status !== ProductStatus.AVAILABLE) {
      throw new Error('Product is not available');
    }

    if (product.vendor.status !== 'ACTIVE') {
      throw new Error('Vendor is not currently active');
    }

    const vendorId = product.vendorId;

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: {
        customerId_vendorId: {
          customerId,
          vendorId,
        },
      },
      include: {
        items: true,
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          customerId,
          vendorId,
        },
        include: {
          items: true,
        },
      });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (existingItem) {
      // Update quantity
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
        },
      });
    } else {
      // Create new cart item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }

    // Update cart timestamp
    await prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });

    // Return updated cart
    return this.getCart(customerId, vendorId);
  }

  /**
   * Update cart item quantity
   */
  static async updateCartItem(
    customerId: string,
    cartItemId: string,
    data: UpdateCartItemInput
  ) {
    const { quantity } = data;

    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    // Get cart item and verify it belongs to customer
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
        product: {
          include: {
            vendor: true,
          },
        },
      },
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    if (cartItem.cart.customerId !== customerId) {
      throw new Error('Cart item does not belong to this customer');
    }

    // Verify product is still available
    if (cartItem.product.status !== ProductStatus.AVAILABLE) {
      throw new Error('Product is no longer available');
    }

    if (cartItem.product.vendor.status !== 'ACTIVE') {
      throw new Error('Vendor is not currently active');
    }

    // Update quantity
    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });

    // Update cart timestamp
    await prisma.cart.update({
      where: { id: cartItem.cartId },
      data: { updatedAt: new Date() },
    });

    // Return updated cart
    return this.getCart(customerId, cartItem.cart.vendorId);
  }

  /**
   * Remove item from cart
   */
  static async removeCartItem(customerId: string, cartItemId: string) {
    // Get cart item and verify it belongs to customer
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
      },
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    if (cartItem.cart.customerId !== customerId) {
      throw new Error('Cart item does not belong to this customer');
    }

    const vendorId = cartItem.cart.vendorId;

    // Delete cart item
    await prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    // Update cart timestamp
    await prisma.cart.update({
      where: { id: cartItem.cartId },
      data: { updatedAt: new Date() },
    });

    // Check if cart is now empty
    const remainingItems = await prisma.cartItem.count({
      where: { cartId: cartItem.cartId },
    });

    // If cart is empty, optionally delete it
    if (remainingItems === 0) {
      await prisma.cart.delete({
        where: { id: cartItem.cartId },
      });
      return null;
    }

    // Return updated cart
    return this.getCart(customerId, vendorId);
  }

  /**
   * Clear entire cart
   */
  static async clearCart(customerId: string, vendorId: string) {
    const cart = await prisma.cart.findUnique({
      where: {
        customerId_vendorId: {
          customerId,
          vendorId,
        },
      },
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    // Delete all cart items
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    // Delete cart
    await prisma.cart.delete({
      where: { id: cart.id },
    });

    return { success: true };
  }
}
