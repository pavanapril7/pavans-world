import { prisma } from '@/lib/prisma';
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PaymentGatewayAdapter } from './payment-gateway.adapter';
import { notificationService } from './notification.service';

/**
 * Checkout Total Calculation Result
 */
export interface CheckoutTotal {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
}

/**
 * Payment Service
 * 
 * Handles payment operations including initiation, verification, and status tracking.
 */
export class PaymentService {
  private gatewayAdapter: PaymentGatewayAdapter;

  constructor(gatewayType: 'razorpay' | 'stripe' = 'razorpay') {
    this.gatewayAdapter = new PaymentGatewayAdapter(gatewayType);
  }

  /**
   * Calculate checkout total including tax and delivery fee
   * 
   * @param subtotal - Order subtotal
   * @param deliveryFee - Delivery fee
   * @param taxRate - Tax rate (default 5% GST)
   * @returns Checkout total breakdown
   */
  calculateCheckoutTotal(
    subtotal: number,
    deliveryFee: number,
    taxRate: number = 0.05
  ): CheckoutTotal {
    const tax = Number((subtotal * taxRate).toFixed(2));
    const total = Number((subtotal + tax + deliveryFee).toFixed(2));

    return {
      subtotal: Number(subtotal.toFixed(2)),
      tax,
      deliveryFee: Number(deliveryFee.toFixed(2)),
      total,
    };
  }

  /**
   * Initiate a payment for an order
   * 
   * @param orderId - Order ID
   * @param method - Payment method
   * @param amount - Payment amount
   * @returns Created payment record
   */
  async initiatePayment(
    orderId: string,
    method: PaymentMethod,
    amount: number
  ) {
    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Check if payment already exists for this order
    const existingPayment = await prisma.payment.findUnique({
      where: { orderId },
    });

    if (existingPayment) {
      throw new Error('Payment already exists for this order');
    }

    // For Cash on Delivery, create payment record without gateway interaction
    if (method === PaymentMethod.CASH_ON_DELIVERY) {
      return await prisma.payment.create({
        data: {
          orderId,
          amount,
          method,
          status: PaymentStatus.PENDING,
        },
      });
    }

    // Initiate payment with gateway
    const gatewayResponse = await this.gatewayAdapter.initiatePayment(
      amount,
      method,
      orderId
    );

    if (!gatewayResponse.success) {
      throw new Error(gatewayResponse.error || 'Payment initiation failed');
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        orderId,
        amount,
        method,
        status: PaymentStatus.PROCESSING,
        gatewayTransactionId: gatewayResponse.transactionId,
        gatewayResponse: (gatewayResponse.gatewayResponse || {}) as Prisma.InputJsonValue,
      },
    });

    return payment;
  }

  /**
   * Verify a payment transaction
   * 
   * @param paymentId - Payment ID
   * @param gatewayTransactionId - Gateway transaction ID
   * @param gatewayResponse - Gateway response data
   * @returns Updated payment record
   */
  async verifyPayment(
    paymentId: string,
    gatewayTransactionId: string,
    gatewayResponse?: Record<string, unknown>
  ) {
    // Get payment record
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new Error('Payment already completed');
    }

    // For Cash on Delivery, mark as completed without verification
    if (payment.method === PaymentMethod.CASH_ON_DELIVERY) {
      return await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
        },
      });
    }

    // Verify payment with gateway
    const verificationResult = await this.gatewayAdapter.verifyPayment(
      gatewayTransactionId,
      payment.orderId
    );

    if (!verificationResult.success) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.FAILED,
          gatewayResponse: (gatewayResponse || {}) as Prisma.InputJsonValue,
        },
      });

      throw new Error(verificationResult.error || 'Payment verification failed');
    }

    // Update payment status to completed
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        gatewayTransactionId,
        gatewayResponse: {
          ...(typeof payment.gatewayResponse === 'object' && payment.gatewayResponse !== null ? payment.gatewayResponse : {}),
          ...gatewayResponse,
          ...verificationResult.gatewayResponse,
        } as Prisma.InputJsonValue,
      },
    });

    // Send payment success notification
    try {
      await notificationService.notifyPaymentSuccess(payment.orderId);
    } catch (error) {
      console.error('[PaymentService] Failed to send payment success notification:', error);
      // Don't fail the payment verification if notification fails
    }

    return updatedPayment;
  }

  /**
   * Get payment by ID
   * 
   * @param paymentId - Payment ID
   * @returns Payment record
   */
  async getPaymentById(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            vendor: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
        },
        refund: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return payment;
  }

  /**
   * Get payment by order ID
   * 
   * @param orderId - Order ID
   * @returns Payment record or null
   */
  async getPaymentByOrderId(orderId: string) {
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: true,
        refund: true,
      },
    });

    return payment;
  }

  /**
   * Update payment status
   * 
   * @param paymentId - Payment ID
   * @param status - New payment status
   * @returns Updated payment record
   */
  async updatePaymentStatus(paymentId: string, status: PaymentStatus) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return await prisma.payment.update({
      where: { id: paymentId },
      data: { status },
    });
  }

  /**
   * Mark payment as failed
   * 
   * @param paymentId - Payment ID
   * @param error - Error message
   * @returns Updated payment record
   */
  async markPaymentFailed(paymentId: string, error?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        gatewayResponse: {
          ...(typeof payment.gatewayResponse === 'object' && payment.gatewayResponse !== null ? payment.gatewayResponse : {}),
          error,
        } as Prisma.InputJsonValue,
      },
    });

    // Send payment failed notification
    try {
      await notificationService.notifyPaymentFailed(payment.orderId);
    } catch (notifError) {
      console.error('[PaymentService] Failed to send payment failed notification:', notifError);
      // Don't fail the payment update if notification fails
    }

    return updatedPayment;
  }
}
