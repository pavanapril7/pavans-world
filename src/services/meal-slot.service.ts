import { prisma } from '@/lib/prisma';
import { MealSlot } from '@prisma/client';

export interface CreateMealSlotInput {
  vendorId: string;
  name: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  cutoffTime: string; // HH:MM
  timeWindowDuration?: number; // Duration in minutes (default: 60)
}

export interface UpdateMealSlotInput {
  name?: string;
  startTime?: string;
  endTime?: string;
  cutoffTime?: string;
  timeWindowDuration?: number;
  isActive?: boolean;
}

export class MealSlotService {
  /**
   * Validate time format (HH:MM)
   */
  static validateTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Validate that cutoff time is before start time
   */
  static validateCutoffBeforeStart(cutoffTime: string, startTime: string): boolean {
    return cutoffTime < startTime;
  }

  /**
   * Get current time in HH:MM format
   */
  private static getCurrentTime(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Create meal slot for vendor
   */
  static async createMealSlot(data: CreateMealSlotInput): Promise<MealSlot> {
    // Validate time formats
    if (!this.validateTimeFormat(data.startTime)) {
      throw new Error('Invalid start time format (HH:MM)');
    }
    if (!this.validateTimeFormat(data.endTime)) {
      throw new Error('Invalid end time format (HH:MM)');
    }
    if (!this.validateTimeFormat(data.cutoffTime)) {
      throw new Error('Invalid cutoff time format (HH:MM)');
    }

    // Validate time constraints
    if (!this.validateCutoffBeforeStart(data.cutoffTime, data.startTime)) {
      throw new Error('Cutoff time must be before start time');
    }
    if (data.startTime >= data.endTime) {
      throw new Error('Start time must be before end time');
    }

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: data.vendorId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    return prisma.mealSlot.create({
      data: {
        vendorId: data.vendorId,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        cutoffTime: data.cutoffTime,
        timeWindowDuration: data.timeWindowDuration || 60,
      },
    });
  }

  /**
   * Get meal slot by ID
   */
  static async getMealSlotById(id: string): Promise<MealSlot> {
    const mealSlot = await prisma.mealSlot.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
      },
    });

    if (!mealSlot) {
      throw new Error('Meal slot not found');
    }

    return mealSlot;
  }

  /**
   * Get all meal slots for a vendor
   */
  static async getMealSlotsByVendorId(vendorId: string): Promise<MealSlot[]> {
    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    return prisma.mealSlot.findMany({
      where: { vendorId },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Get active meal slots for a vendor
   */
  static async getActiveMealSlots(vendorId: string): Promise<MealSlot[]> {
    return prisma.mealSlot.findMany({
      where: {
        vendorId,
        isActive: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Get available meal slots (active + not past cutoff)
   */
  static async getAvailableMealSlots(vendorId: string): Promise<MealSlot[]> {
    const activeMealSlots = await this.getActiveMealSlots(vendorId);
    const currentTime = this.getCurrentTime();

    // Filter out meal slots where current time is past cutoff
    return activeMealSlots.filter((slot) => currentTime < slot.cutoffTime);
  }

  /**
   * Update meal slot
   */
  static async updateMealSlot(
    id: string,
    data: UpdateMealSlotInput
  ): Promise<MealSlot> {
    // Verify meal slot exists
    const mealSlot = await prisma.mealSlot.findUnique({
      where: { id },
    });

    if (!mealSlot) {
      throw new Error('Meal slot not found');
    }

    // Validate time formats if provided
    if (data.startTime && !this.validateTimeFormat(data.startTime)) {
      throw new Error('Invalid start time format (HH:MM)');
    }
    if (data.endTime && !this.validateTimeFormat(data.endTime)) {
      throw new Error('Invalid end time format (HH:MM)');
    }
    if (data.cutoffTime && !this.validateTimeFormat(data.cutoffTime)) {
      throw new Error('Invalid cutoff time format (HH:MM)');
    }

    // Validate time constraints if times are being updated
    const newStartTime = data.startTime || mealSlot.startTime;
    const newEndTime = data.endTime || mealSlot.endTime;
    const newCutoffTime = data.cutoffTime || mealSlot.cutoffTime;

    if (!this.validateCutoffBeforeStart(newCutoffTime, newStartTime)) {
      throw new Error('Cutoff time must be before start time');
    }
    if (newStartTime >= newEndTime) {
      throw new Error('Start time must be before end time');
    }

    return prisma.mealSlot.update({
      where: { id },
      data,
    });
  }

  /**
   * Deactivate meal slot
   */
  static async deactivateMealSlot(id: string): Promise<MealSlot> {
    // Verify meal slot exists
    const mealSlot = await prisma.mealSlot.findUnique({
      where: { id },
    });

    if (!mealSlot) {
      throw new Error('Meal slot not found');
    }

    return prisma.mealSlot.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Validate meal slot is available for ordering
   */
  static async validateMealSlotAvailability(mealSlotId: string): Promise<boolean> {
    const mealSlot = await prisma.mealSlot.findUnique({
      where: { id: mealSlotId },
    });

    if (!mealSlot) {
      return false;
    }

    // Check if meal slot is active
    if (!mealSlot.isActive) {
      return false;
    }

    // Check if current time is before cutoff
    const currentTime = this.getCurrentTime();
    return currentTime < mealSlot.cutoffTime;
  }

  /**
   * Get delivery time windows for a meal slot
   */
  static async getDeliveryTimeWindows(
    mealSlotId: string
  ): Promise<Array<{ start: string; end: string }>> {
    const mealSlot = await prisma.mealSlot.findUnique({
      where: { id: mealSlotId },
    });

    if (!mealSlot) {
      throw new Error('Meal slot not found');
    }

    const windows: Array<{ start: string; end: string }> = [];
    const duration = mealSlot.timeWindowDuration;

    // Parse start and end times
    const [startHour, startMinute] = mealSlot.startTime.split(':').map(Number);
    const [endHour, endMinute] = mealSlot.endTime.split(':').map(Number);

    // Convert to minutes since midnight
    let currentMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Generate time windows
    while (currentMinutes + duration <= endMinutes) {
      const windowStartHour = Math.floor(currentMinutes / 60);
      const windowStartMinute = currentMinutes % 60;
      const windowEndMinutes = currentMinutes + duration;
      const windowEndHour = Math.floor(windowEndMinutes / 60);
      const windowEndMinute = windowEndMinutes % 60;

      windows.push({
        start: `${String(windowStartHour).padStart(2, '0')}:${String(windowStartMinute).padStart(2, '0')}`,
        end: `${String(windowEndHour).padStart(2, '0')}:${String(windowEndMinute).padStart(2, '0')}`,
      });

      currentMinutes += duration;
    }

    return windows;
  }

  /**
   * Validate delivery window is within meal slot range
   */
  static validateDeliveryWindow(
    mealSlot: MealSlot,
    deliveryStart: string,
    deliveryEnd: string
  ): boolean {
    // Validate time formats
    if (!this.validateTimeFormat(deliveryStart) || !this.validateTimeFormat(deliveryEnd)) {
      return false;
    }

    // Check if delivery window is within meal slot range
    if (deliveryStart < mealSlot.startTime || deliveryEnd > mealSlot.endTime) {
      return false;
    }

    // Check if delivery start is before delivery end
    if (deliveryStart >= deliveryEnd) {
      return false;
    }

    return true;
  }
}
