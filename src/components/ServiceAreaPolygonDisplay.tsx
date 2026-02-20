'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Map as LeafletMap } from 'leaflet';

// Dynamically import Leaflet to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Polygon = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polygon),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('react-leaflet').then((mod) => mod.Tooltip),
  { ssr: false }
);

interface ServiceAreaPolygonDisplayProps {
  serviceArea: {
    id: string;
    name: string;
    boundary: GeoJSON.Polygon;
    centerLatitude: number;
    centerLongitude: number;
  };
  color?: string;
  showName?: boolean;
}

// Color palette for different service areas
const SERVICE_AREA_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];

/**
 * ServiceAreaPolygonDisplay component
 * Displays a service area polygon on a read-only Leaflet map
 * Uses distinct colors for different service areas
 */
export function ServiceAreaPolygonDisplay({
  serviceArea,
  color,
  showName = true,
}: ServiceAreaPolygonDisplayProps) {
  const mapRef = useRef<LeafletMap | null>(null);

  // Check if boundary exists
  if (!serviceArea.boundary || !serviceArea.boundary.coordinates) {
    return (
      <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <p className="text-gray-500 mb-2">No boundary data available</p>
          <p className="text-sm text-gray-400">
            This service area needs to be updated with polygon boundary data
          </p>
        </div>
      </div>
    );
  }

  // Generate a consistent color based on service area ID if no color provided
  const polygonColor =
    color ||
    SERVICE_AREA_COLORS[
      parseInt(serviceArea.id.replace(/\D/g, ''), 10) % SERVICE_AREA_COLORS.length
    ];

  // Convert GeoJSON coordinates to Leaflet format [lat, lng]
  const polygonPositions = serviceArea.boundary.coordinates[0].map(
    ([lng, lat]) => [lat, lng] as [number, number]
  );

  useEffect(() => {
    // Fit map bounds to polygon when component mounts
    if (mapRef.current && polygonPositions.length > 0) {
      const bounds = polygonPositions.map(([lat, lng]) => [lat, lng] as [number, number]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [polygonPositions]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={[serviceArea.centerLatitude, serviceArea.centerLongitude]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        scrollWheelZoom={false}
        dragging={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Polygon
          positions={polygonPositions}
          pathOptions={{
            color: polygonColor,
            fillColor: polygonColor,
            fillOpacity: 0.2,
            weight: 3,
          }}
        >
          {showName && (
            <Tooltip permanent direction="center" className="leaflet-tooltip-custom">
              <div className="text-center">
                <div className="font-semibold">{serviceArea.name}</div>
              </div>
            </Tooltip>
          )}
        </Polygon>
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
        <div className="flex items-center space-x-2">
          <div
            className="w-4 h-4 rounded border-2"
            style={{
              backgroundColor: `${polygonColor}33`,
              borderColor: polygonColor,
            }}
          />
          <span className="text-sm font-medium text-gray-900">{serviceArea.name}</span>
        </div>
      </div>
    </div>
  );
}
