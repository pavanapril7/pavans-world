import { prisma } from '@/lib/prisma';
import { ServiceAreaStatus } from '@prisma/client';

export interface CreateServiceAreaInput {
  name: string;
  city: string;
  state: string;
  pincodes: string[];
  status?: ServiceAreaStatus;
}

export interface UpdateServiceAreaInput {
  name?: string;
  city?: string;
  state?: string;
  pincodes?: string[];
  status?: ServiceAreaStatus;
}

export class ServiceAreaService {
  /**
   * Get all service areas
   */
  static async getServiceAreas(statusFilter?: ServiceAreaStatus) {
    const where = statusFilter ? { status: statusFilter } : {};

    const serviceAreas = await prisma.serviceArea.findMany({
      where,
      include: {
        _count: {
          select: {
            vendors: true,
            deliveryPartners: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return serviceAreas;
  }

  /**
   * Get a single service area by ID
   */
  static async getServiceAreaById(serviceAreaId: string) {
    const serviceArea = await prisma.serviceArea.findUnique({
      where: { id: serviceAreaId },
      include: {
        _count: {
          select: {
            vendors: true,
            deliveryPartners: true,
          },
        },
      },
    });

    if (!serviceArea) {
      throw new Error('Service area not found');
    }

    return serviceArea;
  }

  /**
   * Create a new service area
   */
  static async createServiceArea(data: CreateServiceAreaInput) {
    // Validate required fields
    if (!data.name || !data.city || !data.state || !data.pincodes || data.pincodes.length === 0) {
      throw new Error('Missing required fields: name, city, state, and pincodes are required');
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

    // Create service area
    const serviceArea = await prisma.serviceArea.create({
      data: {
        name: data.name,
        city: data.city,
        state: data.state,
        pincodes: data.pincodes,
        status: data.status || ServiceAreaStatus.ACTIVE,
      },
    });

    return serviceArea;
  }

  /**
   * Update a service area
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

    // Update service area
    const serviceArea = await prisma.serviceArea.update({
      where: { id: serviceAreaId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.city && { city: data.city }),
        ...(data.state && { state: data.state }),
        ...(data.pincodes && { pincodes: data.pincodes }),
        ...(data.status && { status: data.status }),
      },
    });

    return serviceArea;
  }

  /**
   * Delete a service area
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
          },
        },
      },
    });

    if (!existingArea) {
      throw new Error('Service area not found');
    }

    // Check if there are any vendors or delivery partners associated
    if (existingArea._count.vendors > 0 || existingArea._count.deliveryPartners > 0) {
      throw new Error('Cannot delete service area with associated vendors or delivery partners');
    }

    // Delete service area
    await prisma.serviceArea.delete({
      where: { id: serviceAreaId },
    });

    return { message: 'Service area deleted successfully' };
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
