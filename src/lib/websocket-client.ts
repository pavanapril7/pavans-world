/**
 * WebSocket Client Utility
 * 
 * HTTP client for triggering WebSocket server events
 * Handles connection errors gracefully and logs failures without blocking
 */

interface WebSocketClientConfig {
  baseUrl: string;
  apiSecret: string;
  timeout?: number;
}

interface LocationUpdatePayload {
  deliveryId: string;
  latitude: number;
  longitude: number;
  eta: number;
}

interface DeliveryAssignedPayload {
  deliveryPartnerIds: string[];
  orderId: string;
  vendorLocation: {
    latitude: number;
    longitude: number;
  };
  deliveryAddress: {
    latitude: number;
    longitude: number;
    address: string;
  };
  estimatedDistanceKm: number;
  paymentAmount: number;
}

interface NotificationCancelledPayload {
  deliveryPartnerIds: string[];
  orderId: string;
  reason: 'accepted_by_other' | 'cancelled';
}

interface WebSocketResponse {
  success: boolean;
  event: string;
  sent?: number;
  failed?: number;
  error?: string;
}

export class WebSocketClient {
  private config: WebSocketClientConfig;

  constructor(config: WebSocketClientConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 5000, // Default 5 second timeout
    };
  }

  /**
   * Make HTTP request to WebSocket server API
   */
  private async makeRequest(
    endpoint: string,
    payload: LocationUpdatePayload | DeliveryAssignedPayload | NotificationCancelledPayload
  ): Promise<WebSocketResponse> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiSecret}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle different error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('WebSocket server request timeout');
        }
        throw error;
      }

      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Trigger location update event
   * Sends location update to customer tracking the delivery
   */
  async triggerLocationUpdate(
    payload: LocationUpdatePayload
  ): Promise<boolean> {
    try {
      const response = await this.makeRequest('/trigger/location-update', payload);
      
      if (response.success) {
        console.log(
          `✅ Location update sent for delivery ${payload.deliveryId} (sent: ${response.sent}, failed: ${response.failed})`
        );
        return true;
      }

      console.warn(
        `⚠️ Location update failed for delivery ${payload.deliveryId}:`,
        response.error
      );
      return false;
    } catch (error) {
      // Log error but don't throw - degraded mode
      console.error(
        `❌ Failed to trigger location update for delivery ${payload.deliveryId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }

  /**
   * Trigger delivery assigned notifications
   * Sends notifications to nearby delivery partners
   */
  async triggerDeliveryAssigned(
    payload: DeliveryAssignedPayload
  ): Promise<boolean> {
    try {
      const response = await this.makeRequest('/trigger/delivery-assigned', payload);
      
      if (response.success) {
        console.log(
          `✅ Delivery assigned notifications sent for order ${payload.orderId} (sent: ${response.sent}, failed: ${response.failed})`
        );
        return true;
      }

      console.warn(
        `⚠️ Delivery assigned notifications failed for order ${payload.orderId}:`,
        response.error
      );
      return false;
    } catch (error) {
      // Log error but don't throw - degraded mode
      console.error(
        `❌ Failed to trigger delivery assigned for order ${payload.orderId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }

  /**
   * Trigger notification cancelled event
   * Cancels pending notifications for delivery partners
   */
  async triggerNotificationCancelled(
    payload: NotificationCancelledPayload
  ): Promise<boolean> {
    try {
      const response = await this.makeRequest('/trigger/notification-cancelled', payload);
      
      if (response.success) {
        console.log(
          `✅ Notification cancelled for order ${payload.orderId} (sent: ${response.sent}, failed: ${response.failed})`
        );
        return true;
      }

      console.warn(
        `⚠️ Notification cancellation failed for order ${payload.orderId}:`,
        response.error
      );
      return false;
    } catch (error) {
      // Log error but don't throw - degraded mode
      console.error(
        `❌ Failed to trigger notification cancellation for order ${payload.orderId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }

  /**
   * Health check for WebSocket server
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl}/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return response.ok;
    } catch (error) {
      console.error(
        '❌ WebSocket server health check failed:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }
}

/**
 * Create WebSocket client instance from environment variables
 */
export function createWebSocketClient(): WebSocketClient | null {
  const baseUrl = process.env.WEBSOCKET_HTTP_API_URL;
  const apiSecret = process.env.WEBSOCKET_SERVER_SECRET;

  if (!baseUrl || !apiSecret) {
    console.warn(
      '⚠️ WebSocket server not configured (WEBSOCKET_HTTP_API_URL or WEBSOCKET_SERVER_SECRET missing). Running in degraded mode.'
    );
    return null;
  }

  return new WebSocketClient({
    baseUrl,
    apiSecret,
    timeout: 5000,
  });
}

// Singleton instance
let wsClientInstance: WebSocketClient | null | undefined;

/**
 * Get WebSocket client singleton
 * Returns null if not configured (degraded mode)
 */
export function getWebSocketClient(): WebSocketClient | null {
  if (wsClientInstance === undefined) {
    wsClientInstance = createWebSocketClient();
  }
  return wsClientInstance;
}
