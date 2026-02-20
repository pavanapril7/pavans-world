import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { ServiceAreaService } from '@/services/service-area.service';
import { createServiceAreaSchema } from '@/schemas/service-area.schema';

/**
 * GET /api/admin/service-areas
 * List all service areas with optional filters (SUPER_ADMIN only)
 */
export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status') || undefined;
      const city = searchParams.get('city') || undefined;

      // Call ServiceAreaService.listServiceAreas
      const serviceAreas = await ServiceAreaService.listServiceAreas({
        status: status as any,
        city,
      });

      // Return service areas
      return NextResponse.json({
        serviceAreas,
      });
    } catch (error) {
      console.error('Error fetching service areas:', error);

      return NextResponse.json(
        {
          error: {
            code: 'FETCH_FAILED',
            message: 'Failed to fetch service areas',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.SUPER_ADMIN] }
);

/**
 * POST /api/admin/service-areas
 * Create a new service area with polygon boundary (SUPER_ADMIN only)
 */
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const body = await request.json();

      // Validate request with createServiceAreaSchema
      const validatedData = createServiceAreaSchema.parse(body);

      // Call ServiceAreaService.createServiceArea
      const result = await ServiceAreaService.createServiceArea({
        name: validatedData.name,
        city: validatedData.city,
        state: validatedData.state,
        boundary: validatedData.boundary,
        pincodes: validatedData.pincodes,
        status: validatedData.status,
      });

      // Return service area with optional warnings
      return NextResponse.json({
        serviceArea: result.serviceArea,
        warnings: result.warnings,
      });
    } catch (error) {
      console.error('Error creating service area:', error);

      // Handle validation errors
      if (error instanceof Error && error.name === 'ZodError') {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input data',
              details: error.message,
            },
          },
          { status: 400 }
        );
      }

      // Handle invalid polygon errors
      if (error instanceof Error && error.message.includes('Invalid polygon')) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_POLYGON',
              message: error.message,
            },
          },
          { status: 400 }
        );
      }

      // Handle duplicate name errors
      if (error instanceof Error && error.message.includes('already exists')) {
        return NextResponse.json(
          {
            error: {
              code: 'DUPLICATE_NAME',
              message: error.message,
            },
          },
          { status: 409 }
        );
      }

      // Handle database errors
      return NextResponse.json(
        {
          error: {
            code: 'CREATE_FAILED',
            message: 'Failed to create service area',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.SUPER_ADMIN] }
);
