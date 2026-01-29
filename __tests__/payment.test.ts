import { PaymentService } from '@/services/payment.service';
import { RefundService } from '@/services/refund.service';
import { PaymentGatewayAdapter } from '@/services/payment-gateway.adapter';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

describe('Payment Module', () => {
  describe('PaymentService', () => {
    describe('calculateCheckoutTotal', () => {
      it('should calculate checkout total correctly with default tax rate', () => {
        const paymentService = new PaymentService();
        const result = paymentService.calculateCheckoutTotal(100, 20);

        expect(result.subtotal).toBe(100);
        expect(result.deliveryFee).toBe(20);
        expect(result.tax).toBe(5); // 5% of 100
        expect(result.total).toBe(125); // 100 + 5 + 20
      });

      it('should calculate checkout total correctly with custom tax rate', () => {
        const paymentService = new PaymentService();
        const result = paymentService.calculateCheckoutTotal(100, 20, 0.1);

        expect(result.subtotal).toBe(100);
        expect(result.deliveryFee).toBe(20);
        expect(result.tax).toBe(10); // 10% of 100
        expect(result.total).toBe(130); // 100 + 10 + 20
      });

      it('should handle decimal values correctly', () => {
        const paymentService = new PaymentService();
        const result = paymentService.calculateCheckoutTotal(99.99, 15.50, 0.05);

        expect(result.subtotal).toBe(99.99);
        expect(result.deliveryFee).toBe(15.5);
        expect(result.tax).toBe(5); // 5% of 99.99 = 4.9995, rounded to 5.00
        expect(result.total).toBe(120.49); // 99.99 + 5.00 + 15.50
      });

      it('should handle zero delivery fee', () => {
        const paymentService = new PaymentService();
        const result = paymentService.calculateCheckoutTotal(100, 0);

        expect(result.subtotal).toBe(100);
        expect(result.deliveryFee).toBe(0);
        expect(result.tax).toBe(5);
        expect(result.total).toBe(105);
      });
    });
  });

  describe('PaymentGatewayAdapter', () => {
    describe('Razorpay Integration', () => {
      it('should initiate Razorpay payment successfully', async () => {
        const adapter = new PaymentGatewayAdapter('razorpay');
        const result = await adapter.initiatePayment(
          1000,
          PaymentMethod.UPI,
          'test-order-id'
        );

        expect(result.success).toBe(true);
        expect(result.transactionId).toBeDefined();
        expect(result.transactionId).toMatch(/^rzp_/);
        expect(result.gatewayResponse).toBeDefined();
      });

      it('should verify Razorpay payment successfully', async () => {
        const adapter = new PaymentGatewayAdapter('razorpay');
        const result = await adapter.verifyPayment(
          'rzp_test_transaction_123',
          'test-order-id'
        );

        expect(result.success).toBe(true);
        expect(result.transactionId).toBe('rzp_test_transaction_123');
      });

      it('should reject invalid Razorpay transaction ID', async () => {
        const adapter = new PaymentGatewayAdapter('razorpay');
        const result = await adapter.verifyPayment(
          'invalid_transaction_id',
          'test-order-id'
        );

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should process Razorpay refund successfully', async () => {
        const adapter = new PaymentGatewayAdapter('razorpay');
        const result = await adapter.processRefund(
          'rzp_test_transaction_123',
          500
        );

        expect(result.success).toBe(true);
        expect(result.refundId).toBeDefined();
        expect(result.refundId).toMatch(/^rfnd_/);
      });
    });

    describe('Stripe Integration', () => {
      it('should initiate Stripe payment successfully', async () => {
        const adapter = new PaymentGatewayAdapter('stripe');
        const result = await adapter.initiatePayment(
          1000,
          PaymentMethod.CARD,
          'test-order-id'
        );

        expect(result.success).toBe(true);
        expect(result.transactionId).toBeDefined();
        expect(result.transactionId).toMatch(/^pi_/);
        expect(result.gatewayResponse).toBeDefined();
      });

      it('should verify Stripe payment successfully', async () => {
        const adapter = new PaymentGatewayAdapter('stripe');
        const result = await adapter.verifyPayment(
          'pi_test_transaction_123',
          'test-order-id'
        );

        expect(result.success).toBe(true);
        expect(result.transactionId).toBe('pi_test_transaction_123');
      });

      it('should process Stripe refund successfully', async () => {
        const adapter = new PaymentGatewayAdapter('stripe');
        const result = await adapter.processRefund(
          'pi_test_transaction_123',
          500
        );

        expect(result.success).toBe(true);
        expect(result.refundId).toBeDefined();
        expect(result.refundId).toMatch(/^re_/);
      });
    });
  });
});
