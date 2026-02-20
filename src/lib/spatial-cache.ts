/**
 * Spatial Query Caching Utilities
 * 
 * Provides caching for service area lookups and vendor discovery queries.
 * Gracefully degrades if Redis is unavailable.
 */

import { getRedisClient, isRedisConnected } from './redis';
import type { VendorWithLocationInfo } from '@/services/vendor-discovery.service';

// Cache key prefixes
const CACHE_PREFIX = {
  SERVICE_AREA: 'service-area:point:',
  VENDORS: 'vendors:location:',
};

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  SERVICE_AREA: 300, // 5 minutes
  VENDORS: 120, // 2 minutes
};

/**
 * Generate cache key for service area lookup
 */
function getServiceAreaCacheKey(latitude: number, longitude: number): string {
  // Round to 6 decimal places for cache key (~0.1m precision)
  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);
  return `${CACHE_PREFIX.SERVICE_AREA}${lat},${lng}`;
}

/**
 * Generate cache key for vendor discovery
 */
function getVendorsCacheKey(
  latitude: number,
  longitude: number,
  categoryId?: string,
  maxDistanceKm?: number
): string {
  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);
  const category = categoryId || 'all';
  const distance = maxDistanceKm || 50;
  return `${CACHE_PREFIX.VENDORS}${lat},${lng}:${category}:${distance}`;
}

/**
 * Get cached service area for a point
 * Returns null if not cached or Redis unavailable
 */
export async function getCachedServiceArea(
  latitude: number,
  longitude: number
): Promise<any | null> {
  if (!isRedisConnected()) {
    return null;
  }

  try {
    const client = await getRedisClient();
    if (!client) return null;

    const key = getServiceAreaCacheKey(latitude, longitude);
    const cached = await client.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    return null;
  } catch (error) {
    console.warn('[Cache] Failed to get cached service area:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Cache service area for a point
 * TTL: 5 minutes
 */
export async function setCachedServiceArea(
  latitude: number,
  longitude: number,
  serviceArea: any
): Promise<void> {
  if (!isRedisConnected()) {
    return;
  }

  try {
    const client = await getRedisClient();
    if (!client) return;

    const key = getServiceAreaCacheKey(latitude, longitude);
    await client.setEx(key, CACHE_TTL.SERVICE_AREA, JSON.stringify(serviceArea));
  } catch (error) {
    console.warn('[Cache] Failed to cache service area:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Get cached vendors for a location
 * Returns null if not cached or Redis unavailable
 */
export async function getCachedVendors(
  latitude: number,
  longitude: number,
  categoryId?: string,
  maxDistanceKm?: number
): Promise<VendorWithLocationInfo[] | null> {
  if (!isRedisConnected()) {
    return null;
  }

  try {
    const client = await getRedisClient();
    if (!client) return null;

    const key = getVendorsCacheKey(latitude, longitude, categoryId, maxDistanceKm);
    const cached = await client.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    return null;
  } catch (error) {
    console.warn('[Cache] Failed to get cached vendors:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Cache vendors for a location
 * TTL: 2 minutes
 */
export async function setCachedVendors(
  latitude: number,
  longitude: number,
  vendors: VendorWithLocationInfo[],
  categoryId?: string,
  maxDistanceKm?: number
): Promise<void> {
  if (!isRedisConnected()) {
    return;
  }

  try {
    const client = await getRedisClient();
    if (!client) return;

    const key = getVendorsCacheKey(latitude, longitude, categoryId, maxDistanceKm);
    await client.setEx(key, CACHE_TTL.VENDORS, JSON.stringify(vendors));
  } catch (error) {
    console.warn('[Cache] Failed to cache vendors:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Invalidate service area cache
 * Call this when service areas are created, updated, or deleted
 */
export async function invalidateServiceAreaCache(serviceAreaId?: string): Promise<void> {
  if (!isRedisConnected()) {
    return;
  }

  try {
    const client = await getRedisClient();
    if (!client) return;

    // If specific service area ID provided, we could be more targeted
    // For now, invalidate all service area cache entries
    const keys = await client.keys(`${CACHE_PREFIX.SERVICE_AREA}*`);
    
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`[Cache] Invalidated ${keys.length} service area cache entries`);
    }

    // Also invalidate vendor cache since service areas affect vendor discovery
    const vendorKeys = await client.keys(`${CACHE_PREFIX.VENDORS}*`);
    if (vendorKeys.length > 0) {
      await client.del(vendorKeys);
      console.log(`[Cache] Invalidated ${vendorKeys.length} vendor cache entries`);
    }
  } catch (error) {
    console.warn('[Cache] Failed to invalidate service area cache:', error instanceof Error ? error.message : 'Unknown error');
  }
}
