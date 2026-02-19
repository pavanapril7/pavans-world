'use client';

/**
 * VendorLocationPicker Component
 * 
 * Interactive map component for vendors to set their business location:
 * - Draggable marker for location selection
 * - Manual latitude/longitude input fields
 * - Service radius circle overlay
 * - Coordinate validation
 * - Saves location via API
 */

import { useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import type { LeafletMouseEvent, DragEndEvent } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Save, Loader2, Locate, Search } from 'lucide-react';

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

interface VendorLocationPickerProps {
  vendorId: string;
  initialLocation?: {
    latitude: number;
    longitude: number;
    serviceRadiusKm: number;
  };
  onSave?: (location: { latitude: number; longitude: number; serviceRadiusKm: number }) => void;
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

// Component to handle map center changes
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useRef(() => {
    map.setView(center, map.getZoom());
  });

  return null;
}

export function VendorLocationPicker({
  vendorId,
  initialLocation,
  onSave,
}: VendorLocationPickerProps) {
  const [latitude, setLatitude] = useState(initialLocation?.latitude || 28.6139); // Default: New Delhi
  const [longitude, setLongitude] = useState(initialLocation?.longitude || 77.209);
  const [serviceRadiusKm, setServiceRadiusKm] = useState(initialLocation?.serviceRadiusKm || 10);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapKey, setMapKey] = useState(0); // Key to force map re-render

  // Validate coordinates
  const validateCoordinates = (lat: number, lng: number): boolean => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  // Validate service radius
  const validateServiceRadius = (radius: number): boolean => {
    return radius >= 1 && radius <= 100;
  };

  // Handle marker position change
  const handlePositionChange = useCallback((lat: number, lng: number) => {
    if (validateCoordinates(lat, lng)) {
      setLatitude(lat);
      setLongitude(lng);
      setError(null);
    } else {
      setError('Invalid coordinates');
    }
  }, []);

  // Handle location search using Nominatim (OpenStreetMap)
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a location to search');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      if (data.length === 0) {
        setError('Location not found. Try a different search term.');
        return;
      }

      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      if (validateCoordinates(lat, lng)) {
        setLatitude(lat);
        setLongitude(lng);
        setMapKey(prev => prev + 1); // Force map to re-center
        setError(null);
      }
    } catch (err) {
      setError('Failed to search location. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
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
          setMapKey(prev => prev + 1); // Force map to re-center
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

  // Handle manual latitude input
  const handleLatitudeChange = (value: string) => {
    const lat = parseFloat(value);
    if (!isNaN(lat)) {
      if (validateCoordinates(lat, longitude)) {
        setLatitude(lat);
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
        setError(null);
      } else {
        setError('Longitude must be between -180 and 180');
      }
    }
  };

  // Handle service radius change
  const handleServiceRadiusChange = (value: string) => {
    const radius = parseFloat(value);
    if (!isNaN(radius)) {
      if (validateServiceRadius(radius)) {
        setServiceRadiusKm(radius);
        setError(null);
      } else {
        setError('Service radius must be between 1 and 100 km');
      }
    }
  };

  // Save location
  const handleSave = async () => {
    // Validate before saving
    if (!validateCoordinates(latitude, longitude)) {
      setError('Invalid coordinates');
      return;
    }

    if (!validateServiceRadius(serviceRadiusKm)) {
      setError('Invalid service radius');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/vendors/${vendorId}/location`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: Number(latitude),
          longitude: Number(longitude),
          serviceRadiusKm: Number(serviceRadiusKm),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to save location');
      }

      setSuccess(true);
      
      // Call onSave callback if provided
      if (onSave) {
        onSave({ latitude, longitude, serviceRadiusKm });
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save location');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Location Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for a location (e.g., Mumbai, India)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search
              </>
            )}
          </button>
        </div>
        
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 justify-center"
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
      </div>

      {/* Map Container */}
      <div className="relative h-[500px] rounded-lg overflow-hidden border border-gray-200">
        <MapContainer
          center={[latitude, longitude]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          key={mapKey} // Force re-render when location changes
        >
          <TileLayer
            url={process.env.NEXT_PUBLIC_LEAFLET_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapController center={[latitude, longitude]} />
          
          <LocationMarker
            position={[latitude, longitude]}
            onPositionChange={handlePositionChange}
          />
          
          {/* Service radius circle */}
          <Circle
            center={[latitude, longitude]}
            radius={serviceRadiusKm * 1000} // Convert km to meters
            pathOptions={{
              color: 'blue',
              fillColor: 'blue',
              fillOpacity: 0.1,
            }}
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

      {/* Coordinate Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <div>
          <label htmlFor="serviceRadius" className="block text-sm font-medium text-gray-700 mb-1">
            Service Radius (km)
          </label>
          <input
            id="serviceRadius"
            type="number"
            step="0.1"
            min="1"
            max="100"
            value={serviceRadiusKm}
            onChange={(e) => handleServiceRadiusChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1 to 100"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          Location saved successfully!
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || !!error}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Location
            </>
          )}
        </button>
      </div>
    </div>
  );
}
