import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { ImageUploadService } from '@/services/image-upload.service';
import { AuditLogService } from '@/services/audit-log.service';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/vendors/:vendorId/image - Upload vendor profile image (admin only)
 */
export async function POST(
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

    // Only super admins can access this
    if (authResult.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
        },
        { status: 403 }
      );
    }

    // Get current vendor
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, businessName: true, imageUrl: true },
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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'No image file provided',
          },
        },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload new image
    const result = await ImageUploadService.uploadImage({
      file: buffer,
      filename: file.name,
      mimeType: file.type,
      type: 'vendor',
    });

    // Update vendor record
    await prisma.vendor.update({
      where: { id: vendorId },
      data: { imageUrl: result.url },
    });

    // Log admin action
    await AuditLogService.log({
      userId: authResult.user.id,
      action: 'UPDATE_VENDOR_IMAGE',
      entityType: 'VENDOR',
      entityId: vendorId,
      details: {
        businessName: vendor.businessName,
        oldImageUrl: vendor.imageUrl,
        newImageUrl: result.url,
      },
    });

    // Delete old image if exists
    if (vendor.imageUrl) {
      await ImageUploadService.deleteImage(vendor.imageUrl);
    }

    return NextResponse.json(
      {
        url: result.url,
        size: result.size,
        format: result.format,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error uploading vendor image:', error);

    if (
      error instanceof Error &&
      (error.message.includes('exceeds') || error.message.includes('format'))
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
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
          message: 'Unable to save image. Please try again later',
        },
      },
      { status: 500 }
    );
  }
}
