import * as fc from 'fast-check';
import { FulfillmentMethod } from '@prisma/client';

/**
 * Arbitrary for generating fulfillment methods
 * Generates one of: EAT_IN, PICKUP, DELIVERY
 */
export const fulfillmentMethodArbitrary = () =>
  fc.constantFrom(
    FulfillmentMethod.EAT_IN,
    FulfillmentMethod.PICKUP,
    FulfillmentMethod.DELIVERY
  );

/**
 * Arbitrary for generating valid fulfillment configurations
 * Ensures at least one method is enabled
 */
export const fulfillmentConfigArbitrary = () =>
  fc
    .record({
      eatInEnabled: fc.boolean(),
      pickupEnabled: fc.boolean(),
      deliveryEnabled: fc.boolean(),
    })
    .filter(
      (config) =>
        // At least one method must be enabled
        config.eatInEnabled || config.pickupEnabled || config.deliveryEnabled
    );

/**
 * Arbitrary for generating invalid fulfillment configurations
 * Generates configurations where all methods are disabled (violates constraint)
 */
export const invalidFulfillmentConfigArbitrary = () =>
  fc.constant({
    eatInEnabled: false,
    pickupEnabled: false,
    deliveryEnabled: false,
  });

/**
 * Arbitrary for generating fulfillment configurations with specific method enabled
 * 
 * @param method - The fulfillment method that must be enabled
 */
export const fulfillmentConfigWithMethodArbitrary = (method: FulfillmentMethod) =>
  fc
    .record({
      eatInEnabled: fc.boolean(),
      pickupEnabled: fc.boolean(),
      deliveryEnabled: fc.boolean(),
    })
    .map((config) => {
      // Ensure the specified method is enabled
      if (method === FulfillmentMethod.EAT_IN) {
        return { ...config, eatInEnabled: true };
      } else if (method === FulfillmentMethod.PICKUP) {
        return { ...config, pickupEnabled: true };
      } else {
        return { ...config, deliveryEnabled: true };
      }
    });

/**
 * Arbitrary for generating fulfillment configurations with specific method disabled
 * Ensures at least one other method is enabled
 * 
 * @param method - The fulfillment method that must be disabled
 */
export const fulfillmentConfigWithoutMethodArbitrary = (method: FulfillmentMethod) =>
  fc
    .record({
      eatInEnabled: fc.boolean(),
      pickupEnabled: fc.boolean(),
      deliveryEnabled: fc.boolean(),
    })
    .map((config) => {
      // Ensure the specified method is disabled
      if (method === FulfillmentMethod.EAT_IN) {
        config.eatInEnabled = false;
      } else if (method === FulfillmentMethod.PICKUP) {
        config.pickupEnabled = false;
      } else {
        config.deliveryEnabled = false;
      }
      return config;
    })
    .filter(
      (config) =>
        // At least one method must still be enabled
        config.eatInEnabled || config.pickupEnabled || config.deliveryEnabled
    );

/**
 * Arbitrary for generating fulfillment configurations with only one method enabled
 */
export const singleMethodFulfillmentConfigArbitrary = () =>
  fc.constantFrom(
    { eatInEnabled: true, pickupEnabled: false, deliveryEnabled: false },
    { eatInEnabled: false, pickupEnabled: true, deliveryEnabled: false },
    { eatInEnabled: false, pickupEnabled: false, deliveryEnabled: true }
  );

/**
 * Arbitrary for generating fulfillment configurations with all methods enabled
 */
export const allMethodsEnabledFulfillmentConfigArbitrary = () =>
  fc.constant({
    eatInEnabled: true,
    pickupEnabled: true,
    deliveryEnabled: true,
  });

/**
 * Arbitrary for generating fulfillment configurations with exactly two methods enabled
 */
export const twoMethodsFulfillmentConfigArbitrary = () =>
  fc.constantFrom(
    { eatInEnabled: true, pickupEnabled: true, deliveryEnabled: false },
    { eatInEnabled: true, pickupEnabled: false, deliveryEnabled: true },
    { eatInEnabled: false, pickupEnabled: true, deliveryEnabled: true }
  );

/**
 * Arbitrary for generating a fulfillment method that requires delivery address
 * Always returns DELIVERY
 */
export const deliveryMethodArbitrary = () =>
  fc.constant(FulfillmentMethod.DELIVERY);

/**
 * Arbitrary for generating fulfillment methods that don't require delivery address
 * Returns either EAT_IN or PICKUP
 */
export const nonDeliveryMethodArbitrary = () =>
  fc.constantFrom(FulfillmentMethod.EAT_IN, FulfillmentMethod.PICKUP);

/**
 * Arbitrary for generating a pair of fulfillment method and matching config
 * Ensures the generated method is enabled in the config
 */
export const enabledMethodWithConfigArbitrary = () =>
  fc
    .tuple(fulfillmentMethodArbitrary(), fulfillmentConfigArbitrary())
    .filter(([method, config]) => {
      // Ensure the method is enabled in the config
      if (method === FulfillmentMethod.EAT_IN) {
        return config.eatInEnabled;
      } else if (method === FulfillmentMethod.PICKUP) {
        return config.pickupEnabled;
      } else {
        return config.deliveryEnabled;
      }
    });

/**
 * Arbitrary for generating a pair of fulfillment method and config where method is disabled
 * Ensures the generated method is NOT enabled in the config
 */
export const disabledMethodWithConfigArbitrary = () =>
  fc
    .tuple(fulfillmentMethodArbitrary(), fulfillmentConfigArbitrary())
    .filter(([method, config]) => {
      // Ensure the method is disabled in the config
      if (method === FulfillmentMethod.EAT_IN) {
        return !config.eatInEnabled;
      } else if (method === FulfillmentMethod.PICKUP) {
        return !config.pickupEnabled;
      } else {
        return !config.deliveryEnabled;
      }
    });

/**
 * Helper function to check if a fulfillment method is enabled in a config
 * 
 * @param method - The fulfillment method to check
 * @param config - The fulfillment configuration
 * @returns true if the method is enabled, false otherwise
 */
export const isMethodEnabled = (
  method: FulfillmentMethod,
  config: {
    eatInEnabled: boolean;
    pickupEnabled: boolean;
    deliveryEnabled: boolean;
  }
): boolean => {
  if (method === FulfillmentMethod.EAT_IN) {
    return config.eatInEnabled;
  } else if (method === FulfillmentMethod.PICKUP) {
    return config.pickupEnabled;
  } else {
    return config.deliveryEnabled;
  }
};

/**
 * Helper function to get enabled methods from a config
 * 
 * @param config - The fulfillment configuration
 * @returns Array of enabled fulfillment methods
 */
export const getEnabledMethods = (config: {
  eatInEnabled: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
}): FulfillmentMethod[] => {
  const methods: FulfillmentMethod[] = [];
  if (config.eatInEnabled) methods.push(FulfillmentMethod.EAT_IN);
  if (config.pickupEnabled) methods.push(FulfillmentMethod.PICKUP);
  if (config.deliveryEnabled) methods.push(FulfillmentMethod.DELIVERY);
  return methods;
};
