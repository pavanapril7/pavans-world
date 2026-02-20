import { OrderService } from '@/services/order.service';
import { MealSlotService } from '@/services/meal-slot.service';
import { FulfillmentService } from '@/services/fulfillment.service';
import { prisma } from '@/lib/prisma';
import { FulfillmentMethod, OrderStatus } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    vendor: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    address: {
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    cart: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/services/meal-slot.service');
jest.mock('@/services/fulfillment.service');
jest.mock('@/services/notification.service', () => ({
  notificationService: {
    notifyOrderPlaced: jest.fn(),
  },
}));

describe('OrderService - Meal Slots and Fulfillment', () => {
  const mockCustomerId = 'customer-123';
  const mockVendorId = 'vendor-123';
  const mockAddressId = 'address-123';
  const mockProductId = 'product-123';
  const mockMealSlotId = 'meal-slot-123';

  const baseOrderData = {
    customerId: mockCustomerId,
    vendorId: mockVendorId,
    deliveryAddressId: mockAddressId,
    items: [{ productId: mockProductId, quantity: 2 }],
    subtotal: 20.0,
    deliveryFee: 2.0,
    tax: 2.0,
    total: 24.0,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks for successful order creation
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: mockCustomerId,
      role: 'CUSTOMER',
    });

    (prisma.vendor.findUnique as jest.Mock).mockResolvedValue({
      id: mockVendorId,
      status: 'ACTIVE',
    });

    (prisma.address.findUnique as jest.Mock).mockResolvedValue({
      id: mockAddressId,
      userId: mockCustomerId,
    });

    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      {
        id: mockProductId,
        vendorId: mockVendorId,
        name: 'Test Product',
        price: 10.0,
        status: 'AVAILABLE',
      },
    ]);

    (FulfillmentService.validateFulfillmentMethod as jest.Mock).mockResolvedValue(true);
    (FulfillmentService.requiresDeliveryAddress as jest.Mock).mockReturnValue(true);
  });

  describe('createOrder with meal slots', () => {
    it('should create order with valid meal slot', async () => {
      const orderData = {
        ...baseOrderData,
        mealSlotId: mockMealSlotId,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
      };

      const mockMealSlot = {
        id: mockMealSlotId,
        startTime: '12:00',
        endTime: '14:00',
        isActive: true,
      };

      (MealSlotService.validateMealSlotAvailability as jest.Mock).mockResolvedValue(true);
      (MealSlotService.getMealSlotById as jest.Mock).mockResolvedValue(mockMealSlot);

      const mockCreatedOrder = {
        id: 'order-123',
        orderNumber: 'ORD-001',
        ...orderData,
        status: OrderStatus.PENDING,
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          order: {
            create: jest.fn().mockResolvedValue(mockCreatedOrder),
          },
          orderItem: {
            createMany: jest.fn(),
          },
          orderStatusHistory: {
            create: jest.fn(),
          },
          vendor: {
            update: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          cartItem: {
            deleteMany: jest.fn(),
          },
        });
      });

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockCreatedOrder);

      const result = await OrderService.createOrder(orderData);

      expect(MealSlotService.validateMealSlotAvailability).toHaveBeenCalledWith(
        mockMealSlotId
      );
      expect(result.mealSlotId).toBe(mockMealSlotId);
    });

    it('should throw error when meal slot is not available', async () => {
      const orderData = {
        ...baseOrderData,
        mealSlotId: mockMealSlotId,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
      };

      (MealSlotService.validateMealSlotAvailability as jest.Mock).mockResolvedValue(false);

      await expect(OrderService.createOrder(orderData)).rejects.toThrow(
        'Meal slot is not available for ordering'
      );
    });

    it('should validate delivery window when provided with meal slot', async () => {
      const orderData = {
        ...baseOrderData,
        mealSlotId: mockMealSlotId,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
        preferredDeliveryStart: '12:30',
        preferredDeliveryEnd: '13:30',
      };

      const mockMealSlot = {
        id: mockMealSlotId,
        startTime: '12:00',
        endTime: '14:00',
        isActive: true,
      };

      (MealSlotService.validateMealSlotAvailability as jest.Mock).mockResolvedValue(true);
      (MealSlotService.getMealSlotById as jest.Mock).mockResolvedValue(mockMealSlot);
      (MealSlotService.validateDeliveryWindow as jest.Mock).mockReturnValue(true);

      const mockCreatedOrder = {
        id: 'order-123',
        orderNumber: 'ORD-001',
        ...orderData,
        status: OrderStatus.PENDING,
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          order: {
            create: jest.fn().mockResolvedValue(mockCreatedOrder),
          },
          orderItem: {
            createMany: jest.fn(),
          },
          orderStatusHistory: {
            create: jest.fn(),
          },
          vendor: {
            update: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });
      });

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockCreatedOrder);

      await OrderService.createOrder(orderData);

      expect(MealSlotService.validateDeliveryWindow).toHaveBeenCalledWith(
        mockMealSlot,
        '12:30',
        '13:30'
      );
    });

    it('should throw error when delivery window is invalid', async () => {
      const orderData = {
        ...baseOrderData,
        mealSlotId: mockMealSlotId,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
        preferredDeliveryStart: '11:00',
        preferredDeliveryEnd: '11:30',
      };

      const mockMealSlot = {
        id: mockMealSlotId,
        startTime: '12:00',
        endTime: '14:00',
        isActive: true,
      };

      (MealSlotService.validateMealSlotAvailability as jest.Mock).mockResolvedValue(true);
      (MealSlotService.getMealSlotById as jest.Mock).mockResolvedValue(mockMealSlot);
      (MealSlotService.validateDeliveryWindow as jest.Mock).mockReturnValue(false);

      await expect(OrderService.createOrder(orderData)).rejects.toThrow(
        'Delivery window is not within meal slot time range'
      );
    });
  });

  describe('createOrder with fulfillment methods', () => {
    it('should create order with DELIVERY fulfillment method', async () => {
      const orderData = {
        ...baseOrderData,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
      };

      (FulfillmentService.validateFulfillmentMethod as jest.Mock).mockResolvedValue(true);
      (FulfillmentService.requiresDeliveryAddress as jest.Mock).mockReturnValue(true);

      const mockCreatedOrder = {
        id: 'order-123',
        orderNumber: 'ORD-001',
        ...orderData,
        status: OrderStatus.PENDING,
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          order: {
            create: jest.fn().mockResolvedValue(mockCreatedOrder),
          },
          orderItem: {
            createMany: jest.fn(),
          },
          orderStatusHistory: {
            create: jest.fn(),
          },
          vendor: {
            update: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });
      });

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockCreatedOrder);

      const result = await OrderService.createOrder(orderData);

      expect(FulfillmentService.validateFulfillmentMethod).toHaveBeenCalledWith(
        mockVendorId,
        FulfillmentMethod.DELIVERY
      );
      expect(result.fulfillmentMethod).toBe(FulfillmentMethod.DELIVERY);
    });

    it('should create order with PICKUP fulfillment method', async () => {
      const orderData = {
        ...baseOrderData,
        fulfillmentMethod: FulfillmentMethod.PICKUP,
      };

      (FulfillmentService.validateFulfillmentMethod as jest.Mock).mockResolvedValue(true);
      (FulfillmentService.requiresDeliveryAddress as jest.Mock).mockReturnValue(false);

      const mockCreatedOrder = {
        id: 'order-123',
        orderNumber: 'ORD-001',
        ...orderData,
        status: OrderStatus.PENDING,
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          order: {
            create: jest.fn().mockResolvedValue(mockCreatedOrder),
          },
          orderItem: {
            createMany: jest.fn(),
          },
          orderStatusHistory: {
            create: jest.fn(),
          },
          vendor: {
            update: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });
      });

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockCreatedOrder);

      const result = await OrderService.createOrder(orderData);

      expect(result.fulfillmentMethod).toBe(FulfillmentMethod.PICKUP);
    });

    it('should throw error when fulfillment method is not enabled', async () => {
      const orderData = {
        ...baseOrderData,
        fulfillmentMethod: FulfillmentMethod.EAT_IN,
      };

      (FulfillmentService.validateFulfillmentMethod as jest.Mock).mockResolvedValue(false);

      await expect(OrderService.createOrder(orderData)).rejects.toThrow(
        'EAT_IN is not available for this vendor'
      );
    });

    it('should require delivery address for DELIVERY method', async () => {
      const orderData = {
        ...baseOrderData,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
      };

      (FulfillmentService.validateFulfillmentMethod as jest.Mock).mockResolvedValue(true);
      (FulfillmentService.requiresDeliveryAddress as jest.Mock).mockReturnValue(true);
      (prisma.address.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(OrderService.createOrder(orderData)).rejects.toThrow(
        'Delivery address not found'
      );
    });

    it('should not require delivery address for PICKUP method', async () => {
      const orderData = {
        ...baseOrderData,
        fulfillmentMethod: FulfillmentMethod.PICKUP,
      };

      (FulfillmentService.validateFulfillmentMethod as jest.Mock).mockResolvedValue(true);
      (FulfillmentService.requiresDeliveryAddress as jest.Mock).mockReturnValue(false);

      const mockCreatedOrder = {
        id: 'order-123',
        orderNumber: 'ORD-001',
        ...orderData,
        status: OrderStatus.PENDING,
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          order: {
            create: jest.fn().mockResolvedValue(mockCreatedOrder),
          },
          orderItem: {
            createMany: jest.fn(),
          },
          orderStatusHistory: {
            create: jest.fn(),
          },
          vendor: {
            update: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });
      });

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockCreatedOrder);

      // Should not throw error even though address validation is skipped
      await expect(OrderService.createOrder(orderData)).resolves.toBeDefined();
    });

    it('should validate address belongs to customer for DELIVERY', async () => {
      const orderData = {
        ...baseOrderData,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
      };

      (FulfillmentService.validateFulfillmentMethod as jest.Mock).mockResolvedValue(true);
      (FulfillmentService.requiresDeliveryAddress as jest.Mock).mockReturnValue(true);
      (prisma.address.findUnique as jest.Mock).mockResolvedValue({
        id: mockAddressId,
        userId: 'different-customer-id',
      });

      await expect(OrderService.createOrder(orderData)).rejects.toThrow(
        'Delivery address does not belong to this customer'
      );
    });
  });

  describe('createOrder with combined meal slot and fulfillment', () => {
    it('should create order with both meal slot and fulfillment method', async () => {
      const orderData = {
        ...baseOrderData,
        mealSlotId: mockMealSlotId,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
        preferredDeliveryStart: '12:30',
        preferredDeliveryEnd: '13:30',
      };

      const mockMealSlot = {
        id: mockMealSlotId,
        startTime: '12:00',
        endTime: '14:00',
        isActive: true,
      };

      (MealSlotService.validateMealSlotAvailability as jest.Mock).mockResolvedValue(true);
      (MealSlotService.getMealSlotById as jest.Mock).mockResolvedValue(mockMealSlot);
      (MealSlotService.validateDeliveryWindow as jest.Mock).mockReturnValue(true);
      (FulfillmentService.validateFulfillmentMethod as jest.Mock).mockResolvedValue(true);
      (FulfillmentService.requiresDeliveryAddress as jest.Mock).mockReturnValue(true);

      const mockCreatedOrder = {
        id: 'order-123',
        orderNumber: 'ORD-001',
        ...orderData,
        status: OrderStatus.PENDING,
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          order: {
            create: jest.fn().mockResolvedValue(mockCreatedOrder),
          },
          orderItem: {
            createMany: jest.fn(),
          },
          orderStatusHistory: {
            create: jest.fn(),
          },
          vendor: {
            update: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });
      });

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockCreatedOrder);

      const result = await OrderService.createOrder(orderData);

      expect(result.mealSlotId).toBe(mockMealSlotId);
      expect(result.fulfillmentMethod).toBe(FulfillmentMethod.DELIVERY);
      expect(result.preferredDeliveryStart).toBe('12:30');
      expect(result.preferredDeliveryEnd).toBe('13:30');
    });
  });
});

