import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

/**
 * Schema for creating an order
 */
export const createOrderSchema = z.object({
  deliveryAddressId: z.string().uuid('Invalid delivery address ID'),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Invalid product ID'),
        quantity: z.number().int().positive('Quantity must be positive'),
      })
    )
    .min(1, 'Order must contain at least one item'),
  subtotal: z.number().nonnegative('Subtotal must be non-negative'),
  deliveryFee: z.number().nonnegative('Delivery fee must be non-negative'),
  tax: z.number().nonnegative('Tax must be non-negative'),
  total: z.number().positive('Total must be positive'),
});

/**
 * Schema for updating order status
 */
export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  notes: z.string().optional(),
});

/**
 * Schema for rejecting an order
 */
export const rejectOrderSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(500, 'Reason too long'),
});

/**
 * Schema for cancelling an order
 */
export const cancelOrderSchema = z.object({
  reason: z.string().optional().default('Order cancelled by customer'),
});

/**
 * Schema for order filters
 */
export const orderFiltersSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  customerId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  deliveryPartnerId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type OrderFiltersInput = z.infer<typeof orderFiltersSchema>;
