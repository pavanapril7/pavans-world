import { prisma } from '@/lib/prisma';
import { DayOfWeek } from '@prisma/client';

export interface OperatingHoursInput {
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface SetOperatingHoursInput {
  hours: OperatingHoursInput[];
}

export class OperatingHoursService {
  /**
   * Set operating hours for a vendor (replaces all existing hours)
   */
  static async setOperatingHours(vendorId: string, data: SetOperatingHoursInput) {
    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    for (const hour of data.hours) {
      if (!hour.isClosed) {
        if (!timeRegex.test(hour.openTime)) {
          throw new Error(`Invalid open time format for ${hour.dayOfWeek}. Use HH:MM format.`);
        }
        if (!timeRegex.test(hour.closeTime)) {
          throw new Error(`Invalid close time format for ${hour.dayOfWeek}. Use HH:MM format.`);
        }
        if (hour.openTime >= hour.closeTime) {
          throw new Error(`Open time must be before close time for ${hour.dayOfWeek}`);
        }
      }
    }

    // Delete existing operating hours
    await prisma.operatingHours.deleteMany({
      where: { vendorId },
    });

    // Create new operating hours
    const createdHours = await Promise.all(
      data.hours.map((hour) =>
        prisma.operatingHours.create({
          data: {
            vendorId,
            dayOfWeek: hour.dayOfWeek,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            isClosed: hour.isClosed,
          },
        })
      )
    );

    return createdHours;
  }

  /**
   * Update operating hours for a specific day
   */
  static async updateDayOperatingHours(
    vendorId: string,
    dayOfWeek: DayOfWeek,
    data: Omit<OperatingHoursInput, 'dayOfWeek'>
  ) {
    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Validate time format
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!data.isClosed) {
      if (!timeRegex.test(data.openTime)) {
        throw new Error('Invalid open time format. Use HH:MM format.');
      }
      if (!timeRegex.test(data.closeTime)) {
        throw new Error('Invalid close time format. Use HH:MM format.');
      }
      if (data.openTime >= data.closeTime) {
        throw new Error('Open time must be before close time');
      }
    }

    // Check if operating hours exist for this day
    const existing = await prisma.operatingHours.findUnique({
      where: {
        vendorId_dayOfWeek: {
          vendorId,
          dayOfWeek,
        },
      },
    });

    if (existing) {
      // Update existing
      return prisma.operatingHours.update({
        where: {
          vendorId_dayOfWeek: {
            vendorId,
            dayOfWeek,
          },
        },
        data: {
          openTime: data.openTime,
          closeTime: data.closeTime,
          isClosed: data.isClosed,
        },
      });
    } else {
      // Create new
      return prisma.operatingHours.create({
        data: {
          vendorId,
          dayOfWeek,
          openTime: data.openTime,
          closeTime: data.closeTime,
          isClosed: data.isClosed,
        },
      });
    }
  }

  /**
   * Get operating hours for a vendor
   */
  static async getOperatingHours(vendorId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    return prisma.operatingHours.findMany({
      where: { vendorId },
      orderBy: {
        dayOfWeek: 'asc',
      },
    });
  }

  /**
   * Delete operating hours for a specific day
   */
  static async deleteDayOperatingHours(vendorId: string, dayOfWeek: DayOfWeek) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const existing = await prisma.operatingHours.findUnique({
      where: {
        vendorId_dayOfWeek: {
          vendorId,
          dayOfWeek,
        },
      },
    });

    if (!existing) {
      throw new Error('Operating hours not found for this day');
    }

    return prisma.operatingHours.delete({
      where: {
        vendorId_dayOfWeek: {
          vendorId,
          dayOfWeek,
        },
      },
    });
  }
}
