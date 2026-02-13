import { MealSlotService } from '@/services/meal-slot.service';
import { prisma } from '@/lib/prisma';
import { MealSlot } from '@prisma/client';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    vendor: {
      findUnique: jest.fn(),
    },
    mealSlot: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('MealSlotService', () => {
  const mockVendorId = 'vendor-123';
  const mockMealSlotId = 'meal-slot-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateTimeFormat', () => {
    it('should return true for valid time format', () => {
      expect(MealSlotService.validateTimeFormat('00:00')).toBe(true);
      expect(MealSlotService.validateTimeFormat('12:30')).toBe(true);
      expect(MealSlotService.validateTimeFormat('23:59')).toBe(true);
    });

    it('should return false for invalid time format', () => {
      expect(MealSlotService.validateTimeFormat('24:00')).toBe(false);
      expect(MealSlotService.validateTimeFormat('12:60')).toBe(false);
      expect(MealSlotService.validateTimeFormat('1:30')).toBe(false);
      expect(MealSlotService.validateTimeFormat('12:3')).toBe(false);
      expect(MealSlotService.validateTimeFormat('invalid')).toBe(false);
      expect(MealSlotService.validateTimeFormat('')).toBe(false);
    });
  });

  describe('validateCutoffBeforeStart', () => {
    it('should return true when cutoff is before start', () => {
      expect(MealSlotService.validateCutoffBeforeStart('10:00', '12:00')).toBe(true);
      expect(MealSlotService.validateCutoffBeforeStart('08:30', '09:00')).toBe(true);
    });

    it('should return false when cutoff is equal to or after start', () => {
      expect(MealSlotService.validateCutoffBeforeStart('12:00', '12:00')).toBe(false);
      expect(MealSlotService.validateCutoffBeforeStart('13:00', '12:00')).toBe(false);
    });
  });

  describe('createMealSlot', () => {
    const validMealSlotData = {
      vendorId: mockVendorId,
      name: 'Lunch',
      startTime: '12:00',
      endTime: '14:00',
      cutoffTime: '11:00',
      timeWindowDuration: 60,
    };

    it('should create meal slot with valid data', async () => {
      const mockVendor = { id: mockVendorId, businessName: 'Test Vendor' };
      const mockCreatedMealSlot = { id: mockMealSlotId, ...validMealSlotData };

      (prisma.vendor.findUnique as jest.Mock).mockResolvedValue(mockVendor);
      (prisma.mealSlot.create as jest.Mock).mockResolvedValue(mockCreatedMealSlot);

      const result = await MealSlotService.createMealSlot(validMealSlotData);

      expect(result).toEqual(mockCreatedMealSlot);
      expect(prisma.vendor.findUnique).toHaveBeenCalledWith({
        where: { id: mockVendorId },
      });
      expect(prisma.mealSlot.create).toHaveBeenCalledWith({
        data: validMealSlotData,
      });
    });

    it('should use default timeWindowDuration of 60 if not provided', async () => {
      const dataWithoutDuration = { ...validMealSlotData };
      delete dataWithoutDuration.timeWindowDuration;

      const mockVendor = { id: mockVendorId, businessName: 'Test Vendor' };
      (prisma.vendor.findUnique as jest.Mock).mockResolvedValue(mockVendor);
      (prisma.mealSlot.create as jest.Mock).mockResolvedValue({});

      await MealSlotService.createMealSlot(dataWithoutDuration);

      expect(prisma.mealSlot.create).toHaveBeenCalledWith({
        data: { ...dataWithoutDuration, timeWindowDuration: 60 },
      });
    });

    it('should throw error for invalid start time format', async () => {
      const invalidData = { ...validMealSlotData, startTime: '25:00' };

      await expect(MealSlotService.createMealSlot(invalidData)).rejects.toThrow(
        'Invalid start time format (HH:MM)'
      );
    });

    it('should throw error for invalid end time format', async () => {
      const invalidData = { ...validMealSlotData, endTime: '12:70' };

      await expect(MealSlotService.createMealSlot(invalidData)).rejects.toThrow(
        'Invalid end time format (HH:MM)'
      );
    });

    it('should throw error for invalid cutoff time format', async () => {
      const invalidData = { ...validMealSlotData, cutoffTime: 'invalid' };

      await expect(MealSlotService.createMealSlot(invalidData)).rejects.toThrow(
        'Invalid cutoff time format (HH:MM)'
      );
    });

    it('should throw error when cutoff time is not before start time', async () => {
      const invalidData = { ...validMealSlotData, cutoffTime: '13:00' };

      await expect(MealSlotService.createMealSlot(invalidData)).rejects.toThrow(
        'Cutoff time must be before start time'
      );
    });

    it('should throw error when start time is not before end time', async () => {
      const invalidData = { ...validMealSlotData, startTime: '15:00' };

      await expect(MealSlotService.createMealSlot(invalidData)).rejects.toThrow(
        'Start time must be before end time'
      );
    });

    it('should throw error when vendor does not exist', async () => {
      (prisma.vendor.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(MealSlotService.createMealSlot(validMealSlotData)).rejects.toThrow(
        'Vendor not found'
      );
    });
  });

  describe('getMealSlotById', () => {
    it('should return meal slot with vendor details', async () => {
      const mockMealSlot = {
        id: mockMealSlotId,
        vendorId: mockVendorId,
        name: 'Lunch',
        startTime: '12:00',
        endTime: '14:00',
        cutoffTime: '11:00',
        vendor: {
          id: mockVendorId,
          businessName: 'Test Vendor',
          status: 'ACTIVE',
        },
      };

      (prisma.mealSlot.findUnique as jest.Mock).mockResolvedValue(mockMealSlot);

      const result = await MealSlotService.getMealSlotById(mockMealSlotId);

      expect(result).toEqual(mockMealSlot);
      expect(prisma.mealSlot.findUnique).toHaveBeenCalledWith({
        where: { id: mockMealSlotId },
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
    });

    it('should throw error when meal slot not found', async () => {
      (prisma.mealSlot.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(MealSlotService.getMealSlotById(mockMealSlotId)).rejects.toThrow(
        'Meal slot not found'
      );
    });
  });

  describe('getMealSlotsByVendorId', () => {
    it('should return all meal slots for vendor', async () => {
      const mockVendor = { id: mockVendorId };
      const mockMealSlots = [
        { id: '1', name: 'Breakfast', startTime: '08:00' },
        { id: '2', name: 'Lunch', startTime: '12:00' },
      ];

      (prisma.vendor.findUnique as jest.Mock).mockResolvedValue(mockVendor);
      (prisma.mealSlot.findMany as jest.Mock).mockResolvedValue(mockMealSlots);

      const result = await MealSlotService.getMealSlotsByVendorId(mockVendorId);

      expect(result).toEqual(mockMealSlots);
      expect(prisma.mealSlot.findMany).toHaveBeenCalledWith({
        where: { vendorId: mockVendorId },
        orderBy: { startTime: 'asc' },
      });
    });

    it('should throw error when vendor not found', async () => {
      (prisma.vendor.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        MealSlotService.getMealSlotsByVendorId(mockVendorId)
      ).rejects.toThrow('Vendor not found');
    });
  });

  describe('getActiveMealSlots', () => {
    it('should return only active meal slots', async () => {
      const mockActiveMealSlots = [
        { id: '1', name: 'Lunch', isActive: true },
        { id: '2', name: 'Dinner', isActive: true },
      ];

      (prisma.mealSlot.findMany as jest.Mock).mockResolvedValue(mockActiveMealSlots);

      const result = await MealSlotService.getActiveMealSlots(mockVendorId);

      expect(result).toEqual(mockActiveMealSlots);
      expect(prisma.mealSlot.findMany).toHaveBeenCalledWith({
        where: {
          vendorId: mockVendorId,
          isActive: true,
        },
        orderBy: { startTime: 'asc' },
      });
    });
  });

  describe('updateMealSlot', () => {
    const mockExistingMealSlot = {
      id: mockMealSlotId,
      vendorId: mockVendorId,
      name: 'Lunch',
      startTime: '12:00',
      endTime: '14:00',
      cutoffTime: '11:00',
      timeWindowDuration: 60,
      isActive: true,
    };

    it('should update meal slot with valid data', async () => {
      const updateData = { name: 'Updated Lunch' };
      const mockUpdatedMealSlot = { ...mockExistingMealSlot, ...updateData };

      (prisma.mealSlot.findUnique as jest.Mock).mockResolvedValue(mockExistingMealSlot);
      (prisma.mealSlot.update as jest.Mock).mockResolvedValue(mockUpdatedMealSlot);

      const result = await MealSlotService.updateMealSlot(mockMealSlotId, updateData);

      expect(result).toEqual(mockUpdatedMealSlot);
      expect(prisma.mealSlot.update).toHaveBeenCalledWith({
        where: { id: mockMealSlotId },
        data: updateData,
      });
    });

    it('should throw error when meal slot not found', async () => {
      (prisma.mealSlot.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        MealSlotService.updateMealSlot(mockMealSlotId, { name: 'Updated' })
      ).rejects.toThrow('Meal slot not found');
    });

    it('should throw error for invalid start time format', async () => {
      (prisma.mealSlot.findUnique as jest.Mock).mockResolvedValue(mockExistingMealSlot);

      await expect(
        MealSlotService.updateMealSlot(mockMealSlotId, { startTime: 'invalid' })
      ).rejects.toThrow('Invalid start time format (HH:MM)');
    });

    it('should validate time constraints with updated values', async () => {
      (prisma.mealSlot.findUnique as jest.Mock).mockResolvedValue(mockExistingMealSlot);

      await expect(
        MealSlotService.updateMealSlot(mockMealSlotId, { cutoffTime: '13:00' })
      ).rejects.toThrow('Cutoff time must be before start time');
    });
  });

  describe('deactivateMealSlot', () => {
    it('should deactivate meal slot', async () => {
      const mockMealSlot = { id: mockMealSlotId, isActive: true };
      const mockDeactivatedMealSlot = { ...mockMealSlot, isActive: false };

      (prisma.mealSlot.findUnique as jest.Mock).mockResolvedValue(mockMealSlot);
      (prisma.mealSlot.update as jest.Mock).mockResolvedValue(mockDeactivatedMealSlot);

      const result = await MealSlotService.deactivateMealSlot(mockMealSlotId);

      expect(result).toEqual(mockDeactivatedMealSlot);
      expect(prisma.mealSlot.update).toHaveBeenCalledWith({
        where: { id: mockMealSlotId },
        data: { isActive: false },
      });
    });

    it('should throw error when meal slot not found', async () => {
      (prisma.mealSlot.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(MealSlotService.deactivateMealSlot(mockMealSlotId)).rejects.toThrow(
        'Meal slot not found'
      );
    });
  });

  describe('validateMealSlotAvailability', () => {
    it('should return true for active meal slot before cutoff', async () => {
      const mockMealSlot = {
        id: mockMealSlotId,
        isActive: true,
        cutoffTime: '23:59', // Future time
      };

      (prisma.mealSlot.findUnique as jest.Mock).mockResolvedValue(mockMealSlot);

      const result = await MealSlotService.validateMealSlotAvailability(mockMealSlotId);

      expect(result).toBe(true);
    });

    it('should return false for inactive meal slot', async () => {
      const mockMealSlot = {
        id: mockMealSlotId,
        isActive: false,
        cutoffTime: '23:59',
      };

      (prisma.mealSlot.findUnique as jest.Mock).mockResolvedValue(mockMealSlot);

      const result = await MealSlotService.validateMealSlotAvailability(mockMealSlotId);

      expect(result).toBe(false);
    });

    it('should return false when meal slot not found', async () => {
      (prisma.mealSlot.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await MealSlotService.validateMealSlotAvailability(mockMealSlotId);

      expect(result).toBe(false);
    });
  });

  describe('getDeliveryTimeWindows', () => {
    it('should generate time windows based on duration', async () => {
      const mockMealSlot = {
        id: mockMealSlotId,
        startTime: '12:00',
        endTime: '14:00',
        timeWindowDuration: 60,
      };

      (prisma.mealSlot.findUnique as jest.Mock).mockResolvedValue(mockMealSlot);

      const result = await MealSlotService.getDeliveryTimeWindows(mockMealSlotId);

      expect(result).toEqual([
        { start: '12:00', end: '13:00' },
        { start: '13:00', end: '14:00' },
      ]);
    });

    it('should generate multiple windows for longer meal slots', async () => {
      const mockMealSlot = {
        id: mockMealSlotId,
        startTime: '12:00',
        endTime: '15:00',
        timeWindowDuration: 30,
      };

      (prisma.mealSlot.findUnique as jest.Mock).mockResolvedValue(mockMealSlot);

      const result = await MealSlotService.getDeliveryTimeWindows(mockMealSlotId);

      expect(result).toEqual([
        { start: '12:00', end: '12:30' },
        { start: '12:30', end: '13:00' },
        { start: '13:00', end: '13:30' },
        { start: '13:30', end: '14:00' },
        { start: '14:00', end: '14:30' },
        { start: '14:30', end: '15:00' },
      ]);
    });

    it('should throw error when meal slot not found', async () => {
      (prisma.mealSlot.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        MealSlotService.getDeliveryTimeWindows(mockMealSlotId)
      ).rejects.toThrow('Meal slot not found');
    });
  });

  describe('validateDeliveryWindow', () => {
    const mockMealSlot = {
      id: mockMealSlotId,
      startTime: '12:00',
      endTime: '14:00',
    } as MealSlot;

    it('should return true for valid delivery window within meal slot', () => {
      const result = MealSlotService.validateDeliveryWindow(
        mockMealSlot,
        '12:30',
        '13:30'
      );

      expect(result).toBe(true);
    });

    it('should return false for invalid time format', () => {
      const result = MealSlotService.validateDeliveryWindow(
        mockMealSlot,
        'invalid',
        '13:30'
      );

      expect(result).toBe(false);
    });

    it('should return false when delivery start is before meal slot start', () => {
      const result = MealSlotService.validateDeliveryWindow(
        mockMealSlot,
        '11:00',
        '13:00'
      );

      expect(result).toBe(false);
    });

    it('should return false when delivery end is after meal slot end', () => {
      const result = MealSlotService.validateDeliveryWindow(
        mockMealSlot,
        '13:00',
        '15:00'
      );

      expect(result).toBe(false);
    });

    it('should return false when delivery start is not before delivery end', () => {
      const result = MealSlotService.validateDeliveryWindow(
        mockMealSlot,
        '13:00',
        '13:00'
      );

      expect(result).toBe(false);
    });
  });
});
