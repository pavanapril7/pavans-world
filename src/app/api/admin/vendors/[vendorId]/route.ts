import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateVendorSchema = z.object({
  businessName: z.string().min(1).optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  serviceAreaId: z.string().optional(),
  status: z.enum(['PENDING_APPROVAL', 'ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

/**
 * PUT /api/admin/vendors/:vendorId - Update vendor (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params;

    // Verify authentication
    const authResult = await authenticate(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Only super admins can access this
    if (authResult.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateVendorSchema.parse(body);

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!existingVendor) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Vendor not found' } },
        { status: 404 }
      );
    }

    // Update vendor
    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: validatedData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        category: true,
        serviceArea: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: vendor,
      message: 'Vendor updated successfully',
    });
  } catch (error) {
    console.error('Error updating vendor:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid vendor data',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update vendor',
        },
      },
      { status: 500 }
    );
  }
}
