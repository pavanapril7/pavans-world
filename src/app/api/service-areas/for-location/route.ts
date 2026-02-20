import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GeoLocationService } from '@/services/geolocation.service';

// Validation schema for query parameters
const forLocationQuerySchema = z.object({
  latitude: z.string().transform((val) => parseFloat(val)),
  longitude: z.string().transform((val) => parseFloat(val)),
});

/**
 * GET /api/service-areas/for-location - Find service area for a location
 * Query parameters: latitude, longitude
 * 
 * Returns service area containing the point or nearest service area if outside all polygons
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');

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
    const validatedQuery = forLocationQuerySchema.parse({
      latitude,
      longitude,
    });

    // Validate point in service area
    const validation = await GeoLocationService.validatePointInServiceArea(
      validatedQuery.latitude,
      validatedQuery.longitude
    );

    // Build response based on validation result
    if (validation.isServiceable && validation.serviceArea) {
      return NextResponse.json(
        {
          serviceArea: {
            id: validation.serviceArea.id,
            name: validation.serviceArea.name,
            city: validation.serviceArea.city,
            state: validation.serviceArea.state,
            centerLatitude: validation.serviceArea.centerLatitude,
            centerLongitude: validation.serviceArea.centerLongitude,
          },
          isServiceable: true,
        },
        { status: 200 }
      );
    } else {
      // Point is outside all service areas
      const response: {
        serviceArea: null;
        isServiceable: false;
        nearestServiceArea?: {
          id: string;
          name: string;
          distanceKm: number;
        };
      } = {
        serviceArea: null,
        isServiceable: false,
      };

      if (validation.nearestServiceArea && validation.distanceToNearest !== null) {
        response.nearestServiceArea = {
          id: validation.nearestServiceArea.id,
          name: validation.nearestServiceArea.name,
          distanceKm: validation.distanceToNearest,
        };
      }

      return NextResponse.json(response, { status: 200 });
    }
  } catch (error: unknown) {
    console.error('Error finding service area for location:', error);

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
          message: 'Failed to find service area for location',
        },
      },
      { status: 500 }
    );
  }
}
