import { prisma } from '@/lib/prisma';
import { OrderStatus, Prisma, UserRole, FulfillmentMethod } from '@prisma/client';
import { notificationService } from './notification.service';
import { MealSlotService } from './meal-slot.service';
import { FulfillmentService } from './fulfillment.service';

export interface CreateOrderInput {
  customerId: string;
  vendorId: string;
  deliveryAddressId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  mealSlotId?: string;
  fulfillmentMethod: FulfillmentMethod;
  preferredDeliveryStart?: string;
  preferredDeliveryEnd?: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  customerId?: string;
  vendorId?: string;
  deliveryPartnerId?: string;
  startDate?: Date;
  endDate?: Date;
  mealSlotId?: string;
  fulfillmentMethod?: FulfillmentMethod;
}

export class OrderService {
  /**
   * Generate unique human-readable order number
   * Format: ORD-YYYYMMDD-XXXXX (e.g., ORD-20260129-00001)
   */
  static async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get count of orders created today
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const todayOrderCount = await prisma.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
    
    const sequence = String(todayOrderCount + 1).padStart(5, '0');
    return `ORD-${dateStr}-${sequence}`;
  }

  /**
   * Create a new order from cart or direct items
   */
  static async createOrder(data: CreateOrderInput) {
    const { 
      customerId, 
      vendorId, 
      deliveryAddressId, 
      items, 
      subtotal, 
      deliveryFee, 
      tax, 
      total,
      mealSlotId,
      fulfillmentMethod,
      preferredDeliveryStart,
      preferredDeliveryEnd,
    } = data;

    // Verify customer exists
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Verify vendor exists and is active
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    if (vendor.status !== 'ACTIVE') {
      throw new Error('Vendor is not currently active');
    }

    // Validate meal slot availability if provided
    if (mealSlotId) {
      const isAvailable = await MealSlotService.validateMealSlotAvailability(mealSlotId);
      if (!isAvailable) {
        throw new Error('Meal slot is not available for ordering');
      }

      // Validate delivery window if provided
      if (preferredDeliveryStart && preferredDeliveryEnd) {
        const mealSlot = await MealSlotService.getMealSlotById(mealSlotId);
        const isValidWindow = MealSlotService.validateDeliveryWindow(
          mealSlot,
          preferredDeliveryStart,
          preferredDeliveryEnd
        );
        if (!isValidWindow) {
          throw new Error('Delivery window is not within meal slot time range');
        }
      }
    }

    // Validate fulfillment method is enabled for vendor
    const isFulfillmentEnabled = await FulfillmentService.validateFulfillmentMethod(
      vendorId,
      fulfillmentMethod
    );
    if (!isFulfillmentEnabled) {
      throw new Error(`${fulfillmentMethod} is not available for this vendor`);
    }

    // Validate delivery address requirement based on fulfillment method
    if (FulfillmentService.requiresDeliveryAddress(fulfillmentMethod)) {
      // Verify delivery address exists and belongs to customer
      const address = await prisma.address.findUnique({
        where: { id: deliveryAddressId },
      });

      if (!address) {
        throw new Error('Delivery address not found');
      }

      if (address.userId !== customerId) {
        throw new Error('Delivery address does not belong to this customer');
      }
    }

    // Verify all products exist, are available, and belong to the vendor
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
    });

    if (products.length !== items.length) {
      throw new Error('One or more products not found');
    }

    for (const product of products) {
      if (product.vendorId !== vendorId) {
        throw new Error(`Product ${product.name} does not belong to this vendor`);
      }

      if (product.status !== 'AVAILABLE') {
        throw new Error(`Product ${product.name} is not available`);
      }
    }

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    // Create order with items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          vendorId,
          deliveryAddressId,
          status: OrderStatus.PENDING,
          subtotal,
          deliveryFee,
          tax,
          total,
          mealSlotId,
          fulfillmentMethod,
          preferredDeliveryStart,
          preferredDeliveryEnd,
        },
      });

      // Create order items
      const orderItems = items.map((item) => {
        const product = products.find((p) => p.id === item.productId)!;
        return {
          orderId: newOrder.id,
          productId: item.productId,
          productName: product.name,
          productPrice: product.price,
          quantity: item.quantity,
          subtotal: Number(product.price) * item.quantity,
        };
      });

      await tx.orderItem.createMany({
        data: orderItems,
      });

      // Create initial status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          status: OrderStatus.PENDING,
          notes: 'Order created',
        },
      });

      // Update vendor total orders
      await tx.vendor.update({
        where: { id: vendorId },
        data: {
          totalOrders: { increment: 1 },
        },
      });

      // Clear the customer's cart for this vendor
      const cart = await tx.cart.findUnique({
        where: {
          customerId_vendorId: {
            customerId,
            vendorId,
          },
        },
      });

      if (cart) {
        // Delete all cart items
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        // Delete the cart
        await tx.cart.delete({
          where: { id: cart.id },
        });
      }

      return newOrder;
    });

    // Send notification for order placed (Requirements: 6.1)
    try {
      await notificationService.notifyOrderPlaced(order.id);
    } catch (error) {
      console.error('[OrderService] Failed to send order placed notification:', error);
      // Don't fail the order creation if notification fails
    }

    // Return order with full details
    return this.getOrderById(order.id);
  }

  /**
   * Get order by ID with full details
   */
  static async getOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
            user: {
              select: {
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
        mealSlot: true,
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
            timestamp: 'desc',
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
   * Get order by order number
   */
  static async getOrderByNumber(orderNumber: string) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
            user: {
              select: {
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
        mealSlot: true,
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
            timestamp: 'desc',
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
   * List orders with filters and role-based access
   */
  static async listOrders(
    userId: string,
    userRole: UserRole,
    filters: OrderFilters = {},
    page = 1,
    limit = 20
  ) {
    const where: Prisma.OrderWhereInput = {};

    // Apply role-based filtering
    if (userRole === UserRole.CUSTOMER) {
      where.customerId = userId;
    } else if (userRole === UserRole.VENDOR) {
      // Get vendor ID for this user
      const vendor = await prisma.vendor.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!vendor) {
        throw new Error('Vendor profile not found for this user');
      }

      where.vendorId = vendor.id;
    } else if (userRole === UserRole.DELIVERY_PARTNER) {
      // Get delivery partner ID for this user
      const deliveryPartner = await prisma.deliveryPartner.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!deliveryPartner) {
        throw new Error('Delivery partner profile not found for this user');
      }

      where.deliveryPartnerId = deliveryPartner.id;
    }
    // SUPER_ADMIN can see all orders, no additional filtering

    // Apply additional filters
    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.customerId && userRole === UserRole.SUPER_ADMIN) {
      where.customerId = filters.customerId;
    }

    if (filters.vendorId && userRole === UserRole.SUPER_ADMIN) {
      where.vendorId = filters.vendorId;
    }

    if (filters.deliveryPartnerId && userRole === UserRole.SUPER_ADMIN) {
      where.deliveryPartnerId = filters.deliveryPartnerId;
    }

    if (filters.mealSlotId) {
      where.mealSlotId = filters.mealSlotId;
    }

    if (filters.fulfillmentMethod) {
      where.fulfillmentMethod = filters.fulfillmentMethod;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          vendor: {
            select: {
              id: true,
              businessName: true,
            },
          },
          deliveryPartner: {
            select: {
              id: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          mealSlot: {
            select: {
              id: true,
              name: true,
              startTime: true,
              endTime: true,
            },
          },
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              subtotal: true,
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
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update order status with history tracking
   */
  static async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    notes?: string
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Update order and create status history in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: newStatus,
          notes: notes || `Order status changed to ${newStatus}`,
        },
      });

      return updated;
    });

    // Send notification for status change (Requirements: 6.4, 8.2)
    try {
      await notificationService.notifyOrderStatusChange(orderId, newStatus);
    } catch (error) {
      console.error('[OrderService] Failed to send order status notification:', error);
      // Don't fail the status update if notification fails
    }

    return updatedOrder;
  }

  /**
   * Vendor accepts order
   */
  static async acceptOrder(orderId: string, vendorId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.vendorId !== vendorId) {
      throw new Error('Order does not belong to this vendor');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new Error('Order can only be accepted when in PENDING status');
    }

    await this.updateOrderStatus(orderId, OrderStatus.ACCEPTED, 'Order accepted by vendor');

    return this.getOrderById(orderId);
  }

  /**
   * Vendor rejects order
   */
  static async rejectOrder(orderId: string, vendorId: string, reason?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.vendorId !== vendorId) {
      throw new Error('Order does not belong to this vendor');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new Error('Order can only be rejected when in PENDING status');
    }

    await this.updateOrderStatus(
      orderId,
      OrderStatus.REJECTED,
      reason || 'Order rejected by vendor'
    );

    return this.getOrderById(orderId);
  }

  /**
   * Vendor marks order as ready for pickup
   */
  static async markOrderReady(orderId: string, vendorId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.vendorId !== vendorId) {
      throw new Error('Order does not belong to this vendor');
    }

    if (order.status !== OrderStatus.ACCEPTED && order.status !== OrderStatus.PREPARING) {
      throw new Error('Order must be in ACCEPTED or PREPARING status');
    }

    await this.updateOrderStatus(
      orderId,
      OrderStatus.READY_FOR_PICKUP,
      'Order ready for pickup'
    );

    return this.getOrderById(orderId);
  }

  /**
   * Assign delivery partner to order
   */
  static async assignDeliveryPartner(orderId: string, deliveryPartnerId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== OrderStatus.READY_FOR_PICKUP) {
      throw new Error('Order must be ready for pickup before assigning delivery partner');
    }

    if (order.deliveryPartnerId) {
      throw new Error('Order already has a delivery partner assigned');
    }

    // Verify delivery partner exists
    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { id: deliveryPartnerId },
    });

    if (!deliveryPartner) {
      throw new Error('Delivery partner not found');
    }

    // Update order with delivery partner and change status
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          deliveryPartnerId,
          status: OrderStatus.ASSIGNED_TO_DELIVERY,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatus.ASSIGNED_TO_DELIVERY,
          notes: 'Order assigned to delivery partner',
        },
      });
    });

    return this.getOrderById(orderId);
  }

  /**
   * Cancel order
   */
  static async cancelOrder(orderId: string, userId: string, userRole: UserRole, reason?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Verify user has permission to cancel
    if (userRole === UserRole.CUSTOMER && order.customerId !== userId) {
      throw new Error('You do not have permission to cancel this order');
    }

    // Check if order can be cancelled
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REJECTED
    ) {
      throw new Error('Order cannot be cancelled in current status');
    }

    await this.updateOrderStatus(
      orderId,
      OrderStatus.CANCELLED,
      reason || 'Order cancelled'
    );

    return this.getOrderById(orderId);
  }
}
