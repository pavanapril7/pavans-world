'use client';

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Package, MapPin } from 'lucide-react';

// Global flag to prevent multiple connections (survives component remounts in dev mode)
let globalConnectionActive = false;

interface DeliveryAssignedEvent {
  type: 'delivery_assigned';
  eventId: string;
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
  expiresAt: string;
}

interface NotificationCancelledEvent {
  type: 'notification_cancelled';
  eventId: string;
  orderId: string;
  reason: 'accepted_by_other' | 'cancelled';
}

type WebSocketEvent = DeliveryAssignedEvent | NotificationCancelledEvent;

interface DeliveryNotificationListenerProps {
  onNewDelivery?: () => void;
  onDeliveryCancelled?: (orderId: string) => void;
}

export default function DeliveryNotificationListener({
  onNewDelivery,
  onDeliveryCancelled,
}: DeliveryNotificationListenerProps) {
  console.log('[WebSocket] Component render');
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeToastsRef = useRef<Map<string, string | number>>(new Map());
  const connectFnRef = useRef<(() => Promise<void>) | null>(null);

  const getAuthToken = useCallback(async () => {
    // Fetch JWT token from API endpoint (since auth_token cookie is HttpOnly)
    try {
      const response = await fetch('/api/auth/ws-token');
      if (!response.ok) {
        console.log('[WebSocket] Failed to get token from API:', response.status);
        return null;
      }
      const data = await response.json();
      console.log('[WebSocket] Successfully fetched token from API');
      return data.token;
    } catch (error) {
      console.error('[WebSocket] Error fetching token:', error);
      return null;
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    // Optional: Play notification sound
    // This can be implemented with an audio element
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore errors if sound file doesn't exist or autoplay is blocked
      });
    } catch (err) {
      // Ignore sound errors
    }
  }, []);

  const handleDeliveryAssigned = useCallback(
    (event: DeliveryAssignedEvent) => {
      // Calculate time until expiry
      const expiresAt = new Date(event.expiresAt);
      const now = new Date();
      const timeUntilExpiry = Math.max(0, expiresAt.getTime() - now.getTime());

      // Play notification sound
      playNotificationSound();

      // Show toast notification
      const toastId = toast(
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-green-600" />
            <span className="font-semibold">New Delivery Opportunity!</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{event.estimatedDistanceKm.toFixed(1)} km away</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <span className="font-medium">₹{event.paymentAmount.toFixed(2)}</span>
            </div>
            <div className="text-xs text-gray-500">
              Expires in {Math.floor(timeUntilExpiry / 1000)} seconds
            </div>
          </div>
        </div>,
        {
          duration: timeUntilExpiry > 0 ? timeUntilExpiry : 60000, // Auto-dismiss after expiry or 60 seconds
          action: {
            label: 'View',
            onClick: () => {
              window.location.href = '/delivery/available';
            },
          },
        }
      );

      // Store toast ID for this order
      activeToastsRef.current.set(event.orderId, toastId);

      // Auto-dismiss after expiry time
      if (timeUntilExpiry > 0) {
        setTimeout(() => {
          activeToastsRef.current.delete(event.orderId);
        }, timeUntilExpiry);
      }

      // Dispatch custom event for pages to listen to
      window.dispatchEvent(new CustomEvent('delivery-assigned', { detail: event }));
      
      // Trigger callback if provided
      if (onNewDelivery) {
        onNewDelivery();
      }
    },
    [playNotificationSound, onNewDelivery]
  );

  const handleNotificationCancelled = useCallback(
    (event: NotificationCancelledEvent) => {
      // Dismiss the toast for this order if it exists
      const toastId = activeToastsRef.current.get(event.orderId);
      if (toastId) {
        toast.dismiss(toastId);
        activeToastsRef.current.delete(event.orderId);
      }

      // Show cancellation message
      const reason =
        event.reason === 'accepted_by_other'
          ? 'This delivery was accepted by another partner'
          : 'This delivery was cancelled';

      toast.info(reason, {
        duration: 3000,
      });

      // Dispatch custom event for pages to listen to
      window.dispatchEvent(new CustomEvent('delivery-cancelled', { detail: event }));
      
      // Trigger callback to update delivery list
      if (onDeliveryCancelled) {
        onDeliveryCancelled(event.orderId);
      }
    },
    [onDeliveryCancelled]
  );

  const handleWebSocketMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as WebSocketEvent | { type: 'auth_success' | 'auth_error'; userId?: string; message?: string };

        if (data.type === 'auth_success') {
          console.log('[WebSocket] Authentication successful');
          return;
        }

        if (data.type === 'auth_error') {
          console.error('[WebSocket] Authentication failed:', 'message' in data ? data.message : 'Unknown error');
          return;
        }

        // Handle delivery events
        if (data.type === 'delivery_assigned') {
          handleDeliveryAssigned(data as DeliveryAssignedEvent);
        } else if (data.type === 'notification_cancelled') {
          handleNotificationCancelled(data as NotificationCancelledEvent);
        }
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    },
    [handleDeliveryAssigned, handleNotificationCancelled]
  );

  const connectWebSocket = useCallback(async () => {
    const token = await getAuthToken();
    console.log('[WebSocket] Attempting to connect, token present:', !!token);
    if (!token) {
      // Silently skip connection if no token (user not logged in)
      // This is expected behavior when the layout renders before authentication
      console.log('[WebSocket] Skipping connection - no auth token');
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL;
    console.log('[WebSocket] WebSocket URL:', wsUrl);
    if (!wsUrl) {
      console.error('[WebSocket] WebSocket server URL not configured');
      return;
    }

    try {
      console.log('[WebSocket] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] Connection opened');
        // Send authentication message
        ws.send(JSON.stringify({ type: 'auth', token }));
      };

      ws.onmessage = handleWebSocketMessage;

      ws.onerror = () => {
        console.error('[WebSocket] Connection error');
      };

      ws.onclose = () => {
        console.log('[WebSocket] Connection closed');
        wsRef.current = null;

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(async () => {
          console.log('[WebSocket] Attempting to reconnect...');
          if (connectFnRef.current) {
            await connectFnRef.current();
          }
        }, 5000);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WebSocket] Connection error:', err);
    }
  }, [getAuthToken, handleWebSocketMessage]);

  // Store the connect function in a ref for reconnection
  useEffect(() => {
    connectFnRef.current = connectWebSocket;
  }, [connectWebSocket]);

  useEffect(() => {
    // Track if we've already initiated a connection
    let isConnecting = false;
    
    console.log('[WebSocket] useEffect triggered, wsRef.current:', wsRef.current, 'globalConnectionActive:', globalConnectionActive);
    
    // Connect to WebSocket server (external system synchronization)
    // Use an async IIFE to handle the async connectWebSocket function
    const initConnection = async () => {
      if (isConnecting || wsRef.current || globalConnectionActive) {
        console.log('[WebSocket] Connection already exists or in progress, skipping');
        return;
      }
      isConnecting = true;
      globalConnectionActive = true;
      console.log('[WebSocket] Initiating new connection');
      await connectWebSocket();
    };
    
    initConnection();

    // Cleanup on unmount
    return () => {
      console.log('[WebSocket] Cleanup triggered');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        console.log('[WebSocket] Closing connection in cleanup');
        wsRef.current.close();
        wsRef.current = null;
      }
      globalConnectionActive = false;
      // Dismiss all active toasts
      const toasts = activeToastsRef.current;
      toasts.forEach((toastId) => {
        toast.dismiss(toastId);
      });
      toasts.clear();
    };
  }, []); // Empty dependency array - only run once on mount

  // This component doesn't render anything visible
  return null;
}
