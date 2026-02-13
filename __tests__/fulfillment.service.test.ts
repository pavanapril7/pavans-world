import { FulfillmentService } from '@/services/fulfillment.service';
import { prisma } from '@/lib/prisma';
import { FulfillmentMethod } from '@prisma/client';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    vendorFulfillmentConfig: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('FulfillmentService', () => {
  const mockVendorId = 'vendor-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFulfillmentConfig', () => {
    it('should return existing config if found', async () => {
      const mockConfig = {
        id: 'config-123',
        vendorId: mockVendorId,
        eatInEnabled: true,
        pickupEnabled: true,
        deliveryEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.vendorFulfillmentConfig.findUnique as jest.Mock).mockResolvedValue(
        mockConfig
      );

      const result = await FulfillmentService.getFulfillmentConfig(mockVendorId);

      expect(result).toEqual(mockConfig);
      expect(prisma.vendorFulfillmentConfig.findUnique).toHaveBeenCalledWith({
        where: { vendorId: mockVendorId },
      });
      expect(prisma.vendorFulfillmentConfig.create).not.toHaveBeenCalled();
    });

    it('should create config with defaults if not found', async () => {
      const mockCreatedConfig = {
        id: 'config-123',
        vendorId: mockVendorId,
        eatInEnabled: false,
        pickupEnabled: true,
        deliveryEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.vendorFulfillmentConfig.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.vendorFulfillmentConfig.create as jest.Mock).mockResolvedValue(
        mockCreatedConfig
      );

      const result = await FulfillmentService.getFulfillmentConfig(mockVendorId);

      expect(result).toEqual(mockCreatedConfig);
      expect(prisma.vendorFulfillmentConfig.create).toHaveBeenCalledWith({
        data: {
          vendorId: mockVendorId,
          eatInEnabled: false,
          pickupEnabled: true,
          deliveryEnabled: true,
        },
      });
    });
  });

  describe('updateFulfillmentConfig', () => {
    it('should update existing config', async () => {
      const existingConfig = {
        id: 'config-123',
        vendorId: mockVendorId,
        eatInEnabled: false,
        pickupEnabled: true,
        deliveryEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = {
        eatInEnabled: true,
        pickupEnabled: false,
      };

      const updatedConfig = {
        ...existingConfig,
        ...updateData,
      };

      (prisma.vendorFulfillmentConfig.findUnique as jest.Mock).mockResolvedValue(
        existingConfig
      );
      (prisma.vendorFulfillmentConfig.update as jest.Mock).mockResolvedValue(
        updatedConfig
      );

      const result = await FulfillmentService.updateFulfillmentConfig(
        mockVendorId,
        updateData
      );

      expect(result).toEqual(updatedConfig);
      expect(prisma.vendorFulfillmentConfig.update).toHaveBeenCalledWith({
        where: { vendorId: mockVendorId },
        data: updateData,
      });
    });

    it('should create config if not exists before updating', async () => {
      const newConfig = {
        id: 'config-123',
        vendorId: mockVendorId,
        eatInEnabled: false,
        pickupEnabled: true,
        deliveryEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = {
        eatInEnabled: true,
      };

      const updatedConfig = {
        ...newConfig,
        ...updateData,
      };

      // First call returns null (config doesn't exist)
      // Second call returns the created config
      (prisma.vendorFulfillmentConfig.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newConfig);
      (prisma.vendorFulfillmentConfig.create as jest.Mock).mockResolvedValue(newConfig);
      (prisma.vendorFulfillmentConfig.update as jest.Mock).mockResolvedValue(
        updatedConfig
      );

      const result = await FulfillmentService.updateFulfillmentConfig(
        mockVendorId,
        updateData
      );

      expect(result).toEqual(updatedConfig);
      expect(prisma.vendorFulfillmentConfig.create).toHaveBeenCalled();
      expect(prisma.vendorFulfillmentConfig.update).toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      const existingConfig = {
        id: 'config-123',
        vendorId: mockVendorId,
        eatInEnabled: false,
        pickupEnabled: true,
        deliveryEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = {
        deliveryEnabled: false,
      };

      const updatedConfig = {
        ...existingConfig,
        deliveryEnabled: false,
      };

      (prisma.vendorFulfillmentConfig.findUnique as jest.Mock).mockResolvedValue(
        existingConfig
      );
      (prisma.vendorFulfillmentConfig.update as jest.Mock).mockResolvedValue(
        updatedConfig
      );

      const result = await FulfillmentService.updateFulfillmentConfig(
        mockVendorId,
        updateData
      );

      expect(result.deliveryEnabled).toBe(false);
      expect(result.eatInEnabled).toBe(false);
      expect(result.pickupEnabled).toBe(true);
    });
  });

  describe('getEnabledMethods', () => {
    it('should return all enabled methods', async () => {
      const mockConfig = {
        id: 'config-123',
        vendorId: mockVendorId,
        eatInEnabled: true,
        pickupEnabled: true,
        deliveryEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.vendorFulfillmentConfig.findUnique as jest.Mock).mockResolvedValue(
        mockConfig
      );

      const result = await FulfillmentService.getEnabledMethods(mockVendorId);

      expect(result).toEqual([
        FulfillmentMethod.EAT_IN,
        FulfillmentMethod.PICKUP,
        FulfillmentMethod.DELIVERY,
      ]);
    });

    it('should return only enabled methods', async () => {
      const mockConfig = {
        id: 'config-123',
        vendorId: mockVendorId,
        eatInEnabled: false,
        pickupEnabled: true,
        deliveryEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.vendorFulfillmentConfig.findUnique as jest.Mock).mockResolvedValue(
        mockConfig
      );

      const result = await FulfillmentService.getEnabledMethods(mockVendorId);

      expect(result).toEqual([FulfillmentMethod.PICKUP, FulfillmentMethod.DELIVERY]);
      expect(result).not.toContain(FulfillmentMethod.EAT_IN);
    });

    it('should return empty array when no methods enabled', async () => {
      const mockConfig = {
        id: 'config-123',
        vendorId: mockVendorId,
        eatInEnabled: false,
        pickupEnabled: false,
        deliveryEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.vendorFulfillmentConfig.findUnique as jest.Mock).mockResolvedValue(
        mockConfig
      );

      const result = await FulfillmentService.getEnabledMethods(mockVendorId);

      expect(result).toEqual([]);
    });

    it('should return only DELIVERY when only delivery is enabled', async () => {
      const mockConfig = {
        id: 'config-123',
        vendorId: mockVendorId,
        eatInEnabled: false,
        pickupEnabled: false,
        deliveryEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.vendorFulfillmentConfig.findUnique as jest.Mock).mockResolvedValue(
        mockConfig
      );

      const result = await FulfillmentService.getEnabledMethods(mockVendorId);

      expect(result).toEqual([FulfillmentMethod.DELIVERY]);
    });
  });

  describe('validateFulfillmentMethod', () => {
    it('should return true when EAT_IN is enabled', async () => {
      const mockConfig = {
        id: 'config-123',
        vendorId: mockVendorId,
        eatInEnabled: true,
        pickupEnabled: false,
        deliveryEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.vendorFulfillmentConfig.findUnique as jest.Mock).mockResolvedValue(
        mockConfig
      );

      const result = await FulfillmentService.validateFulfillmentMethod(
        mockVendorId,
        FulfillmentMethod.EAT_IN
      );

      expect(result).toBe(true);
    });

    it('should return false when EAT_IN is disabled', async () => {
      const mockConfig = {
        id: 'config-123',
        vendorId: mockVendorId,
        eatInEnabled: false,
        pickupEnabled: true,
        deliveryEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.vendorFulfillmentConfig.findUnique as jest.Mock).mockResolvedValue(
        mockConfig
      );

      const result = await FulfillmentService.validateFulfillmentMethod(
        mockVendorId,
        FulfillmentMethod.EAT_IN
      );

      expect(result).toBe(false);
    });

    it('should return true when PICKUP is enabled', async () => {
      const mockConfig = {
        id: 'config-123',
        vendorId: mockVendorId,
        eatInEnabled: false,
        pickupEnabled: true,
        deliveryEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.vendorFulfillmentConfig.findUnique as jest.Mock).mockResolvedValue(
        mockConfig
      );

      const result = await FulfillmentService.validateFulfillmentMethod(
        mockVendorId,
        FulfillmentMethod.PICKUP
      );

      expect(result).toBe(true);
    });

    it('should return true when DELIVERY is enabled', async () => {
      const mockConfig = {
        id: 'config-123',
        vendorId: mockVendorId,
        eatInEnabled: false,
        pickupEnabled: false,
        deliveryEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.vendorFulfillmentConfig.findUnique as jest.Mock).mockResolvedValue(
        mockConfig
      );

      const result = await FulfillmentService.validateFulfillmentMethod(
        mockVendorId,
        FulfillmentMethod.DELIVERY
      );

      expect(result).toBe(true);
    });

    it('should validate each method independently', async () => {
      const mockConfig = {
        id: 'config-123',
        vendorId: mockVendorId,
        eatInEnabled: true,
        pickupEnabled: false,
        deliveryEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.vendorFulfillmentConfig.findUnique as jest.Mock).mockResolvedValue(
        mockConfig
      );

      const eatInResult = await FulfillmentService.validateFulfillmentMethod(
        mockVendorId,
        FulfillmentMethod.EAT_IN
      );
      const pickupResult = await FulfillmentService.validateFulfillmentMethod(
        mockVendorId,
        FulfillmentMethod.PICKUP
      );
      const deliveryResult = await FulfillmentService.validateFulfillmentMethod(
        mockVendorId,
        FulfillmentMethod.DELIVERY
      );

      expect(eatInResult).toBe(true);
      expect(pickupResult).toBe(false);
      expect(deliveryResult).toBe(true);
    });
  });

  describe('requiresDeliveryAddress', () => {
    it('should return true for DELIVERY method', () => {
      const result = FulfillmentService.requiresDeliveryAddress(
        FulfillmentMethod.DELIVERY
      );

      expect(result).toBe(true);
    });

    it('should return false for EAT_IN method', () => {
      const result = FulfillmentService.requiresDeliveryAddress(
        FulfillmentMethod.EAT_IN
      );

      expect(result).toBe(false);
    });

    it('should return false for PICKUP method', () => {
      const result = FulfillmentService.requiresDeliveryAddress(
        FulfillmentMethod.PICKUP
      );

      expect(result).toBe(false);
    });
  });
});
