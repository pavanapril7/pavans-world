import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { GeoLocationService } from './geolocation.service';
import { getWebSocketClient } from '@/lib/websocket-client';

export interface DeliveryLocation {
  orderId: string;
  latitude: number | null;
  longitude: number | null;
  lastUpdate: Date | null;
  eta: number | null; // minutes
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export interface DeliveryRoute {
  orderId: string;
  route: LocationPoint[];
  totalDistanceKm: number;
}

export class LocationTrackingService {
  /**
   * Update delivery partner location during active delivery
   * Verifies delivery partner has active delivery, validates coordinates,
   * updates current location, creates history record, and calculates ETA
   */
  static async updateDeliveryPartnerLocation(
    deliveryPartnerId: string,
    latitude: number,
    longitude: number
  ): Promise<{ eta: number; orderId: string }> {
    // Validate coordinates
    if (!GeoLocationService.validateCoordinates(latitude, longitude)) {
      throw new Error('Invalid coordinates provided');
    }

    // Get delivery partner with active delivery
    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { id: deliveryPartnerId },
      include: {
        orders: {
          where: {
            status: {
              in: [OrderStatus.PICKED_UP, OrderStatus.ASSIGNED_TO_DELIVERY],
            },
          },
          include: {
            deliveryAddress: true,
          },
          take: 1,
        },
      },
    });

    if (!deliveryPartner) {
      throw new Error('Delivery partner not found');
    }

    // Verify delivery partner has active delivery
    const activeOrder = deliveryPartner.orders[0];
    if (!activeOrder) {
      throw new Error('No active delivery found');
    }

    // Verify delivery address has coordinates
    if (!activeOrder.deliveryAddress.latitude || !activeOrder.deliveryAddress.longitude) {
      throw new Error('Delivery address does not have coordinates');
    }

    // Calculate distance and ETA to destination
    const distanceKm = await GeoLocationService.calculateDistance(
      latitude,
      longitude,
      activeOrder.deliveryAddress.latitude,
      activeOrder.deliveryAddress.longitude
    );
    const eta = GeoLocationService.calculateETA(distanceKm);

    // Update delivery partner location and create history record in transaction
    await prisma.$transaction(async (tx) => {
      // Update current location
      await tx.deliveryPartner.update({
        where: { id: deliveryPartnerId },
        data: {
          currentLatitude: latitude,
          currentLongitude: longitude,
          lastLocationUpdate: new Date(),
        },
      });

      // Create location history record
      await tx.locationHistory.create({
        data: {
          orderId: activeOrder.id,
          deliveryPartnerId,
          latitude,
          longitude,
          timestamp: new Date(),
        },
      });
    });

    // Trigger WebSocket notification (non-blocking, degraded mode if unavailable)
    const wsClient = getWebSocketClient();
    if (wsClient) {
      // Fire and forget - don't await to avoid blocking
      wsClient.triggerLocationUpdate({
        deliveryId: activeOrder.id,
        latitude,
        longitude,
        eta,
      }).catch((error) => {
        // Error already logged in WebSocketClient
        console.error('WebSocket notification failed, continuing in degraded mode');
      });
    }

    return {
      eta,
      orderId: activeOrder.id,
    };
  }

  /**
   * Get current location for a delivery
   * Returns current location and ETA for an active delivery
   */
  static async getDeliveryLocation(orderId: string): Promise<DeliveryLocation | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        deliveryPartner: true,
        deliveryAddress: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Return null if no delivery partner assigned or no location data
    if (
      !order.deliveryPartner ||
      !order.deliveryPartner.currentLatitude ||
      !order.deliveryPartner.currentLongitude
    ) {
      return {
        orderId,
        latitude: null,
        longitude: null,
        lastUpdate: null,
        eta: null,
      };
    }

    // Calculate ETA if delivery address has coordinates
    let eta: number | null = null;
    if (order.deliveryAddress.latitude && order.deliveryAddress.longitude) {
      const distanceKm = await GeoLocationService.calculateDistance(
        order.deliveryPartner.currentLatitude,
        order.deliveryPartner.currentLongitude,
        order.deliveryAddress.latitude,
        order.deliveryAddress.longitude
      );
      eta = GeoLocationService.calculateETA(distanceKm);
    }

    return {
      orderId,
      latitude: order.deliveryPartner.currentLatitude,
      longitude: order.deliveryPartner.currentLongitude,
      lastUpdate: order.deliveryPartner.lastLocationUpdate,
      eta,
    };
  }

  /**
   * Get location history (route) for a delivery
   * Returns ordered location history points
   */
  static async getDeliveryRoute(orderId: string): Promise<LocationPoint[]> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const locationHistory = await prisma.locationHistory.findMany({
      where: { orderId },
      orderBy: { timestamp: 'asc' },
      select: {
        latitude: true,
        longitude: true,
        timestamp: true,
      },
    });

    return locationHistory;
  }

  /**
   * Calculate total distance traveled for a delivery
   * Sums distances between consecutive location points
   */
  static async calculateTotalDistance(orderId: string): Promise<number> {
    const route = await this.getDeliveryRoute(orderId);

    if (route.length < 2) {
      return 0;
    }

    let totalDistance = 0;

    // Calculate distance between consecutive points
    for (let i = 1; i < route.length; i++) {
      const distance = await GeoLocationService.calculateDistance(
        route[i - 1].latitude,
        route[i - 1].longitude,
        route[i].latitude,
        route[i].longitude
      );
      totalDistance += distance;
    }

    // Return with two decimal precision
    return Math.round(totalDistance * 100) / 100;
  }

  /**
   * Clear delivery partner location when delivery completes
   * Sets currentLatitude and currentLongitude to null
   */
  static async clearDeliveryPartnerLocation(deliveryPartnerId: string): Promise<void> {
    await prisma.deliveryPartner.update({
      where: { id: deliveryPartnerId },
      data: {
        currentLatitude: null,
        currentLongitude: null,
        lastLocationUpdate: null,
      },
    });
  }

  /**
   * Clean up old location history (90 days retention)
   * Deletes LocationHistory records older than 90 days
   */
  static async cleanupOldLocationHistory(): Promise<number> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await prisma.locationHistory.deleteMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo,
        },
      },
    });

    return result.count;
  }
}
