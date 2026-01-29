import { prisma } from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';
import { PaymentGatewayAdapter } from './payment-gateway.adapter';

/**
 * Refund Service
 * 
 * Handles refund processing for cancelled or rejected orders.
 */
export class RefundService {
  private gatewayAdapter: PaymentGatewayAdapter;

  constructor(gatewayType: 'razorpay' | 'stripe' = 'razorpay') {
    this.gatewayAdapter = new PaymentGatewayAdapter(gatewayType);
  }

  /**
   * Process a refund for a payment
   * 
   * @param paymentId - Payment ID
   * @param reason - Refund reason
   * @param amount - Refund amount (optional, defaults to full payment amount)
   * @returns Created refund record
   */
  async processRefund(
    paymentId: string,
    reason: string,
    amount?: number
  ) {
    // Get payment record
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: true,
        refund: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Check if payment is completed
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new Error('Cannot refund a payment that is not completed');
    }

    // Check if refund already exists
    if (payment.refund) {
      throw new Error('Refund already exists for this payment');
    }

    // Determine refund amount
    const refundAmount = amount || Number(payment.amount);

    // Validate refund amount
    if (refundAmount > Number(payment.amount)) {
      throw new Error('Refund amount cannot exceed payment amount');
    }

    if (refundAmount <= 0) {
      throw new Error('Refund amount must be positive');
    }

    // For Cash on Delivery, create refund record without gateway interaction
    if (payment.method === 'CASH_ON_DELIVERY') {
      const refund = await prisma.refund.create({
        data: {
          paymentId,
          amount: refundAmount,
          reason,
          status: PaymentStatus.COMPLETED,
        },
      });

      // Update payment status to refunded
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
        },
      });

      return refund;
    }

    // Process refund with gateway
    if (!payment.gatewayTransactionId) {
      throw new Error('Gateway transaction ID not found');
    }

    const gatewayResponse = await this.gatewayAdapter.processRefund(
      payment.gatewayTransactionId,
      refundAmount
    );

    if (!gatewayResponse.success) {
      throw new Error(gatewayResponse.error || 'Refund processing failed');
    }

    // Create refund record
    const refund = await prisma.refund.create({
      data: {
        paymentId,
        amount: refundAmount,
        reason,
        status: PaymentStatus.COMPLETED,
        gatewayRefundId: gatewayResponse.refundId,
      },
    });

    // Update payment status to refunded
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
      },
    });

    return refund;
  }

  /**
   * Get refund by ID
   * 
   * @param refundId - Refund ID
   * @returns Refund record
   */
  async getRefundById(refundId: string) {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        payment: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!refund) {
      throw new Error('Refund not found');
    }

    return refund;
  }

  /**
   * Get refund by payment ID
   * 
   * @param paymentId - Payment ID
   * @returns Refund record or null
   */
  async getRefundByPaymentId(paymentId: string) {
    const refund = await prisma.refund.findUnique({
      where: { paymentId },
      include: {
        payment: {
          include: {
            order: true,
          },
        },
      },
    });

    return refund;
  }

  /**
   * Update refund status
   * 
   * @param refundId - Refund ID
   * @param status - New refund status
   * @returns Updated refund record
   */
  async updateRefundStatus(refundId: string, status: PaymentStatus) {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new Error('Refund not found');
    }

    return await prisma.refund.update({
      where: { id: refundId },
      data: { status },
    });
  }
}
