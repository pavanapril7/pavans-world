import { PaymentService } from '@/services/payment.service';
import { RefundService } from '@/services/refund.service';
import { PaymentMethod, PaymentStatus, UserRole, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

describe('Payment Integration Tests', () => {
  let testCustomer: any;
  let testVendor: any;
  let testServiceArea: any;
  let testCategory: any;
  let testAddress: any;
  let testOrder: any;

  beforeAll(async () => {
    // Create test service area with unique name
    const timestamp = Date.now();
    testServiceArea = await prisma.serviceArea.create({
      data: {
        name: `Test Payment Area ${timestamp}`,
        city: 'Test City',
        state: 'Test State',
        pincodes: ['560001'],
        status: 'ACTIVE',
      },
    });

    // Create test category with unique name
    testCategory = await prisma.vendorCategory.create({
      data: {
        name: `Test Payment Category ${timestamp}`,
        description: 'Test category for payment tests',
        icon: 'test-icon',
      },
    });

    // Create test customer
    testCustomer = await prisma.user.create({
      data: {
        email: `payment-customer-${timestamp}@test.com`,
        phone: `+9198765432${String(timestamp).slice(-2)}`,
        firstName: 'Payment',
        lastName: 'Customer',
        role: UserRole.CUSTOMER,
        status: 'ACTIVE',
      },
    });

    // Create test vendor user
    const vendorUser = await prisma.user.create({
      data: {
        email: `payment-vendor-${timestamp}@test.com`,
        phone: `+9198765431${String(timestamp).slice(-2)}`,
        firstName: 'Payment',
        lastName: 'Vendor',
        role: UserRole.VENDOR,
        status: 'ACTIVE',
      },
    });

    // Create test vendor
    testVendor = await prisma.vendor.create({
      data: {
        userId: vendorUser.id,
        businessName: 'Test Payment Vendor',
        categoryId: testCategory.id,
        description: 'Test vendor for payment tests',
        serviceAreaId: testServiceArea.id,
        status: 'ACTIVE',
      },
    });

    // Create test address
    testAddress = await prisma.address.create({
      data: {
        userId: testCustomer.id,
        label: 'Home',
        street: '123 Test St',
        landmark: 'Near Test Park',
        city: 'Test City',
        state: 'Test State',
        pincode: '560001',
        isDefault: true,
      },
    });

    // Create test order
    testOrder = await prisma.order.create({
      data: {
        orderNumber: `TEST-PAY-${Date.now()}`,
        customerId: testCustomer.id,
        vendorId: testVendor.id,
        deliveryAddressId: testAddress.id,
        status: OrderStatus.PENDING,
        subtotal: 100,
        deliveryFee: 20,
        tax: 5,
        total: 125,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data in correct order
    await prisma.refund.deleteMany({
      where: {
        payment: {
          orderId: testOrder.id,
        },
      },
    });
    await prisma.payment.deleteMany({
      where: { orderId: testOrder.id },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: testOrder.id },
    });
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: testOrder.id },
    });
    await prisma.order.deleteMany({
      where: { id: testOrder.id },
    });
    await prisma.address.deleteMany({
      where: { userId: testCustomer.id },
    });
    await prisma.vendor.deleteMany({
      where: { id: testVendor.id },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: testCustomer.id },
          { role: UserRole.VENDOR, vendor: { id: testVendor.id } },
        ],
      },
    });
    await prisma.vendorCategory.deleteMany({
      where: { id: testCategory.id },
    });
    await prisma.serviceArea.deleteMany({
      where: { id: testServiceArea.id },
    });
  });

  describe('Payment Lifecycle', () => {
    it('should complete full payment lifecycle for UPI payment', async () => {
      const paymentService = new PaymentService();

      // Step 1: Initiate payment
      const payment = await paymentService.initiatePayment(
        testOrder.id,
        PaymentMethod.UPI,
        125
      );

      expect(payment).toBeDefined();
      expect(payment.orderId).toBe(testOrder.id);
      expect(payment.method).toBe(PaymentMethod.UPI);
      expect(Number(payment.amount)).toBe(125);
      expect(payment.status).toBe(PaymentStatus.PROCESSING);
      expect(payment.gatewayTransactionId).toBeDefined();

      // Step 2: Verify payment
      const verifiedPayment = await paymentService.verifyPayment(
        payment.id,
        payment.gatewayTransactionId!,
        { verified: true }
      );

      expect(verifiedPayment.status).toBe(PaymentStatus.COMPLETED);
      expect(verifiedPayment.id).toBe(payment.id);

      // Step 3: Get payment by order ID
      const retrievedPayment = await paymentService.getPaymentByOrderId(testOrder.id);
      expect(retrievedPayment).toBeDefined();
      expect(retrievedPayment?.id).toBe(payment.id);
      expect(retrievedPayment?.status).toBe(PaymentStatus.COMPLETED);
    });

    it('should handle Cash on Delivery payment', async () => {
      // Create a new order for COD test
      const codOrder = await prisma.order.create({
        data: {
          orderNumber: `TEST-COD-${Date.now()}`,
          customerId: testCustomer.id,
          vendorId: testVendor.id,
          deliveryAddressId: testAddress.id,
          status: OrderStatus.PENDING,
          subtotal: 200,
          deliveryFee: 30,
          tax: 10,
          total: 240,
        },
      });

      const paymentService = new PaymentService();

      // Initiate COD payment
      const payment = await paymentService.initiatePayment(
        codOrder.id,
        PaymentMethod.CASH_ON_DELIVERY,
        240
      );

      expect(payment.method).toBe(PaymentMethod.CASH_ON_DELIVERY);
      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.gatewayTransactionId).toBeNull();

      // Verify COD payment (simulating delivery completion)
      const verifiedPayment = await paymentService.verifyPayment(
        payment.id,
        'cod-completed',
        {}
      );

      expect(verifiedPayment.status).toBe(PaymentStatus.COMPLETED);

      // Clean up
      await prisma.payment.deleteMany({ where: { orderId: codOrder.id } });
      await prisma.order.deleteMany({ where: { id: codOrder.id } });
    });

    it('should process refund for completed payment', async () => {
      // Create a new order for refund test
      const refundOrder = await prisma.order.create({
        data: {
          orderNumber: `TEST-REFUND-${Date.now()}`,
          customerId: testCustomer.id,
          vendorId: testVendor.id,
          deliveryAddressId: testAddress.id,
          status: OrderStatus.PENDING,
          subtotal: 150,
          deliveryFee: 25,
          tax: 7.5,
          total: 182.5,
        },
      });

      const paymentService = new PaymentService();
      const refundService = new RefundService();

      // Create and complete payment
      const payment = await paymentService.initiatePayment(
        refundOrder.id,
        PaymentMethod.CARD,
        182.5
      );

      await paymentService.verifyPayment(
        payment.id,
        payment.gatewayTransactionId!,
        {}
      );

      // Process refund
      const refund = await refundService.processRefund(
        payment.id,
        'Order cancelled by customer',
        182.5
      );

      expect(refund).toBeDefined();
      expect(refund.paymentId).toBe(payment.id);
      expect(Number(refund.amount)).toBe(182.5);
      expect(refund.reason).toBe('Order cancelled by customer');
      expect(refund.status).toBe(PaymentStatus.COMPLETED);
      expect(refund.gatewayRefundId).toBeDefined();

      // Verify payment status is updated to REFUNDED
      const updatedPayment = await paymentService.getPaymentById(payment.id);
      expect(updatedPayment.status).toBe(PaymentStatus.REFUNDED);

      // Clean up
      await prisma.refund.deleteMany({ where: { paymentId: payment.id } });
      await prisma.payment.deleteMany({ where: { orderId: refundOrder.id } });
      await prisma.order.deleteMany({ where: { id: refundOrder.id } });
    });

    it('should reject duplicate payment for same order', async () => {
      // Create a new order
      const duplicateOrder = await prisma.order.create({
        data: {
          orderNumber: `TEST-DUP-${Date.now()}`,
          customerId: testCustomer.id,
          vendorId: testVendor.id,
          deliveryAddressId: testAddress.id,
          status: OrderStatus.PENDING,
          subtotal: 100,
          deliveryFee: 20,
          tax: 5,
          total: 125,
        },
      });

      const paymentService = new PaymentService();

      // Create first payment
      await paymentService.initiatePayment(
        duplicateOrder.id,
        PaymentMethod.UPI,
        125
      );

      // Try to create duplicate payment
      await expect(
        paymentService.initiatePayment(
          duplicateOrder.id,
          PaymentMethod.CARD,
          125
        )
      ).rejects.toThrow('Payment already exists for this order');

      // Clean up
      await prisma.payment.deleteMany({ where: { orderId: duplicateOrder.id } });
      await prisma.order.deleteMany({ where: { id: duplicateOrder.id } });
    });

    it('should reject refund for non-completed payment', async () => {
      // Create a new order
      const pendingOrder = await prisma.order.create({
        data: {
          orderNumber: `TEST-PENDING-${Date.now()}`,
          customerId: testCustomer.id,
          vendorId: testVendor.id,
          deliveryAddressId: testAddress.id,
          status: OrderStatus.PENDING,
          subtotal: 100,
          deliveryFee: 20,
          tax: 5,
          total: 125,
        },
      });

      const paymentService = new PaymentService();
      const refundService = new RefundService();

      // Create payment but don't complete it
      const payment = await paymentService.initiatePayment(
        pendingOrder.id,
        PaymentMethod.UPI,
        125
      );

      // Try to refund pending payment
      await expect(
        refundService.processRefund(
          payment.id,
          'Test refund',
          125
        )
      ).rejects.toThrow('Cannot refund a payment that is not completed');

      // Clean up
      await prisma.payment.deleteMany({ where: { orderId: pendingOrder.id } });
      await prisma.order.deleteMany({ where: { id: pendingOrder.id } });
    });
  });
});
