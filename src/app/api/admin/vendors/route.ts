import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth.middleware';
import { UserRole, UserStatus } from '@prisma/client';
import { AuthService } from '@/services/auth.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createVendorSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  businessName: z.string().min(1, 'Business name is required'),
  description: z.string().min(1, 'Description is required'),
  categoryId: z.string().min(1, 'Category is required'),
  serviceAreaId: z.string().min(1, 'Service area is required'),
});

/**
 * POST /api/admin/vendors
 * Create a new vendor (admin only)
 */
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const body = await request.json();

      // Validate input
      const validatedData = createVendorSchema.parse(body);

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: validatedData.email }, { phone: validatedData.phone }],
        },
      });

      if (existingUser) {
        throw new Error('User with this email or phone already exists');
      }

      // Hash password
      const passwordHash = await AuthService.hashPassword(validatedData.password);

      // Create user with vendor profile in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: validatedData.email,
            phone: validatedData.phone,
            passwordHash,
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            role: UserRole.VENDOR,
            status: UserStatus.ACTIVE,
          },
        });

        // Create vendor profile
        const vendor = await tx.vendor.create({
          data: {
            userId: user.id,
            businessName: validatedData.businessName,
            description: validatedData.description,
            categoryId: validatedData.categoryId,
            serviceAreaId: validatedData.serviceAreaId,
            status: 'ACTIVE',
          },
          include: {
            category: true,
            serviceArea: true,
          },
        });

        return { user, vendor };
      });

      return NextResponse.json(
        {
          success: true,
          data: result,
          message: 'Vendor created successfully',
        },
        { status: 201 }
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

      if (error instanceof Error) {
        return NextResponse.json(
          {
            error: {
              code: 'CREATE_FAILED',
              message: error.message,
            },
          },
          { status: 400 }
        );
      }

      console.error('Error creating vendor:', error);
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create vendor',
          },
        },
        { status: 500 }
      );
    }
  },
  { roles: [UserRole.SUPER_ADMIN] }
);

