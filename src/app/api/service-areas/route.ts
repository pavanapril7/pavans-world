import { NextRequest, NextResponse } from 'next/server';
import { createServiceAreaSchema } from '@/schemas/service-area.schema';
import { ZodError } from 'zod';
import { ServiceAreaService } from '@/services/service-area.service';
import { withAuth } from '@/middleware/auth.middleware';
import { UserRole, ServiceAreaStatus } from '@prisma/client';

/**
 * GET /api/service-areas
 * List all service areas with optional status filtering
 * Query params: status (ACTIVE | INACTIVE)
 */
export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status') as ServiceAreaStatus | undefined;

      const serviceAreas = await ServiceAreaService.getServiceAreas(status);

      return NextResponse.json({
        success: true,
        data: serviceAreas,
      }, { status: 200 });
    } catch (error) {
      console.error('Error fetching service areas:', error);
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch service areas',
        },
      }, { status: 500 });
    }
  },
  { roles: [UserRole.SUPER_ADMIN] }
);

/**
 * POST /api/service-areas
 * Create a new service area (admin only)
 */
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      
      // Validate request body
      const validatedData = createServiceAreaSchema.parse(body);
      
      // Create service area
      const serviceArea = await ServiceAreaService.createServiceArea(validatedData);
      
      return NextResponse.json({
        success: true,
        data: serviceArea,
        message: 'Service area created successfully',
      }, { status: 201 });
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        return NextResponse.json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.issues.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
        }, { status: 400 });
      }
      
      // Handle business logic errors
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          return NextResponse.json({
            error: {
              code: 'CONFLICT',
              message: error.message,
            },
          }, { status: 409 });
        }
        
        if (error.message.includes('Missing required fields')) {
          return NextResponse.json({
            error: {
              code: 'VALIDATION_ERROR',
              message: error.message,
            },
          }, { status: 400 });
        }
      }
      
      // Handle other errors
      console.error('Error creating service area:', error);
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create service area',
        },
      }, { status: 500 });
    }
  },
  { roles: [UserRole.SUPER_ADMIN] }
);
