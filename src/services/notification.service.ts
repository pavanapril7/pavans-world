/**
 * Notification Service
 * Orchestrates notification creation and delivery across multiple channels
 */

import { prisma } from '@/lib/prisma';
import { NotificationType, OrderStatus } from '@prisma/client';
import { smsService } from './sms.service';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

export interface NotificationWithUser {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export class NotificationService {
  /**
   * Create a notification in the database
   */
  async createNotification(
    input: CreateNotificationInput
  ): Promise<NotificationWithUser> {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
      },
    });

    return notification;
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<NotificationWithUser[]> {
    const { unreadOnly = false, limit = 50, offset = 0 } = options || {};

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return notifications;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId, // Ensure user owns the notification
        },
        data: {
          isRead: true,
        },
      });

      return true;
    } catch (error) {
      console.error('[NotificationService] Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return result.count;
    } catch (error) {
      console.error('[NotificationService] Error marking all notifications as read:', error);
      return 0;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return count;
  }

  /**
   * Send order placed notification
   * Requirements: 6.1 - WHEN a customer places an order THEN the System SHALL notify the vendor immediately
   */
  async notifyOrderPlaced(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          vendor: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Notify vendor
      await this.createNotification({
        userId: order.vendor.userId,
        type: NotificationType.ORDER_PLACED,
        title: 'New Order Received',
        message: `New order ${order.orderNumber} from ${order.customer.firstName} ${order.customer.lastName}. Total: ₹${order.total}`,
      });

      // Send SMS to vendor
      await smsService.sendOrderPlacedNotification(
        order.vendor.user.phone,
        order.orderNumber,
        order.vendor.businessName
      );

      // Notify customer
      await this.createNotification({
        userId: order.customerId,
        type: NotificationType.ORDER_PLACED,
        title: 'Order Placed Successfully',
        message: `Your order ${order.orderNumber} has been placed with ${order.vendor.businessName}.`,
      });

      // Send SMS to customer
      await smsService.sendOrderPlacedNotification(
        order.customer.phone,
        order.orderNumber,
        order.vendor.businessName
      );
    } catch (error) {
      console.error('[NotificationService] Error notifying order placed:', error);
      throw error;
    }
  }

  /**
   * Send order status change notification
   * Requirements: 6.4 - WHEN a vendor marks an order as ready THEN the System SHALL notify available delivery partners
   * Requirements: 8.2 - WHEN a delivery partner marks an order as in transit THEN the System SHALL notify the customer
   */
  async notifyOrderStatusChange(
    orderId: string,
    newStatus: OrderStatus
  ): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          vendor: {
            include: {
              user: true,
            },
          },
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

      const statusMessages: Record<OrderStatus, { title: string; message: string }> = {
        PENDING: {
          title: 'Order Pending',
          message: 'Your order is pending confirmation.',
        },
        ACCEPTED: {
          title: 'Order Accepted',
          message: `Your order ${order.orderNumber} has been accepted by ${order.vendor.businessName}.`,
        },
        PREPARING: {
          title: 'Order Being Prepared',
          message: `Your order ${order.orderNumber} is being prepared.`,
        },
        READY_FOR_PICKUP: {
          title: 'Order Ready for Pickup',
          message: `Your order ${order.orderNumber} is ready for pickup.`,
        },
        ASSIGNED_TO_DELIVERY: {
          title: 'Delivery Partner Assigned',
          message: `A delivery partner has been assigned to your order ${order.orderNumber}.`,
        },
        PICKED_UP: {
          title: 'Order Picked Up',
          message: `Your order ${order.orderNumber} has been picked up by the delivery partner.`,
        },
        IN_TRANSIT: {
          title: 'Order In Transit',
          message: `Your order ${order.orderNumber} is on the way to you.`,
        },
        DELIVERED: {
          title: 'Order Delivered',
          message: `Your order ${order.orderNumber} has been delivered. Enjoy!`,
        },
        CANCELLED: {
          title: 'Order Cancelled',
          message: `Your order ${order.orderNumber} has been cancelled.`,
        },
        REJECTED: {
          title: 'Order Rejected',
          message: `Your order ${order.orderNumber} has been rejected by the vendor.`,
        },
      };

      const notificationContent = statusMessages[newStatus];

      // Notify customer about status change
      await this.createNotification({
        userId: order.customerId,
        type: this.mapOrderStatusToNotificationType(newStatus),
        title: notificationContent.title,
        message: notificationContent.message,
      });

      // Send SMS to customer
      await smsService.sendOrderStatusNotification(
        order.customer.phone,
        order.orderNumber,
        newStatus
      );

      // Special handling for READY_FOR_PICKUP - notify delivery partners
      if (newStatus === OrderStatus.READY_FOR_PICKUP) {
        // Find available delivery partners in the same service area
        const deliveryPartners = await prisma.deliveryPartner.findMany({
          where: {
            serviceAreaId: order.vendor.serviceAreaId,
            status: 'AVAILABLE',
          },
          include: {
            user: true,
          },
        });

        // Notify all available delivery partners
        for (const partner of deliveryPartners) {
          await this.createNotification({
            userId: partner.userId,
            type: NotificationType.ORDER_READY,
            title: 'New Delivery Available',
            message: `Order ${order.orderNumber} is ready for pickup from ${order.vendor.businessName}.`,
          });

          // Send SMS to delivery partner
          await smsService.sendDeliveryAssignmentNotification(
            partner.user.phone,
            order.orderNumber
          );
        }
      }

      // Notify vendor for certain status changes
      if (
        newStatus === OrderStatus.PICKED_UP ||
        newStatus === OrderStatus.DELIVERED
      ) {
        await this.createNotification({
          userId: order.vendor.userId,
          type: this.mapOrderStatusToNotificationType(newStatus),
          title: notificationContent.title,
          message: `Order ${order.orderNumber} ${newStatus === OrderStatus.PICKED_UP ? 'has been picked up' : 'has been delivered'}.`,
        });
      }
    } catch (error) {
      console.error('[NotificationService] Error notifying order status change:', error);
      throw error;
    }
  }

  /**
   * Send payment success notification
   */
  async notifyPaymentSuccess(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          payment: true,
        },
      });

      if (!order || !order.payment) {
        throw new Error('Order or payment not found');
      }

      await this.createNotification({
        userId: order.customerId,
        type: NotificationType.PAYMENT_SUCCESS,
        title: 'Payment Successful',
        message: `Payment of ₹${order.payment.amount} for order ${order.orderNumber} was successful.`,
      });
    } catch (error) {
      console.error('[NotificationService] Error notifying payment success:', error);
      throw error;
    }
  }

  /**
   * Send payment failed notification
   */
  async notifyPaymentFailed(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          payment: true,
        },
      });

      if (!order || !order.payment) {
        throw new Error('Order or payment not found');
      }

      await this.createNotification({
        userId: order.customerId,
        type: NotificationType.PAYMENT_FAILED,
        title: 'Payment Failed',
        message: `Payment for order ${order.orderNumber} failed. Please try again.`,
      });
    } catch (error) {
      console.error('[NotificationService] Error notifying payment failed:', error);
      throw error;
    }
  }

  /**
   * Map order status to notification type
   */
  private mapOrderStatusToNotificationType(
    status: OrderStatus
  ): NotificationType {
    const mapping: Record<OrderStatus, NotificationType> = {
      PENDING: NotificationType.ORDER_PLACED,
      ACCEPTED: NotificationType.ORDER_ACCEPTED,
      PREPARING: NotificationType.ORDER_ACCEPTED,
      READY_FOR_PICKUP: NotificationType.ORDER_READY,
      ASSIGNED_TO_DELIVERY: NotificationType.ORDER_READY,
      PICKED_UP: NotificationType.ORDER_PICKED_UP,
      IN_TRANSIT: NotificationType.ORDER_PICKED_UP,
      DELIVERED: NotificationType.ORDER_DELIVERED,
      CANCELLED: NotificationType.ORDER_CANCELLED,
      REJECTED: NotificationType.ORDER_CANCELLED,
    };

    return mapping[status] || NotificationType.ORDER_PLACED;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
