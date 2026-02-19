import { NextRequest, NextResponse } from 'next/server';
import { vendorLocationSchema } from '@/schemas/geolocation.schema';
import { authenticate } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/vendors/:vendorId/location - Update vendor location
 * Allows vendors to set their business location and service radius
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params;

    // Authenticate user
    const authResult = await authenticate(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // Get vendor to verify ownership
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        userId: true,
        businessName: true,
      },
    });

    if (!vendor) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Vendor not found',
          },
        },
        { status: 404 }
      );
    }

    // Check if user is vendor owner or admin
    const isOwner = vendor.userId === authResult.user.id;
    const isAdmin = authResult.user.role === 'SUPER_ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this vendor location',
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = vendorLocationSchema.parse(body);

    // Update vendor location
    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        serviceRadiusKm: validatedData.serviceRadiusKm,
      },
      select: {
        id: true,
        businessName: true,
        latitude: true,
        longitude: true,
        serviceRadiusKm: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedVendor, { status: 200 });
  } catch (error: unknown) {
    console.error('Error updating vendor location:', error);

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid location data',
            details: 'errors' in error ? error.errors : undefined,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update vendor location',
        },
      },
      { status: 500 }
    );
  }
}
