/**
 * Polygon Validation Logic
 * 
 * Validates polygon quality including closure, self-intersection,
 * and area bounds.
 */

import * as turf from '@turf/turf';
import { GeoJSONPolygon, validateCoordinates } from './polygon-utils';

/**
 * Polygon validation result with detailed error messages
 */
export interface PolygonValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Minimum polygon area in square kilometers
 */
const MIN_AREA_KM2 = 0.1;

/**
 * Maximum polygon area in square kilometers
 */
const MAX_AREA_KM2 = 10000;

/**
 * Validate polygon has minimum required points
 * A polygon must have at least 3 unique points (4 including closure)
 */
function validateMinimumPoints(coordinates: number[][][]): string | null {
  const outerRing = coordinates[0];
  
  if (!outerRing || outerRing.length < 4) {
    return `Polygon must have at least 3 unique points (4 including closure), got ${outerRing?.length || 0}`;
  }
  
  return null;
}

/**
 * Validate polygon is properly closed
 * First and last coordinates must be identical
 */
function validateClosure(coordinates: number[][][]): string | null {
  const errors: string[] = [];
  
  coordinates.forEach((ring, ringIndex) => {
    if (ring.length < 2) {
      errors.push(`Ring ${ringIndex} has insufficient points`);
      return;
    }
    
    const first = ring[0];
    const last = ring[ring.length - 1];
    
    if (first[0] !== last[0] || first[1] !== last[1]) {
      errors.push(
        `Ring ${ringIndex} is not closed: first point [${first}] !== last point [${last}]`
      );
    }
  });
  
  return errors.length > 0 ? errors.join('; ') : null;
}

/**
 * Validate polygon does not have self-intersecting edges
 * Uses turf.js kinks detection
 */
function validateNoSelfIntersection(geoJson: GeoJSONPolygon): string | null {
  try {
    const kinks = turf.kinks(geoJson);
    
    if (kinks.features.length > 0) {
      return `Polygon has ${kinks.features.length} self-intersecting edge(s)`;
    }
    
    return null;
  } catch (error) {
    // If turf.kinks fails, the polygon might be invalid
    return `Failed to check for self-intersection: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Validate polygon area is within acceptable bounds
 */
function validateAreaBounds(geoJson: GeoJSONPolygon): string | null {
  try {
    const areaInSquareMeters = turf.area(geoJson);
    const areaInSquareKm = areaInSquareMeters / 1_000_000;
    
    if (areaInSquareKm < MIN_AREA_KM2) {
      return `Polygon area (${areaInSquareKm.toFixed(2)} km²) is below minimum (${MIN_AREA_KM2} km²)`;
    }
    
    if (areaInSquareKm > MAX_AREA_KM2) {
      return `Polygon area (${areaInSquareKm.toFixed(2)} km²) exceeds maximum (${MAX_AREA_KM2} km²)`;
    }
    
    return null;
  } catch (error) {
    return `Failed to calculate polygon area: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Comprehensive polygon validation
 * 
 * Validates:
 * - Minimum 3 coordinate points
 * - Polygon is closed (first = last point)
 * - No self-intersecting edges
 * - Area within bounds (0.1 km² to 10000 km²)
 * - Valid coordinate ranges
 * 
 * @param geoJson - GeoJSON Polygon object to validate
 * @returns Validation result with errors and warnings
 */
export function validatePolygon(geoJson: GeoJSONPolygon): PolygonValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate GeoJSON structure
  if (!geoJson || geoJson.type !== 'Polygon') {
    errors.push('Invalid GeoJSON: must be a Polygon type');
    return { isValid: false, errors, warnings };
  }
  
  if (!geoJson.coordinates || !Array.isArray(geoJson.coordinates)) {
    errors.push('Invalid GeoJSON: coordinates must be an array');
    return { isValid: false, errors, warnings };
  }
  
  const { coordinates } = geoJson;
  
  // Validate coordinates are valid numbers
  const coordValidation = validateCoordinates(coordinates);
  if (!coordValidation.isValid) {
    errors.push(...coordValidation.errors);
    return { isValid: false, errors, warnings };
  }
  
  // Validate minimum points
  const minPointsError = validateMinimumPoints(coordinates);
  if (minPointsError) {
    errors.push(minPointsError);
  }
  
  // Validate closure
  const closureError = validateClosure(coordinates);
  if (closureError) {
    errors.push(closureError);
  }
  
  // If basic validations fail, don't proceed with geometric validations
  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }
  
  // Validate no self-intersection
  const selfIntersectionError = validateNoSelfIntersection(geoJson);
  if (selfIntersectionError) {
    errors.push(selfIntersectionError);
  }
  
  // Validate area bounds
  const areaBoundsError = validateAreaBounds(geoJson);
  if (areaBoundsError) {
    errors.push(areaBoundsError);
  }
  
  // Check for very small polygons (warning only)
  try {
    const areaInSquareMeters = turf.area(geoJson);
    const areaInSquareKm = areaInSquareMeters / 1_000_000;
    
    if (areaInSquareKm < 1 && areaInSquareKm >= MIN_AREA_KM2) {
      warnings.push(
        `Polygon area is very small (${areaInSquareKm.toFixed(3)} km²). Consider if this is intentional.`
      );
    }
  } catch {
    // Ignore warning calculation errors
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate polygon and throw error if invalid
 * Convenience function for use in services
 * 
 * @param geoJson - GeoJSON Polygon object to validate
 * @throws Error with validation error messages
 */
export function validatePolygonOrThrow(geoJson: GeoJSONPolygon): void {
  const validation = validatePolygon(geoJson);
  
  if (!validation.isValid) {
    throw new Error(`Invalid polygon: ${validation.errors.join('; ')}`);
  }
}
