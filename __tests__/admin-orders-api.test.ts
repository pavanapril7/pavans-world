import { prisma } from '@/lib/prisma';
import { UserRole, OrderStatus, PaymentStatus } from '@prisma/client';
import { AuthService } from '@/services/auth.service';

describe('Admin Orders API', () => {
  let adminUser: { id: string; email: string; role: UserRole };
  let adminToken: string;
  let testCustomer: { id: string };
  let testVendor: { id: string };
  let testOrder: { id: string };

  beforeAll(async () => {
    // Create admin user
    adminUser = await prisma.user.create({
      data: {
        email: 'admin-orders-test@test.com',
        phone: '+919999999901',
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
        email: 'customer-orders-test@test.com',
        phone: '+919999999902',
        firstName: 'Test',
        lastName: 'Customer',
        role: UserRole.CUSTOMER,
        passwordHash: 'test',
      },
    });

    // Create test vendor user
    const vendorUser = await prisma.user.create({
      data: {
        email: 'vendor-orders-test@test.com',
        phone: '+919999999903',
        firstName: 'Test',
        lastName: 'Vendor',
        role: UserRole.VENDOR,
        passwordHash: 'test',
      },
    });

    // Create service area
    const serviceArea = await prisma.serviceArea.create({
      data: {
        name: 'Test Area',
        city: 'Test City',
        state: 'Test State',
        pincodes: ['123456'],
      },
    });

    // Create vendor category
    const category = await prisma.vendorCategory.create({
      data: {
        name: 'Test Category Orders',
        description: 'Test',
        icon: 'test',
      },
    });

    // Create vendor
    testVendor = await prisma.vendor.create({
      data: {
        userId: vendorUser.id,
        businessName: 'Test Vendor Orders',
        categoryId: category.id,
        description: 'Test',
        serviceAreaId: serviceArea.id,
        status: 'ACTIVE',
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
        orderNumber: 'TEST-ORDER-001',
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
    await prisma.vendor.deleteMany({
      where: { id: testVendor.id },
    });
    await prisma.vendorCategory.deleteMany({
      where: { name: 'Test Category Orders' },
    });
    await prisma.serviceArea.deleteMany({
      where: { name: 'Test Area' },
    });
    await prisma.session.deleteMany({
      where: { userId: adminUser.id },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'admin-orders-test@test.com',
            'customer-orders-test@test.com',
            'vendor-orders-test@test.com',
          ],
        },
      },
    });
  });

  describe('GET /api/admin/orders', () => {
    it('should return orders list for admin', async () => {
      const response = await fetch(
        `http://localhost:3000/api/admin/orders?page=1&pageSize=50`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.orders).toBeDefined();
      expect(Array.isArray(data.data.orders)).toBe(true);
      expect(data.data.pagination).toBeDefined();
      expect(data.data.pagination.currentPage).toBe(1);
    });

    it('should filter orders by status', async () => {
      const response = await fetch(
        `http://localhost:3000/api/admin/orders?status=PENDING`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // All returned orders should have PENDING status
      data.data.orders.forEach((order: { status: string }) => {
        expect(order.status).toBe('PENDING');
      });
    });

    it('should reject unauthorized access', async () => {
      const response = await fetch(`http://localhost:3000/api/admin/orders`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/orders/stats', () => {
    it('should return order statistics for admin', async () => {
      const response = await fetch(`http://localhost:3000/api/admin/orders/stats`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.stats).toBeDefined();
      expect(data.data.stats.totalOrders).toBeGreaterThanOrEqual(0);
      expect(data.data.stats.ordersByStatus).toBeDefined();
      expect(data.data.stats.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(data.data.stats.averageOrderValue).toBeGreaterThanOrEqual(0);
    });

    it('should reject unauthorized access', async () => {
      const response = await fetch(`http://localhost:3000/api/admin/orders/stats`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/orders/:id', () => {
    it('should return order details for admin', async () => {
      const response = await fetch(
        `http://localhost:3000/api/admin/orders/${testOrder.id}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.order).toBeDefined();
      expect(data.data.order.id).toBe(testOrder.id);
      expect(data.data.order.customer).toBeDefined();
      expect(data.data.order.vendor).toBeDefined();
      expect(data.data.order.deliveryAddress).toBeDefined();
      expect(data.data.order.statusHistory).toBeDefined();
      expect(data.data.order.payment).toBeDefined();
    });

    it('should return 404 for non-existent order', async () => {
      const response = await fetch(
        `http://localhost:3000/api/admin/orders/00000000-0000-0000-0000-000000000000`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      expect(response.status).toBe(404);
    });

    it('should reject unauthorized access', async () => {
      const response = await fetch(
        `http://localhost:3000/api/admin/orders/${testOrder.id}`
      );

      expect(response.status).toBe(401);
    });
  });
});
