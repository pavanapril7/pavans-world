import { prisma } from '@/lib/prisma';
import { Prisma, ServiceAreaStatus } from '@prisma/client';
import { wktToGeoJson, calculatePolygonCenter } from '@/lib/polygon-utils';
import { getCachedServiceArea, setCachedServiceArea } from '@/lib/spatial-cache';

export interface VendorWithDistance {
  id: string;
  businessName: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  distanceKm: number;
  isActive: boolean;
  imageUrl: string | null;
  rating: number;
  categoryId: string;
}

export interface DeliveryPartnerWithDistance {
  id: string;
  userId: string;
  currentLatitude: number;
  currentLongitude: number;
  distanceKm: number;
  status: string;
}

export interface ServiceAreaInfo {
  id: string;
  name: string;
  city: string;
  state: string;
  centerLatitude: number | null;
  centerLongitude: number | null;
}

export interface PointInServiceAreaResult {
  isServiceable: boolean;
  serviceArea: ServiceAreaInfo | null;
  nearestServiceArea: ServiceAreaInfo | null;
  distanceToNearest: number | null;
}

export interface PolygonOverlapResult {
  hasOverlap: boolean;
  overlappingAreas: Array<{
    id: string;
    name: string;
    overlapPercentage: number;
  }>;
}

