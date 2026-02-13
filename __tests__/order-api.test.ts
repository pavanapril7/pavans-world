import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/orders/route';
import { OrderService } from '@/services/order.service';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole, FulfillmentMethod } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/services/order.service');
jest.mock('@/middleware/auth.middleware');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
    },
  },
}));

describe('Order API Routes', () => {
  const mockCustomerId = '550e8400-e29b-41d4-a716-446655440001';
  const mockVendorId = '550e8400-e29b-41d4-a716-446655440002';
  const mockMealSlotId = '550e8400-e29b-41d4-a716-446655440003';
  const mockProductId = '550e8400-e29b-41d4-a716-446655440004';
  const mockAddressId = '550e8400-e29b-41d4-a716-446655440005';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/orders', () => {
    it('should list orders for authenticated user', async () => {
      const mockUser = {
        id: mockCustomerId,
        role: UserRole.CUSTOMER,
        email: 'customer@example.com',
      };

      const mockOrders = {
        orders: [
          {
            id: 'order-1',
            customerId: mockCustomerId,
            vendorId: mockVendorId,
            status: 'PENDING',
            total: 100,
            mealSlotId: mockMealSlotId,
            fulfillmentMethod: FulfillmentMethod.DELIVERY,
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      (authenticate as jest.Mock).mockResolvedValue({
        authenticated: true,
        user: mockUser,
      });

      (OrderService.listOrders as jest.Mock).mockResolvedValue(mockOrders);

      const request = new NextRequest('http://localhost:3000/api/orders');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orders).toHaveLength(1);
      expect(data.orders[0].mealSlotId).toBe(mockMealSlotId);
      expect(data.orders[0].fulfillmentMethod).toBe(FulfillmentMethod.DELIVERY);
    });

    it('should filter orders by meal slot ID', async () => {
      const mockUser = {
        id: mockCustomerId,
        role: UserRole.CUSTOMER,
        email: 'customer@example.com',
      };

      const mockOrders = {
        orders: [
          {
            id: 'order-1',
            customerId: mockCustomerId,
            vendorId: mockVendorId,
            status: 'PENDING',
            total: 100,
            mealSlotId: mockMealSlotId,
            fulfillmentMethod: FulfillmentMethod.DELIVERY,
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      (authenticate as jest.Mock).mockResolvedValue({
        authenticated: true,
        user: mockUser,
      });

      (OrderService.listOrders as jest.Mock).mockResolvedValue(mockOrders);

      const request = new NextRequest(`http://localhost:3000/api/orders?mealSlotId=${mockMealSlotId}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(OrderService.listOrders).toHaveBeenCalledWith(
        mockCustomerId,
        UserRole.CUSTOMER,
        expect.objectContaining({ mealSlotId: mockMealSlotId }),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should filter orders by fulfillment method', async () => {
      const mockUser = {
        id: mockCustomerId,
        role: UserRole.CUSTOMER,
        email: 'customer@example.com',
      };

      const mockOrders = {
        orders: [
          {
            id: 'order-1',
            customerId: mockCustomerId,
            vendorId: mockVendorId,
            status: 'PENDING',
            total: 100,
            fulfillmentMethod: FulfillmentMethod.PICKUP,
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      (authenticate as jest.Mock).mockResolvedValue({
        authenticated: true,
        user: mockUser,
      });

      (OrderService.listOrders as jest.Mock).mockResolvedValue(mockOrders);

      const request = new NextRequest(`http://localhost:3000/api/orders?fulfillmentMethod=PICKUP`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(OrderService.listOrders).toHaveBeenCalledWith(
        mockCustomerId,
        UserRole.CUSTOMER,
        expect.objectContaining({ fulfillmentMethod: FulfillmentMethod.PICKUP }),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should return 401 if not authenticated', async () => {
      (authenticate as jest.Mock).mockResolvedValue({
        authenticated: false,
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/api/orders');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/orders', () => {
    it('should create order with meal slot and fulfillment method', async () => {
      const mockUser = {
        id: mockCustomerId,
        role: UserRole.CUSTOMER,
        email: 'customer@example.com',
      };

      const mockProduct = {
        vendorId: mockVendorId,
      };

      const mockOrder = {
        id: 'order-1',
        customerId: mockCustomerId,
        vendorId: mockVendorId,
        status: 'PENDING',
        total: 100,
        mealSlotId: mockMealSlotId,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
        preferredDeliveryStart: '12:00',
        preferredDeliveryEnd: '12:30',
        createdAt: new Date(),
      };

      (authenticate as jest.Mock).mockResolvedValue({
        authenticated: true,
        user: mockUser,
      });

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (OrderService.createOrder as jest.Mock).mockResolvedValue(mockOrder);

      const orderData = {
        items: [{ productId: mockProductId, quantity: 2, price: 50 }],
        deliveryAddressId: mockAddressId,
        subtotal: 100,
        deliveryFee: 10,
        tax: 5,
        total: 115,
        mealSlotId: mockMealSlotId,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
        preferredDeliveryStart: '12:00',
        preferredDeliveryEnd: '12:30',
      };

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.mealSlotId).toBe(mockMealSlotId);
      expect(data.fulfillmentMethod).toBe(FulfillmentMethod.DELIVERY);
      expect(data.preferredDeliveryStart).toBe('12:00');
      expect(data.preferredDeliveryEnd).toBe('12:30');
      expect(OrderService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          mealSlotId: mockMealSlotId,
          fulfillmentMethod: FulfillmentMethod.DELIVERY,
          preferredDeliveryStart: '12:00',
          preferredDeliveryEnd: '12:30',
        })
      );
    });

    it('should create order with PICKUP fulfillment method', async () => {
      const mockUser = {
        id: mockCustomerId,
        role: UserRole.CUSTOMER,
        email: 'customer@example.com',
      };

      const mockProduct = {
        vendorId: mockVendorId,
      };

      const mockOrder = {
        id: 'order-1',
        customerId: mockCustomerId,
        vendorId: mockVendorId,
        status: 'PENDING',
        total: 100,
        mealSlotId: mockMealSlotId,
        fulfillmentMethod: FulfillmentMethod.PICKUP,
        createdAt: new Date(),
      };

      (authenticate as jest.Mock).mockResolvedValue({
        authenticated: true,
        user: mockUser,
      });

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (OrderService.createOrder as jest.Mock).mockResolvedValue(mockOrder);

      const orderData = {
        items: [{ productId: mockProductId, quantity: 2, price: 50 }],
        subtotal: 100,
        deliveryFee: 0,
        tax: 5,
        total: 105,
        mealSlotId: mockMealSlotId,
        fulfillmentMethod: FulfillmentMethod.PICKUP,
      };

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.fulfillmentMethod).toBe(FulfillmentMethod.PICKUP);
    });

    it('should return 400 if meal slot is unavailable', async () => {
      const mockUser = {
        id: mockCustomerId,
        role: UserRole.CUSTOMER,
        email: 'customer@example.com',
      };

      const mockProduct = {
        vendorId: mockVendorId,
      };

      (authenticate as jest.Mock).mockResolvedValue({
        authenticated: true,
        user: mockUser,
      });

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (OrderService.createOrder as jest.Mock).mockRejectedValue(
        new Error('Meal slot is not available')
      );

      const orderData = {
        items: [{ productId: mockProductId, quantity: 2, price: 50 }],
        deliveryAddressId: mockAddressId,
        subtotal: 100,
        deliveryFee: 10,
        tax: 5,
        total: 115,
        mealSlotId: mockMealSlotId,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
      };

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('MEAL_SLOT_UNAVAILABLE');
    });

    it('should return 400 if delivery window is invalid', async () => {
      const mockUser = {
        id: mockCustomerId,
        role: UserRole.CUSTOMER,
        email: 'customer@example.com',
      };

      const mockProduct = {
        vendorId: mockVendorId,
      };

      (authenticate as jest.Mock).mockResolvedValue({
        authenticated: true,
        user: mockUser,
      });

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (OrderService.createOrder as jest.Mock).mockRejectedValue(
        new Error('Delivery window is not within meal slot')
      );

      const orderData = {
        items: [{ productId: mockProductId, quantity: 2, price: 50 }],
        deliveryAddressId: mockAddressId,
        subtotal: 100,
        deliveryFee: 10,
        tax: 5,
        total: 115,
        mealSlotId: mockMealSlotId,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
        preferredDeliveryStart: '10:00',
        preferredDeliveryEnd: '10:30',
      };

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_DELIVERY_WINDOW');
    });

    it('should return 400 if fulfillment method is not enabled', async () => {
      const mockUser = {
        id: mockCustomerId,
        role: UserRole.CUSTOMER,
        email: 'customer@example.com',
      };

      const mockProduct = {
        vendorId: mockVendorId,
      };

      (authenticate as jest.Mock).mockResolvedValue({
        authenticated: true,
        user: mockUser,
      });

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (OrderService.createOrder as jest.Mock).mockRejectedValue(
        new Error('PICKUP is not available for this vendor')
      );

      const orderData = {
        items: [{ productId: mockProductId, quantity: 2, price: 50 }],
        subtotal: 100,
        deliveryFee: 0,
        tax: 5,
        total: 105,
        fulfillmentMethod: FulfillmentMethod.PICKUP,
      };

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('FULFILLMENT_METHOD_NOT_ENABLED');
    });

    it('should return 401 if not authenticated', async () => {
      (authenticate as jest.Mock).mockResolvedValue({
        authenticated: false,
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 if user is not a customer', async () => {
      const mockUser = {
        id: 'vendor-123',
        role: UserRole.VENDOR,
        email: 'vendor@example.com',
      };

      (authenticate as jest.Mock).mockResolvedValue({
        authenticated: true,
        user: mockUser,
      });

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 if product not found', async () => {
      const mockUser = {
        id: mockCustomerId,
        role: UserRole.CUSTOMER,
        email: 'customer@example.com',
      };

      (authenticate as jest.Mock).mockResolvedValue({
        authenticated: true,
        user: mockUser,
      });

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      const orderData = {
        items: [{ productId: mockProductId, quantity: 2, price: 50 }],
        deliveryAddressId: mockAddressId,
        subtotal: 100,
        deliveryFee: 10,
        tax: 5,
        total: 115,
      };

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });
});
