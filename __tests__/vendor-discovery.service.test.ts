/**
 * Unit tests for VendorDiscoveryService
 * Tests location-aware vendor filtering and discovery
 */

import { VendorDiscoveryService } from '@/services/vendor-discovery.service';
import { prisma } from '@/lib/prisma';
import { GeoLocationService } from '@/services/geolocation.service';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    vendor: {
      findUnique: jest.fn(),
    },
    address: {
      findUnique: jest.fn(),
    },
    serviceArea: {
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/services/geolocation.service', () => ({
  GeoLocationService: {
    validateCoordinates: jest.fn(),
    findServiceAreaForPoint: jest.fn(),
    calculateDistance: jest.fn(),
    validatePointInServiceArea: jest.fn(),
  },
}));

describe('VendorDiscoveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findVendorsForLocation', () => {
    it('should return empty array if coordinates are invalid', async () => {
      (GeoLocationService.validateCoordinates as jest.Mock).mockReturnValue(false);

      await expect(
        VendorDiscoveryService.findVendorsForLocation({
          latitude: 200,
          longitude: 200,
        })
      ).rejects.toThrow('Invalid coordinates provided');
    });

    it('should return empty array if no service area found', async () => {
      (GeoLocationService.validateCoordinates as jest.Mock).mockReturnValue(true);
      (GeoLocationService.findServiceAreaForPoint as jest.Mock).mockResolvedValue(null);

      const result = await VendorDiscoveryService.findVendorsForLocation({
        latitude: 19.0760,
        longitude: 72.8777,
      });

      expect(result).toEqual([]);
    });

    it('should find vendors in service area sorted by distance', async () => {
      const mockServiceArea = {
        id: 'service-area-1',
        name: 'Mumbai Central',
      };

      const mockVendors = [
        {
          id: 'vendor-1',
          businessName: 'Vendor 1',
          description: 'Test vendor 1',
          categoryId: 'cat-1',
          latitude: 19.0760,
          longitude: 72.8777,
          serviceRadiusKm: 10,
          distanceKm: 2.5,
          status: 'ACTIVE',
          imageUrl: 'image1.jpg',
          rating: 4.5,
          serviceAreaId: 'service-area-1',
        },
        {
          id: 'vendor-2',
          businessName: 'Vendor 2',
          description: 'Test vendor 2',
          categoryId: 'cat-1',
          latitude: 19.0800,
          longitude: 72.8800,
          serviceRadiusKm: 15,
          distanceKm: 5.0,
          status: 'ACTIVE',
          imageUrl: null,
          rating: 4.0,
          serviceAreaId: 'service-area-1',
        },
      ];

      (GeoLocationService.validateCoordinates as jest.Mock).mockReturnValue(true);
      (GeoLocationService.findServiceAreaForPoint as jest.Mock).mockResolvedValue(
        mockServiceArea
      );
      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockVendors);

      const result = await VendorDiscoveryService.findVendorsForLocation({
        latitude: 19.0760,
        longitude: 72.8777,
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('vendor-1');
      expect(result[0].distanceKm).toBe(2.5);
      expect(result[0].serviceAreaName).toBe('Mumbai Central');
      expect(result[0].isWithinServiceRadius).toBe(true);
      expect(result[1].id).toBe('vendor-2');
      expect(result[1].distanceKm).toBe(5.0);
    });

    it('should filter vendors by category if provided', async () => {
      const mockServiceArea = {
        id: 'service-area-1',
        name: 'Mumbai Central',
      };

      (GeoLocationService.validateCoordinates as jest.Mock).mockReturnValue(true);
      (GeoLocationService.findServiceAreaForPoint as jest.Mock).mockResolvedValue(
        mockServiceArea
      );
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      await VendorDiscoveryService.findVendorsForLocation({
        latitude: 19.0760,
        longitude: 72.8777,
        categoryId: 'cat-1',
      });

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should use provided serviceAreaId if given', async () => {
      const mockServiceArea = {
        name: 'Mumbai Central',
      };

      (GeoLocationService.validateCoordinates as jest.Mock).mockReturnValue(true);
      (prisma.serviceArea.findUnique as jest.Mock).mockResolvedValue(mockServiceArea);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      await VendorDiscoveryService.findVendorsForLocation({
        latitude: 19.0760,
        longitude: 72.8777,
        serviceAreaId: 'service-area-1',
      });

      expect(prisma.serviceArea.findUnique).toHaveBeenCalledWith({
        where: { id: 'service-area-1' },
        select: { name: true },
      });
    });
  });

  describe('canVendorServeAddress', () => {
    it('should return false if vendor not found', async () => {
      (prisma.vendor.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await VendorDiscoveryService.canVendorServeAddress(
        'vendor-1',
        'address-1'
      );

      expect(result.canServe).toBe(false);
      expect(result.reason).toBe('Vendor not found');
    });

    it('should return false if vendor is not active', async () => {
      const mockVendor = {
        id: 'vendor-1',
        status: 'INACTIVE',
        serviceAreaId: 'service-area-1',
        latitude: 19.0760,
        longitude: 72.8777,
        serviceRadiusKm: 10,
      };

      (prisma.vendor.findUnique as jest.Mock).mockResolvedValue(mockVendor);

      const result = await VendorDiscoveryService.canVendorServeAddress(
        'vendor-1',
        'address-1'
      );

      expect(result.canServe).toBe(false);
      expect(result.reason).toBe('Vendor is not active');
    });

    it('should return false if vendor location not set', async () => {
      const mockVendor = {
        id: 'vendor-1',
        status: 'ACTIVE',
        serviceAreaId: 'service-area-1',
        latitude: null,
        longitude: null,
        serviceRadiusKm: 10,
      };

      (prisma.vendor.findUnique as jest.Mock).mockResolvedValue(mockVendor);

      const result = await VendorDiscoveryService.canVendorServeAddress(
        'vendor-1',
        'address-1'
      );

      expect(result.canServe).toBe(false);
      expect(result.reason).toBe('Vendor location not set');
    });

    it('should return false if address not found', async () => {
      const mockVendor = {
        id: 'vendor-1',
        status: 'ACTIVE',
        serviceAreaId: 'service-area-1',
        latitude: 19.0760,
        longitude: 72.8777,
        serviceRadiusKm: 10,
      };

      (prisma.vendor.findUnique as jest.Mock).mockResolvedValue(mockVendor);
      (prisma.address.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await VendorDiscoveryService.canVendorServeAddress(
        'vendor-1',
        'address-1'
      );

      expect(result.canServe).toBe(false);
      expect(result.reason).toBe('Address not found');
    });

    it('should return false if vendor and address in different service areas', async () => {
      const mockVendor = {
        id: 'vendor-1',
        status: 'ACTIVE',
        serviceAreaId: 'service-area-1',
        latitude: 19.0760,
        longitude: 72.8777,
        serviceRadiusKm: 10,
      };

      const mockAddress = {
        id: 'address-1',
        serviceAreaId: 'service-area-2',
        latitude: 19.0800,
        longitude: 72.8800,
      };

      (prisma.vendor.findUnique as jest.Mock).mockResolvedValue(mockVendor);
      (prisma.address.findUnique as jest.Mock).mockResolvedValue(mockAddress);

      const result = await VendorDiscoveryService.canVendorServeAddress(
        'vendor-1',
        'address-1'
      );

      expect(result.canServe).toBe(false);
      expect(result.reason).toBe('Vendor does not serve this service area');
    });

    it('should return false if address beyond vendor service radius', async () => {
      const mockVendor = {
        id: 'vendor-1',
        status: 'ACTIVE',
        serviceAreaId: 'service-area-1',
        latitude: 19.0760,
        longitude: 72.8777,
        serviceRadiusKm: 5,
      };

      const mockAddress = {
        id: 'address-1',
        serviceAreaId: 'service-area-1',
        latitude: 19.0800,
        longitude: 72.8800,
      };

      (prisma.vendor.findUnique as jest.Mock).mockResolvedValue(mockVendor);
      (prisma.address.findUnique as jest.Mock).mockResolvedValue(mockAddress);
      (GeoLocationService.calculateDistance as jest.Mock).mockResolvedValue(10.5);

      const result = await VendorDiscoveryService.canVendorServeAddress(
        'vendor-1',
        'address-1'
      );

      expect(result.canServe).toBe(false);
      expect(result.reason).toContain("Address is beyond vendor's delivery range");
    });

    it('should return false if address outside serviceable area', async () => {
      const mockVendor = {
        id: 'vendor-1',
        status: 'ACTIVE',
        serviceAreaId: 'service-area-1',
        latitude: 19.0760,
        longitude: 72.8777,
        serviceRadiusKm: 10,
      };

      const mockAddress = {
        id: 'address-1',
        serviceAreaId: 'service-area-1',
        latitude: 19.0800,
        longitude: 72.8800,
      };

      (prisma.vendor.findUnique as jest.Mock).mockResolvedValue(mockVendor);
      (prisma.address.findUnique as jest.Mock).mockResolvedValue(mockAddress);
      (GeoLocationService.calculateDistance as jest.Mock).mockResolvedValue(3.5);
      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue({
        isServiceable: false,
        serviceArea: null,
        nearestServiceArea: null,
        distanceToNearest: null,
      });

      const result = await VendorDiscoveryService.canVendorServeAddress(
        'vendor-1',
        'address-1'
      );

      expect(result.canServe).toBe(false);
      expect(result.reason).toBe('Address is outside serviceable area');
    });

    it('should return true if vendor can serve address', async () => {
      const mockVendor = {
        id: 'vendor-1',
        status: 'ACTIVE',
        serviceAreaId: 'service-area-1',
        latitude: 19.0760,
        longitude: 72.8777,
        serviceRadiusKm: 10,
      };

      const mockAddress = {
        id: 'address-1',
        serviceAreaId: 'service-area-1',
        latitude: 19.0800,
        longitude: 72.8800,
      };

      (prisma.vendor.findUnique as jest.Mock).mockResolvedValue(mockVendor);
      (prisma.address.findUnique as jest.Mock).mockResolvedValue(mockAddress);
      (GeoLocationService.calculateDistance as jest.Mock).mockResolvedValue(3.5);
      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue({
        isServiceable: true,
        serviceArea: { id: 'service-area-1', name: 'Mumbai Central' },
        nearestServiceArea: null,
        distanceToNearest: null,
      });

      const result = await VendorDiscoveryService.canVendorServeAddress(
        'vendor-1',
        'address-1'
      );

      expect(result.canServe).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });
});
