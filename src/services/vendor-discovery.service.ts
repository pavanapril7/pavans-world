/**
 * VendorDiscoveryService
 * 
 * Provides location-aware vendor filtering and discovery.
 * Filters vendors by service area, service radius, and active status.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { GeoLocationService } from './geolocation.service';
import { getCachedVendors, setCachedVendors } from '@/lib/spatial-cache';

export interface VendorDiscoveryFilters {
  latitude: number;
  longitude: number;
  serviceAreaId?: string;
  categoryId?: string;
  maxDistanceKm?: number;
}

export interface VendorWithLocationInfo {
  id: string;
  businessName: string;
  description: string;
  categoryId: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  distanceKm: number;
  isActive: boolean;
  imageUrl: string | null;
  rating: number;
  serviceAreaId: string;
  serviceAreaName: string;
  isWithinServiceRadius: boolean;
}

export class VendorDiscoveryService {
  /**
   * Find vendors for a specific location
   * 
   * Performs hybrid filtering:
   * 1. Finds service area for given coordinates
   * 2. Filters vendors in same service area with ACTIVE status
   * 3. Filters by service radius using ST_Distance
   * 4. Calculates distance for each vendor
   * 5. Sorts by distance ascending
   * 
   * @param filters - Location and optional filtering criteria
   * @returns Array of vendors with location info, sorted by distance
   */
  static async findVendorsForLocation(
    filters: VendorDiscoveryFilters
  ): Promise<VendorWithLocationInfo[]> {
    const { latitude, longitude, categoryId, maxDistanceKm = 50 } = filters;

    // Validate coordinates
    if (!GeoLocationService.validateCoordinates(latitude, longitude)) {
      throw new Error('Invalid coordinates provided');
    }

    // Check cache first
    const cached = await getCachedVendors(latitude, longitude, categoryId, maxDistanceKm);
    if (cached) {
      return cached;
    }

    // Find service area for given coordinates
    let serviceAreaId = filters.serviceAreaId;
    let serviceAreaName = '';

    if (!serviceAreaId) {
      const serviceArea = await GeoLocationService.findServiceAreaForPoint(
        latitude,
        longitude
      );

      // If no service area found, return empty array
      if (!serviceArea) {
        return [];
      }

      serviceAreaId = serviceArea.id;
      serviceAreaName = serviceArea.name;
    } else {
      // Fetch service area name if serviceAreaId is provided
      const serviceArea = await prisma.serviceArea.findUnique({
        where: { id: serviceAreaId },
        select: { name: true },
      });

      if (!serviceArea) {
        return [];
      }

      serviceAreaName = serviceArea.name;
    }

    // Build category filter
    const categoryFilter = categoryId
      ? Prisma.sql`AND v."categoryId" = ${categoryId}`
      : Prisma.empty;

    // Query vendors in same service area with ACTIVE status
    // Filter by service radius using ST_Distance
    // Calculate distance for each vendor
    // Sort by distance ascending
    const vendors = await prisma.$queryRaw<
      Array<{
        id: string;
        businessName: string;
        description: string;
        categoryId: string;
        latitude: number;
        longitude: number;
        serviceRadiusKm: Prisma.Decimal;
        distanceKm: number;
        status: string;
        imageUrl: string | null;
        rating: Prisma.Decimal;
        serviceAreaId: string;
      }>
    >`
      SELECT 
        v.id,
        v."businessName",
        v.description,
        v."categoryId",
        v.latitude,
        v.longitude,
        v."serviceRadiusKm",
        v.status,
        v."imageUrl",
        v.rating,
        v."serviceAreaId",
        ST_Distance(
          ST_SetSRID(ST_MakePoint(v.longitude, v.latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        ) / 1000 as "distanceKm"
      FROM "Vendor" v
      WHERE 
        v.status = 'ACTIVE'
        AND v."serviceAreaId" = ${serviceAreaId}
        AND v.latitude IS NOT NULL
        AND v.longitude IS NOT NULL
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(v.longitude, v.latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          v."serviceRadiusKm" * 1000
        )
        AND ST_Distance(
          ST_SetSRID(ST_MakePoint(v.longitude, v.latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        ) / 1000 <= v."serviceRadiusKm"
        ${categoryFilter}
      ORDER BY "distanceKm" ASC
    `;

    // Format response with location info
    const result = vendors.map((vendor) => ({
      id: vendor.id,
      businessName: vendor.businessName,
      description: vendor.description,
      categoryId: vendor.categoryId,
      latitude: vendor.latitude,
      longitude: vendor.longitude,
      serviceRadiusKm: Number(vendor.serviceRadiusKm),
      distanceKm: Math.round(vendor.distanceKm * 100) / 100, // Two decimal precision
      isActive: vendor.status === 'ACTIVE',
      imageUrl: vendor.imageUrl,
      rating: Number(vendor.rating),
      serviceAreaId: vendor.serviceAreaId,
      serviceAreaName,
      isWithinServiceRadius: true, // All returned vendors are within service radius
    }));

    // Cache the results
    await setCachedVendors(latitude, longitude, result, categoryId, maxDistanceKm);

    return result;
  }

  /**
   * Check if vendor can serve an address
   * 
   * Validates:
   * 1. Vendor and address are in same service area
   * 2. Address is within vendor service radius
   * 3. Address is within service area polygon
   * 
   * @param vendorId - Vendor ID
   * @param addressId - Address ID
   * @returns Object indicating if vendor can serve address with reason if not
   */
  static async canVendorServeAddress(
    vendorId: string,
    addressId: string
  ): Promise<{ canServe: boolean; reason?: string }> {
    // Get vendor and address from database
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        serviceAreaId: true,
        latitude: true,
        longitude: true,
        serviceRadiusKm: true,
        status: true,
      },
    });

    if (!vendor) {
      return { canServe: false, reason: 'Vendor not found' };
    }

    if (vendor.status !== 'ACTIVE') {
      return { canServe: false, reason: 'Vendor is not active' };
    }

    if (!vendor.latitude || !vendor.longitude) {
      return { canServe: false, reason: 'Vendor location not set' };
    }

    const address = await prisma.address.findUnique({
      where: { id: addressId },
      select: {
        id: true,
        serviceAreaId: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!address) {
      return { canServe: false, reason: 'Address not found' };
    }

    if (!address.latitude || !address.longitude) {
      return { canServe: false, reason: 'Address coordinates not set' };
    }

    // Check vendor and address are in same service area
    if (vendor.serviceAreaId !== address.serviceAreaId) {
      return { canServe: false, reason: 'Vendor does not serve this service area' };
    }

    // Check address is within vendor service radius
    const distance = await GeoLocationService.calculateDistance(
      vendor.latitude,
      vendor.longitude,
      address.latitude,
      address.longitude
    );

    if (distance > Number(vendor.serviceRadiusKm)) {
      return {
        canServe: false,
        reason: `Address is beyond vendor's delivery range (${distance.toFixed(2)} km > ${vendor.serviceRadiusKm} km)`,
      };
    }

    // Check address is within service area polygon
    const validation = await GeoLocationService.validatePointInServiceArea(
      address.latitude,
      address.longitude
    );

    if (!validation.isServiceable) {
      return { canServe: false, reason: 'Address is outside serviceable area' };
    }

    return { canServe: true };
  }
}
