import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
}
