import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GeoLocationService } from '@/services/geolocation.service';
import { prisma } from '@/lib/prisma';

// Validation schema for request body
const validateAddressSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  addressId: z.string().uuid().optional(),
});

/**
 * POST /api/addresses/validate - Validate address coordinates
 * Request body: { latitude, longitude, addressId? }
 * 
 * Validates if coordinates are within a service area and optionally updates address
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = validateAddressSchema.parse(body);

    // Validate point in service area
    const validation = await GeoLocationService.validatePointInServiceArea(
      validatedData.latitude,
      validatedData.longitude
    );

    // If serviceable and addressId provided, update address with serviceAreaId
    if (validation.isServiceable && validation.serviceArea && validatedData.addressId) {
      try {
        await prisma.address.update({
          where: { id: validatedData.addressId },
          data: {
            serviceAreaId: validation.serviceArea.id,
          },
        });
      } catch (updateError) {
        console.error('Error updating address with serviceAreaId:', updateError);
        // Continue with response even if update fails
      }
    }

    // Build response based on validation result
    if (validation.isServiceable && validation.serviceArea) {
      return NextResponse.json(
        {
          isServiceable: true,
          serviceAreaId: validation.serviceArea.id,
          serviceAreaName: validation.serviceArea.name,
        },
        { status: 200 }
      );
    } else {
      // Point is outside all service areas
      const response: {
        isServiceable: false;
        reason: string;
        nearestServiceArea?: {
          id: string;
          name: string;
          distanceKm: number;
        };
      } = {
        isServiceable: false,
        reason: "We don't serve this location yet",
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
    console.error('Error validating address:', error);

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
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
          message: 'Failed to validate address',
        },
      },
      { status: 500 }
    );
  }
}