// Mock polygon validation services
jest.mock('@/services/vendor-discovery.service');
jest.mock('@/services/geolocation.service');

import { VendorDiscoveryService } from '@/services/vendor-discovery.service';
import { GeoLocationService } from '@/services/geolocation.service';

describe('OrderService - Polygon Validation', () => {
  const mockCustomerId = 'customer-123';
  const mockVendorId = 'vendor-123';
  const mockAddressId = 'address-123';
  const mockProductId = 'product-123';

  const baseOrderData = {
    customerId: mockCustomerId,
    vendorId: mockVendorId,
    deliveryAddressId: mockAddressId,
    items: [{ productId: mockProductId, quantity: 2 }],
    subtotal: 20.0,
    deliveryFee: 2.0,
    tax: 2.0,
    total: 24.0,
    fulfillmentMethod: FulfillmentMethod.DELIVERY,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks for successful order creation
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: mockCustomerId,
      role: 'CUSTOMER',
    });

    (prisma.vendor.findUnique as jest.Mock).mockResolvedValue({
      id: mockVendorId,
      status: 'ACTIVE',
    });

    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      {
        id: mockProductId,
        vendorId: mockVendorId,
        name: 'Test Product',
        price: 10.0,
        status: 'AVAILABLE',
      },
    ]);

    (FulfillmentService.validateFulfillmentMethod as jest.Mock).mockResolvedValue(true);
    (FulfillmentService.requiresDeliveryAddress as jest.Mock).mockReturnValue(true);
  });

  describe('Polygon-based validation', () => {
    it('should throw "Delivery address is outside serviceable area" when address is not in service area', async () => {
      const mockAddress = {
        id: mockAddressId,
        userId: mockCustomerId,
        latitude: 12.9716,
        longitude: 77.5946,
      };

      (prisma.address.findUnique as jest.Mock).mockResolvedValue(mockAddress);
      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue({
        isServiceable: false,
        serviceArea: null,
        nearestServiceArea: null,
        distanceToNearest: null,
      });

      await expect(OrderService.createOrder(baseOrderData)).rejects.toThrow(
        'Delivery address is outside serviceable area'
      );

      expect(GeoLocationService.validatePointInServiceArea).toHaveBeenCalledWith(
        12.9716,
        77.5946
      );
    });

    it('should throw "Vendor does not serve this location" when vendor service area mismatch', async () => {
      const mockAddress = {
        id: mockAddressId,
        userId: mockCustomerId,
        latitude: 12.9716,
        longitude: 77.5946,
      };

      (prisma.address.findUnique as jest.Mock).mockResolvedValue(mockAddress);
      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue({
        isServiceable: true,
        serviceArea: { id: 'area-1', name: 'Test Area' },
        nearestServiceArea: null,
        distanceToNearest: null,
      });
      (VendorDiscoveryService.canVendorServeAddress as jest.Mock).mockResolvedValue({
        canServe: false,
        reason: 'Vendor does not serve this service area',
      });

      await expect(OrderService.createOrder(baseOrderData)).rejects.toThrow(
        'Vendor does not serve this location'
      );

      expect(VendorDiscoveryService.canVendorServeAddress).toHaveBeenCalledWith(
        mockVendorId,
        mockAddressId
      );
    });

    it('should throw "Address is beyond vendor\'s delivery range" when address exceeds service radius', async () => {
      const mockAddress = {
        id: mockAddressId,
        userId: mockCustomerId,
        latitude: 12.9716,
        longitude: 77.5946,
      };

      (prisma.address.findUnique as jest.Mock).mockResolvedValue(mockAddress);
      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue({
        isServiceable: true,
        serviceArea: { id: 'area-1', name: 'Test Area' },
        nearestServiceArea: null,
        distanceToNearest: null,
      });
      (VendorDiscoveryService.canVendorServeAddress as jest.Mock).mockResolvedValue({
        canServe: false,
        reason: 'Address is beyond vendor\'s delivery range (10.5 km > 5 km)',
      });

      await expect(OrderService.createOrder(baseOrderData)).rejects.toThrow(
        "Address is beyond vendor's delivery range"
      );
    });

    it('should successfully create order when all polygon validations pass', async () => {
      const mockAddress = {
        id: mockAddressId,
        userId: mockCustomerId,
        latitude: 12.9716,
        longitude: 77.5946,
      };

      const mockCreatedOrder = {
        id: 'order-123',
        orderNumber: 'ORD-001',
        ...baseOrderData,
        status: OrderStatus.PENDING,
      };

      (prisma.address.findUnique as jest.Mock).mockResolvedValue(mockAddress);
      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue({
        isServiceable: true,
        serviceArea: { id: 'area-1', name: 'Test Area' },
        nearestServiceArea: null,
        distanceToNearest: null,
      });
      (VendorDiscoveryService.canVendorServeAddress as jest.Mock).mockResolvedValue({
        canServe: true,
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          order: {
            create: jest.fn().mockResolvedValue(mockCreatedOrder),
          },
          orderItem: {
            createMany: jest.fn(),
          },
          orderStatusHistory: {
            create: jest.fn(),
          },
          vendor: {
            update: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });
      });

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockCreatedOrder);

      const result = await OrderService.createOrder(baseOrderData);

      expect(result).toBeDefined();
      expect(result.id).toBe('order-123');
      expect(GeoLocationService.validatePointInServiceArea).toHaveBeenCalled();
      expect(VendorDiscoveryService.canVendorServeAddress).toHaveBeenCalled();
    });

    it('should skip polygon validation when address has no coordinates', async () => {
      const mockAddress = {
        id: mockAddressId,
        userId: mockCustomerId,
        latitude: null,
        longitude: null,
      };

      const mockCreatedOrder = {
        id: 'order-123',
        orderNumber: 'ORD-001',
        ...baseOrderData,
        status: OrderStatus.PENDING,
      };

      (prisma.address.findUnique as jest.Mock).mockResolvedValue(mockAddress);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          order: {
            create: jest.fn().mockResolvedValue(mockCreatedOrder),
          },
          orderItem: {
            createMany: jest.fn(),
          },
          orderStatusHistory: {
            create: jest.fn(),
          },
          vendor: {
            update: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });
      });

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockCreatedOrder);

      const result = await OrderService.createOrder(baseOrderData);

      expect(result).toBeDefined();
      expect(GeoLocationService.validatePointInServiceArea).not.toHaveBeenCalled();
      expect(VendorDiscoveryService.canVendorServeAddress).not.toHaveBeenCalled();
    });

    it('should skip polygon validation for non-delivery fulfillment methods', async () => {
      const pickupOrderData = {
        ...baseOrderData,
        fulfillmentMethod: FulfillmentMethod.PICKUP,
      };

      const mockCreatedOrder = {
        id: 'order-123',
        orderNumber: 'ORD-001',
        ...pickupOrderData,
        status: OrderStatus.PENDING,
      };

      (FulfillmentService.requiresDeliveryAddress as jest.Mock).mockReturnValue(false);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          order: {
            create: jest.fn().mockResolvedValue(mockCreatedOrder),
          },
          orderItem: {
            createMany: jest.fn(),
          },
          orderStatusHistory: {
            create: jest.fn(),
          },
          vendor: {
            update: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });
      });

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockCreatedOrder);

      const result = await OrderService.createOrder(pickupOrderData);

      expect(result).toBeDefined();
      expect(GeoLocationService.validatePointInServiceArea).not.toHaveBeenCalled();
      expect(VendorDiscoveryService.canVendorServeAddress).not.toHaveBeenCalled();
    });
  });
});
