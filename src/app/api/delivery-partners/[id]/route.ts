import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateDeliveryPartnerSchema = z.object({
  vehicleType: z.string().optional(),
  vehicleNumber: z.string().optional(),
  serviceAreaId: z.string().uuid().optional(),
});

/**
 * PATCH /api/delivery-partners/[id]
 * Update delivery partner details (admin only)
 */
export const PATCH = withAuth(
  async (request: NextRequest, context: { params?: Record<string, string> }) => {
    try {
      const params = await Promise.resolve(context.params);
      const id = params?.id;

      if (!id) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              message: 'Delivery partner ID is required',
            },
          },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate input
      const validatedData = updateDeliveryPartnerSchema.parse(body);

      // Check if delivery partner exists
      const existingPartner = await prisma.deliveryPartner.findUnique({
        where: { id },
      });

      if (!existingPartner) {
        return NextResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Delivery partner not found',
            },
          },
          { status: 404 }
        );
      }

      // If service area is being updated, verify it exists
      if (validatedData.serviceAreaId) {
        const serviceArea = await prisma.serviceArea.findUnique({
          where: { id: validatedData.serviceAreaId },
        });

        if (!serviceArea) {
          return NextResponse.json(
            {
              error: {
                code: 'INVALID_SERVICE_AREA',
                message: 'Service area not found',
              },
            },
            { status: 400 }
          );
        }
      }

      // Update delivery partner
      const updatedPartner = await prisma.deliveryPartner.update({
        where: { id },
        data: {
          ...(validatedData.vehicleType && { vehicleType: validatedData.vehicleType }),
          ...(validatedData.vehicleNumber && { vehicleNumber: validatedData.vehicleNumber }),
          ...(validatedData.serviceAreaId && { serviceAreaId: validatedData.serviceAreaId }),
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          serviceArea: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: updatedPartner,
          message: 'Delivery partner updated successfully',
        },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input data',
              details: error.issues.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
              })),
            },
          },
          { status: 400 }
        );
      }

      console.error('Error updating delivery partner:', error);
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update delivery partner',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.SUPER_ADMIN] }
);
