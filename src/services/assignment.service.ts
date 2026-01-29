import { prisma } from '@/lib/prisma';
import { OrderStatus, DeliveryPartnerStatus } from '@prisma/client';

export interface AssignmentStrategy {
  type: 'nearest' | 'least_busy' | 'highest_rated' | 'round_robin';
}

/**
 * Service for managing delivery partner assignment logic
 */
export class AssignmentService {
  /**
   * Find available delivery partners in a service area
   */
  static async findAvailablePartners(serviceAreaId: string) {
    const partners = await prisma.deliveryPartner.findMany({
      where: {
        serviceAreaId,
        status: DeliveryPartnerStatus.AVAILABLE,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    // Filter out partners with inactive users
    return partners.filter((partner) => partner.user.status === 'ACTIVE');
  }

  /**
   * Check if a delivery partner can accept more deliveries
   */
  static async canAcceptDelivery(deliveryPartnerId: string): Promise<boolean> {
    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: deliveryPartnerId },
      include: {
        user: true,
      },
    });

    if (!partner) {
      return false;
    }

    // Check if partner is available and user is active
    if (partner.status !== DeliveryPartnerStatus.AVAILABLE) {
      return false;
    }

    if (partner.user.status !== 'ACTIVE') {
      return false;
    }

    // Check if partner has any active deliveries
    const activeDeliveries = await prisma.order.count({
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
    });

    // For now, allow only one active delivery at a time
    return activeDeliveries === 0;
  }

  /**
   * Verify assignment exclusivity - ensure order is not already assigned
   */
  static async verifyAssignmentExclusivity(orderId: string): Promise<boolean> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        deliveryPartnerId: true,
        status: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Order should not have a delivery partner assigned
    if (order.deliveryPartnerId !== null) {
      return false;
    }

    // Order should be in READY_FOR_PICKUP status
    if (order.status !== OrderStatus.READY_FOR_PICKUP) {
      return false;
    }

    return true;
  }

  /**
   * Get the best available delivery partner based on strategy
   */
  static async getBestAvailablePartner(
    serviceAreaId: string,
    strategy: AssignmentStrategy = { type: 'highest_rated' }
  ) {
    const availablePartners = await this.findAvailablePartners(serviceAreaId);

    if (availablePartners.length === 0) {
      return null;
    }

    // Filter partners who can accept deliveries
    const eligiblePartners = [];
    for (const partner of availablePartners) {
      const canAccept = await this.canAcceptDelivery(partner.id);
      if (canAccept) {
        eligiblePartners.push(partner);
      }
    }

    if (eligiblePartners.length === 0) {
      return null;
    }

    // Apply strategy
    switch (strategy.type) {
      case 'highest_rated':
        return eligiblePartners.sort((a, b) => Number(b.rating) - Number(a.rating))[0];

      case 'least_busy':
        // Already filtered to only available partners with no active deliveries
        return eligiblePartners[0];

      case 'round_robin':
        // Return partner with lowest total deliveries
        return eligiblePartners.sort((a, b) => a.totalDeliveries - b.totalDeliveries)[0];

      default:
        return eligiblePartners[0];
    }
  }

  /**
   * Auto-assign order to best available delivery partner
   */
  static async autoAssignOrder(orderId: string, strategy?: AssignmentStrategy) {
    // Verify order can be assigned
    const isExclusive = await this.verifyAssignmentExclusivity(orderId);
    if (!isExclusive) {
      throw new Error('Order cannot be assigned - already assigned or not ready');
    }

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        vendor: {
          select: {
            serviceAreaId: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Find best available partner
    const partner = await this.getBestAvailablePartner(
      order.vendor.serviceAreaId,
      strategy
    );

    if (!partner) {
      throw new Error('No available delivery partners in this service area');
    }

    // Assign partner to order
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          deliveryPartnerId: partner.id,
          status: OrderStatus.ASSIGNED_TO_DELIVERY,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatus.ASSIGNED_TO_DELIVERY,
          notes: `Auto-assigned to delivery partner ${partner.user.firstName} ${partner.user.lastName}`,
        },
      });

      await tx.deliveryPartner.update({
        where: { id: partner.id },
        data: {
          status: DeliveryPartnerStatus.BUSY,
        },
      });
    });

    return {
      orderId,
      deliveryPartnerId: partner.id,
      partnerName: `${partner.user.firstName} ${partner.user.lastName}`,
    };
  }

  /**
   * Get assignment statistics for a service area
   */
  static async getAssignmentStats(serviceAreaId: string) {
    const [totalPartners, availablePartners, busyPartners, activeOrders] = await Promise.all([
      prisma.deliveryPartner.count({
        where: { serviceAreaId },
      }),
      prisma.deliveryPartner.count({
        where: {
          serviceAreaId,
          status: DeliveryPartnerStatus.AVAILABLE,
        },
      }),
      prisma.deliveryPartner.count({
        where: {
          serviceAreaId,
          status: DeliveryPartnerStatus.BUSY,
        },
      }),
      prisma.order.count({
        where: {
          vendor: {
            serviceAreaId,
          },
          status: {
            in: [
              OrderStatus.ASSIGNED_TO_DELIVERY,
              OrderStatus.PICKED_UP,
              OrderStatus.IN_TRANSIT,
            ],
          },
        },
      }),
    ]);

    return {
      totalPartners,
      availablePartners,
      busyPartners,
      offlinePartners: totalPartners - availablePartners - busyPartners,
      activeOrders,
    };
  }
}
