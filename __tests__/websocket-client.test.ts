/**
 * WebSocket Client Tests
 */

import { WebSocketClient, createWebSocketClient, getWebSocketClient } from '@/lib/websocket-client';

// Mock fetch globally
global.fetch = jest.fn();

describe('WebSocketClient', () => {
  let client: WebSocketClient;

  beforeEach(() => {
    client = new WebSocketClient({
      baseUrl: 'http://localhost:8081',
      apiSecret: 'test-secret',
      timeout: 5000,
    });
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('triggerLocationUpdate', () => {
    it('should send location update successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          event: 'location_update',
          sent: 1,
          failed: 0,
        }),
      });

      const result = await client.triggerLocationUpdate({
        deliveryId: 'delivery-1',
        latitude: 40.7128,
        longitude: -74.006,
        eta: 15,
      });

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8081/trigger/location-update',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-secret',
          },
          body: JSON.stringify({
            deliveryId: 'delivery-1',
            latitude: 40.7128,
            longitude: -74.006,
            eta: 15,
          }),
        })
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Location update sent for delivery delivery-1')
      );
    });

    it('should handle server error gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      });

      const result = await client.triggerLocationUpdate({
        deliveryId: 'delivery-1',
        latitude: 40.7128,
        longitude: -74.006,
        eta: 15,
      });

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to trigger location update'),
        expect.any(String)
      );
    });

    it('should handle network timeout gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('AbortError')), 100);
          })
      );

      const result = await client.triggerLocationUpdate({
        deliveryId: 'delivery-1',
        latitude: 40.7128,
        longitude: -74.006,
        eta: 15,
      });

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('triggerDeliveryAssigned', () => {
    it('should send delivery assigned notification successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          event: 'delivery_assigned',
          sent: 2,
          failed: 0,
        }),
      });

      const result = await client.triggerDeliveryAssigned({
        deliveryPartnerIds: ['dp-1', 'dp-2'],
        orderId: 'order-1',
        vendorLocation: { latitude: 40.7128, longitude: -74.006 },
        deliveryAddress: {
          latitude: 40.7589,
          longitude: -73.9851,
          address: '123 Main St, New York',
        },
        estimatedDistanceKm: 5.2,
        paymentAmount: 25.5,
      });

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Delivery assigned notifications sent for order order-1')
      );
    });

    it('should handle failure gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await client.triggerDeliveryAssigned({
        deliveryPartnerIds: ['dp-1'],
        orderId: 'order-1',
        vendorLocation: { latitude: 40.7128, longitude: -74.006 },
        deliveryAddress: {
          latitude: 40.7589,
          longitude: -73.9851,
          address: '123 Main St',
        },
        estimatedDistanceKm: 5.2,
        paymentAmount: 25.5,
      });

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('triggerNotificationCancelled', () => {
    it('should send cancellation notification successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          event: 'notification_cancelled',
          sent: 1,
          failed: 0,
        }),
      });

      const result = await client.triggerNotificationCancelled({
        deliveryPartnerIds: ['dp-1'],
        orderId: 'order-1',
        reason: 'accepted_by_other',
      });

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Notification cancelled for order order-1')
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when server is healthy', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await client.healthCheck();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8081/health',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should return false when server is unhealthy', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await client.healthCheck();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });
});

describe('createWebSocketClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('should create client when env vars are set', () => {
    process.env.WEBSOCKET_HTTP_API_URL = 'http://localhost:8081';
    process.env.WEBSOCKET_SERVER_SECRET = 'test-secret';

    const client = createWebSocketClient();

    expect(client).not.toBeNull();
    expect(client).toBeInstanceOf(WebSocketClient);
  });

  it('should return null when WEBSOCKET_HTTP_API_URL is missing', () => {
    delete process.env.WEBSOCKET_HTTP_API_URL;
    process.env.WEBSOCKET_SERVER_SECRET = 'test-secret';

    const client = createWebSocketClient();

    expect(client).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('WebSocket server not configured')
    );
  });

  it('should return null when WEBSOCKET_SERVER_SECRET is missing', () => {
    process.env.WEBSOCKET_HTTP_API_URL = 'http://localhost:8081';
    delete process.env.WEBSOCKET_SERVER_SECRET;

    const client = createWebSocketClient();

    expect(client).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('WebSocket server not configured')
    );
  });
});

describe('getWebSocketClient', () => {
  it('should return singleton instance', () => {
    const client1 = getWebSocketClient();
    const client2 = getWebSocketClient();

    expect(client1).toBe(client2);
  });
});
