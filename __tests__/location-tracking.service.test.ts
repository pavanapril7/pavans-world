import { LocationTrackingService } from '@/services/location-tracking.service';
import { GeoLocationService } from '@/services/geolocation.service';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    deliveryPartner: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
    locationHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/services/geolocation.service');

describe('LocationTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateDeliveryPartnerLocation', () => {
    it('should throw error for invalid coordinates', async () => {
      (GeoLocationService.validateCoordinates as jest.Mock).mockReturnValue(false);

      await expect(
        LocationTrackingService.updateDeliveryPartnerLocation('dp-1', 91, 0)
      ).rejects.toThrow('Invalid coordinates provided');
    });

    it('should throw error if delivery partner not found', async () => {
      (GeoLocationService.validateCoordinates as jest.Mock).mockReturnValue(true);
      (prisma.deliveryPartner.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        LocationTrackingService.updateDeliveryPartnerLocation('dp-1', 40.7128, -74.0060)
      ).rejects.toThrow('Delivery partner not found');
    });

    it('should throw error if no active delivery', async () => {
      (GeoLocationService.validateCoordinates as jest.Mock).mockReturnValue(true);
      (prisma.deliveryPartner.findUnique as jest.Mock).mockResolvedValue({
        id: 'dp-1',
        orders: [],
      });

      await expect(
        LocationTrackingService.updateDeliveryPartnerLocation('dp-1', 40.7128, -74.0060)
      ).rejects.toThrow('No active delivery found');
    });

    it('should throw error if delivery address has no coordinates', async () => {
      (GeoLocationService.validateCoordinates as jest.Mock).mockReturnValue(true);
      (prisma.deliveryPartner.findUnique as jest.Mock).mockResolvedValue({
        id: 'dp-1',
        orders: [
          {
            id: 'order-1',
            status: OrderStatus.PICKED_UP,
            deliveryAddress: {
              latitude: null,
              longitude: null,
            },
          },
        ],
      });

      await expect(
        LocationTrackingService.updateDeliveryPartnerLocation('dp-1', 40.7128, -74.0060)
      ).rejects.toThrow('Delivery address does not have coordinates');
    });

    it('should update location and create history record', async () => {
      const mockDeliveryPartner = {
        id: 'dp-1',
        orders: [
          {
            id: 'order-1',
            status: OrderStatus.PICKED_UP,
            deliveryAddress: {
              latitude: 40.7589,
              longitude: -73.9851,
            },
          },
        ],
      };

      (GeoLocationService.validateCoordinates as jest.Mock).mockReturnValue(true);
      (prisma.deliveryPartner.findUnique as jest.Mock).mockResolvedValue(mockDeliveryPartner);
      (GeoLocationService.calculateDistance as jest.Mock).mockResolvedValue(5.5);
      (GeoLocationService.calculateETA as jest.Mock).mockReturnValue(16);

      const mockTransaction = jest.fn(async (callback) => {
        return callback({
          deliveryPartner: {
            update: jest.fn(),
          },
          locationHistory: {
            create: jest.fn(),
          },
        });
      });
      (prisma.$transaction as jest.Mock).mockImplementation(mockTransaction);

      const result = await LocationTrackingService.updateDeliveryPartnerLocation(
        'dp-1',
        40.7128,
        -74.0060
      );

      expect(result).toEqual({
        eta: 16,
        orderId: 'order-1',
      });
      expect(GeoLocationService.calculateDistance).toHaveBeenCalledWith(
        40.7128,
        -74.0060,
        40.7589,
        -73.9851
      );
      expect(GeoLocationService.calculateETA).toHaveBeenCalledWith(5.5);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getDeliveryLocation', () => {
    it('should throw error if order not found', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(LocationTrackingService.getDeliveryLocation('order-1')).rejects.toThrow(
        'Order not found'
      );
    });

    it('should return null location if no delivery partner assigned', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-1',
        deliveryPartner: null,
        deliveryAddress: {},
      });

      const result = await LocationTrackingService.getDeliveryLocation('order-1');

      expect(result).toEqual({
        orderId: 'order-1',
        latitude: null,
        longitude: null,
        lastUpdate: null,
        eta: null,
      });
    });

    it('should return null location if delivery partner has no location', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-1',
        deliveryPartner: {
          currentLatitude: null,
          currentLongitude: null,
        },
        deliveryAddress: {},
      });

      const result = await LocationTrackingService.getDeliveryLocation('order-1');

      expect(result).toEqual({
        orderId: 'order-1',
        latitude: null,
        longitude: null,
        lastUpdate: null,
        eta: null,
      });
    });

    it('should return location with ETA', async () => {
      const lastUpdate = new Date();
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-1',
        deliveryPartner: {
          currentLatitude: 40.7128,
          currentLongitude: -74.0060,
          lastLocationUpdate: lastUpdate,
        },
        deliveryAddress: {
          latitude: 40.7589,
          longitude: -73.9851,
        },
      });
      (GeoLocationService.calculateDistance as jest.Mock).mockResolvedValue(5.5);
      (GeoLocationService.calculateETA as jest.Mock).mockReturnValue(16);

      const result = await LocationTrackingService.getDeliveryLocation('order-1');

      expect(result).toEqual({
        orderId: 'order-1',
        latitude: 40.7128,
        longitude: -74.0060,
        lastUpdate,
        eta: 16,
      });
    });

    it('should return location without ETA if address has no coordinates', async () => {
      const lastUpdate = new Date();
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-1',
        deliveryPartner: {
          currentLatitude: 40.7128,
          currentLongitude: -74.0060,
          lastLocationUpdate: lastUpdate,
        },
        deliveryAddress: {
          latitude: null,
          longitude: null,
        },
      });

      const result = await LocationTrackingService.getDeliveryLocation('order-1');

      expect(result).toEqual({
        orderId: 'order-1',
        latitude: 40.7128,
        longitude: -74.0060,
        lastUpdate,
        eta: null,
      });
    });
  });

  describe('getDeliveryRoute', () => {
    it('should throw error if order not found', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(LocationTrackingService.getDeliveryRoute('order-1')).rejects.toThrow(
        'Order not found'
      );
    });

    it('should return location history ordered by timestamp', async () => {
      const mockHistory = [
        { latitude: 40.7128, longitude: -74.0060, timestamp: new Date('2024-01-01T10:00:00Z') },
        { latitude: 40.7200, longitude: -74.0000, timestamp: new Date('2024-01-01T10:15:00Z') },
        { latitude: 40.7300, longitude: -73.9900, timestamp: new Date('2024-01-01T10:30:00Z') },
      ];

      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: 'order-1' });
      (prisma.locationHistory.findMany as jest.Mock).mockResolvedValue(mockHistory);

      const result = await LocationTrackingService.getDeliveryRoute('order-1');

      expect(result).toEqual(mockHistory);
      expect(prisma.locationHistory.findMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        orderBy: { timestamp: 'asc' },
        select: {
          latitude: true,
          longitude: true,
          timestamp: true,
        },
      });
    });
  });

  describe('calculateTotalDistance', () => {
    it('should return 0 for route with less than 2 points', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: 'order-1' });
      (prisma.locationHistory.findMany as jest.Mock).mockResolvedValue([
        { latitude: 40.7128, longitude: -74.0060, timestamp: new Date() },
      ]);

      const result = await LocationTrackingService.calculateTotalDistance('order-1');

      expect(result).toBe(0);
    });

    it('should calculate total distance from consecutive points', async () => {
      const mockHistory = [
        { latitude: 40.7128, longitude: -74.0060, timestamp: new Date() },
        { latitude: 40.7200, longitude: -74.0000, timestamp: new Date() },
        { latitude: 40.7300, longitude: -73.9900, timestamp: new Date() },
      ];

      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: 'order-1' });
      (prisma.locationHistory.findMany as jest.Mock).mockResolvedValue(mockHistory);
      (GeoLocationService.calculateDistance as jest.Mock)
        .mockResolvedValueOnce(1.5)
        .mockResolvedValueOnce(2.3);

      const result = await LocationTrackingService.calculateTotalDistance('order-1');

      expect(result).toBe(3.8); // 1.5 + 2.3
      expect(GeoLocationService.calculateDistance).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearDeliveryPartnerLocation', () => {
    it('should clear location fields', async () => {
      (prisma.deliveryPartner.update as jest.Mock).mockResolvedValue({});

      await LocationTrackingService.clearDeliveryPartnerLocation('dp-1');

      expect(prisma.deliveryPartner.update).toHaveBeenCalledWith({
        where: { id: 'dp-1' },
        data: {
          currentLatitude: null,
          currentLongitude: null,
          lastLocationUpdate: null,
        },
      });
    });
  });

  describe('cleanupOldLocationHistory', () => {
    it('should delete records older than 90 days', async () => {
      (prisma.locationHistory.deleteMany as jest.Mock).mockResolvedValue({ count: 42 });

      const result = await LocationTrackingService.cleanupOldLocationHistory();

      expect(result).toBe(42);
      expect(prisma.locationHistory.deleteMany).toHaveBeenCalled();

      const callArgs = (prisma.locationHistory.deleteMany as jest.Mock).mock.calls[0][0];
      const ninetyDaysAgo = callArgs.where.createdAt.lt;
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - ninetyDaysAgo.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBeGreaterThanOrEqual(89);
      expect(daysDiff).toBeLessThanOrEqual(91);
    });
  });
});
