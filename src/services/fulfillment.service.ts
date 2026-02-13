import { prisma } from '@/lib/prisma';
import { FulfillmentMethod, VendorFulfillmentConfig } from '@prisma/client';

export interface UpdateFulfillmentConfigInput {
  eatInEnabled?: boolean;
  pickupEnabled?: boolean;
  deliveryEnabled?: boolean;
}

export class FulfillmentService {
  /**
   * Get or create fulfillment config for vendor
   * If config doesn't exist, creates one with default values
   */
  static async getFulfillmentConfig(
    vendorId: string
  ): Promise<VendorFulfillmentConfig> {
    // Try to find existing config
    let config = await prisma.vendorFulfillmentConfig.findUnique({
      where: { vendorId },
    });

    // If not found, create with defaults
    if (!config) {
      config = await prisma.vendorFulfillmentConfig.create({
        data: {
          vendorId,
          eatInEnabled: false,
          pickupEnabled: true,
          deliveryEnabled: true,
        },
      });
    }

    return config;
  }

  /**
   * Update fulfillment config for vendor
   */
  static async updateFulfillmentConfig(
    vendorId: string,
    data: UpdateFulfillmentConfigInput
  ): Promise<VendorFulfillmentConfig> {
    // Get or create config first
    await this.getFulfillmentConfig(vendorId);

    // Update the config
    const updated = await prisma.vendorFulfillmentConfig.update({
      where: { vendorId },
      data,
    });

    return updated;
  }

  /**
   * Get enabled fulfillment methods for vendor
   * Returns array of enabled methods
   */
  static async getEnabledMethods(
    vendorId: string
  ): Promise<FulfillmentMethod[]> {
    const config = await this.getFulfillmentConfig(vendorId);

    const enabledMethods: FulfillmentMethod[] = [];

    if (config.eatInEnabled) {
      enabledMethods.push(FulfillmentMethod.EAT_IN);
    }
    if (config.pickupEnabled) {
      enabledMethods.push(FulfillmentMethod.PICKUP);
    }
    if (config.deliveryEnabled) {
      enabledMethods.push(FulfillmentMethod.DELIVERY);
    }

    return enabledMethods;
  }

  /**
   * Validate fulfillment method is enabled for vendor
   * Returns true if method is enabled, false otherwise
   */
  static async validateFulfillmentMethod(
    vendorId: string,
    method: FulfillmentMethod
  ): Promise<boolean> {
    const config = await this.getFulfillmentConfig(vendorId);

    switch (method) {
      case FulfillmentMethod.EAT_IN:
        return config.eatInEnabled;
      case FulfillmentMethod.PICKUP:
        return config.pickupEnabled;
      case FulfillmentMethod.DELIVERY:
        return config.deliveryEnabled;
      default:
        return false;
    }
  }

  /**
   * Check if delivery address is required for fulfillment method
   * Static method - doesn't require database access
   */
  static requiresDeliveryAddress(method: FulfillmentMethod): boolean {
    return method === FulfillmentMethod.DELIVERY;
  }
}
