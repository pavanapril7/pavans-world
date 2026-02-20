import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VendorDiscoveryService } from '@/services/vendor-discovery.service';
import { GeoLocationService } from '@/services/geolocation.service';
import { prisma } from '@/lib/prisma';

// Validation schema for query parameters
const nearbyVendorsQuerySchema = z.object({
  latitude: z.string().transform((val) => parseFloat(val)),
  longitude: z.string().transform((val) => parseFloat(val)),
  categoryId: z.string().optional(),
  maxDistance: z.string().transform((val) => parseFloat(val)).optional(),
});

/**
 * GET /api/vendors/nearby - Find vendors near a customer location
 * Query parameters: latitude, longitude, categoryId (optional), maxDistance (optional)
 * 
 * Uses VendorDiscoveryService for location-aware vendor filtering with service area validation
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');
    const categoryId = searchParams.get('categoryId');
    const maxDistance = searchParams.get('maxDistance');

    // Validate required parameters
    if (!latitude || !longitude) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'latitude and longitude query parameters are required',
          },
        },
        { status: 400 }
      );
    }

    // Validate query parameters
    const validatedQuery = nearbyVendorsQuerySchema.parse({
      latitude,
      longitude,
      categoryId: categoryId || undefined,
      maxDistance: maxDistance || undefined,
    });

    // Find vendors for location using VendorDiscoveryService
    const vendors = await VendorDiscoveryService.findVendorsForLocation({
      latitude: validatedQuery.latitude,
      longitude: validatedQuery.longitude,
      categoryId: validatedQuery.categoryId,
      maxDistanceKm: validatedQuery.maxDistance,
    });

    // Enrich with category details
    const vendorIds = vendors.map((v) => v.id);
    const vendorDetails = await prisma.vendor.findMany({
      where: {
        id: { in: vendorIds },
      },
      select: {
        id: true,
        totalOrders: true,
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
      },
    });

    // Merge vendor data with category details
    const enrichedVendors = vendors.map((vendor) => {
      const details = vendorDetails.find((d) => d.id === vendor.id);
      return {
        id: vendor.id,
        businessName: vendor.businessName,
        description: vendor.description,
        latitude: vendor.latitude,
        longitude: vendor.longitude,
        serviceRadiusKm: vendor.serviceRadiusKm,
        distanceKm: vendor.distanceKm,
        rating: vendor.rating,
        totalOrders: details?.totalOrders || 0,
        imageUrl: vendor.imageUrl,
        category: details?.category || null,
        serviceAreaId: vendor.serviceAreaId,
        serviceAreaName: vendor.serviceAreaName,
        isWithinServiceRadius: vendor.isWithinServiceRadius,
      };
    });

    // Get service area info
    let serviceArea = null;
    if (vendors.length > 0) {
      serviceArea = {
        id: vendors[0].serviceAreaId,
        name: vendors[0].serviceAreaName,
      };
    } else {
      // Try to find service area even if no vendors
      const foundServiceArea = await GeoLocationService.findServiceAreaForPoint(
        validatedQuery.latitude,
        validatedQuery.longitude
      );
      if (foundServiceArea) {
        serviceArea = {
          id: foundServiceArea.id,
          name: foundServiceArea.name,
        };
      }
    }

    return NextResponse.json(
      {
        vendors: enrichedVendors,
        serviceArea,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error finding nearby vendors:', error);

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: 'errors' in error ? error.errors : undefined,
          },
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Invalid coordinates provided') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_COORDINATES',
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to find nearby vendors',
        },
      },
      { status: 500 }
    );
  }
}
