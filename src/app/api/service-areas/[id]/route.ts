import { NextRequest, NextResponse } from 'next/server';
import { updateServiceAreaSchema } from '@/schemas/service-area.schema';
import { ZodError } from 'zod';
import { ServiceAreaService } from '@/services/service-area.service';
import { withAuth, AuthUser } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';

/**
 * GET /api/service-areas/:id
 * Get a single service area by ID
 */
export const GET = withAuth(
  async (request: NextRequest, context: { user: AuthUser; params?: Record<string, string> }) => {
    try {
      const serviceAreaId = context.params?.id!;
      const serviceArea = await ServiceAreaService.getServiceAreaById(serviceAreaId);

      return NextResponse.json({
        success: true,
        data: serviceArea,
      }, { status: 200 });
    } catch (error) {
      if (error instanceof Error && error.message === 'Service area not found') {
        return NextResponse.json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        }, { status: 404 });
      }

      console.error('Error fetching service area:', error);
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch service area',
        },
      }, { status: 500 });
    }
  },
  { roles: [UserRole.SUPER_ADMIN] }
);

/**
 * PUT /api/service-areas/:id
 * Update a service area (admin only)
 */
export const PUT = withAuth(
  async (request: NextRequest, context: { user: AuthUser; params?: Record<string, string> }) => {
    try {
      const serviceAreaId = context.params?.id!;
      const body = await request.json();
      
      // Validate request body
      const validatedData = updateServiceAreaSchema.parse(body);
      
      // Update service area
      const serviceArea = await ServiceAreaService.updateServiceArea(serviceAreaId, validatedData);
      
      return NextResponse.json({
        success: true,
        data: serviceArea,
        message: 'Service area updated successfully',
      }, { status: 200 });
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
        if (error.message === 'Service area not found') {
          return NextResponse.json({
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          }, { status: 404 });
        }
        
        if (error.message.includes('already exists')) {
          return NextResponse.json({
            error: {
              code: 'CONFLICT',
              message: error.message,
            },
          }, { status: 409 });
        }
      }
      
      // Handle other errors
      console.error('Error updating service area:', error);
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update service area',
        },
      }, { status: 500 });
    }
  },
  { roles: [UserRole.SUPER_ADMIN] }
);

/**
 * DELETE /api/service-areas/:id
 * Delete a service area (admin only)
 */
export const DELETE = withAuth(
  async (request: NextRequest, context: { user: AuthUser; params?: Record<string, string> }) => {
    try {
      const serviceAreaId = context.params?.id!;
      const result = await ServiceAreaService.deleteServiceArea(serviceAreaId);
      
      return NextResponse.json({
        success: true,
        message: result.message,
      }, { status: 200 });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Service area not found') {
          return NextResponse.json({
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          }, { status: 404 });
        }
        
        if (error.message.includes('Cannot delete')) {
          return NextResponse.json({
            error: {
              code: 'CONFLICT',
              message: error.message,
            },
          }, { status: 409 });
        }
      }

      console.error('Error deleting service area:', error);
      return NextResponse.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete service area',
        },
      }, { status: 500 });
    }
  },
  { roles: [UserRole.SUPER_ADMIN] }
);
