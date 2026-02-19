import { DeliveryMatchingService } from '@/services/delivery-matching.service';
import { GeoLocationService } from '@/services/geolocation.service';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/services/geolocation.service');

describe('DeliveryMatchingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.log in tests
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('notifyNearbyDeliveryPartners', () => {
    it('should throw error if order not found', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        DeliveryMatchingService.notifyNearbyDeliveryPartners('order-1')
      ).rejects.toThrow('Order not found');
    });

    it('should throw error if vendor location not set', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-1',
        vendor: {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: null,
          longitude: null,
          serviceAreaId: 'area-1',
        },
        deliveryAddress: {},
      });

      await expect(
        DeliveryMatchingService.notifyNearbyDeliveryPartners('order-1')
      ).rejects.toThrow('Vendor location not set');
    });

    it('should return empty result if no delivery partners found', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-1',
        vendor: {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: 40.7128,
          longitude: -74.0060,
          serviceAreaId: 'area-1',
        },
        deliveryAddress: {
          latitude: 40.7589,
          longitude: -73.9851,
          street: '123 Main St',
          city: 'New York',
        },
        total: 50.0,
      });

      (GeoLocationService.findNearbyDeliveryPartners as jest.Mock).mockResolvedValue([]);

      const result = await DeliveryMatchingService.notifyNearbyDeliveryPartners('order-1');

      expect(result).toEqual({
        deliveryPartnerIds: [],
        notifiedCount: 0,
      });
    });

    it('should notify up to 5 nearest delivery partners', async () => {
      const mockDeliveryPartners = [
        { id: 'dp-1', distanceKm: 1.0 },
        { id: 'dp-2', distanceKm: 1.5 },
        { id: 'dp-3', distanceKm: 2.0 },
        { id: 'dp-4', distanceKm: 2.5 },
        { id: 'dp-5', distanceKm: 3.0 },
        { id: 'dp-6', distanceKm: 3.5 },
        { id: 'dp-7', distanceKm: 4.0 },
      ];

      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-1',
        vendor: {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: 40.7128,
          longitude: -74.0060,
          serviceAreaId: 'area-1',
        },
        deliveryAddress: {
          latitude: 40.7589,
          longitude: -73.9851,
          street: '123 Main St',
          city: 'New York',
        },
        total: 50.0,
      });

      (GeoLocationService.findNearbyDeliveryPartners as jest.Mock).mockResolvedValue(
        mockDeliveryPartners
      );
      (GeoLocationService.calculateDistance as jest.Mock).mockResolvedValue(5.5);

      const result = await DeliveryMatchingService.notifyNearbyDeliveryPartners('order-1', 5);

      expect(result.deliveryPartnerIds).toHaveLength(5);
      expect(result.notifiedCount).toBe(5);
      expect(result.deliveryPartnerIds).toEqual(['dp-1', 'dp-2', 'dp-3', 'dp-4', 'dp-5']);

      expect(GeoLocationService.findNearbyDeliveryPartners).toHaveBeenCalledWith(
        40.7128,
        -74.0060,
        5,
        'area-1'
      );
    });

    it('should use default proximity threshold of 5km', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-1',
        vendor: {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: 40.7128,
          longitude: -74.0060,
          serviceAreaId: 'area-1',
        },
        deliveryAddress: {
          latitude: 40.7589,
          longitude: -73.9851,
          street: '123 Main St',
          city: 'New York',
        },
        total: 50.0,
      });

      (GeoLocationService.findNearbyDeliveryPartners as jest.Mock).mockResolvedValue([
        { id: 'dp-1', distanceKm: 1.0 },
      ]);
      (GeoLocationService.calculateDistance as jest.Mock).mockResolvedValue(5.5);

      await DeliveryMatchingService.notifyNearbyDeliveryPartners('order-1');

      expect(GeoLocationService.findNearbyDeliveryPartners).toHaveBeenCalledWith(
        40.7128,
        -74.0060,
        5, // default threshold
        'area-1'
      );
    });

    it('should calculate estimated distance to delivery address', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-1',
        vendor: {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: 40.7128,
          longitude: -74.0060,
          serviceAreaId: 'area-1',
        },
        deliveryAddress: {
          latitude: 40.7589,
          longitude: -73.9851,
          street: '123 Main St',
          city: 'New York',
        },
        total: 50.0,
      });

      (GeoLocationService.findNearbyDeliveryPartners as jest.Mock).mockResolvedValue([
        { id: 'dp-1', distanceKm: 1.0 },
      ]);
      (GeoLocationService.calculateDistance as jest.Mock).mockResolvedValue(5.5);

      await DeliveryMatchingService.notifyNearbyDeliveryPartners('order-1');

      expect(GeoLocationService.calculateDistance).toHaveBeenCalledWith(
        40.7128,
        -74.0060,
        40.7589,
        -73.9851
      );
    });

    it('should handle delivery address without coordinates', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-1',
        vendor: {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: 40.7128,
          longitude: -74.0060,
          serviceAreaId: 'area-1',
        },
        deliveryAddress: {
          latitude: null,
          longitude: null,
          street: '123 Main St',
          city: 'New York',
        },
        total: 50.0,
      });

      (GeoLocationService.findNearbyDeliveryPartners as jest.Mock).mockResolvedValue([
        { id: 'dp-1', distanceKm: 1.0 },
      ]);

      const result = await DeliveryMatchingService.notifyNearbyDeliveryPartners('order-1');

      expect(result.notifiedCount).toBe(1);
      expect(GeoLocationService.calculateDistance).not.toHaveBeenCalled();
    });
  });

  describe('retryWithExpandedRadius', () => {
    it('should expand radius by 5km per attempt', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-1',
        vendor: {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: 40.7128,
          longitude: -74.0060,
          serviceAreaId: 'area-1',
        },
        deliveryAddress: {
          latitude: 40.7589,
          longitude: -73.9851,
          street: '123 Main St',
          city: 'New York',
        },
        total: 50.0,
      });

      (GeoLocationService.findNearbyDeliveryPartners as jest.Mock).mockResolvedValue([
        { id: 'dp-1', distanceKm: 8.0 },
      ]);
      (GeoLocationService.calculateDistance as jest.Mock).mockResolvedValue(5.5);

      // Attempt 1: radius = 5 + (1 * 5) = 10km
      await DeliveryMatchingService.retryWithExpandedRadius('order-1', 1);

      expect(GeoLocationService.findNearbyDeliveryPartners).toHaveBeenCalledWith(
        40.7128,
        -74.0060,
        10,
        'area-1'
      );
    });

    it('should mark order for manual assignment after 3 attempts', async () => {
      (prisma.order.update as jest.Mock).mockResolvedValue({});

      const result = await DeliveryMatchingService.retryWithExpandedRadius('order-1', 3);

      expect(result).toEqual({
        deliveryPartnerIds: [],
        notifiedCount: 0,
      });

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          statusHistory: {
            create: {
              status: 'READY_FOR_PICKUP',
              notes: expect.stringContaining('manual assignment'),
            },
          },
        },
      });
    });

    it('should not call notifyNearbyDeliveryPartners after max attempts', async () => {
      (prisma.order.update as jest.Mock).mockResolvedValue({});

      await DeliveryMatchingService.retryWithExpandedRadius('order-1', 3);

      expect(GeoLocationService.findNearbyDeliveryPartners).not.toHaveBeenCalled();
    });
  });

  describe('cancelPendingNotifications', () => {
    it('should throw error if order not found', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        DeliveryMatchingService.cancelPendingNotifications('order-1', 'dp-1')
      ).rejects.toThrow('Order not found');
    });

    it('should log cancellation for accepted order', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-1',
      });

      await DeliveryMatchingService.cancelPendingNotifications('order-1', 'dp-1');

      expect(console.log).toHaveBeenCalledWith(
        'Cancelling notifications for order:',
        expect.objectContaining({
          orderId: 'order-1',
          acceptedByPartnerId: 'dp-1',
          reason: 'accepted_by_other',
        })
      );
    });
  });
});
