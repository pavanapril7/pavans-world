import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import { sanitizeSearchQuery, sanitizeTextContent } from '@/lib/sanitization';

/**
 * Schema for admin order list filters
 */
export const adminOrderFiltersSchema = z
  .object({
    status: z.nativeEnum(OrderStatus).optional(),
    vendorId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    search: z
      .string()
      .optional()
      .transform((val) => sanitizeSearchQuery(val)), // Sanitize search query
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    pageSize: z
      .string()
      .optional()
      .transform((val) => {
        const size = val ? parseInt(val, 10) : 50;
        return Math.min(size, 100); // Max 100 items per page
      }),
  })
  .refine(
    (data) => {
      // Validate date range: dateFrom must be before or equal to dateTo
      if (data.dateFrom && data.dateTo) {
        return new Date(data.dateFrom) <= new Date(data.dateTo);
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
      path: ['dateFrom'],
    }
  );

/**
 * Schema for admin order statistics filters
 */
export const adminOrderStatsFiltersSchema = z
  .object({
    status: z.nativeEnum(OrderStatus).optional(),
    vendorId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      // Validate date range: dateFrom must be before or equal to dateTo
      if (data.dateFrom && data.dateTo) {
        return new Date(data.dateFrom) <= new Date(data.dateTo);
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
      path: ['dateFrom'],
    }
  );

/**
 * Schema for cancelling an order (admin)
 */
export const adminCancelOrderSchema = z.object({
  reason: z
    .string()
    .min(1, 'Cancellation reason is required')
    .max(500, 'Reason too long')
    .transform((val) => sanitizeTextContent(val, 500)),
  notifyCustomer: z.boolean().default(true),
});

/**
 * Schema for adding admin note to order
 */
export const adminAddNoteSchema = z.object({
  content: z
    .string()
    .min(1, 'Note content is required')
    .max(1000, 'Note too long')
    .transform((val) => sanitizeTextContent(val, 1000)),
});

/**
 * Schema for reassigning delivery partner
 */
export const adminReassignDeliverySchema = z.object({
  deliveryPartnerId: z.string().uuid('Invalid delivery partner ID'),
});

export type AdminOrderFiltersInput = z.infer<typeof adminOrderFiltersSchema>;
export type AdminOrderStatsFiltersInput = z.infer<typeof adminOrderStatsFiltersSchema>;
export type AdminCancelOrderInput = z.infer<typeof adminCancelOrderSchema>;
export type AdminAddNoteInput = z.infer<typeof adminAddNoteSchema>;
export type AdminReassignDeliveryInput = z.infer<typeof adminReassignDeliverySchema>;
