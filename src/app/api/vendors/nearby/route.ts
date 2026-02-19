import { NextRequest, NextResponse } from 'next/server';
import { nearbyVendorsQuerySchema } from '@/schemas/geolocation.schema';
import { GeoLocationService } from '@/services/geolocation.service';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/vendors/nearby - Find vendors near a customer location
 * Query parameters: latitude, longitude, radius (optional, default 50km)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');
    const radius = searchParams.get('radius');

    // If no location provided, return all active vendors
    if (!latitude || !longitude) {
      const vendors = await prisma.vendor.findMany({
        where: {
          status: 'ACTIVE',
        },
        select: {
          id: true,
          businessName: true,
          description: true,
          latitude: true,
          longitude: true,
          serviceRadiusKm: true,
          rating: true,
          totalOrders: true,
          imageUrl: true,
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
        },
        orderBy: {
          rating: 'desc',
        },
      });

      return NextResponse.json(
        {
          vendors: vendors.map((v) => ({
            ...v,
            distanceKm: null,
            serviceRadiusKm: Number(v.serviceRadiusKm),
            rating: Number(v.rating),
          })),
        },
        { status: 200 }
      );
    }

    // Validate query parameters
    const validatedQuery = nearbyVendorsQuerySchema.parse({
      latitude,
      longitude,
      radius,
    });

    // Find nearby vendors using GeoLocationService
    const nearbyVendors = await GeoLocationService.findNearbyVendors(
      validatedQuery.latitude,
      validatedQuery.longitude,
      validatedQuery.radius
    );

    // Enrich with additional vendor details
    const vendorIds = nearbyVendors.map((v) => v.id);
    const vendorDetails = await prisma.vendor.findMany({
      where: {
        id: { in: vendorIds },
      },
      select: {
        id: true,
        description: true,
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

    // Merge nearby vendor data with details
    const enrichedVendors = nearbyVendors.map((vendor) => {
      const details = vendorDetails.find((d) => d.id === vendor.id);
      return {
        id: vendor.id,
        businessName: vendor.businessName,
        description: details?.description || '',
        latitude: vendor.latitude,
        longitude: vendor.longitude,
        serviceRadiusKm: vendor.serviceRadiusKm,
        distanceKm: vendor.distanceKm,
        rating: vendor.rating,
        totalOrders: details?.totalOrders || 0,
        imageUrl: vendor.imageUrl,
        category: details?.category || null,
      };
    });

    return NextResponse.json(
      {
        vendors: enrichedVendors,
        location: {
          latitude: validatedQuery.latitude,
          longitude: validatedQuery.longitude,
        },
        searchRadius: validatedQuery.radius,
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
            code: 'VALIDATION_ERROR',
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
