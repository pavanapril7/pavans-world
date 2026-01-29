/**
 * Notification Service Tests
 * Tests for notification creation, retrieval, and SMS integration
 */

import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/services/notification.service';
import { SMSService } from '@/services/sms.service';
import { NotificationType, OrderStatus, UserRole } from '@prisma/client';

describe('Notification Service', () => {
  let notificationService: NotificationService;
  let smsService: SMSService;
  let testUserId: string;
  let testVendorId: string;
  let testOrderId: string;

  beforeAll(async () => {
    notificationService = new NotificationService();
    smsService = new SMSService();

    // Clean up any existing test data first
    await prisma.notification.deleteMany({
      where: {
        user: {
          email: {
            in: ['notification-test@example.com', 'vendor-notification@example.com'],
          },
        },
      },
    });
    await prisma.order.deleteMany({
      where: { orderNumber: 'TEST-ORDER-001' },
    });
    await prisma.address.deleteMany({
      where: {
        user: {
          email: 'notification-test@example.com',
        },
      },
    });
    await prisma.vendor.deleteMany({
      where: {
        user: {
          email: 'vendor-notification@example.com',
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['notification-test@example.com', 'vendor-notification@example.com'],
        },
      },
    });
    await prisma.vendorCategory.deleteMany({
      where: { name: 'Test Category Notif' },
    });
    await prisma.serviceArea.deleteMany({
      where: { name: 'Test Area Notif' },
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'notification-test@example.com',
        phone: '+919876000299',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
        status: 'ACTIVE',
      },
    });
    testUserId = user.id;

    // Create test vendor
    const serviceArea = await prisma.serviceArea.create({
      data: {
        name: 'Test Area Notif',
        city: 'Bangalore',
        state: 'Karnataka',
        pincodes: ['560001'],
        status: 'ACTIVE',
      },
    });

    const category = await prisma.vendorCategory.create({
      data: {
        name: 'Test Category Notif',
        description: 'Test',
        icon: 'test',
      },
    });

    const vendorUser = await prisma.user.create({
      data: {
        email: 'vendor-notification@example.com',
        phone: '+919876000298',
        firstName: 'Vendor',
        lastName: 'User',
        role: UserRole.VENDOR,
        status: 'ACTIVE',
      },
    });

    const vendor = await prisma.vendor.create({
      data: {
        userId: vendorUser.id,
        businessName: 'Test Vendor',
        categoryId: category.id,
        description: 'Test',
        serviceAreaId: serviceArea.id,
        status: 'ACTIVE',
      },
    });
    testVendorId = vendor.id;

    // Create test address
    const address = await prisma.address.create({
      data: {
        userId: testUserId,
        label: 'Home',
        street: 'Test Street',
        landmark: 'Test Landmark',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        isDefault: true,
      },
    });

    // Create test order
    const order = await prisma.order.create({
      data: {
        orderNumber: 'TEST-ORDER-001',
        customerId: testUserId,
        vendorId: testVendorId,
        deliveryAddressId: address.id,
        status: OrderStatus.PENDING,
        subtotal: 100,
        deliveryFee: 20,
        tax: 5,
        total: 125,
      },
    });
    testOrderId = order.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.notification.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.order.deleteMany({
      where: { id: testOrderId },
    });
    await prisma.address.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.vendor.deleteMany({
      where: { id: testVendorId },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['notification-test@example.com', 'vendor-notification@example.com'],
        },
      },
    });
    await prisma.vendorCategory.deleteMany({
      where: { name: 'Test Category Notif' },
    });
    await prisma.serviceArea.deleteMany({
      where: { name: 'Test Area Notif' },
    });
    await prisma.$disconnect();
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const notification = await notificationService.createNotification({
        userId: testUserId,
        type: NotificationType.ORDER_PLACED,
        title: 'Test Notification',
        message: 'This is a test notification',
      });

      expect(notification).toBeDefined();
      expect(notification.userId).toBe(testUserId);
      expect(notification.type).toBe(NotificationType.ORDER_PLACED);
      expect(notification.title).toBe('Test Notification');
      expect(notification.message).toBe('This is a test notification');
      expect(notification.isRead).toBe(false);
    });
  });

  describe('getUserNotifications', () => {
    it('should retrieve user notifications', async () => {
      // Create a notification first
      await notificationService.createNotification({
        userId: testUserId,
        type: NotificationType.ORDER_PLACED,
        title: 'Test Notification 2',
        message: 'Another test notification',
      });

      const notifications = await notificationService.getUserNotifications(testUserId);

      expect(notifications).toBeDefined();
      expect(Array.isArray(notifications)).toBe(true);
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should filter unread notifications', async () => {
      const notifications = await notificationService.getUserNotifications(testUserId, {
        unreadOnly: true,
      });

      expect(notifications).toBeDefined();
      expect(notifications.every((n) => !n.isRead)).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      // Create a notification
      const notification = await notificationService.createNotification({
        userId: testUserId,
        type: NotificationType.ORDER_PLACED,
        title: 'Test Notification 3',
        message: 'Yet another test notification',
      });

      // Mark as read
      const success = await notificationService.markAsRead(notification.id, testUserId);
      expect(success).toBe(true);

      // Verify it's marked as read
      const updated = await prisma.notification.findUnique({
        where: { id: notification.id },
      });
      expect(updated?.isRead).toBe(true);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      const count = await notificationService.getUnreadCount(testUserId);
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('SMS Service', () => {
    it('should send OTP SMS', async () => {
      const result = await smsService.sendOTP('+919876543210', '123456');
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send order placed notification SMS', async () => {
      const result = await smsService.sendOrderPlacedNotification(
        '+919876543210',
        'ORD-001',
        'Test Vendor'
      );
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send order status notification SMS', async () => {
      const result = await smsService.sendOrderStatusNotification(
        '+919876543210',
        'ORD-001',
        'ACCEPTED'
      );
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });
});
