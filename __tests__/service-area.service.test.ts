/**
 * Unit tests for ServiceAreaService
 * Tests CRUD operations for polygon-based service areas
 */

import { ServiceAreaService } from '@/services/service-area.service';
import { prisma } from '@/lib/prisma';
import { ServiceAreaStatus } from '@prisma/client';
import type { GeoJSONPolygon } from '@/lib/polygon-utils';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    serviceArea: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    vendor: {
      count: jest.fn(),
    },
    deliveryPartner: {
      count: jest.fn(),
    },
    address: {
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    order: {
      count: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/lib/polygon-validation', () => ({
  validatePolygon: jest.fn(),
}));

jest.mock('@/lib/polygon-utils', () => ({
  geoJsonToWKT: jest.fn(),
  calculatePolygonCenter: jest.fn(),
}));

jest.mock('@/services/geolocation.service', () => ({
  GeoLocationService: {
    checkPolygonOverlap: jest.fn(),
  },
}));

describe('ServiceAreaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listServiceAreas', () => {
    it('should list all service areas without filters', async () => {
      const mockServiceAreas = [
        {
          id: '1',
          name: 'Test Area 1',
          city: 'Test City',
          state: 'Test State',
          status: ServiceAreaStatus.ACTIVE,
          _count: { vendors: 5, deliveryPartners: 3, addresses: 10 },
        },
      ];

      (prisma.serviceArea.findMany as jest.Mock).mockResolvedValue(mockServiceAreas);

      const result = await ServiceAreaService.listServiceAreas();

      expect(prisma.serviceArea.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          _count: {
            select: {
              vendors: true,
              deliveryPartners: true,
              addresses: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual(mockServiceAreas);
    });

    it('should filter service areas by status', async () => {
      const mockServiceAreas = [
        {
          id: '1',
          name: 'Active Area',
          status: ServiceAreaStatus.ACTIVE,
        },
      ];

      (prisma.serviceArea.findMany as jest.Mock).mockResolvedValue(mockServiceAreas);

      await ServiceAreaService.listServiceAreas({ status: ServiceAreaStatus.ACTIVE });

      expect(prisma.serviceArea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ServiceAreaStatus.ACTIVE },
        })
      );
    });

    it('should filter service areas by city', async () => {
      const mockServiceAreas = [
        {
          id: '1',
          name: 'City Area',
          city: 'Mumbai',
        },
      ];

      (prisma.serviceArea.findMany as jest.Mock).mockResolvedValue(mockServiceAreas);

      await ServiceAreaService.listServiceAreas({ city: 'Mumbai' });

      expect(prisma.serviceArea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { city: 'Mumbai' },
        })
      );
    });
  });

  describe('getServiceAreaById', () => {
    it('should return service area by id', async () => {
      const mockServiceArea = {
        id: '1',
        name: 'Test Area',
        _count: { vendors: 5, deliveryPartners: 3, addresses: 10 },
      };

      (prisma.serviceArea.findUnique as jest.Mock).mockResolvedValue(mockServiceArea);

      const result = await ServiceAreaService.getServiceAreaById('1');

      expect(result).toEqual(mockServiceArea);
    });

    it('should throw error if service area not found', async () => {
      (prisma.serviceArea.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ServiceAreaService.getServiceAreaById('999')).rejects.toThrow(
        'Service area not found'
      );
    });
  });

  describe('deleteServiceArea', () => {
    it('should delete service area and update addresses', async () => {
      const mockServiceArea = {
        id: '1',
        name: 'Test Area',
        _count: { vendors: 0, deliveryPartners: 0, addresses: 5 },
      };

      (prisma.serviceArea.findUnique as jest.Mock).mockResolvedValue(mockServiceArea);
      (prisma.address.updateMany as jest.Mock).mockResolvedValue({ count: 5 });
      (prisma.serviceArea.delete as jest.Mock).mockResolvedValue(mockServiceArea);

      const result = await ServiceAreaService.deleteServiceArea('1');

      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { serviceAreaId: '1' },
        data: { serviceAreaId: null },
      });
      expect(prisma.serviceArea.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual({
        message: 'Service area deleted successfully',
        addressesUpdated: 5,
      });
    });

    it('should throw error if service area has vendors', async () => {
      const mockServiceArea = {
        id: '1',
        name: 'Test Area',
        _count: { vendors: 3, deliveryPartners: 0, addresses: 0 },
      };

      (prisma.serviceArea.findUnique as jest.Mock).mockResolvedValue(mockServiceArea);

      await expect(ServiceAreaService.deleteServiceArea('1')).rejects.toThrow(
        'Cannot delete service area with associated vendors'
      );
    });

    it('should throw error if service area has delivery partners', async () => {
      const mockServiceArea = {
        id: '1',
        name: 'Test Area',
        _count: { vendors: 0, deliveryPartners: 2, addresses: 0 },
      };

      (prisma.serviceArea.findUnique as jest.Mock).mockResolvedValue(mockServiceArea);

      await expect(ServiceAreaService.deleteServiceArea('1')).rejects.toThrow(
        'Cannot delete service area with associated'
      );
    });
  });

  describe('getServiceAreaWithStats', () => {
    it('should return service area with statistics', async () => {
      const mockServiceArea = {
        id: '1',
        name: 'Test Area',
        city: 'Test City',
        state: 'Test State',
        pincodes: ['12345'],
        centerLatitude: 19.0760,
        centerLongitude: 72.8777,
        status: ServiceAreaStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.serviceArea.findUnique as jest.Mock).mockResolvedValue(mockServiceArea);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ area: 100.5 }]);
      (prisma.vendor.count as jest.Mock).mockResolvedValue(10);
      (prisma.deliveryPartner.count as jest.Mock).mockResolvedValue(5);
      (prisma.address.count as jest.Mock).mockResolvedValue(50);
      (prisma.order.count as jest.Mock).mockResolvedValue(200);

      const result = await ServiceAreaService.getServiceAreaWithStats('1');

      expect(result.stats).toEqual({
        areaSqKm: 100.5,
        vendorCount: 10,
        deliveryPartnerCount: 5,
        addressCount: 50,
        orderCount30Days: 200,
      });
    });

    it('should throw error if service area not found', async () => {
      (prisma.serviceArea.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ServiceAreaService.getServiceAreaWithStats('999')).rejects.toThrow(
        'Service area not found'
      );
    });

    it('should throw error if service area has no center coordinates', async () => {
      const mockServiceArea = {
        id: '1',
        name: 'Test Area',
        centerLatitude: null,
        centerLongitude: null,
      };

      (prisma.serviceArea.findUnique as jest.Mock).mockResolvedValue(mockServiceArea);

      await expect(ServiceAreaService.getServiceAreaWithStats('1')).rejects.toThrow(
        'Service area does not have center coordinates'
      );
    });
  });
});
