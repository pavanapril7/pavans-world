/**
 * Unit tests for DeliveryMatchingService
 * Tests polygon-based delivery partner matching
 */

import { DeliveryMatchingService } from '@/services/delivery-matching.service';
import { prisma } from '@/lib/prisma';
import { GeoLocationService } from '@/services/geolocation.service';
import { getWebSocketClient } from '@/lib/websocket-client';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/services/geolocation.service', () => ({
  GeoLocationService: {
    validatePointInServiceArea: jest.fn(),
    calculateDistance: jest.fn(),
  },
}));

jest.mock('@/lib/websocket-client', () => ({
  getWebSocketClient: jest.fn(),
}));

describe('DeliveryMatchingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyNearbyDeliveryPartners', () => {
    it('should throw error if order not found', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        DeliveryMatchingService.notifyNearbyDeliveryPartners('order-1')
      ).rejects.toThrow('Order not found');
    });

    it('should throw error if vendor location not set', async () => {
      const mockOrder = {
        id: 'order-1',
        vendor: {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: null,
          longitude: null,
          serviceAreaId: 'service-area-1',
        },
        deliveryAddress: {
          id: 'address-1',
          street: 'Test Street',
          city: 'Test City',
          latitude: 19.0760,
          longitude: 72.8777,
        },
      };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

      await expect(
        DeliveryMatchingService.notifyNearbyDeliveryPartners('order-1')
      ).rejects.toThrow('Vendor location not set');
    });

    it('should throw error if delivery address location not set', async () => {
      const mockOrder = {
        id: 'order-1',
        vendor: {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: 19.0760,
          longitude: 72.8777,
          serviceAreaId: 'service-area-1',
        },
        deliveryAddress: {
          id: 'address-1',
          street: 'Test Street',
          city: 'Test City',
          latitude: null,
          longitude: null,
        },
      };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

      await expect(
        DeliveryMatchingService.notifyNearbyDeliveryPartners('order-1')
      ).rejects.toThrow('Delivery address location not set');
    });

    it('should throw error if delivery address is outside serviceable area', async () => {
      const mockOrder = {
        id: 'order-1',
        vendor: {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: 19.0760,
          longitude: 72.8777,
          serviceAreaId: 'service-area-1',
        },
        deliveryAddress: {
          id: 'address-1',
          street: 'Test Street',
          city: 'Test City',
          latitude: 19.0800,
          longitude: 72.8800,
          serviceAreaId: 'service-area-1',
        },
        total: 500,
      };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue({
        isServiceable: false,
        serviceArea: null,
        nearestServiceArea: null,
        distanceToNearest: null,
      });

      await expect(
        DeliveryMatchingService.notifyNearbyDeliveryPartners('order-1')
      ).rejects.toThrow('Delivery address is outside serviceable area');
    });

    it('should return empty result if no delivery partners found', async () => {
      const mockOrder = {
        id: 'order-1',
        vendor: {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: 19.0760,
          longitude: 72.8777,
          serviceAreaId: 'service-area-1',
        },
        deliveryAddress: {
          id: 'address-1',
          street: 'Test Street',
          city: 'Test City',
          latitude: 19.0800,
          longitude: 72.8800,
          serviceAreaId: 'service-area-1',
        },
        total: 500,
      };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue({
        isServiceable: true,
        serviceArea: { id: 'service-area-1', name: 'Test Area' },
        nearestServiceArea: null,
        distanceToNearest: null,
      });
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await DeliveryMatchingService.notifyNearbyDeliveryPartners('order-1');

      expect(result).toEqual({
        deliveryPartnerIds: [],
        notifiedCount: 0,
      });
    });

    it('should find and notify top 5 delivery partners within service area polygon', async () => {
      const mockOrder = {
        id: 'order-1',
        vendor: {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: 19.0760,
          longitude: 72.8777,
          serviceAreaId: 'service-area-1',
        },
        deliveryAddress: {
          id: 'address-1',
          street: 'Test Street',
          city: 'Test City',
          latitude: 19.0800,
          longitude: 72.8800,
          serviceAreaId: 'service-area-1',
        },
        total: 500,
      };

      const mockDeliveryPartners = [
        {
          id: 'dp-1',
          userId: 'user-1',
          currentLatitude: 19.0765,
          currentLongitude: 72.8780,
          distanceKm: 0.5,
          status: 'AVAILABLE',
        },
        {
          id: 'dp-2',
          userId: 'user-2',
          currentLatitude: 19.0770,
          currentLongitude: 72.8785,
          distanceKm: 1.2,
          status: 'AVAILABLE',
        },
        {
          id: 'dp-3',
          userId: 'user-3',
          currentLatitude: 19.0775,
          currentLongitude: 72.8790,
          distanceKm: 2.0,
          status: 'AVAILABLE',
        },
      ];

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue({
        isServiceable: true,
        serviceArea: { id: 'service-area-1', name: 'Test Area' },
        nearestServiceArea: null,
        distanceToNearest: null,
      });
      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockDeliveryPartners);
      (GeoLocationService.calculateDistance as jest.Mock).mockResolvedValue(3.5);
      (getWebSocketClient as jest.Mock).mockReturnValue({
        triggerDeliveryAssigned: jest.fn().mockResolvedValue(undefined),
      });

      const result = await DeliveryMatchingService.notifyNearbyDeliveryPartners('order-1');

      expect(result.deliveryPartnerIds).toEqual(['dp-1', 'dp-2', 'dp-3']);
      expect(result.notifiedCount).toBe(3);
      expect(GeoLocationService.validatePointInServiceArea).toHaveBeenCalledWith(
        19.0800,
        72.8800
      );
    });

    it('should limit notifications to top 5 delivery partners', async () => {
      const mockOrder = {
        id: 'order-1',
        vendor: {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: 19.0760,
          longitude: 72.8777,
          serviceAreaId: 'service-area-1',
        },
        deliveryAddress: {
          id: 'address-1',
          street: 'Test Street',
          city: 'Test City',
          latitude: 19.0800,
          longitude: 72.8800,
          serviceAreaId: 'service-area-1',
        },
        total: 500,
      };

      const mockDeliveryPartners = Array.from({ length: 10 }, (_, i) => ({
        id: `dp-${i + 1}`,
        userId: `user-${i + 1}`,
        currentLatitude: 19.0760 + i * 0.001,
        currentLongitude: 72.8777 + i * 0.001,
        distanceKm: i * 0.5,
        status: 'AVAILABLE',
      }));

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue({
        isServiceable: true,
        serviceArea: { id: 'service-area-1', name: 'Test Area' },
        nearestServiceArea: null,
        distanceToNearest: null,
      });
      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockDeliveryPartners);
      (GeoLocationService.calculateDistance as jest.Mock).mockResolvedValue(3.5);
      (getWebSocketClient as jest.Mock).mockReturnValue({
        triggerDeliveryAssigned: jest.fn().mockResolvedValue(undefined),
      });

      const result = await DeliveryMatchingService.notifyNearbyDeliveryPartners('order-1');

      expect(result.deliveryPartnerIds).toHaveLength(5);
      expect(result.notifiedCount).toBe(5);
      expect(result.deliveryPartnerIds).toEqual(['dp-1', 'dp-2', 'dp-3', 'dp-4', 'dp-5']);
    });

    it('should handle WebSocket unavailability gracefully', async () => {
      const mockOrder = {
        id: 'order-1',
        vendor: {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: 19.0760,
          longitude: 72.8777,
          serviceAreaId: 'service-area-1',
        },
        deliveryAddress: {
          id: 'address-1',
          street: 'Test Street',
          city: 'Test City',
          latitude: 19.0800,
          longitude: 72.8800,
          serviceAreaId: 'service-area-1',
        },
        total: 500,
      };

      const mockDeliveryPartners = [
        {
          id: 'dp-1',
          userId: 'user-1',
          currentLatitude: 19.0765,
          currentLongitude: 72.8780,
          distanceKm: 0.5,
          status: 'AVAILABLE',
        },
      ];

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue({
        isServiceable: true,
        serviceArea: { id: 'service-area-1', name: 'Test Area' },
        nearestServiceArea: null,
        distanceToNearest: null,
      });
      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockDeliveryPartners);
      (GeoLocationService.calculateDistance as jest.Mock).mockResolvedValue(3.5);
      (getWebSocketClient as jest.Mock).mockReturnValue(null);

      const result = await DeliveryMatchingService.notifyNearbyDeliveryPartners('order-1');

      expect(result.deliveryPartnerIds).toEqual(['dp-1']);
      expect(result.notifiedCount).toBe(1);
    });
  });

  describe('retryWithExpandedRadius', () => {
    it('should expand radius by 5km per attempt', async () => {
      const mockOrder = {
        id: 'order-1',
        vendor: {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: 19.0760,
          longitude: 72.8777,
          serviceAreaId: 'service-area-1',
        },
        deliveryAddress: {
          id: 'address-1',
          street: 'Test Street',
          city: 'Test City',
          latitude: 19.0800,
          longitude: 72.8800,
          serviceAreaId: 'service-area-1',
        },
        total: 500,
      };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue({
        isServiceable: true,
        serviceArea: { id: 'service-area-1', name: 'Test Area' },
        nearestServiceArea: null,
        distanceToNearest: null,
      });
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
      (getWebSocketClient as jest.Mock).mockReturnValue(null);

      await DeliveryMatchingService.retryWithExpandedRadius('order-1', 1);

      // Verify the query was called (radius would be 5 + 1*5 = 10km)
      expect(prisma.$queryRaw).toHaveBeenCalled();
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
  });
});
