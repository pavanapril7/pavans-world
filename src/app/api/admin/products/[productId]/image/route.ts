import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { ImageUploadService } from '@/services/image-upload.service';
import { AuditLogService } from '@/services/audit-log.service';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/products/:productId/image - Upload product image (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

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

    // Get current product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, imageUrl: true },
    });

    if (!product) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found',
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
      type: 'product',
    });

    // Update product record
    await prisma.product.update({
      where: { id: productId },
      data: { imageUrl: result.url },
    });

    // Log admin action
    await AuditLogService.log({
      userId: authResult.user.id,
      action: 'UPDATE_PRODUCT_IMAGE',
      entityType: 'PRODUCT',
      entityId: productId,
      details: {
        productName: product.name,
        oldImageUrl: product.imageUrl,
        newImageUrl: result.url,
      },
    });

    // Delete old image if exists
    if (product.imageUrl) {
      await ImageUploadService.deleteImage(product.imageUrl);
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
    console.error('Error uploading product image:', error);

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
