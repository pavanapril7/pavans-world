import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { rateLimit } from '@/middleware/rate-limit.middleware';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { locationUpdateSchema } from '@/schemas/geolocation.schema';
import { LocationTrackingService } from '@/services/location-tracking.service';

// Rate limiter: 1 request per 10 seconds per delivery partner
const locationUpdateRateLimit = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  maxRequests: 1,
  keyGenerator: (request: NextRequest) => {
    // Use delivery partner ID as key (will be set after auth)
    const authHeader = request.headers.get('authorization');
    return authHeader || 'unknown';
  },
});

/**
 * POST /api/delivery-partners/location
 * Update delivery partner's current location
 * - If delivery partner has active delivery: updates location, creates history, returns ETA
 * - If delivery partner is available: updates location for matching purposes
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await authenticate(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Verify user is a delivery partner
    if (authResult.user.role !== UserRole.DELIVERY_PARTNER) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only delivery partners can update location',
          },
        },
        { status: 403 }
      );
    }

    // Get delivery partner profile
    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { userId: authResult.user.id },
    });

    if (!deliveryPartner) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Delivery partner profile not found',
          },
        },
        { status: 404 }
      );
    }

    // Apply rate limiting (1 request per 10 seconds)
    const rateLimitResponse = await locationUpdateRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = locationUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { latitude, longitude } = validationResult.data;

    // Update location (works with or without active delivery)
    const result = await LocationTrackingService.updateDeliveryPartnerLocation(
      deliveryPartner.id,
      latitude,
      longitude
    );

    // Build response based on whether there's an active delivery
    const responseData: any = {
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    };

    if (result.orderId && result.eta !== null) {
      // Has active delivery - include ETA and order info
      responseData.orderId = result.orderId;
      responseData.eta = result.eta;
      responseData.message = 'Location updated with ETA';
    } else {
      // No active delivery - just location update
      responseData.message = 'Location updated (available for matching)';
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Error updating delivery partner location:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle specific error cases
    if (errorMessage.includes('Invalid coordinates')) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_COORDINATES',
            message: errorMessage,
          },
        },
        { status: 400 }
      );
    }

    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: errorMessage,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update location',
        },
      },
      { status: 500 }
    );
  }
}
