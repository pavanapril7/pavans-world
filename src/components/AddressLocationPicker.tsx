'use client';

/**
 * AddressLocationPicker Component
 * 
 * Interactive map component for customers to set their address location:
 * - Draggable marker for location selection
 * - Manual latitude/longitude input fields
 * - Browser geolocation API support for initial location
 * - Coordinate validation
 * - Returns coordinates to parent form component
 */

import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import type { LeafletMouseEvent, DragEndEvent } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Locate, Loader2 } from 'lucide-react';

// Fix for default marker icons in Leaflet with Next.js
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface AddressLocationPickerProps {
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
  onLocationChange: (location: { latitude: number; longitude: number } | null) => void;
}

// Component to handle map click events
function LocationMarker({
  position,
  onPositionChange,
}: {
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend: (e: DragEndEvent) => {
          const marker = e.target;
          const position = marker.getLatLng();
          onPositionChange(position.lat, position.lng);
        },
      }}
    />
  );
}

export function AddressLocationPicker({
  initialLocation,
  onLocationChange,
}: AddressLocationPickerProps) {
  const [latitude, setLatitude] = useState(initialLocation?.latitude || 28.6139); // Default: New Delhi
  const [longitude, setLongitude] = useState(initialLocation?.longitude || 77.209);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLocation, setHasLocation] = useState(!!initialLocation);

  // Validate coordinates
  const validateCoordinates = (lat: number, lng: number): boolean => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  // Update parent component when coordinates change
  useEffect(() => {
    if (hasLocation && validateCoordinates(latitude, longitude)) {
      onLocationChange({ latitude, longitude });
    } else if (!hasLocation) {
      onLocationChange(null);
    }
  }, [latitude, longitude, hasLocation, onLocationChange]);

  // Handle marker position change
  const handlePositionChange = useCallback((lat: number, lng: number) => {
    if (validateCoordinates(lat, lng)) {
      setLatitude(lat);
      setLongitude(lng);
      setHasLocation(true);
      setError(null);
    } else {
      setError('Invalid coordinates');
    }
  }, []);

  // Handle manual latitude input
  const handleLatitudeChange = (value: string) => {
    const lat = parseFloat(value);
    if (!isNaN(lat)) {
      if (validateCoordinates(lat, longitude)) {
        setLatitude(lat);
        setHasLocation(true);
        setError(null);
      } else {
        setError('Latitude must be between -90 and 90');
      }
    }
  };

  // Handle manual longitude input
  const handleLongitudeChange = (value: string) => {
    const lng = parseFloat(value);
    if (!isNaN(lng)) {
      if (validateCoordinates(latitude, lng)) {
        setLongitude(lng);
        setHasLocation(true);
        setError(null);
      } else {
        setError('Longitude must be between -180 and 180');
      }
    }
  };

  // Get current location from browser
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        if (validateCoordinates(lat, lng)) {
          setLatitude(lat);
          setLongitude(lng);
          setHasLocation(true);
          setError(null);
        }
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError('Location permission denied. Please enable location access.');
            break;
          case error.POSITION_UNAVAILABLE:
            setError('Location information unavailable.');
            break;
          case error.TIMEOUT:
            setError('Location request timed out.');
            break;
          default:
            setError('An error occurred while getting your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Clear location
  const handleClearLocation = () => {
    setHasLocation(false);
    setError(null);
    onLocationChange(null);
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {isLocating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Getting location...
            </>
          ) : (
            <>
              <Locate className="w-4 h-4" />
              Use My Location
            </>
          )}
        </button>

        {hasLocation && (
          <button
            type="button"
            onClick={handleClearLocation}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
          >
            Clear Location
          </button>
        )}
      </div>

      {/* Map Container */}
      {hasLocation && (
        <div className="relative h-[400px] rounded-lg overflow-hidden border border-gray-200">
          <MapContainer
            center={[latitude, longitude]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            key={`${latitude}-${longitude}`} // Force re-render when coordinates change
          >
            <TileLayer
              url={process.env.NEXT_PUBLIC_LEAFLET_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            <LocationMarker
              position={[latitude, longitude]}
              onPositionChange={handlePositionChange}
            />
          </MapContainer>

          {/* Map Instructions */}
          <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded-lg shadow-lg z-[1000]">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4" />
              <span>Click or drag marker to set location</span>
            </div>
          </div>
        </div>
      )}

      {/* Coordinate Inputs */}
      {hasLocation && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
              Latitude
            </label>
            <input
              id="latitude"
              type="number"
              step="0.000001"
              value={latitude}
              onChange={(e) => handleLatitudeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="-90 to 90"
            />
          </div>

          <div>
            <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
              Longitude
            </label>
            <input
              id="longitude"
              type="number"
              step="0.000001"
              value={longitude}
              onChange={(e) => handleLongitudeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="-180 to 180"
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Help Text */}
      {!hasLocation && !error && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm">
          <p>
            Adding a location is optional but helps us provide better service. Click &quot;Use My Location&quot; to automatically detect your current position.
          </p>
        </div>
      )}
    </div>
  );
}
