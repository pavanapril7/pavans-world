import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const initiatePaymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  method: z.nativeEnum(PaymentMethod),
  amount: z.number().positive('Amount must be positive'),
});

export const verifyPaymentSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID'),
  gatewayTransactionId: z.string().min(1, 'Gateway transaction ID is required'),
  gatewayResponse: z.record(z.string(), z.unknown()).optional(),
});

export const refundPaymentSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID'),
  reason: z.string().min(1, 'Refund reason is required'),
  amount: z.number().positive('Amount must be positive').optional(),
});

export const checkoutTotalSchema = z.object({
  subtotal: z.number().nonnegative('Subtotal must be non-negative'),
  deliveryFee: z.number().nonnegative('Delivery fee must be non-negative'),
  taxRate: z.number().min(0).max(1, 'Tax rate must be between 0 and 1'),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type CheckoutTotalInput = z.infer<typeof checkoutTotalSchema>;
