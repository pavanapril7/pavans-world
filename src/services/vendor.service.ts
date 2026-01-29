import { prisma } from '@/lib/prisma';
import { Prisma, VendorStatus } from '@prisma/client';

export interface CreateVendorInput {
  userId: string;
  businessName: string;
  categoryId: string;
  description: string;
  serviceAreaId: string;
}

export interface UpdateVendorInput {
  businessName?: string;
  categoryId?: string;
  description?: string;
  serviceAreaId?: string;
}

export interface VendorFilters {
  categoryId?: string;
  serviceAreaId?: string;
  status?: VendorStatus;
  search?: string;
}

export class VendorService {
  /**
   * Create a new vendor
   */
  static async createVendor(data: CreateVendorInput) {
    // Verify user exists and has VENDOR role
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'VENDOR') {
      throw new Error('User must have VENDOR role');
    }

    // Check if user already has a vendor profile
    const existingVendor = await prisma.vendor.findUnique({
      where: { userId: data.userId },
    });

    if (existingVendor) {
      throw new Error('User already has a vendor profile');
    }

    // Verify category exists
    const category = await prisma.vendorCategory.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new Error('Vendor category not found');
    }

    // Verify service area exists
    const serviceArea = await prisma.serviceArea.findUnique({
      where: { id: data.serviceAreaId },
    });

    if (!serviceArea) {
      throw new Error('Service area not found');
    }

    return prisma.vendor.create({
      data: {
        userId: data.userId,
        businessName: data.businessName,
        categoryId: data.categoryId,
        description: data.description,
        serviceAreaId: data.serviceAreaId,
        status: VendorStatus.PENDING_APPROVAL,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
        serviceArea: true,
      },
    });
  }

  /**
   * Get vendor by ID
   */
  static async getVendorById(id: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
        serviceArea: true,
        operatingHours: {
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
      },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    return vendor;
  }

  /**
   * Get vendor by user ID
   */
  static async getVendorByUserId(userId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
        serviceArea: true,
        operatingHours: {
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
      },
    });

    return vendor;
  }

  /**
   * List vendors with filters
   */
  static async listVendors(filters: VendorFilters = {}, page = 1, limit = 20) {
    const where: Prisma.VendorWhereInput = {};

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.serviceAreaId) {
      where.serviceAreaId = filters.serviceAreaId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { businessName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
            },
          },
          category: true,
          serviceArea: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    return {
      vendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update vendor
   */
  static async updateVendor(id: string, data: UpdateVendorInput) {
    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // If updating category, verify it exists
    if (data.categoryId) {
      const category = await prisma.vendorCategory.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new Error('Vendor category not found');
      }
    }

    // If updating service area, verify it exists
    if (data.serviceAreaId) {
      const serviceArea = await prisma.serviceArea.findUnique({
        where: { id: data.serviceAreaId },
      });

      if (!serviceArea) {
        throw new Error('Service area not found');
      }
    }

    return prisma.vendor.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
        serviceArea: true,
      },
    });
  }

  /**
   * Update vendor status
   */
  static async updateVendorStatus(id: string, status: VendorStatus) {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    return prisma.vendor.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
        serviceArea: true,
      },
    });
  }

  /**
   * Approve vendor (admin only)
   */
  static async approveVendor(id: string) {
    return this.updateVendorStatus(id, VendorStatus.ACTIVE);
  }

  /**
   * Deactivate vendor (admin only)
   */
  static async deactivateVendor(id: string) {
    return this.updateVendorStatus(id, VendorStatus.INACTIVE);
  }

  /**
   * Check if vendor is available based on operating hours
   */
  static async isVendorAvailable(vendorId: string): Promise<boolean> {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        operatingHours: true,
      },
    });

    if (!vendor || vendor.status !== VendorStatus.ACTIVE) {
      return false;
    }

    // Get current day and time
    const now = new Date();
    const dayOfWeek = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ][now.getDay()];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Find operating hours for current day
    const todayHours = vendor.operatingHours.find(
      (hours) => hours.dayOfWeek === dayOfWeek
    );

    if (!todayHours || todayHours.isClosed) {
      return false;
    }

    // Check if current time is within operating hours
    return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
  }

  /**
   * Get next available time for vendor
   */
  static async getNextAvailableTime(vendorId: string): Promise<string | null> {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        operatingHours: true,
      },
    });

    if (!vendor || vendor.status !== VendorStatus.ACTIVE) {
      return null;
    }

    const now = new Date();
    const currentDayIndex = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const daysOfWeek = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];

    // Check next 7 days
    for (let i = 0; i < 7; i++) {
      const checkDayIndex = (currentDayIndex + i) % 7;
      const checkDay = daysOfWeek[checkDayIndex];

      const hours = vendor.operatingHours.find((h) => h.dayOfWeek === checkDay);

      if (hours && !hours.isClosed) {
        // If it's today, check if we're before opening time
        if (i === 0 && currentTime < hours.openTime) {
          return `Today at ${hours.openTime}`;
        }
        // If it's a future day
        if (i > 0) {
          return `${checkDay} at ${hours.openTime}`;
        }
      }
    }

    return null;
  }
}
