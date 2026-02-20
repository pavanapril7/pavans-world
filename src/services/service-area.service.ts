import { prisma } from '@/lib/prisma';
import { ServiceAreaStatus, Prisma } from '@prisma/client';
import { GeoJSONPolygon, geoJsonToWKT, calculatePolygonCenter } from '@/lib/polygon-utils';
import { validatePolygon } from '@/lib/polygon-validation';
import { GeoLocationService } from './geolocation.service';
import { invalidateServiceAreaCache } from '@/lib/spatial-cache';

export interface CreateServiceAreaInput {
  name: string;
  city: string;
  state: string;
  pincodes?: string[];
  boundary: GeoJSONPolygon;
  status?: ServiceAreaStatus;
}

export interface UpdateServiceAreaInput {
  name?: string;
  city?: string;
  state?: string;
  pincodes?: string[];
  boundary?: GeoJSONPolygon;
  status?: ServiceAreaStatus;
}

export interface ServiceAreaWithStats {
  id: string;
  name: string;
  city: string;
  state: string;
  pincodes: string[];
  centerLatitude: number;
  centerLongitude: number;
  status: ServiceAreaStatus;
  createdAt: Date;
  updatedAt: Date;
  stats: {
    areaSqKm: number;
    vendorCount: number;
    deliveryPartnerCount: number;
    addressCount: number;
    orderCount30Days: number;
  };
}

export interface CreateServiceAreaResult {
  serviceArea: {
    id: string;
    name: string;
    city: string;
    state: string;
    centerLatitude: number;
    centerLongitude: number;
    status: ServiceAreaStatus;
  };
  warnings?: string[];
}

export class ServiceAreaService {
  /**
   * List all service areas with optional filtering
   * Query with optional filters (status, city)
   * Returns array of service areas
   */
  static async listServiceAreas(filters?: { 
    status?: ServiceAreaStatus; 
    city?: string;
  }) {
    // Build WHERE clause for raw query
    let whereClause = Prisma.sql`WHERE 1=1`;
    
    if (filters?.status) {
      whereClause = Prisma.sql`${whereClause} AND status = ${filters.status}::"ServiceAreaStatus"`;
    }
    
    if (filters?.city) {
      whereClause = Prisma.sql`${whereClause} AND city = ${filters.city}`;
    }

    // Fetch service areas with boundary as GeoJSON
    const serviceAreas = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      city: string;
      state: string;
      status: ServiceAreaStatus;
      pincodes: string[];
      centerLatitude: number;
      centerLongitude: number;
      createdAt: Date;
      updatedAt: Date;
      boundary: any;
      vendorCount: number;
      deliveryPartnerCount: number;
      addressCount: number;
    }>>`
      SELECT 
        sa.id,
        sa.name,
        sa.city,
        sa.state,
        sa.status,
        sa.pincodes,
        sa."centerLatitude",
        sa."centerLongitude",
        sa."createdAt",
        sa."updatedAt",
        ST_AsGeoJSON(sa.boundary)::json as boundary,
        COUNT(DISTINCT v.id) as "vendorCount",
        COUNT(DISTINCT dp.id) as "deliveryPartnerCount",
        COUNT(DISTINCT a.id) as "addressCount"
      FROM "ServiceArea" sa
      LEFT JOIN "Vendor" v ON v."serviceAreaId" = sa.id
      LEFT JOIN "DeliveryPartner" dp ON dp."serviceAreaId" = sa.id
      LEFT JOIN "Address" a ON a."serviceAreaId" = sa.id
      ${whereClause}
      GROUP BY sa.id, sa.name, sa.city, sa.state, sa.status, sa.pincodes, 
               sa."centerLatitude", sa."centerLongitude", sa."createdAt", sa."updatedAt", sa.boundary
      ORDER BY sa."createdAt" DESC
    `;

