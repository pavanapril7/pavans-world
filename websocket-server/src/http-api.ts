/**
 * HTTP API Server
 * 
 * Provides HTTP endpoints for triggering WebSocket events
 */

import express, { Request, Response, NextFunction } from 'express';
import { ConnectionManager } from './connection-manager';
import {
  TriggerLocationUpdateRequest,
  TriggerDeliveryAssignedRequest,
  TriggerNotificationCancelledRequest,
  LocationUpdateEvent,
  DeliveryAssignedEvent,
  NotificationCancelledEvent,
} from './types';
import { prisma } from './prisma';

/**
 * Authentication middleware for HTTP API
 */
function authenticateRequest(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const apiSecret = process.env.HTTP_API_SECRET;

  if (!apiSecret) {
    console.error('HTTP_API_SECRET not configured');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  // Support both "Bearer <secret>" and plain secret
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  if (token !== apiSecret) {
    res.status(401).json({ error: 'Invalid API secret' });
    return;
  }

  next();
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Retry logic for sending events
 */
async function sendWithRetry(
  connectionManager: ConnectionManager,
  userIds: string[],
  event: any,
  maxRetries: number = 3
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const userId of userIds) {
    let success = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (connectionManager.isConnected(userId)) {
          connectionManager.sendToUser(userId, event);
          success = true;
          break;
        } else {
          // User not connected, wait before retry
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      } catch (error) {
        console.error(`Error sending to user ${userId} (attempt ${attempt}):`, error);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    if (success) {
      sent++;
    } else {
      failed++;
      console.warn(`Failed to send event to user ${userId} after ${maxRetries} attempts`);
    }
  }

  return { sent, failed };
}

/**
 * Initialize HTTP API server
 */
export function initializeHttpApi(connectionManager: ConnectionManager): void {
  const app = express();
  const HTTP_PORT = parseInt(process.env.HTTP_PORT || '8081');
  const HTTP_HOST = process.env.HTTP_HOST || '0.0.0.0';

  // Middleware
  app.use(express.json());

  // Health check endpoint (no auth required)
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connections: connectionManager.getConnectionCount(),
    });
  });

  // Apply authentication to all /trigger routes
  app.use('/trigger', authenticateRequest);

  /**
   * POST /trigger/location-update
   * Trigger location update event for a delivery
   */
  app.post('/trigger/location-update', async (req: Request, res: Response) => {
    try {
      const body = req.body as TriggerLocationUpdateRequest;

      // Validate request
      if (!body.deliveryId || body.latitude === undefined || body.longitude === undefined || body.eta === undefined) {
        res.status(400).json({ error: 'Missing required fields: deliveryId, latitude, longitude, eta' });
        return;
      }

      // Get order associated with delivery
      const order = await prisma.order.findFirst({
        where: {
          id: body.deliveryId,
        },
        select: {
          customerId: true,
        },
      });

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Create location update event
      const event: LocationUpdateEvent = {
        type: 'location_update',
        eventId: generateEventId(),
        deliveryId: body.deliveryId,
        latitude: body.latitude,
        longitude: body.longitude,
        eta: body.eta,
        timestamp: new Date().toISOString(),
      };

      // Send to customer
      const result = await sendWithRetry(connectionManager, [order.customerId], event);

      res.json({
        success: true,
        event: event.type,
        deliveryId: body.deliveryId,
        sent: result.sent,
        failed: result.failed,
      });
    } catch (error) {
      console.error('Error triggering location update:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /trigger/delivery-assigned
   * Trigger delivery assigned notifications to delivery partners
   */
  app.post('/trigger/delivery-assigned', async (req: Request, res: Response) => {
    try {
      const body = req.body as TriggerDeliveryAssignedRequest;

      // Validate request
      if (
        !body.deliveryPartnerIds ||
        !Array.isArray(body.deliveryPartnerIds) ||
        !body.orderId ||
        !body.vendorLocation ||
        !body.deliveryAddress ||
        body.estimatedDistanceKm === undefined ||
        body.paymentAmount === undefined
      ) {
        res.status(400).json({ error: 'Missing or invalid required fields' });
        return;
      }

      // Get user IDs for delivery partners
      const deliveryPartners = await prisma.deliveryPartner.findMany({
        where: {
          id: {
            in: body.deliveryPartnerIds,
          },
        },
        select: {
          userId: true,
        },
      });

      const userIds = deliveryPartners.map((dp) => dp.userId);

      if (userIds.length === 0) {
        res.status(404).json({ error: 'No delivery partners found' });
        return;
      }

      // Create delivery assigned event
      const event: DeliveryAssignedEvent = {
        type: 'delivery_assigned',
        eventId: generateEventId(),
        orderId: body.orderId,
        vendorLocation: body.vendorLocation,
        deliveryAddress: body.deliveryAddress,
        estimatedDistanceKm: body.estimatedDistanceKm,
        paymentAmount: body.paymentAmount,
        expiresAt: new Date(Date.now() + 60000).toISOString(), // 60 seconds
      };

      // Send to delivery partners
      const result = await sendWithRetry(connectionManager, userIds, event);

      res.json({
        success: true,
        event: event.type,
        orderId: body.orderId,
        notified: body.deliveryPartnerIds.length,
        sent: result.sent,
        failed: result.failed,
      });
    } catch (error) {
      console.error('Error triggering delivery assigned:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /trigger/notification-cancelled
   * Cancel pending notifications for delivery partners
   */
  app.post('/trigger/notification-cancelled', async (req: Request, res: Response) => {
    try {
      const body = req.body as TriggerNotificationCancelledRequest;

      // Validate request
      if (!body.deliveryPartnerIds || !Array.isArray(body.deliveryPartnerIds) || !body.orderId || !body.reason) {
        res.status(400).json({ error: 'Missing or invalid required fields' });
        return;
      }

      // Get user IDs for delivery partners
      const deliveryPartners = await prisma.deliveryPartner.findMany({
        where: {
          id: {
            in: body.deliveryPartnerIds,
          },
        },
        select: {
          userId: true,
        },
      });

      const userIds = deliveryPartners.map((dp) => dp.userId);

      if (userIds.length === 0) {
        res.status(404).json({ error: 'No delivery partners found' });
        return;
      }

      // Create notification cancelled event
      const event: NotificationCancelledEvent = {
        type: 'notification_cancelled',
        eventId: generateEventId(),
        orderId: body.orderId,
        reason: body.reason,
      };

      // Send to delivery partners
      const result = await sendWithRetry(connectionManager, userIds, event);

      res.json({
        success: true,
        event: event.type,
        orderId: body.orderId,
        sent: result.sent,
        failed: result.failed,
      });
    } catch (error) {
      console.error('Error triggering notification cancelled:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /trigger/delivery-completed
   * Notify customer that delivery is completed
   */
  app.post('/trigger/delivery-completed', async (req: Request, res: Response) => {
    try {
      const body = req.body as { deliveryId: string; completedAt: string };

      // Validate request
      if (!body.deliveryId) {
        res.status(400).json({ error: 'Missing required field: deliveryId' });
        return;
      }

      // Get order and customer
      const order = await prisma.order.findFirst({
        where: {
          id: body.deliveryId,
        },
        select: {
          customerId: true,
        },
      });

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Create delivery completed event
      const event = {
        type: 'delivery_completed',
        eventId: generateEventId(),
        deliveryId: body.deliveryId,
        completedAt: body.completedAt || new Date().toISOString(),
      };

      // Send to customer
      const result = await sendWithRetry(connectionManager, [order.customerId], event);

      res.json({
        success: true,
        event: event.type,
        deliveryId: body.deliveryId,
        sent: result.sent,
        failed: result.failed,
      });
    } catch (error) {
      console.error('Error triggering delivery completed:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('HTTP API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start HTTP server
  app.listen(HTTP_PORT, HTTP_HOST, () => {
    console.log(`✅ HTTP API server running on http://${HTTP_HOST}:${HTTP_PORT}`);
  });
}
