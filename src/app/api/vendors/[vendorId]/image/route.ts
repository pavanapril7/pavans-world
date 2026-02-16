import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { ImageUploadService } from '@/services/image-upload.service';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/vendors/:vendorId/image - Upload vendor profile image
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

    // Get vendor to verify ownership
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, userId: true, imageUrl: true },
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

    // Verify vendor owns the profile (user.userId === vendor.userId)
    if (authResult.user.role !== 'VENDOR' || authResult.user.id !== vendor.userId) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Not authorized to update this vendor profile',
          },
        },
        { status: 403 }
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
