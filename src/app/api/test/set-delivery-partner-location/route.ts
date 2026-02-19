import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * TEST ENDPOINT - Remove in production
 * POST /api/test/set-delivery-partner-location
 * Manually set delivery partner location for testing
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { deliveryPartnerId, latitude, longitude } = body;

    if (!deliveryPartnerId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: deliveryPartnerId, latitude, longitude' },
        { status: 400 }
      );
    }

    // Update delivery partner location
    const updated = await prisma.deliveryPartner.update({
      where: { id: deliveryPartnerId },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
        lastLocationUpdate: new Date(),
        status: 'AVAILABLE',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        currentLatitude: updated.currentLatitude,
        currentLongitude: updated.currentLongitude,
        status: updated.status,
        lastLocationUpdate: updated.lastLocationUpdate,
      },
    });
  } catch (error) {
    console.error('Error setting delivery partner location:', error);
    return NextResponse.json(
      { error: 'Failed to set location' },
      { status: 500 }
    );
  }
}
