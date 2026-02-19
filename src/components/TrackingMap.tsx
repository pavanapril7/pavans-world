'use client';

/**
 * TrackingMap Component
 * 
 * Real-time delivery tracking map component that displays:
 * - Delivery partner's current location (moving marker)
 * - Destination address (fixed marker)
 * - ETA badge
 * - Delivery completion message
 * 
 * Uses Leaflet for map rendering
 * Connects to WebSocket server for real-time location updates
 */

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Clock, CheckCircle } from 'lucide-react';

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.Icon.Default.prototype as L.Icon & {
  _getIconUrl?: string;
};
delete DefaultIcon._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const deliveryPartnerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to update map center when location changes
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

interface TrackingMapProps {
  orderId: string;
  deliveryId: string;
  destination: {
    latitude: number;
    longitude: number;
    address: string;
  };
  jwtToken: string;
}

interface LocationUpdate {
  latitude: number;
  longitude: number;
  eta: number; // minutes
  timestamp: string;
}

export function TrackingMap({
  deliveryId,
  destination,
  jwtToken,
}: TrackingMapProps) {
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [isDeliveryCompleted, setIsDeliveryCompleted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasEverConnected, setHasEverConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  console.log('TrackingMap render - isConnected:', isConnected, 'hasEverConnected:', hasEverConnected, 'connectionError:', connectionError);

  // WebSocket connection and event handling
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL;
    
    if (!wsUrl) {
      console.error('WebSocket server URL not configured');
      return;
    }

    // Prevent duplicate connections in Strict Mode
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket already exists, skipping connection');
      return;
    }

    let reconnectTimeout: NodeJS.Timeout;
    let isCleanupCalled = false;

    const connectWebSocket = () => {
      if (isCleanupCalled) return;

      console.log('Creating new WebSocket connection');
      
      // Connect to WebSocket server
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        
        // Authenticate with JWT
        ws.send(
          JSON.stringify({
            type: 'auth',
            token: jwtToken,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'auth_success':
              console.log('WebSocket authenticated');
              setHasEverConnected(true);
              setIsConnected(true);
              setConnectionError(null);
              break;

            case 'auth_error':
              console.error('WebSocket authentication failed:', data.message);
              setConnectionError('Authentication failed');
              setIsConnected(false);
              break;

            case 'location_update':
              if (data.deliveryId === deliveryId) {
                setCurrentLocation({
                  latitude: data.latitude,
                  longitude: data.longitude,
                  eta: data.eta,
                  timestamp: data.timestamp,
                });
              }
              break;

            case 'delivery_completed':
              if (data.deliveryId === deliveryId) {
                setIsDeliveryCompleted(true);
              }
              break;

            default:
              console.log('Unknown WebSocket event:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error');
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        
        // Don't reset isConnected immediately if we've successfully connected before
        // This prevents the "Connecting..." overlay from showing during reconnection
        if (!hasEverConnected) {
          setIsConnected(false);
        }
        
        // Only attempt reconnection if not a clean unmount and not authentication failure
        if (!isCleanupCalled && event.code !== 4001 && event.code !== 1000) {
          console.log('Attempting to reconnect in 3 seconds...');
          reconnectTimeout = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };
    };

    // Initial connection
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      console.log('Cleanup called');
      isCleanupCalled = true;
      clearTimeout(reconnectTimeout);
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
  }, [deliveryId, jwtToken]);

  // Format ETA for display
  const formatETA = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Calculate map center and zoom
  const mapCenter: [number, number] = currentLocation
    ? [currentLocation.latitude, currentLocation.longitude]
    : [destination.latitude, destination.longitude];

  return (
    <div className="relative w-full h-full min-h-[500px] bg-gray-100 rounded-lg overflow-hidden">
      {/* Leaflet Map */}
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: '100%', 
          width: '100%' 
        }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={process.env.NEXT_PUBLIC_LEAFLET_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
        />

        {/* Destination Marker */}
        <Marker position={[destination.latitude, destination.longitude]} icon={destinationIcon}>
          <Popup>
            <div className="text-sm">
              <div className="font-semibold mb-1">Destination</div>
              <div className="text-gray-600">{destination.address}</div>
            </div>
          </Popup>
        </Marker>

        {/* Delivery Partner Marker */}
        {currentLocation && !isDeliveryCompleted && (
          <Marker
            position={[currentLocation.latitude, currentLocation.longitude]}
            icon={deliveryPartnerIcon}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold mb-1">Delivery Partner</div>
                <div className="text-gray-600">
                  ETA: {formatETA(currentLocation.eta)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Auto-center map when location updates */}
        <MapUpdater center={mapCenter} />
      </MapContainer>

      {/* Connection Status Overlay */}
      {!isConnected && !hasEverConnected && !connectionError && (
        <div className="absolute top-4 left-4 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg shadow-lg z-[1000]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Connecting...</span>
          </div>
        </div>
      )}

      {(isConnected || hasEverConnected) && !connectionError && (
        <div className="absolute top-4 left-4 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg z-[1000]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        </div>
      )}

      {connectionError && (
        <div className="absolute top-4 left-4 bg-red-100 text-red-800 px-4 py-2 rounded-lg shadow-lg z-[1000]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-sm font-medium">{connectionError}</span>
          </div>
        </div>
      )}

      {/* ETA Badge */}
      {currentLocation && !isDeliveryCompleted && (
        <div className="absolute top-4 right-4 bg-white px-4 py-3 rounded-lg shadow-lg z-[1000]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <div>
              <div className="text-xs text-gray-500">Estimated Arrival</div>
              <div className="text-lg font-bold text-gray-900">
                {formatETA(currentLocation.eta)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Completed Message */}
      {isDeliveryCompleted && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
          <div className="bg-white p-8 rounded-lg shadow-2xl text-center max-w-md">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Delivery Completed!
            </h3>
            <p className="text-gray-600">
              Your order has been successfully delivered.
            </p>
          </div>
        </div>
      )}

      {/* No Location Data Message */}
      {!currentLocation && !isDeliveryCompleted && isConnected && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg z-[1000]">
          <p className="text-sm text-gray-600">
            Waiting for delivery partner location...
          </p>
        </div>
      )}
    </div>
  );
}
