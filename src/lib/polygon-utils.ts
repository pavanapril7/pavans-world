/**
 * Polygon Utility Functions
 * 
 * Provides conversion between GeoJSON and WKT formats,
 * coordinate validation, and polygon geometry utilities.
 */

import wellknown from 'wellknown';
import * as turf from '@turf/turf';
import type { Polygon as GeoJSONPolygonType } from 'geojson';

/**
 * GeoJSON Polygon type definition
 */
export type GeoJSONPolygon = GeoJSONPolygonType;

/**
 * Coordinate pair [longitude, latitude]
 */
export type Coordinate = [number, number];

/**
 * Validation result for coordinates
 */
export interface CoordinateValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validation result for polygons
 */
export interface PolygonValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Convert GeoJSON Polygon to WKT (Well-Known Text) format
 * 
 * @param geoJson - GeoJSON Polygon object
 * @returns WKT string representation
 * @throws Error if conversion fails
 */
export function geoJsonToWKT(geoJson: GeoJSONPolygon): string {
  try {
    // Type assertion needed due to incompatibility between geojson and wellknown Position types
    const wkt = wellknown.stringify(geoJson as unknown as wellknown.GeoJSONGeometry);
    if (!wkt) {
      throw new Error('Failed to convert GeoJSON to WKT');
    }
    return wkt;
  } catch (error) {
    throw new Error(
      `GeoJSON to WKT conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Convert WKT (Well-Known Text) to GeoJSON Polygon format
 * 
 * @param wkt - WKT string representation
 * @returns GeoJSON Polygon object
 * @throws Error if conversion fails or result is not a Polygon
 */
export function wktToGeoJson(wkt: string): GeoJSONPolygon {
  try {
    const geoJson = wellknown.parse(wkt);
    
    if (!geoJson) {
      throw new Error('Failed to parse WKT string');
    }
    
    if (geoJson.type !== 'Polygon') {
      throw new Error(`Expected Polygon, got ${geoJson.type}`);
    }
    
    return geoJson as GeoJSONPolygon;
  } catch (error) {
    throw new Error(
      `WKT to GeoJSON conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate a single coordinate pair
 * 
 * @param coordinate - [longitude, latitude] pair
 * @returns Validation result with error message if invalid
 */
export function validateCoordinate(coordinate: Coordinate): CoordinateValidationResult {
  const [lng, lat] = coordinate;
  
  // Check if coordinates are numbers
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    return {
      isValid: false,
      error: 'Coordinates must be numbers',
    };
  }
  
  // Check if coordinates are finite
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return {
      isValid: false,
      error: 'Coordinates must be finite numbers',
    };
  }
  
  // Validate latitude range: -90 to 90
  if (lat < -90 || lat > 90) {
    return {
      isValid: false,
      error: `Latitude must be between -90 and 90, got ${lat}`,
    };
  }
  
  // Validate longitude range: -180 to 180
  if (lng < -180 || lng > 180) {
    return {
      isValid: false,
      error: `Longitude must be between -180 and 180, got ${lng}`,
    };
  }
  
  return { isValid: true };
}

/**
 * Validate all coordinates in a polygon
 * 
 * @param coordinates - Array of coordinate rings
 * @returns Validation result with all error messages
 */
export function validateCoordinates(coordinates: number[][][]): PolygonValidationResult {
  const errors: string[] = [];
  
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    errors.push('Coordinates must be a non-empty array');
    return { isValid: false, errors };
  }
  
  // Validate each ring
  coordinates.forEach((ring, ringIndex) => {
    if (!Array.isArray(ring) || ring.length === 0) {
      errors.push(`Ring ${ringIndex} must be a non-empty array`);
      return;
    }
    
    // Validate each coordinate in the ring
    ring.forEach((coord, coordIndex) => {
      if (!Array.isArray(coord) || coord.length !== 2) {
        errors.push(`Ring ${ringIndex}, coordinate ${coordIndex} must be [lng, lat] pair`);
        return;
      }
      
      const validation = validateCoordinate(coord as Coordinate);
      if (!validation.isValid) {
        errors.push(`Ring ${ringIndex}, coordinate ${coordIndex}: ${validation.error}`);
      }
    });
  });
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate the center point (centroid) of a polygon
 * 
 * @param geoJson - GeoJSON Polygon object
 * @returns Center point as { latitude, longitude }
 */
export function calculatePolygonCenter(geoJson: GeoJSONPolygon): {
  latitude: number;
  longitude: number;
} {
  try {
    const centroid = turf.centroid(geoJson);
    const [longitude, latitude] = centroid.geometry.coordinates;
    
    return {
      latitude,
      longitude,
    };
  } catch (error) {
    throw new Error(
      `Failed to calculate polygon center: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Calculate the area of a polygon in square kilometers
 * 
 * @param geoJson - GeoJSON Polygon object
 * @returns Area in square kilometers
 */
export function calculatePolygonArea(geoJson: GeoJSONPolygon): number {
  try {
    const areaInSquareMeters = turf.area(geoJson);
    const areaInSquareKm = areaInSquareMeters / 1_000_000;
    
    return Math.round(areaInSquareKm * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    throw new Error(
      `Failed to calculate polygon area: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if a point is inside a polygon
 * 
 * @param point - [longitude, latitude] coordinate
 * @param polygon - GeoJSON Polygon object
 * @returns true if point is inside polygon, false otherwise
 */
export function isPointInPolygon(point: Coordinate, polygon: GeoJSONPolygon): boolean {
  try {
    const turfPoint = turf.point(point);
    return turf.booleanPointInPolygon(turfPoint, polygon);
  } catch (error) {
    throw new Error(
      `Failed to check point in polygon: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