    // Transform the results to match expected format
    return serviceAreas.map(area => ({
      ...area,
      vendorCount: Number(area.vendorCount),
      deliveryPartnerCount: Number(area.deliveryPartnerCount),
      addressCount: Number(area.addressCount),
      _count: {
        vendors: Number(area.vendorCount),
        deliveryPartners: Number(area.deliveryPartnerCount),
        addresses: Number(area.addressCount),
      },
    }));
  }

  /**
   * Get all service areas (legacy method, kept for backward compatibility)
   */
  static async getServiceAreas(statusFilter?: ServiceAreaStatus) {
    return this.listServiceAreas({ status: statusFilter });
  }

  /**
   * Get a single service area by ID (legacy method, kept for backward compatibility)
   */
  static async getServiceAreaById(serviceAreaId: string) {
    const serviceAreas = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      city: string;
      state: string;
      status: ServiceAreaStatus;
      pincodes: string[];
      centerLatitude: number;
      centerLongitude: number;
      createdAt: Date;
      updatedAt: Date;
      boundary: any;
      vendorCount: number;
      deliveryPartnerCount: number;
      addressCount: number;
    }>>`
      SELECT 
        sa.id,
        sa.name,
        sa.city,
        sa.state,
        sa.status,
        sa.pincodes,
        sa."centerLatitude",
        sa."centerLongitude",
        sa."createdAt",
        sa."updatedAt",
        ST_AsGeoJSON(sa.boundary)::json as boundary,
        COUNT(DISTINCT v.id) as "vendorCount",
        COUNT(DISTINCT dp.id) as "deliveryPartnerCount",
        COUNT(DISTINCT a.id) as "addressCount"
      FROM "ServiceArea" sa
      LEFT JOIN "Vendor" v ON v."serviceAreaId" = sa.id
      LEFT JOIN "DeliveryPartner" dp ON dp."serviceAreaId" = sa.id
      LEFT JOIN "Address" a ON a."serviceAreaId" = sa.id
      WHERE sa.id = ${serviceAreaId}
      GROUP BY sa.id, sa.name, sa.city, sa.state, sa.status, sa.pincodes, 
               sa."centerLatitude", sa."centerLongitude", sa."createdAt", sa."updatedAt", sa.boundary
    `;

    if (!serviceAreas || serviceAreas.length === 0) {
      throw new Error('Service area not found');
    }

    const area = serviceAreas[0];

    return {
      ...area,
      vendorCount: Number(area.vendorCount),
      deliveryPartnerCount: Number(area.deliveryPartnerCount),
      addressCount: Number(area.addressCount),
      _count: {
        vendors: Number(area.vendorCount),
        deliveryPartners: Number(area.deliveryPartnerCount),
        addresses: Number(area.addressCount),
      },
    };
  }

  /**
   * Get service area with coverage statistics
   * Calculates area, counts vendors, delivery partners, addresses, and recent orders
   */
  static async getServiceAreaWithStats(serviceAreaId: string): Promise<ServiceAreaWithStats> {
    // Query service area
    const serviceArea = await prisma.serviceArea.findUnique({
      where: { id: serviceAreaId },
    });

    if (!serviceArea) {
      throw new Error('Service area not found');
    }

    // Default values for service areas without center coordinates
    const centerLatitude = serviceArea.centerLatitude ?? 0;
    const centerLongitude = serviceArea.centerLongitude ?? 0;

    // Calculate area using ST_Area (only if boundary exists)
    let areaSqKm = 0;
    if (serviceArea.centerLatitude !== null && serviceArea.centerLongitude !== null) {
      const areaResult = await prisma.$queryRaw<Array<{ area: number }>>`
        SELECT 
          COALESCE(ST_Area(boundary::geography) / 1000000, 0) as area
        FROM "ServiceArea"
        WHERE id = ${serviceAreaId}
      `;
      areaSqKm = Math.round((areaResult[0]?.area || 0) * 100) / 100;
    }

    // Count active vendors in service area
    const vendorCount = await prisma.vendor.count({
      where: {
        serviceAreaId,
        status: 'ACTIVE',
      },
    });

    // Count active delivery partners in service area
    const deliveryPartnerCount = await prisma.deliveryPartner.count({
      where: {
        serviceAreaId,
        status: 'AVAILABLE',
      },
    });

    // Count addresses in service area
    const addressCount = await prisma.address.count({
      where: {
        serviceAreaId,
      },
    });

    // Count orders in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orderCount30Days = await prisma.order.count({
      where: {
        vendor: {
          serviceAreaId,
        },
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    return {
      id: serviceArea.id,
      name: serviceArea.name,
      city: serviceArea.city,
      state: serviceArea.state,
      pincodes: serviceArea.pincodes,
      centerLatitude,
      centerLongitude,
      status: serviceArea.status,
      createdAt: serviceArea.createdAt,
      updatedAt: serviceArea.updatedAt,
      stats: {
        areaSqKm,
        vendorCount,
        deliveryPartnerCount,
        addressCount,
        orderCount30Days,
      },
    };
  }

  /**
   * Create a new service area with polygon boundary
   * Validates polygon, checks for overlaps, calculates center point
   * Stores polygon in WKT format for PostGIS
   */
  static async createServiceArea(data: CreateServiceAreaInput): Promise<CreateServiceAreaResult> {
    // Validate required fields
    if (!data.name || !data.city || !data.state || !data.boundary) {
      throw new Error('Missing required fields: name, city, state, and boundary are required');
    }

    // Validate polygon using validation logic from task 2.3
    const validation = validatePolygon(data.boundary);
    if (!validation.isValid) {
      throw new Error(`Invalid polygon: ${validation.errors.join('; ')}`);
    }

    // Check if a service area with the same name already exists
    const existingArea = await prisma.serviceArea.findFirst({
      where: {
        name: data.name,
      },
    });

    if (existingArea) {
      throw new Error('Service area with this name already exists');
    }

    // Convert GeoJSON to WKT for storage
    const wkt = geoJsonToWKT(data.boundary);

    // Calculate and store center point
    const center = calculatePolygonCenter(data.boundary);

    // Check for overlaps (optional warning)
    const overlapResult = await GeoLocationService.checkPolygonOverlap(wkt);
    const warnings: string[] = [];

    if (overlapResult.hasOverlap) {
      const significantOverlaps = overlapResult.overlappingAreas.filter(
        (area) => area.overlapPercentage > 10
      );

      if (significantOverlaps.length > 0) {
        warnings.push(
          `Polygon overlaps with existing service areas: ${significantOverlaps
            .map((area) => `${area.name} (${area.overlapPercentage}%)`)
            .join(', ')}`
        );
      }
    }

    // Add validation warnings if any
    if (validation.warnings.length > 0) {
      warnings.push(...validation.warnings);
    }

    // Store in database with Prisma raw query
    const result = await prisma.$executeRaw`
      INSERT INTO "ServiceArea" (
        id, name, city, state, pincodes, boundary, "centerLatitude", "centerLongitude", status, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        ${data.name},
        ${data.city},
        ${data.state},
        ${data.pincodes || []}::text[],
        ST_GeomFromText(${wkt}, 4326),
        ${center.latitude},
        ${center.longitude},
        ${data.status || ServiceAreaStatus.ACTIVE}::"ServiceAreaStatus",
        NOW(),
        NOW()
      )
      RETURNING id, name, city, state, "centerLatitude", "centerLongitude", status
    `;

    // Fetch the created service area
    const serviceArea = await prisma.serviceArea.findFirst({
      where: { name: data.name },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        centerLatitude: true,
        centerLongitude: true,
        status: true,
      },
    });

    if (!serviceArea || serviceArea.centerLatitude === null || serviceArea.centerLongitude === null) {
      throw new Error('Failed to create service area');
    }

    // Invalidate cache after creating service area
    await invalidateServiceAreaCache(serviceArea.id);

    return {
      serviceArea: {
        id: serviceArea.id,
        name: serviceArea.name,
        city: serviceArea.city,
        state: serviceArea.state,
        centerLatitude: serviceArea.centerLatitude,
        centerLongitude: serviceArea.centerLongitude,
        status: serviceArea.status,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Update a service area with optional polygon boundary update
   * Validates updated polygon if provided, recalculates center point
   * Invalidates cache after update
   */
  static async updateServiceArea(serviceAreaId: string, data: UpdateServiceAreaInput) {
    // Check if service area exists
    const existingArea = await prisma.serviceArea.findUnique({
      where: { id: serviceAreaId },
    });

    if (!existingArea) {
      throw new Error('Service area not found');
    }

    // Check for name conflicts if name is being updated
    if (data.name && data.name !== existingArea.name) {
      const conflictArea = await prisma.serviceArea.findFirst({
        where: {
          name: data.name,
          id: { not: serviceAreaId },
        },
      });

      if (conflictArea) {
        throw new Error('Service area with this name already exists');
      }
    }

    // Validate updated polygon if provided
    let wkt: string | undefined;
    let center: { latitude: number; longitude: number } | undefined;

    if (data.boundary) {
      const validation = validatePolygon(data.boundary);
      if (!validation.isValid) {
        throw new Error(`Invalid polygon: ${validation.errors.join('; ')}`);
      }

      // Convert GeoJSON to WKT
      wkt = geoJsonToWKT(data.boundary);

      // Recalculate center point if boundary changed
      center = calculatePolygonCenter(data.boundary);
    }

    // Update database
    if (wkt && center) {
      // Update with polygon boundary using raw query
      await prisma.$executeRaw`
        UPDATE "ServiceArea"
        SET 
          ${data.name ? Prisma.sql`name = ${data.name},` : Prisma.empty}
          ${data.city ? Prisma.sql`city = ${data.city},` : Prisma.empty}
          ${data.state ? Prisma.sql`state = ${data.state},` : Prisma.empty}
          ${data.pincodes ? Prisma.sql`pincodes = ${data.pincodes}::text[],` : Prisma.empty}
          boundary = ST_GeomFromText(${wkt}, 4326),
          "centerLatitude" = ${center.latitude},
          "centerLongitude" = ${center.longitude},
          ${data.status ? Prisma.sql`status = ${data.status}::"ServiceAreaStatus",` : Prisma.empty}
          "updatedAt" = NOW()
        WHERE id = ${serviceAreaId}
      `;
    } else {
      // Update without polygon boundary
      await prisma.serviceArea.update({
        where: { id: serviceAreaId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.city && { city: data.city }),
          ...(data.state && { state: data.state }),
          ...(data.pincodes && { pincodes: data.pincodes }),
          ...(data.status && { status: data.status }),
        },
      });
    }

    // Fetch updated service area
    const serviceArea = await prisma.serviceArea.findUnique({
      where: { id: serviceAreaId },
    });

    // Invalidate cache after updating service area
    await invalidateServiceAreaCache(serviceAreaId);

    return serviceArea;
  }

  /**
   * Delete a service area
   * Checks for dependent records (vendors, delivery partners, addresses)
   * Cascades updates to addresses (sets serviceAreaId to null)
   */
  static async deleteServiceArea(serviceAreaId: string) {
    // Check if service area exists
    const existingArea = await prisma.serviceArea.findUnique({
      where: { id: serviceAreaId },
      include: {
        _count: {
          select: {
            vendors: true,
            deliveryPartners: true,
            addresses: true,
          },
        },
      },
    });

    if (!existingArea) {
      throw new Error('Service area not found');
    }

    // Check if there are any vendors or delivery partners associated
    if (existingArea._count.vendors > 0 || existingArea._count.deliveryPartners > 0) {
      throw new Error(
        `Cannot delete service area with associated vendors (${existingArea._count.vendors}) or delivery partners (${existingArea._count.deliveryPartners})`
      );
    }

    // Cascade updates to addresses (set serviceAreaId to null)
    if (existingArea._count.addresses > 0) {
      await prisma.address.updateMany({
        where: { serviceAreaId },
        data: { serviceAreaId: null },
      });
    }

    // Delete service area
    await prisma.serviceArea.delete({
      where: { id: serviceAreaId },
    });

    // Invalidate cache after deleting service area
    await invalidateServiceAreaCache(serviceAreaId);

    return { 
      message: 'Service area deleted successfully',
      addressesUpdated: existingArea._count.addresses,
    };
  }

  /**
   * Activate a service area
   */
  static async activateServiceArea(serviceAreaId: string) {
    return this.updateServiceArea(serviceAreaId, { status: ServiceAreaStatus.ACTIVE });
  }

  /**
   * Deactivate a service area
   */
  static async deactivateServiceArea(serviceAreaId: string) {
    return this.updateServiceArea(serviceAreaId, { status: ServiceAreaStatus.INACTIVE });
  }

  /**
   * Get service area by pincode
   */
  static async getServiceAreaByPincode(pincode: string) {
    const serviceArea = await prisma.serviceArea.findFirst({
      where: {
        pincodes: {
          has: pincode,
        },
        status: ServiceAreaStatus.ACTIVE,
      },
    });

    return serviceArea;
  }
}
