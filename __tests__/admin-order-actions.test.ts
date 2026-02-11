import { prisma } from '@/lib/prisma';
import { UserRole, OrderStatus, PaymentStatus } from '@prisma/client';
import { AdminOrderService } from '@/services/admin-order.service';

describe('Admin Order Actions Service', () => {
  let testCustomer: { id: string };
  let testVendor: { id: string };
  let testOrder: { id: string };
  let testDeliveryPartner: { id: string };

  beforeAll(async () => {
    // Create test customer
    testCustomer = await prisma.user.create({
      data: {
        email: 'customer-actions-test@test.com',
        phone: '+919999999904',
        firstName: 'Test',
        lastName: 'Customer',
        role: UserRole.CUSTOMER,
        passwordHash: 'test',
      },
    });

    // Create test vendor user
    const vendorUser = await prisma.user.create({
      data: {
        email: 'vendor-actions-test@test.com',
        phone: '+919999999905',
        firstName: 'Test',
        lastName: 'Vendor',
        role: UserRole.VENDOR,
        passwordHash: 'test',
      },
    });

    // Create service area
    const serviceArea = await prisma.serviceArea.create({
      data: {
        name: 'Test Area Actions',
        city: 'Test City',
        state: 'Test State',
        pincodes: ['123456'],
      },
    });

    // Create vendor category
    const category = await prisma.vendorCategory.create({
      data: {
        name: 'Test Category Actions',
        description: 'Test',
        icon: 'test',
      },
    });

    // Create vendor
    testVendor = await prisma.vendor.create({
      data: {
        userId: vendorUser.id,
        businessName: 'Test Vendor Actions',
        categoryId: category.id,
        description: 'Test',
        serviceAreaId: serviceArea.id,
        status: 'ACTIVE',
      },
    });

    // Create delivery partner user
    const deliveryUser = await prisma.user.create({
      data: {
        email: 'delivery-actions-test@test.com',
        phone: '+919999999906',
        firstName: 'Test',
        lastName: 'Delivery',
        role: UserRole.DELIVERY_PARTNER,
        passwordHash: 'test',
      },
    });

    // Create delivery partner
    testDeliveryPartner = await prisma.deliveryPartner.create({
      data: {
        userId: deliveryUser.id,
        serviceAreaId: serviceArea.id,
        vehicleType: 'BIKE',
        vehicleNumber: 'TEST123',
        status: 'AVAILABLE',
      },
    });

    // Create address
    const address = await prisma.address.create({
      data: {
        userId: testCustomer.id,
        label: 'Home',
        street: 'Test Street',
        landmark: 'Test Landmark',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
      },
    });

    // Create test order
    testOrder = await prisma.order.create({
      data: {
        orderNumber: 'TEST-ACTION-001',
        customerId: testCustomer.id,
        vendorId: testVendor.id,
        deliveryAddressId: address.id,
        status: OrderStatus.PENDING,
        subtotal: 100,
        deliveryFee: 20,
        tax: 10,
        total: 130,
      },
    });

    // Create payment
    await prisma.payment.create({
      data: {
        orderId: testOrder.id,
        amount: 130,
        method: 'UPI',
        status: PaymentStatus.COMPLETED,
      },
    });

    // Create status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: testOrder.id,
        status: OrderStatus.PENDING,
        notes: 'Order created',
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.refund.deleteMany({
      where: {
        payment: {
          orderId: testOrder.id,
        },
      },
    });
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: testOrder.id },
    });
    await prisma.payment.deleteMany({
      where: { orderId: testOrder.id },
    });
    await prisma.order.deleteMany({
      where: { id: testOrder.id },
    });
    await prisma.address.deleteMany({
      where: { userId: testCustomer.id },
    });
    await prisma.deliveryPartner.deleteMany({
      where: { id: testDeliveryPartner.id },
    });
    await prisma.vendor.deleteMany({
      where: { id: testVendor.id },
    });
    await prisma.vendorCategory.deleteMany({
      where: { name: 'Test Category Actions' },
    });
    await prisma.serviceArea.deleteMany({
      where: { name: 'Test Area Actions' },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'customer-actions-test@test.com',
            'vendor-actions-test@test.com',
            'delivery-actions-test@test.com',
          ],
        },
      },
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order and initiate refund for completed payment', async () => {
      const result = await AdminOrderService.cancelOrder(
        testOrder.id,
        'Test cancellation reason',
        false // Don't send notifications in test
      );

      expect(result.order.status).toBe(OrderStatus.CANCELLED);
      expect(result.refundInitiated).toBe(true);

      // Verify refund was created
      const refund = await prisma.refund.findFirst({
        where: {
          payment: {
            orderId: testOrder.id,
          },
        },
      });

      expect(refund).toBeDefined();
      expect(Number(refund?.amount)).toBe(130);
      expect(refund?.reason).toContain('Test cancellation reason');

      // Verify status history was created
      const statusHistory = await prisma.orderStatusHistory.findMany({
        where: {
          orderId: testOrder.id,
          status: OrderStatus.CANCELLED,
        },
      });

      expect(statusHistory.length).toBeGreaterThan(0);
      expect(statusHistory[0].notes).toContain('Test cancellation reason');
    });

    it('should throw error for already cancelled order', async () => {
      await expect(
        AdminOrderService.cancelOrder(testOrder.id, 'Another reason', false)
      ).rejects.toThrow('Order cannot be cancelled in current status');
    });

    it('should throw error for non-existent order', async () => {
      await expect(
        AdminOrderService.cancelOrder(
          '00000000-0000-0000-0000-000000000000',
          'Test reason',
          false
        )
      ).rejects.toThrow('Order not found');
    });
  });

  describe('addNote', () => {
    it('should add admin note to order', async () => {
      const note = await AdminOrderService.addNote(
        testOrder.id,
        'This is a test admin note'
      );

      expect(note).toBeDefined();
      expect(note.notes).toContain('[Admin Note]');
      expect(note.notes).toContain('This is a test admin note');
      expect(note.orderId).toBe(testOrder.id);
    });

    it('should throw error for non-existent order', async () => {
      await expect(
        AdminOrderService.addNote(
          '00000000-0000-0000-0000-000000000000',
          'Test note'
        )
      ).rejects.toThrow('Order not found');
    });
  });

  describe('reassignDeliveryPartner', () => {
    it('should reassign delivery partner to order', async () => {
      const updatedOrder = await AdminOrderService.reassignDeliveryPartner(
        testOrder.id,
        testDeliveryPartner.id
      );

      expect(updatedOrder.deliveryPartnerId).toBe(testDeliveryPartner.id);

      // Verify status history was created
      const statusHistory = await prisma.orderStatusHistory.findMany({
        where: {
          orderId: testOrder.id,
          notes: {
            contains: 'reassigned',
          },
        },
      });

      expect(statusHistory.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent order', async () => {
      await expect(
        AdminOrderService.reassignDeliveryPartner(
          '00000000-0000-0000-0000-000000000000',
          testDeliveryPartner.id
        )
      ).rejects.toThrow('Order not found');
    });

    it('should throw error for non-existent delivery partner', async () => {
      await expect(
        AdminOrderService.reassignDeliveryPartner(
          testOrder.id,
          '00000000-0000-0000-0000-000000000000'
        )
      ).rejects.toThrow('Delivery partner not found');
    });
  });
});
