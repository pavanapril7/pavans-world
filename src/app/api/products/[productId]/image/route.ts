import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { ImageUploadService } from '@/services/image-upload.service';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/products/:productId/image - Upload product image
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

    // Get product and verify vendor ownership
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        vendorId: true,
        imageUrl: true,
        vendor: {
          select: {
            userId: true,
          },
        },
      },
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

    // Verify vendor ownership (product.vendor.userId === user.id)
    if (authResult.user.role !== 'VENDOR' || authResult.user.id !== product.vendor.userId) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Not authorized to update this product',
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
      type: 'product',
    });

    // Update product record
    await prisma.product.update({
      where: { id: productId },
      data: { imageUrl: result.url },
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