export class GeoLocationService {
  /**
   * Validate coordinates are within valid geographic bounds
   * Latitude: -90 to 90, Longitude: -180 to 180
   */
  static validateCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  /**
   * Calculate distance between two points using PostGIS ST_Distance
   * Returns distance in kilometers with two decimal precision
   */
  static async calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): Promise<number> {
    // Validate all coordinates
    if (!this.validateCoordinates(lat1, lng1) || !this.validateCoordinates(lat2, lng2)) {
      throw new Error('Invalid coordinates provided');
    }

    const result = await prisma.$queryRaw<Array<{ distance: number }>>`
      SELECT 
        ST_Distance(
          ST_SetSRID(ST_MakePoint(${lng1}, ${lat1}), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lng2}, ${lat2}), 4326)::geography
        ) / 1000 as distance
    `;

    // Return with two decimal precision
    return Math.round(result[0].distance * 100) / 100;
  }

  /**
   * Calculate ETA based on distance
   * Uses 30 km/h average speed and adds 5-minute buffer
   * Returns ETA in minutes
   */
  static calculateETA(distanceKm: number): number {
    const avgSpeedKmh = 30;
    const bufferMinutes = 5;
    const travelTimeMinutes = (distanceKm / avgSpeedKmh) * 60;
    return Math.ceil(travelTimeMinutes + bufferMinutes);
  }

  /**
   * Format ETA for display
   * - "Arriving soon" if distance < 1 km
   * - "X min" if ETA < 60 minutes
   * - "Xh Ym" if ETA >= 60 minutes
   */
  static formatETA(minutes: number, distanceKm: number): string {
    if (distanceKm < 1) return 'Arriving soon';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  /**
   * Find vendors near a location using PostGIS
   * Filters by service radius and active status
   * Returns vendors sorted by distance ascending
   */
  static async findNearbyVendors(
    latitude: number,
    longitude: number,
    radiusKm: number = 50
  ): Promise<VendorWithDistance[]> {
    // Validate coordinates
    if (!this.validateCoordinates(latitude, longitude)) {
      throw new Error('Invalid coordinates provided');
    }

    // Use raw SQL with PostGIS functions for efficient spatial queries
    const vendors = await prisma.$queryRaw<
      Array<{
        id: string;
        businessName: string;
        latitude: number;
        longitude: number;
        serviceRadiusKm: Prisma.Decimal;
        distanceKm: number;
        status: string;
        imageUrl: string | null;
        rating: Prisma.Decimal;
        categoryId: string;
      }>
    >`
      SELECT 
        id,
        "businessName",
        latitude,
        longitude,
        "serviceRadiusKm",
        status,
        "imageUrl",
        rating,
        "categoryId",
        ST_Distance(
          ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        ) / 1000 as "distanceKm"
      FROM "Vendor"
      WHERE 
        status = 'ACTIVE'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          ${radiusKm * 1000}
        )
        AND ST_Distance(
          ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        ) / 1000 <= "serviceRadiusKm"
      ORDER BY "distanceKm" ASC
    `;

    // Convert Prisma.Decimal to number and format response
    return vendors.map((vendor) => ({
      id: vendor.id,
      businessName: vendor.businessName,
      latitude: vendor.latitude,
      longitude: vendor.longitude,
      serviceRadiusKm: Number(vendor.serviceRadiusKm),
      distanceKm: Math.round(vendor.distanceKm * 100) / 100, // Two decimal precision
      isActive: vendor.status === 'ACTIVE',
      imageUrl: vendor.imageUrl,
      rating: Number(vendor.rating),
      categoryId: vendor.categoryId,
    }));
  }

  /**
   * Find delivery partners near a location
   * Filters by availability status (AVAILABLE) and service area containment
   * Returns delivery partners sorted by distance ascending
   */
  static async findNearbyDeliveryPartners(
    latitude: number,
    longitude: number,
    radiusKm: number,
    serviceAreaId?: string
  ): Promise<DeliveryPartnerWithDistance[]> {
    // Validate coordinates
    if (!this.validateCoordinates(latitude, longitude)) {
      throw new Error('Invalid coordinates provided');
    }

    // Build the query with optional service area filter
    const serviceAreaFilter = serviceAreaId
      ? Prisma.sql`AND "serviceAreaId" = ${serviceAreaId}`
      : Prisma.empty;

    const deliveryPartners = await prisma.$queryRaw<
      Array<{
        id: string;
        userId: string;
        currentLatitude: number;
        currentLongitude: number;
        distanceKm: number;
        status: string;
      }>
    >`
      SELECT 
        id,
        "userId",
        "currentLatitude",
        "currentLongitude",
        status,
        ST_Distance(
          ST_SetSRID(ST_MakePoint("currentLongitude", "currentLatitude"), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        ) / 1000 as "distanceKm"
      FROM "DeliveryPartner"
      WHERE 
        status = 'AVAILABLE'
        AND "currentLatitude" IS NOT NULL
        AND "currentLongitude" IS NOT NULL
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint("currentLongitude", "currentLatitude"), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          ${radiusKm * 1000}
        )
        ${serviceAreaFilter}
      ORDER BY "distanceKm" ASC
    `;

    // Format response with two decimal precision for distance
    return deliveryPartners.map((dp) => ({
      id: dp.id,
      userId: dp.userId,
      currentLatitude: dp.currentLatitude,
      currentLongitude: dp.currentLongitude,
      distanceKm: Math.round(dp.distanceKm * 100) / 100,
      status: dp.status,
    }));
  }

  /**
   * Find service area containing a given point using ST_Contains
   * Returns the first ACTIVE service area that contains the point
   * 
   * @param latitude - Point latitude
   * @param longitude - Point longitude
   * @returns Service area info or null if point is outside all service areas
   */
  static async findServiceAreaForPoint(
    latitude: number,
    longitude: number
  ): Promise<ServiceAreaInfo | null> {
    // Validate coordinates
    if (!this.validateCoordinates(latitude, longitude)) {
      throw new Error('Invalid coordinates provided');
    }

    // Check cache first
    const cached = await getCachedServiceArea(latitude, longitude);
    if (cached) {
      return cached;
    }

    // Query database if not cached
    const result = await prisma.$queryRaw<ServiceAreaInfo[]>`
      SELECT 
        id,
        name,
        city,
        state,
        "centerLatitude",
        "centerLongitude"
      FROM "ServiceArea"
      WHERE 
        status = ${ServiceAreaStatus.ACTIVE}
        AND boundary IS NOT NULL
        AND ST_Contains(
          boundary,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
        )
      LIMIT 1
    `;

    const serviceArea = result[0] || null;

    // Cache the result (even if null)
    if (serviceArea) {
      await setCachedServiceArea(latitude, longitude, serviceArea);
    }

    return serviceArea;
  }

  /**
   * Validate if a point is within a service area polygon
   * If not serviceable, finds the nearest service area
   * 
   * @param latitude - Point latitude
   * @param longitude - Point longitude
   * @returns Validation result with service area info and nearest alternative
   */
  static async validatePointInServiceArea(
    latitude: number,
    longitude: number
  ): Promise<PointInServiceAreaResult> {
    // Validate coordinates
    if (!this.validateCoordinates(latitude, longitude)) {
      throw new Error('Invalid coordinates provided');
    }

    // Check if point is within any service area
    const serviceArea = await this.findServiceAreaForPoint(latitude, longitude);

    if (serviceArea) {
      return {
        isServiceable: true,
        serviceArea,
        nearestServiceArea: null,
        distanceToNearest: null,
      };
    }

    // Point is not serviceable, find nearest service area
    const nearestResult = await prisma.$queryRaw<
      Array<ServiceAreaInfo & { distance: number }>
    >`
      SELECT 
        id,
        name,
        city,
        state,
        "centerLatitude",
        "centerLongitude",
        ST_Distance(
          boundary::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        ) / 1000 as distance
      FROM "ServiceArea"
      WHERE 
        status = ${ServiceAreaStatus.ACTIVE}
        AND boundary IS NOT NULL
      ORDER BY distance ASC
      LIMIT 1
    `;

    const nearest = nearestResult[0];

    return {
      isServiceable: false,
      serviceArea: null,
      nearestServiceArea: nearest
        ? {
            id: nearest.id,
            name: nearest.name,
            city: nearest.city,
            state: nearest.state,
            centerLatitude: nearest.centerLatitude,
            centerLongitude: nearest.centerLongitude,
          }
        : null,
      distanceToNearest: nearest ? Math.round(nearest.distance * 100) / 100 : null,
    };
  }

  /**
   * Calculate the center point of a polygon using turf.js
   * 
   * @param wkt - WKT string representation of polygon
   * @returns Center point as { latitude, longitude }
   */
  static calculatePolygonCenterFromWKT(wkt: string): {
    latitude: number;
    longitude: number;
  } {
    const geoJson = wktToGeoJson(wkt);
    return calculatePolygonCenter(geoJson);
  }

  /**
   * Check if a polygon overlaps with existing service areas
   * Uses ST_Overlaps, ST_Contains, and ST_Within for comprehensive overlap detection
   * 
   * @param wkt - WKT string representation of polygon to check
   * @param excludeId - Optional service area ID to exclude from check (for updates)
   * @returns Overlap result with details of overlapping areas
   */
  static async checkPolygonOverlap(
    wkt: string,
    excludeId?: string
  ): Promise<PolygonOverlapResult> {
    const excludeFilter = excludeId
      ? Prisma.sql`AND id != ${excludeId}`
      : Prisma.empty;

    const overlaps = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        overlapArea: number;
        totalArea: number;
      }>
    >`
      WITH new_polygon AS (
        SELECT ST_GeomFromText(${wkt}, 4326) as geom
      ),
      overlapping_areas AS (
        SELECT 
          sa.id,
          sa.name,
          ST_Area(ST_Intersection(sa.boundary, np.geom)::geography) / 1000000 as "overlapArea",
          ST_Area(sa.boundary::geography) / 1000000 as "totalArea"
        FROM "ServiceArea" sa, new_polygon np
        WHERE 
          sa.status = ${ServiceAreaStatus.ACTIVE}
          AND sa.boundary IS NOT NULL
          ${excludeFilter}
          AND (
            ST_Overlaps(sa.boundary, np.geom)
            OR ST_Contains(sa.boundary, np.geom)
            OR ST_Within(sa.boundary, np.geom)
          )
      )
      SELECT 
        id,
        name,
        "overlapArea",
        "totalArea"
      FROM overlapping_areas
      WHERE "overlapArea" > 0
    `;

    const overlappingAreas = overlaps.map((overlap) => ({
      id: overlap.id,
      name: overlap.name,
      overlapPercentage: Math.round((overlap.overlapArea / overlap.totalArea) * 100 * 100) / 100,
    }));

    return {
      hasOverlap: overlappingAreas.length > 0,
      overlappingAreas,
    };
  }

  /**
   * Calculate the area of a polygon in square kilometers using PostGIS
   * 
   * @param wkt - WKT string representation of polygon
   * @returns Area in square kilometers
   */
  static async calculatePolygonAreaFromWKT(wkt: string): Promise<number> {
    const result = await prisma.$queryRaw<Array<{ area: number }>>`
      SELECT 
        ST_Area(ST_GeomFromText(${wkt}, 4326)::geography) / 1000000 as area
    `;

    return Math.round(result[0].area * 100) / 100; // Two decimal precision
  }
}
