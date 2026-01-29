import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';
import { createOrderSchema, orderFiltersSchema } from '@/schemas/order.schema';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';

/**
 * GET /api/orders - List orders with role-based filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await authenticate(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedParams = orderFiltersSchema.parse(queryParams);

    // Convert date strings to Date objects
    const filters: {
      status?: typeof validatedParams.status;
      startDate?: Date;
      endDate?: Date;
      customerId?: string;
      vendorId?: string;
      deliveryPartnerId?: string;
    } = {
      status: validatedParams.status,
    };

    if (validatedParams.startDate) {
      filters.startDate = new Date(validatedParams.startDate);
    }

    if (validatedParams.endDate) {
      filters.endDate = new Date(validatedParams.endDate);
    }

    // Only super admin can filter by specific customer/vendor/delivery partner
    if (user.role === UserRole.SUPER_ADMIN) {
      if (validatedParams.customerId) {
        filters.customerId = validatedParams.customerId;
      }
      if (validatedParams.vendorId) {
        filters.vendorId = validatedParams.vendorId;
      }
      if (validatedParams.deliveryPartnerId) {
        filters.deliveryPartnerId = validatedParams.deliveryPartnerId;
      }
    }

    const result = await OrderService.listOrders(
      user.id,
      user.role,
      filters,
      validatedParams.page,
      validatedParams.limit
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error listing orders:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: errorMessage } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list orders',
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders - Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await authenticate(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Only customers can create orders
    if (user.role !== UserRole.CUSTOMER) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only customers can create orders' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    // Get vendor ID from first item's product
    // In a real implementation, this would come from the cart or be validated
    const { items } = validatedData;
    
    // For now, we need to get the vendor ID from the products
    // This is a simplified version - in production, you'd validate all products belong to same vendor
    const prisma = (await import('@/lib/prisma')).prisma;
    const firstProduct = await prisma.product.findUnique({
      where: { id: items[0].productId },
      select: { vendorId: true },
    });

    if (!firstProduct) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Product not found' } },
        { status: 404 }
      );
    }

    const order = await OrderService.createOrder({
      customerId: user.id,
      vendorId: firstProduct.vendorId,
      deliveryAddressId: validatedData.deliveryAddressId,
      items: validatedData.items,
      subtotal: validatedData.subtotal,
      deliveryFee: validatedData.deliveryFee,
      tax: validatedData.tax,
      total: validatedData.total,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid order data',
            details: 'errors' in error ? error.errors : undefined,
          },
        },
        { status: 400 }
      );
    }

    if (errorMessage.includes('not found') || errorMessage.includes('not available')) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: errorMessage } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create order',
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
