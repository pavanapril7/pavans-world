import { GeoLocationService } from '@/services/geolocation.service';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

describe('GeoLocationService', () => {
  describe('validateCoordinates', () => {
    it('should accept valid coordinates', () => {
      expect(GeoLocationService.validateCoordinates(0, 0)).toBe(true);
      expect(GeoLocationService.validateCoordinates(45.5, -122.6)).toBe(true);
      expect(GeoLocationService.validateCoordinates(-90, -180)).toBe(true);
      expect(GeoLocationService.validateCoordinates(90, 180)).toBe(true);
    });

    it('should reject invalid latitude', () => {
      expect(GeoLocationService.validateCoordinates(-91, 0)).toBe(false);
      expect(GeoLocationService.validateCoordinates(91, 0)).toBe(false);
    });

    it('should reject invalid longitude', () => {
      expect(GeoLocationService.validateCoordinates(0, -181)).toBe(false);
      expect(GeoLocationService.validateCoordinates(0, 181)).toBe(false);
    });
  });

  describe('calculateETA', () => {
    it('should calculate ETA with 30 km/h speed and 5-minute buffer', () => {
      // 10 km at 30 km/h = 20 minutes + 5 minute buffer = 25 minutes
      expect(GeoLocationService.calculateETA(10)).toBe(25);
      
      // 30 km at 30 km/h = 60 minutes + 5 minute buffer = 65 minutes
      expect(GeoLocationService.calculateETA(30)).toBe(65);
      
      // 5 km at 30 km/h = 10 minutes + 5 minute buffer = 15 minutes
      expect(GeoLocationService.calculateETA(5)).toBe(15);
    });

    it('should round up to nearest minute', () => {
      // 1 km at 30 km/h = 2 minutes + 5 minute buffer = 7 minutes
      expect(GeoLocationService.calculateETA(1)).toBe(7);
    });
  });

  describe('formatETA', () => {
    it('should return "Arriving soon" for distance < 1 km', () => {
      expect(GeoLocationService.formatETA(5, 0.5)).toBe('Arriving soon');
      expect(GeoLocationService.formatETA(10, 0.9)).toBe('Arriving soon');
    });

    it('should format minutes for ETA < 60', () => {
      expect(GeoLocationService.formatETA(30, 5)).toBe('30 min');
      expect(GeoLocationService.formatETA(45, 10)).toBe('45 min');
    });

    it('should format hours and minutes for ETA >= 60', () => {
      expect(GeoLocationService.formatETA(65, 20)).toBe('1h 5m');
      expect(GeoLocationService.formatETA(120, 50)).toBe('2h 0m');
      expect(GeoLocationService.formatETA(90, 30)).toBe('1h 30m');
    });
  });

  describe('calculateDistance', () => {
    it('should throw error for invalid coordinates', async () => {
      await expect(
        GeoLocationService.calculateDistance(91, 0, 0, 0)
      ).rejects.toThrow('Invalid coordinates provided');

      await expect(
        GeoLocationService.calculateDistance(0, 0, 0, 181)
      ).rejects.toThrow('Invalid coordinates provided');
    });

    it('should calculate distance using PostGIS', async () => {
      const mockDistance = 10.5678;
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ distance: mockDistance }]);

      const result = await GeoLocationService.calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
      
      // Should return with two decimal precision
      expect(result).toBe(10.57);
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('findNearbyVendors', () => {
    it('should throw error for invalid coordinates', async () => {
      await expect(
        GeoLocationService.findNearbyVendors(91, 0)
      ).rejects.toThrow('Invalid coordinates provided');
    });

    it('should find nearby vendors using PostGIS', async () => {
      const mockVendors = [
        {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          latitude: 40.7128,
          longitude: -74.0060,
          serviceRadiusKm: { toNumber: () => 10 } as any,
          distanceKm: 2.5,
          status: 'ACTIVE',
          imageUrl: 'test.jpg',
          rating: { toNumber: () => 4.5 } as any,
          categoryId: 'cat-1',
        },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockVendors);

      const result = await GeoLocationService.findNearbyVendors(40.7128, -74.0060, 50);
      
      expect(result).toHaveLength(1);
      expect(result[0].businessName).toBe('Test Vendor');
      expect(result[0].distanceKm).toBe(2.5);
      expect(result[0].isActive).toBe(true);
    });
  });

  describe('findNearbyDeliveryPartners', () => {
    it('should throw error for invalid coordinates', async () => {
      await expect(
        GeoLocationService.findNearbyDeliveryPartners(91, 0, 5)
      ).rejects.toThrow('Invalid coordinates provided');
    });

    it('should find nearby delivery partners using PostGIS', async () => {
      const mockPartners = [
        {
          id: 'dp-1',
          userId: 'user-1',
          currentLatitude: 40.7128,
          currentLongitude: -74.0060,
          distanceKm: 1.5,
          status: 'AVAILABLE',
        },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockPartners);

      const result = await GeoLocationService.findNearbyDeliveryPartners(40.7128, -74.0060, 5);
      
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
      expect(result[0].distanceKm).toBe(1.5);
      expect(result[0].status).toBe('AVAILABLE');
    });

    it('should support optional service area filter', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      await GeoLocationService.findNearbyDeliveryPartners(40.7128, -74.0060, 5, 'service-area-1');
      
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });
  });
});
