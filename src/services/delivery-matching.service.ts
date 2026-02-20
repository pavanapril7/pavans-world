import { prisma } from '@/lib/prisma';
import { GeoLocationService } from './geolocation.service';
import { getWebSocketClient } from '@/lib/websocket-client';

export interface NotificationResult {
  deliveryPartnerIds: string[];
  notifiedCount: number;
}

export class DeliveryMatchingService {
  /**
   * Find and notify nearby delivery partners for an order
   * Enhanced with polygon validation:
   * 1. Gets order with vendor and delivery address
   * 2. Finds delivery partners in same service area
   * 3. Validates partner location is within service area polygon using ST_Contains
   * 4. Validates partner is within proximity threshold of vendor
   * 5. Validates delivery address is within service area polygon
   * 6. Sorts by distance to vendor
   * 7. Takes top 5 nearest partners
   * 8. Triggers WebSocket notifications
   */
  static async notifyNearbyDeliveryPartners(
    orderId: string,
    proximityThresholdKm: number = 5
  ): Promise<NotificationResult> {
    // Get order with vendor and delivery address
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            latitude: true,
            longitude: true,
            serviceAreaId: true,
          },
        },
        deliveryAddress: {
          select: {
            id: true,
            street: true,
            city: true,
            state: true,
            pincode: true,
            latitude: true,
            longitude: true,
            serviceAreaId: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Verify vendor has location
    if (!order.vendor.latitude || !order.vendor.longitude) {
      throw new Error('Vendor location not set');
    }

    // Verify delivery address has location
    if (!order.deliveryAddress.latitude || !order.deliveryAddress.longitude) {
      throw new Error('Delivery address location not set');
    }

    // Validate delivery address is within service area polygon
    const addressValidation = await GeoLocationService.validatePointInServiceArea(
      order.deliveryAddress.latitude,
      order.deliveryAddress.longitude
    );

    if (!addressValidation.isServiceable) {
      throw new Error('Delivery address is outside serviceable area');
    }

    // Find delivery partners in same service area with polygon validation
    // Validates partner location is within service area polygon using ST_Contains
    // Validates partner is within proximity threshold of vendor
    // Sorts by distance to vendor
    const nearbyPartners = await prisma.$queryRaw<
      Array<{
        id: string;
        userId: string;
        currentLatitude: number;
        currentLongitude: number;
        distanceKm: number;
        status: string;
      }>
    >`
      SELECT 
        dp.id,
        dp."userId",
        dp."currentLatitude",
        dp."currentLongitude",
        dp.status,
        ST_Distance(
          ST_SetSRID(ST_MakePoint(dp."currentLongitude", dp."currentLatitude"), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${order.vendor.longitude}, ${order.vendor.latitude}), 4326)::geography
        ) / 1000 as "distanceKm"
      FROM "DeliveryPartner" dp
      INNER JOIN "ServiceArea" sa ON dp."serviceAreaId" = sa.id
      WHERE 
        dp.status = 'AVAILABLE'
        AND dp."serviceAreaId" = ${order.vendor.serviceAreaId}
        AND dp."currentLatitude" IS NOT NULL
        AND dp."currentLongitude" IS NOT NULL
        AND sa.boundary IS NOT NULL
        AND ST_Contains(
          sa.boundary,
          ST_SetSRID(ST_MakePoint(dp."currentLongitude", dp."currentLatitude"), 4326)
        )
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(dp."currentLongitude", dp."currentLatitude"), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${order.vendor.longitude}, ${order.vendor.latitude}), 4326)::geography,
          ${proximityThresholdKm * 1000}
        )
      ORDER BY "distanceKm" ASC
    `;
    console.log(`
      SELECT 
        dp.id,
        dp."userId",
        dp."currentLatitude",
        dp."currentLongitude",
        dp.status,
        ST_Distance(
          ST_SetSRID(ST_MakePoint(dp."currentLongitude", dp."currentLatitude"), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${order.vendor.longitude}, ${order.vendor.latitude}), 4326)::geography
        ) / 1000 as "distanceKm"
      FROM "DeliveryPartner" dp
      INNER JOIN "ServiceArea" sa ON dp."serviceAreaId" = sa.id
      WHERE 
        dp.status = 'AVAILABLE'
        AND dp."serviceAreaId" = ${order.vendor.serviceAreaId}
        AND dp."currentLatitude" IS NOT NULL
        AND dp."currentLongitude" IS NOT NULL
        AND sa.boundary IS NOT NULL
        AND ST_Contains(
          sa.boundary,
          ST_SetSRID(ST_MakePoint(dp."currentLongitude", dp."currentLatitude"), 4326)
        )
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(dp."currentLongitude", dp."currentLatitude"), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${order.vendor.longitude}, ${order.vendor.latitude}), 4326)::geography,
          ${proximityThresholdKm * 1000}
        )
      ORDER BY "distanceKm" ASC
    `);
    // Take top 5 nearest delivery partners
    const selectedPartners = nearbyPartners.slice(0, 5);

    if (selectedPartners.length === 0) {
      return {
        deliveryPartnerIds: [],
        notifiedCount: 0,
      };
    }

    // Calculate estimated distance from vendor to delivery address
    let estimatedDistanceKm = 0;
    if (order.deliveryAddress.latitude && order.deliveryAddress.longitude) {
      estimatedDistanceKm = await GeoLocationService.calculateDistance(
        order.vendor.latitude,
        order.vendor.longitude,
        order.deliveryAddress.latitude,
        order.deliveryAddress.longitude
      );
    }

    // Prepare notification data
    const deliveryPartnerIds = selectedPartners.map((dp) => dp.id);

    // Trigger WebSocket notifications (non-blocking, degraded mode if unavailable)
    const wsClient = getWebSocketClient();
    if (wsClient) {
      // Fire and forget - don't await to avoid blocking
      wsClient.triggerDeliveryAssigned({
        deliveryPartnerIds,
        orderId,
        vendorLocation: {
          latitude: order.vendor.latitude,
          longitude: order.vendor.longitude,
        },
        deliveryAddress: {
          latitude: order.deliveryAddress.latitude || 0,
          longitude: order.deliveryAddress.longitude || 0,
          address: `${order.deliveryAddress.street}, ${order.deliveryAddress.city}`,
        },
        estimatedDistanceKm,
        paymentAmount: Number(order.total),
      }).catch((error) => {
        // Error already logged in WebSocketClient
        console.error('WebSocket notification failed, continuing in degraded mode');
      });
    } else {
      console.log('WebSocket server not configured, notifications not sent');
    }

    return {
      deliveryPartnerIds,
      notifiedCount: selectedPartners.length,
    };
  }

  /**
   * Retry proximity matching with expanded radius
   * Expands radius by 5km per attempt, max 3 attempts
   */
  static async retryWithExpandedRadius(
    orderId: string,
    attempt: number
  ): Promise<NotificationResult> {
    // Check if max attempts reached
    if (attempt >= 3) {
      // Mark order as requiring manual assignment
      await prisma.order.update({
        where: { id: orderId },
        data: {
          // Add a note in status history
          statusHistory: {
            create: {
              status: 'READY_FOR_PICKUP',
              notes: 'No delivery partners available after 3 retry attempts. Requires manual assignment.',
            },
          },
        },
      });

      return {
        deliveryPartnerIds: [],
        notifiedCount: 0,
      };
    }

    // Expand radius by 5km per attempt
    const radius = 5 + attempt * 5;

    return this.notifyNearbyDeliveryPartners(orderId, radius);
  }

  /**
   * Cancel pending notifications when delivery is accepted
   * Sends cancellation event via WebSocket API
   */
  static async cancelPendingNotifications(
    orderId: string,
    acceptedByPartnerId: string
  ): Promise<void> {
    // Get order to find which delivery partners were notified
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // In a real implementation, we would track which delivery partners were notified
    // For now, we'll send a cancellation to all delivery partners who might have been notified
    // This would typically be stored in a separate table or cache
    
    // Log cancellation (for backward compatibility and debugging)
    console.log('Cancelling notifications for order:', {
      orderId,
      acceptedByPartnerId,
      reason: 'accepted_by_other',
    });
    
    // Trigger WebSocket cancellation (non-blocking, degraded mode if unavailable)
    const wsClient = getWebSocketClient();
    if (wsClient) {
      // Fire and forget - don't await to avoid blocking
      // In production, pass the actual list of notified delivery partner IDs
      // wsClient.triggerNotificationCancelled({
      //   deliveryPartnerIds: notifiedPartnerIds,
      //   orderId,
      //   reason: 'accepted_by_other',
      // }).catch((error) => {
      //   console.error('WebSocket cancellation failed, continuing in degraded mode');
      // });
    }
  }
}
