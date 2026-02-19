/**
 * Tests for DeliveryNotificationListener component
 */

import { render, waitFor } from '@testing-library/react';
import DeliveryNotificationListener from '@/components/DeliveryNotificationListener';

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: (() => void) | null = null;
  
  send = jest.fn();
  close = jest.fn();
  
  simulateOpen() {
    if (this.onopen) this.onopen();
  }
  
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
  
  simulateClose() {
    if (this.onclose) this.onclose();
  }
}

describe('DeliveryNotificationListener', () => {
  let mockWebSocket: MockWebSocket;
  
  beforeEach(() => {
    // Mock WebSocket
    mockWebSocket = new MockWebSocket();
    global.WebSocket = jest.fn(() => mockWebSocket) as any;
    
    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'auth_token=test-token',
    });
    
    // Mock environment variable
    process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL = 'ws://localhost:8080';
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('should render without crashing', () => {
    const { container } = render(<DeliveryNotificationListener />);
    expect(container).toBeTruthy();
  });
  
  it('should connect to WebSocket server on mount', () => {
    render(<DeliveryNotificationListener />);
    
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8080');
  });
  
  it('should send authentication message on connection', async () => {
    render(<DeliveryNotificationListener />);
    
    mockWebSocket.simulateOpen();
    
    await waitFor(() => {
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'auth', token: 'test-token' })
      );
    });
  });
  
  it('should call onNewDelivery callback when delivery_assigned event received', async () => {
    const onNewDelivery = jest.fn();
    render(<DeliveryNotificationListener onNewDelivery={onNewDelivery} />);
    
    mockWebSocket.simulateOpen();
    mockWebSocket.simulateMessage({
      type: 'auth_success',
      userId: 'test-user',
    });
    
    mockWebSocket.simulateMessage({
      type: 'delivery_assigned',
      eventId: 'event-1',
      orderId: 'order-1',
      vendorLocation: { latitude: 10, longitude: 20 },
      deliveryAddress: { latitude: 11, longitude: 21, address: 'Test Address' },
      estimatedDistanceKm: 5.5,
      paymentAmount: 100,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });
    
    await waitFor(() => {
      expect(onNewDelivery).toHaveBeenCalled();
    });
  });
  
  it('should call onDeliveryCancelled callback when notification_cancelled event received', async () => {
    const onDeliveryCancelled = jest.fn();
    render(<DeliveryNotificationListener onDeliveryCancelled={onDeliveryCancelled} />);
    
    mockWebSocket.simulateOpen();
    mockWebSocket.simulateMessage({
      type: 'auth_success',
      userId: 'test-user',
    });
    
    mockWebSocket.simulateMessage({
      type: 'notification_cancelled',
      eventId: 'event-2',
      orderId: 'order-1',
      reason: 'accepted_by_other',
    });
    
    await waitFor(() => {
      expect(onDeliveryCancelled).toHaveBeenCalledWith('order-1');
    });
  });
  
  it('should close WebSocket connection on unmount', () => {
    const { unmount } = render(<DeliveryNotificationListener />);
    
    unmount();
    
    expect(mockWebSocket.close).toHaveBeenCalled();
  });
  
  it('should handle connection errors gracefully', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    
    render(<DeliveryNotificationListener />);
    
    if (mockWebSocket.onerror) {
      mockWebSocket.onerror(new Event('error'));
    }
    
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
  
  it('should not attempt connection when no auth token is present', () => {
    // Clear the cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
    
    render(<DeliveryNotificationListener />);
    
    // WebSocket should not be created
    expect(global.WebSocket).not.toHaveBeenCalled();
  });
});
