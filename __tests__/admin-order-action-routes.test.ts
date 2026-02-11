import { NextRequest } from 'next/server';
import { POST as cancelOrderPOST } from '@/app/api/admin/orders/[id]/cancel/route';
import { POST as addNotePOST } from '@/app/api/admin/orders/[id]/notes/route';
import { PUT as reassignDeliveryPUT } from '@/app/api/admin/orders/[id]/reassign-delivery/route';
import { prisma } from '@/lib/prisma';
import { UserRole, OrderStatus, PaymentStatus } from '@prisma/client';
import { AuthService } from '@/services/auth.service';

describe('Admin Order Action Routes', () => {
  let adminUser: { id: string; email: string; role: UserRole };
  let adminToken: string;
  let testCustomer: { id: string };
  let testVendor: { id: string };
  let testOrder: { id: string };
  let testDeliveryPartner: { id: string };

  beforeAll(async () => {
    // Create admin user
    adminUser = await prisma.user.create({
      data: {
        email: 'admin-routes-test@test.com',
        phone: '+919999999907',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.SUPER_ADMIN,
        passwordHash: 'test',
      },
    });

    // Create session for admin
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    adminToken = AuthService.generateToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });

    await prisma.session.create({
      data: {
        userId: adminUser.id,
        token: adminToken,
        expiresAt,
      },
    });

    // Create test customer
    testCustomer = await prisma.user.create({
      data: {
        email: 'customer-routes-test@test.com',
        phone: '+919999999908',
        firstName: 'Test',
        lastName: 'Customer',
        role: UserRole.CUSTOMER,
        passwordHash: 'test',
      },
    });

    // Create test vendor user
    const vendorUser = await prisma.user.create({
      data: {
        email: 'vendor-routes-test@test.com',
        phone: '+919999999909',
        firstName: 'Test',
        lastName: 'Vendor',
        role: UserRole.VENDOR,
        passwordHash: 'test',
      },
    });

    // Create service area
    const serviceArea = await prisma.serviceArea.create({
      data: {
        name: 'Test Area Routes',
        city: 'Test City',
        state: 'Test State',
        pincodes: ['123456'],
      },
    });

    // Create vendor category
    const category = await prisma.vendorCategory.create({
      data: {
        name: 'Test Category Routes',
        description: 'Test',
        icon: 'test',
      },
    });

    // Create vendor
    testVendor = await prisma.vendor.create({
      data: {
        userId: vendorUser.id,
        businessName: 'Test Vendor Routes',
        categoryId: category.id,
        description: 'Test',
        serviceAreaId: serviceArea.id,
        status: 'ACTIVE',
      },
    });

    // Create delivery partner user
    const deliveryUser = await prisma.user.create({
      data: {
        email: 'delivery-routes-test@test.com',
        phone: '+919999999910',
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
        vehicleNumber: 'TEST456',
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
        orderNumber: 'TEST-ROUTE-001',
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
      where: { name: 'Test Category Routes' },
    });
    await prisma.serviceArea.deleteMany({
      where: { name: 'Test Area Routes' },
    });
    await prisma.session.deleteMany({
      where: { userId: adminUser.id },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'admin-routes-test@test.com',
            'customer-routes-test@test.com',
            'vendor-routes-test@test.com',
            'delivery-routes-test@test.com',
          ],
        },
      },
    });
  });

  describe('POST /api/admin/orders/:id/cancel', () => {
    it('should cancel order with valid admin token', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/orders/test/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          reason: 'Test cancellation',
          notifyCustomer: false,
        }),
      });

      const response = await cancelOrderPOST(request, {
        params: Promise.resolve({ id: testOrder.id }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.order.status).toBe(OrderStatus.CANCELLED);
      expect(data.data.refundInitiated).toBe(true);
    });

    it('should reject unauthorized request', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/orders/test/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Test cancellation',
          notifyCustomer: false,
        }),
      });

      const response = await cancelOrderPOST(request, {
        params: Promise.resolve({ id: testOrder.id }),
      });

      expect(response.status).toBe(401);
    });

    it('should validate request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/orders/test/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          // Missing reason field
          notifyCustomer: false,
        }),
      });

      const response = await cancelOrderPOST(request, {
        params: Promise.resolve({ id: testOrder.id }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/admin/orders/:id/notes', () => {
    it('should add note with valid admin token', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/orders/test/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          content: 'This is a test admin note',
        }),
      });

      const response = await addNotePOST(request, {
        params: Promise.resolve({ id: testOrder.id }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.note).toBeDefined();
      expect(data.data.note.notes).toContain('[Admin Note]');
      expect(data.data.note.notes).toContain('This is a test admin note');
    });

    it('should reject unauthorized request', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/orders/test/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Test note',
        }),
      });

      const response = await addNotePOST(request, {
        params: Promise.resolve({ id: testOrder.id }),
      });

      expect(response.status).toBe(401);
    });

    it('should validate request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/orders/test/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          // Missing content field
        }),
      });

      const response = await addNotePOST(request, {
        params: Promise.resolve({ id: testOrder.id }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/admin/orders/:id/reassign-delivery', () => {
    it('should reassign delivery partner with valid admin token', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/orders/test/reassign-delivery', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          deliveryPartnerId: testDeliveryPartner.id,
        }),
      });

      const response = await reassignDeliveryPUT(request, {
        params: Promise.resolve({ id: testOrder.id }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.order.deliveryPartnerId).toBe(testDeliveryPartner.id);
    });

    it('should reject unauthorized request', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/orders/test/reassign-delivery', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deliveryPartnerId: testDeliveryPartner.id,
        }),
      });

      const response = await reassignDeliveryPUT(request, {
        params: Promise.resolve({ id: testOrder.id }),
      });

      expect(response.status).toBe(401);
    });

    it('should validate request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/orders/test/reassign-delivery', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          deliveryPartnerId: 'invalid-uuid',
        }),
      });

      const response = await reassignDeliveryPUT(request, {
        params: Promise.resolve({ id: testOrder.id }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent delivery partner', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/orders/test/reassign-delivery', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          deliveryPartnerId: '00000000-0000-0000-0000-000000000000',
        }),
      });

      const response = await reassignDeliveryPUT(request, {
        params: Promise.resolve({ id: testOrder.id }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });
});
