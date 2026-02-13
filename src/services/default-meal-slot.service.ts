import { prisma } from '@/lib/prisma';
import { DefaultMealSlot, MealSlot } from '@prisma/client';
import { MealSlotService } from './meal-slot.service';

export interface CreateDefaultMealSlotInput {
  name: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  cutoffTime: string; // HH:MM
  timeWindowDuration?: number; // Duration in minutes (default: 60)
}

export class DefaultMealSlotService {
  /**
   * Create default meal slot (admin only)
   */
  static async createDefaultMealSlot(
    data: CreateDefaultMealSlotInput
  ): Promise<DefaultMealSlot> {
    // Validate time formats
    if (!MealSlotService.validateTimeFormat(data.startTime)) {
      throw new Error('Invalid start time format (HH:MM)');
    }
    if (!MealSlotService.validateTimeFormat(data.endTime)) {
      throw new Error('Invalid end time format (HH:MM)');
    }
    if (!MealSlotService.validateTimeFormat(data.cutoffTime)) {
      throw new Error('Invalid cutoff time format (HH:MM)');
    }

    // Validate time constraints
    if (!MealSlotService.validateCutoffBeforeStart(data.cutoffTime, data.startTime)) {
      throw new Error('Cutoff time must be before start time');
    }
    if (data.startTime >= data.endTime) {
      throw new Error('Start time must be before end time');
    }

    return prisma.defaultMealSlot.create({
      data: {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        cutoffTime: data.cutoffTime,
        timeWindowDuration: data.timeWindowDuration || 60,
      },
    });
  }

  /**
   * List all default meal slots
   */
  static async listDefaultMealSlots(): Promise<DefaultMealSlot[]> {
    return prisma.defaultMealSlot.findMany({
      where: { isActive: true },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Update default meal slot
   */
  static async updateDefaultMealSlot(
    id: string,
    data: Partial<CreateDefaultMealSlotInput>
  ): Promise<DefaultMealSlot> {
    // Verify default meal slot exists
    const defaultMealSlot = await prisma.defaultMealSlot.findUnique({
      where: { id },
    });

    if (!defaultMealSlot) {
      throw new Error('Default meal slot not found');
    }

    // Validate time formats if provided
    if (data.startTime && !MealSlotService.validateTimeFormat(data.startTime)) {
      throw new Error('Invalid start time format (HH:MM)');
    }
    if (data.endTime && !MealSlotService.validateTimeFormat(data.endTime)) {
      throw new Error('Invalid end time format (HH:MM)');
    }
    if (data.cutoffTime && !MealSlotService.validateTimeFormat(data.cutoffTime)) {
      throw new Error('Invalid cutoff time format (HH:MM)');
    }

    // Validate time constraints if times are being updated
    const newStartTime = data.startTime || defaultMealSlot.startTime;
    const newEndTime = data.endTime || defaultMealSlot.endTime;
    const newCutoffTime = data.cutoffTime || defaultMealSlot.cutoffTime;

    if (!MealSlotService.validateCutoffBeforeStart(newCutoffTime, newStartTime)) {
      throw new Error('Cutoff time must be before start time');
    }
    if (newStartTime >= newEndTime) {
      throw new Error('Start time must be before end time');
    }

    return prisma.defaultMealSlot.update({
      where: { id },
      data,
    });
  }

  /**
   * Apply default meal slots to a specific vendor
   */
  static async applyDefaultMealSlotsToVendor(vendorId: string): Promise<MealSlot[]> {
    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Get all active default meal slots
    const defaultMealSlots = await this.listDefaultMealSlots();

    if (defaultMealSlots.length === 0) {
      return [];
    }

    // Create meal slots for vendor based on defaults
    const createdMealSlots: MealSlot[] = [];

    for (const defaultSlot of defaultMealSlots) {
      const mealSlot = await prisma.mealSlot.create({
        data: {
          vendorId,
          name: defaultSlot.name,
          startTime: defaultSlot.startTime,
          endTime: defaultSlot.endTime,
          cutoffTime: defaultSlot.cutoffTime,
          timeWindowDuration: defaultSlot.timeWindowDuration,
          isActive: true,
        },
      });
      createdMealSlots.push(mealSlot);
    }

    return createdMealSlots;
  }

  /**
   * Apply default meal slots to new vendor (called during vendor creation)
   */
  static async applyToNewVendor(vendorId: string): Promise<void> {
    try {
      await this.applyDefaultMealSlotsToVendor(vendorId);
    } catch (error) {
      // Log error but don't fail vendor creation if default meal slots can't be applied
      console.error(`Failed to apply default meal slots to vendor ${vendorId}:`, error);
    }
  }
}
