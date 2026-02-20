/**
 * Tests for customer-facing API endpoints
 * Task 9: Implement customer-facing API endpoints
 */

import { GET as getNearbyVendors } from '@/app/api/vendors/nearby/route';
import { GET as getServiceAreaForLocation } from '@/app/api/service-areas/for-location/route';
import { POST as validateAddress } from '@/app/api/addresses/validate/route';
import { VendorDiscoveryService } from '@/services/vendor-discovery.service';
import { GeoLocationService } from '@/services/geolocation.service';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/services/vendor-discovery.service');
jest.mock('@/services/geolocation.service');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    vendor: {
      findMany: jest.fn(),
    },
    address: {
      update: jest.fn(),
    },
  },
}));

describe('Customer-facing API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/vendors/nearby', () => {
    it('should return error when latitude is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/vendors/nearby?longitude=77.5946');
      
      const response = await getNearbyVendors(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return error when longitude is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/vendors/nearby?latitude=12.9716');
      
      const response = await getNearbyVendors(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return vendors with service area info', async () => {
      const mockVendors = [
        {
          id: 'vendor-1',
          businessName: 'Test Vendor',
          description: 'Test description',
          categoryId: 'cat-1',
          latitude: 12.9716,
          longitude: 77.5946,
          serviceRadiusKm: 5,
          distanceKm: 2.5,
          isActive: true,
          imageUrl: null,
          rating: 4.5,
          serviceAreaId: 'area-1',
          serviceAreaName: 'Test Area',
          isWithinServiceRadius: true,
        },
      ];

      const mockVendorDetails = [
        {
          id: 'vendor-1',
          totalOrders: 100,
          category: {
            id: 'cat-1',
            name: 'Food',
            icon: 'utensils',
          },
        },
      ];

      (VendorDiscoveryService.findVendorsForLocation as jest.Mock).mockResolvedValue(mockVendors);
      (prisma.vendor.findMany as jest.Mock).mockResolvedValue(mockVendorDetails);

      const request = new NextRequest('http://localhost:3000/api/vendors/nearby?latitude=12.9716&longitude=77.5946');
      
      const response = await getNearbyVendors(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.vendors).toHaveLength(1);
      expect(data.vendors[0].businessName).toBe('Test Vendor');
      expect(data.vendors[0].serviceAreaName).toBe('Test Area');
      expect(data.serviceArea).toEqual({
        id: 'area-1',
        name: 'Test Area',
      });
    });
  });

  describe('GET /api/service-areas/for-location', () => {
    it('should return error when latitude is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/service-areas/for-location?longitude=77.5946');
      
      const response = await getServiceAreaForLocation(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return service area when point is serviceable', async () => {
      const mockValidation = {
        isServiceable: true,
        serviceArea: {
          id: 'area-1',
          name: 'Test Area',
          city: 'Bangalore',
          state: 'Karnataka',
          centerLatitude: 12.9716,
          centerLongitude: 77.5946,
        },
        nearestServiceArea: null,
        distanceToNearest: null,
      };

      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue(mockValidation);

      const request = new NextRequest('http://localhost:3000/api/service-areas/for-location?latitude=12.9716&longitude=77.5946');
      
      const response = await getServiceAreaForLocation(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.isServiceable).toBe(true);
      expect(data.serviceArea.name).toBe('Test Area');
    });

    it('should return nearest service area when point is not serviceable', async () => {
      const mockValidation = {
        isServiceable: false,
        serviceArea: null,
        nearestServiceArea: {
          id: 'area-2',
          name: 'Nearby Area',
          city: 'Bangalore',
          state: 'Karnataka',
          centerLatitude: 12.9716,
          centerLongitude: 77.5946,
        },
        distanceToNearest: 5.5,
      };

      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue(mockValidation);

      const request = new NextRequest('http://localhost:3000/api/service-areas/for-location?latitude=12.9716&longitude=77.5946');
      
      const response = await getServiceAreaForLocation(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.isServiceable).toBe(false);
      expect(data.serviceArea).toBeNull();
      expect(data.nearestServiceArea?.name).toBe('Nearby Area');
      expect(data.nearestServiceArea?.distanceKm).toBe(5.5);
    });
  });

  describe('POST /api/addresses/validate', () => {
    it('should return error for invalid request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/addresses/validate', {
        method: 'POST',
        body: JSON.stringify({ latitude: 'invalid' }),
      });
      
      const response = await validateAddress(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return serviceable result with service area info', async () => {
      const mockValidation = {
        isServiceable: true,
        serviceArea: {
          id: 'area-1',
          name: 'Test Area',
          city: 'Bangalore',
          state: 'Karnataka',
          centerLatitude: 12.9716,
          centerLongitude: 77.5946,
        },
        nearestServiceArea: null,
        distanceToNearest: null,
      };

      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue(mockValidation);

      const request = new NextRequest('http://localhost:3000/api/addresses/validate', {
        method: 'POST',
        body: JSON.stringify({
          latitude: 12.9716,
          longitude: 77.5946,
        }),
      });
      
      const response = await validateAddress(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.isServiceable).toBe(true);
      expect(data.serviceAreaId).toBe('area-1');
      expect(data.serviceAreaName).toBe('Test Area');
    });

    it('should update address with serviceAreaId when addressId provided', async () => {
      const mockValidation = {
        isServiceable: true,
        serviceArea: {
          id: 'area-1',
          name: 'Test Area',
          city: 'Bangalore',
          state: 'Karnataka',
          centerLatitude: 12.9716,
          centerLongitude: 77.5946,
        },
        nearestServiceArea: null,
        distanceToNearest: null,
      };

      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue(mockValidation);
      (prisma.address.update as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/addresses/validate', {
        method: 'POST',
        body: JSON.stringify({
          latitude: 12.9716,
          longitude: 77.5946,
          addressId: 'addr-1',
        }),
      });
      
      const response = await validateAddress(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(prisma.address.update).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
        data: { serviceAreaId: 'area-1' },
      });
    });

    it('should return not serviceable with reason and nearest service area', async () => {
      const mockValidation = {
        isServiceable: false,
        serviceArea: null,
        nearestServiceArea: {
          id: 'area-2',
          name: 'Nearby Area',
          city: 'Bangalore',
          state: 'Karnataka',
          centerLatitude: 12.9716,
          centerLongitude: 77.5946,
        },
        distanceToNearest: 5.5,
      };

      (GeoLocationService.validatePointInServiceArea as jest.Mock).mockResolvedValue(mockValidation);

      const request = new NextRequest('http://localhost:3000/api/addresses/validate', {
        method: 'POST',
        body: JSON.stringify({
          latitude: 12.9716,
          longitude: 77.5946,
        }),
      });
      
      const response = await validateAddress(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.isServiceable).toBe(false);
      expect(data.reason).toBe("We don't serve this location yet");
      expect(data.nearestServiceArea?.distanceKm).toBe(5.5);
    });
  });
});
