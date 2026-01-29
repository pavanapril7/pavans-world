import { prisma } from '@/lib/prisma';
import { OrderStatus, DeliveryPartnerStatus } from '@prisma/client';
import { OrderService } from './order.service';

export interface DeliveryFilters {
  serviceAreaId?: string;
  status?: OrderStatus;
}

export class DeliveryService {
  /**
   * Get available delivery requests for a delivery partner
   * Returns orders that are READY_FOR_PICKUP and in the partner's service area
   */
  static async getAvailableDeliveries(deliveryPartnerId: string, filters: DeliveryFilters = {}) {
    // Get delivery partner details
    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { id: deliveryPartnerId },
      include: {
        serviceArea: true,
      },
    });

    if (!deliveryPartner) {
      throw new Error('Delivery partner not found');
    }

    // Build where clause
    const where: any = {
      status: OrderStatus.READY_FOR_PICKUP,
      deliveryPartnerId: null, // Not yet assigned
    };

    // Filter by service area - orders from vendors in the same service area
    where.vendor = {
      serviceAreaId: deliveryPartner.serviceAreaId,
    };

    // Apply additional filters
    if (filters.serviceAreaId) {
      where.vendor.serviceAreaId = filters.serviceAreaId;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            user: {
              select: {
                phone: true,
              },
            },
          },
        },
        deliveryAddress: true,
        items: {
          select: {
            productName: true,
            quantity: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Oldest first
      },
    });

    return orders;
  }

  /**
   * Accept a delivery request
   * Assigns the order to the delivery partner
   */
  static async acceptDelivery(orderId: string, deliveryPartnerId: string) {
    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Verify order is ready for pickup
    if (order.status !== OrderStatus.READY_FOR_PICKUP) {
      throw new Error('Order is not ready for pickup');
    }

    // Verify order is not already assigned
    if (order.deliveryPartnerId) {
      throw new Error('Order is already assigned to another delivery partner');
    }

    // Get delivery partner
    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { id: deliveryPartnerId },
      include: {
        serviceArea: true,
      },
    });

    if (!deliveryPartner) {
      throw new Error('Delivery partner not found');
    }

    // Verify delivery partner is available
    if (deliveryPartner.status !== DeliveryPartnerStatus.AVAILABLE) {
      throw new Error('Delivery partner is not available');
    }

    // Verify order is in the same service area
    const vendor = await prisma.vendor.findUnique({
      where: { id: order.vendorId },
      select: { serviceAreaId: true },
    });

    if (vendor?.serviceAreaId !== deliveryPartner.serviceAreaId) {
      throw new Error('Order is not in your service area');
    }

    // Assign delivery partner to order
    await OrderService.assignDeliveryPartner(orderId, deliveryPartnerId);

    // Update delivery partner status to BUSY
    await prisma.deliveryPartner.update({
      where: { id: deliveryPartnerId },
      data: { status: DeliveryPartnerStatus.BUSY },
    });

    return OrderService.getOrderById(orderId);
  }

  /**
   * Mark order as picked up
   */
  static async markPickedUp(orderId: string, deliveryPartnerId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Verify order is assigned to this delivery partner
    if (order.deliveryPartnerId !== deliveryPartnerId) {
      throw new Error('Order is not assigned to you');
    }

    // Verify order status
    if (order.status !== OrderStatus.ASSIGNED_TO_DELIVERY) {
      throw new Error('Order must be in ASSIGNED_TO_DELIVERY status');
    }

    await OrderService.updateOrderStatus(
      orderId,
      OrderStatus.PICKED_UP,
      'Order picked up by delivery partner'
    );

    return OrderService.getOrderById(orderId);
  }

  /**
   * Mark order as in transit
   */
  static async markInTransit(orderId: string, deliveryPartnerId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Verify order is assigned to this delivery partner
    if (order.deliveryPartnerId !== deliveryPartnerId) {
      throw new Error('Order is not assigned to you');
    }

    // Verify order status
    if (order.status !== OrderStatus.PICKED_UP) {
      throw new Error('Order must be in PICKED_UP status');
    }

    await OrderService.updateOrderStatus(
      orderId,
      OrderStatus.IN_TRANSIT,
      'Order is in transit'
    );

    return OrderService.getOrderById(orderId);
  }

  /**
   * Mark order as delivered
   */
  static async markDelivered(orderId: string, deliveryPartnerId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Verify order is assigned to this delivery partner
    if (order.deliveryPartnerId !== deliveryPartnerId) {
      throw new Error('Order is not assigned to you');
    }

    // Verify order status
    if (order.status !== OrderStatus.IN_TRANSIT) {
      throw new Error('Order must be in IN_TRANSIT status');
    }

    // Update order status and delivery partner stats in transaction
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DELIVERED },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatus.DELIVERED,
          notes: 'Order delivered successfully',
        },
      });

      // Update delivery partner stats and status
      await tx.deliveryPartner.update({
        where: { id: deliveryPartnerId },
        data: {
          totalDeliveries: { increment: 1 },
          status: DeliveryPartnerStatus.AVAILABLE,
        },
      });
    });

    return OrderService.getOrderById(orderId);
  }

  /**
   * Report delivery issue
   */
  static async reportIssue(orderId: string, deliveryPartnerId: string, issue: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Verify order is assigned to this delivery partner
    if (order.deliveryPartnerId !== deliveryPartnerId) {
      throw new Error('Order is not assigned to you');
    }

    // Create status history entry with issue
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: order.status,
        notes: `Delivery issue reported: ${issue}`,
      },
    });

    return OrderService.getOrderById(orderId);
  }

  /**
   * Get delivery partner's active deliveries
   */
  static async getActiveDeliveries(deliveryPartnerId: string) {
    const orders = await prisma.order.findMany({
      where: {
        deliveryPartnerId,
        status: {
          in: [
            OrderStatus.ASSIGNED_TO_DELIVERY,
            OrderStatus.PICKED_UP,
            OrderStatus.IN_TRANSIT,
          ],
        },
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            user: {
              select: {
                phone: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        deliveryAddress: true,
        items: {
          select: {
            productName: true,
            quantity: true,
          },
        },
        statusHistory: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 5,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return orders;
  }

  /**
   * Get delivery partner's delivery history
   */
  static async getDeliveryHistory(
    deliveryPartnerId: string,
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: {
          deliveryPartnerId,
          status: {
            in: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
          },
        },
        skip,
        take: limit,
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          deliveryAddress: {
            select: {
              street: true,
              city: true,
              pincode: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      prisma.order.count({
        where: {
          deliveryPartnerId,
          status: {
            in: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
          },
        },
      }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
