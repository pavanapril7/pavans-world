'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AlertCircle, Save, Trash2, MapPin, Undo } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface ServiceAreaMapEditorProps {
  initialPolygon?: GeoJSON.Polygon;
  onSave: (polygon: GeoJSON.Polygon) => Promise<void>;
  existingServiceAreas?: Array<{
    id: string;
    name: string;
    boundary: GeoJSON.Polygon;
  }>;
}

interface ValidationError {
  message: string;
  type: 'error' | 'warning';
}

/**
 * ServiceAreaMapEditor component
 * Interactive map for drawing and editing service area polygons
 * Displays existing service areas and validates new polygons
 */
export function ServiceAreaMapEditor({
  initialPolygon,
  onSave,
  existingServiceAreas = [],
}: ServiceAreaMapEditorProps) {
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>(() => {
    if (initialPolygon) {
      return initialPolygon.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
    }
    return [];
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const mapRef = useRef<LeafletMap | null>(null);

  // Set up map click handler
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      
      const handleMapClick = (e: { latlng: { lat: number; lng: number } }) => {
        // Only add points when actively drawing
        if (isDrawing) {
          const { lat, lng } = e.latlng;
          setPolygonPoints((prev) => [...prev, [lat, lng]]);
        }
      };

      map.on('click', handleMapClick);

      return () => {
        map.off('click', handleMapClick);
      };
    }
  }, [isDrawing]);

  const startDrawing = () => {
    setIsDrawing(true);
    setPolygonPoints([]);
    setValidationErrors([]);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearPolygon = () => {
    setPolygonPoints([]);
    setValidationErrors([]);
    setIsDrawing(false);
  };

  const undoLastPoint = () => {
    if (polygonPoints.length > 0) {
      setPolygonPoints((prev) => prev.slice(0, -1));
    }
  };

  const validatePolygon = useCallback((): boolean => {
    const errors: ValidationError[] = [];

    // Check minimum points
    if (polygonPoints.length < 3) {
      errors.push({
        message: 'Polygon must have at least 3 points',
        type: 'error',
      });
    }

    // Check if polygon is closed (first and last points should be same or close)
    if (polygonPoints.length >= 3) {
      const first = polygonPoints[0];
      const last = polygonPoints[polygonPoints.length - 1];
      const distance = Math.sqrt(
        Math.pow(first[0] - last[0], 2) + Math.pow(first[1] - last[1], 2)
      );
      
      if (distance > 0.001) {
        // Auto-close the polygon
        setPolygonPoints((prev) => [...prev, first]);
      }
    }

    // Calculate approximate area (simplified calculation)
    if (polygonPoints.length >= 3) {
      // This is a very rough approximation
      const bounds = polygonPoints.reduce(
        (acc, [lat, lng]) => ({
          minLat: Math.min(acc.minLat, lat),
          maxLat: Math.max(acc.maxLat, lat),
          minLng: Math.min(acc.minLng, lng),
          maxLng: Math.max(acc.maxLng, lng),
        }),
        {
          minLat: polygonPoints[0][0],
          maxLat: polygonPoints[0][0],
          minLng: polygonPoints[0][1],
          maxLng: polygonPoints[0][1],
        }
      );

      const latDiff = bounds.maxLat - bounds.minLat;
      const lngDiff = bounds.maxLng - bounds.minLng;
      const approxAreaSqKm = latDiff * lngDiff * 111 * 111; // Very rough approximation

      if (approxAreaSqKm < 0.1) {
        errors.push({
          message: 'Polygon area is too small (minimum 0.1 km²)',
          type: 'error',
        });
      }

      if (approxAreaSqKm > 10000) {
        errors.push({
          message: 'Polygon area is too large (maximum 10,000 km²)',
          type: 'error',
        });
      }
    }

    setValidationErrors(errors);
    return errors.filter((e) => e.type === 'error').length === 0;
  }, [polygonPoints]);

  const handleSave = async () => {
    if (!validatePolygon()) {
      return;
    }

    setIsSaving(true);
    try {
      // Ensure polygon is closed
      const points = [...polygonPoints];
      if (points.length > 0) {
        const first = points[0];
        const last = points[points.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          points.push(first);
        }
      }

      // Convert to GeoJSON format [lng, lat]
      const geoJsonPolygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [points.map(([lat, lng]) => [lng, lat])],
      };

      await onSave(geoJsonPolygon);
    } catch (error) {
      console.error('Error saving polygon:', error);
      setValidationErrors([
        {
          message: error instanceof Error ? error.message : 'Failed to save polygon',
          type: 'error',
        },
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  // Convert existing service areas to Leaflet format
  const existingPolygons = existingServiceAreas.map((area) => ({
    id: area.id,
    name: area.name,
    positions: area.boundary.coordinates[0].map(
      ([lng, lat]) => [lat, lng] as [number, number]
    ),
  }));

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">
              {isDrawing
                ? `Drawing... (${polygonPoints.length} points)`
                : polygonPoints.length > 0
                ? `Polygon complete (${polygonPoints.length} points)`
                : 'Click on the map to start drawing'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {!isDrawing && polygonPoints.length === 0 && (
              <Button type="button" onClick={startDrawing} variant="default">
                Start Drawing
              </Button>
            )}

            {!isDrawing && polygonPoints.length > 0 && (
              <Button type="button" onClick={startDrawing} variant="outline">
                Redraw Polygon
              </Button>
            )}

            {isDrawing && (
              <>
                <Button 
                  type="button"
                  onClick={undoLastPoint} 
                  variant="outline" 
                  disabled={polygonPoints.length === 0}
                >
                  <Undo className="w-4 h-4 mr-2" />
                  Undo Last Point
                </Button>
                <Button type="button" onClick={stopDrawing} variant="outline">
                  Finish Drawing
                </Button>
              </>
            )}

            {polygonPoints.length > 0 && !isDrawing && (
              <>
                <Button type="button" onClick={clearPolygon} variant="outline" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || polygonPoints.length < 3}
                  variant="default"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Confirming...' : 'Confirm Polygon'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mt-4 space-y-2">
            {validationErrors.map((error, index) => (
              <div
                key={index}
                className={`flex items-start space-x-2 p-3 rounded-lg ${
                  error.type === 'error'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-amber-50 border border-amber-200'
                }`}
              >
                <AlertCircle
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    error.type === 'error' ? 'text-red-600' : 'text-amber-600'
                  }`}
                />
                <p
                  className={`text-sm ${
                    error.type === 'error' ? 'text-red-800' : 'text-amber-800'
                  }`}
                >
                  {error.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div 
        className="relative w-full h-[600px] rounded-lg overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <MapContainer
          center={[12.9716, 77.5946]} // Bangalore coordinates as default
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Existing service areas (in gray) */}
          {existingPolygons.map((area) => (
            <Polygon
              key={area.id}
              positions={area.positions}
              pathOptions={{
                color: '#9CA3AF',
                fillColor: '#9CA3AF',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '5, 5',
              }}
            />
          ))}

          {/* Current polygon being drawn */}
          {polygonPoints.length > 0 && (
            <Polygon
              positions={polygonPoints}
              pathOptions={{
                color: '#3B82F6',
                fillColor: '#3B82F6',
                fillOpacity: 0.2,
                weight: 3,
              }}
            />
          )}
        </MapContainer>

        {/* Instructions overlay */}
        {isDrawing && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 z-[1000]">
            <p className="text-sm font-medium text-gray-900">
              Click on the map to add points to your polygon
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Click &quot;Finish Drawing&quot; when done
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
