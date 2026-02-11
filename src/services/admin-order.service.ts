import { prisma } from '@/lib/prisma';
import { OrderStatus, PaymentStatus, Prisma, NotificationType } from '@prisma/client';
import { notificationService } from './notification.service';

export interface AdminOrderFilters {
  status?: OrderStatus;
  vendorId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface AdminOrderStats {
  totalOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  totalRevenue: number;
  averageOrderValue: number;
}

export class AdminOrderService {
  /**
   * Get paginated list of orders with filters (admin only)
   */
  static async listOrders(filters: AdminOrderFilters = {}, page = 1, pageSize = 50) {
    const where: Prisma.OrderWhereInput = {};

    // Apply filters
    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    // Order number search
    if (filters.search) {
      where.orderNumber = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    const skip = (page - 1) * pageSize;

    // Optimized query with selective field fetching
    const [orders, totalItems] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          subtotal: true,
          deliveryFee: true,
          tax: true,
          total: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          vendor: {
            select: {
              id: true,
              businessName: true,
              user: {
                select: {
                  email: true,
                  phone: true,
                },
              },
            },
          },
          deliveryPartner: {
            select: {
              id: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
          payment: {
            select: {
              id: true,
              method: true,
              status: true,
              gatewayTransactionId: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / pageSize),
        pageSize,
        totalItems,
      },
    };
  }

  /**
   * Get order statistics with filters (admin only)
   */
  static async getOrderStats(filters: AdminOrderFilters = {}): Promise<AdminOrderStats> {
    const where: Prisma.OrderWhereInput = {};

    // Apply filters
    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    // Get total orders
    const totalOrders = await prisma.order.count({ where });

    // Get orders by status
    const ordersByStatusRaw = await prisma.order.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true,
      },
    });

    // Initialize all statuses with 0
    const ordersByStatus: Record<OrderStatus, number> = {
      PENDING: 0,
      ACCEPTED: 0,
      PREPARING: 0,
      READY_FOR_PICKUP: 0,
      ASSIGNED_TO_DELIVERY: 0,
      PICKED_UP: 0,
      IN_TRANSIT: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      REJECTED: 0,
    };

    // Fill in actual counts
    ordersByStatusRaw.forEach((item) => {
      ordersByStatus[item.status] = item._count.status;
    });

    // Calculate total revenue (only completed payments)
    const revenueResult = await prisma.order.aggregate({
      where: {
        ...where,
        payment: {
          status: PaymentStatus.COMPLETED,
        },
      },
      _sum: {
        total: true,
      },
    });

    const totalRevenue = Number(revenueResult._sum.total || 0);

    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalOrders,
      ordersByStatus,
      totalRevenue,
      averageOrderValue,
    };
  }

  /**
   * Get detailed order information (admin only)
   */
  static async getOrderById(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            user: {
              select: {
                email: true,
                phone: true,
              },
            },
          },
        },
        deliveryPartner: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            vehicleType: true,
            vehicleNumber: true,
          },
        },
        deliveryAddress: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: {
            timestamp: 'asc',
          },
        },
        payment: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  /**
   * Cancel order (admin action)
   */
  static async cancelOrder(orderId: string, reason: string, notifyCustomer = true) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Check if order can be cancelled
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REJECTED
    ) {
      throw new Error('Order cannot be cancelled in current status');
    }

    // Update order status and create history in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatus.CANCELLED,
          notes: `Admin cancelled order: ${reason}`,
        },
      });

      // Initiate refund if payment was completed
      if (order.payment && order.payment.status === PaymentStatus.COMPLETED) {
        await tx.refund.create({
          data: {
            paymentId: order.payment.id,
            amount: order.total,
            reason: `Order cancelled by admin: ${reason}`,
            status: PaymentStatus.PENDING,
          },
        });
      }

      return updated;
    });

    // Send notifications
    if (notifyCustomer) {
      try {
        await notificationService.notifyOrderStatusChange(orderId, OrderStatus.CANCELLED);
      } catch (error) {
        console.error('[AdminOrderService] Failed to send cancellation notification:', error);
      }
    }

    return {
      order: updatedOrder,
      refundInitiated: order.payment?.status === PaymentStatus.COMPLETED,
    };
  }

  /**
   * Add admin note to order
   */
  static async addNote(orderId: string, content: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Create status history entry with admin note
    const note = await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: order.status, // Keep current status
        notes: `[Admin Note] ${content}`,
      },
    });

    return note;
  }

  /**
   * Reassign delivery partner (admin action)
   */
  static async reassignDeliveryPartner(orderId: string, newDeliveryPartnerId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        deliveryPartner: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Verify new delivery partner exists
    const newDeliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { id: newDeliveryPartnerId },
      include: {
        user: true,
      },
    });

    if (!newDeliveryPartner) {
      throw new Error('Delivery partner not found');
    }

    const oldDeliveryPartner = order.deliveryPartner;

    // Update order with new delivery partner
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          deliveryPartnerId: newDeliveryPartnerId,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: order.status,
          notes: `Admin reassigned delivery partner`,
        },
      });

      return updated;
    });

    // Send notifications to both old and new delivery partners
    try {
      // Notify old delivery partner (if exists)
      if (oldDeliveryPartner) {
        await notificationService.createNotification({
          userId: oldDeliveryPartner.userId,
          type: NotificationType.ORDER_CANCELLED,
          title: 'Delivery Reassigned',
          message: `Order ${order.orderNumber} has been reassigned to another delivery partner.`,
        });
      }

      // Notify new delivery partner
      await notificationService.createNotification({
        userId: newDeliveryPartner.userId,
        type: NotificationType.ORDER_READY,
        title: 'New Delivery Assigned',
        message: `You have been assigned to deliver order ${order.orderNumber}.`,
      });
    } catch (error) {
      console.error('[AdminOrderService] Failed to send reassignment notification:', error);
    }

    return updatedOrder;
  }
}
