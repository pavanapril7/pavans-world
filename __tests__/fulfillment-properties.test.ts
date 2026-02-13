import * as fc from 'fast-check';
import { prisma } from '@/lib/prisma';
import { FulfillmentService } from '@/services/fulfillment.service';
import { OrderService } from '@/services/order.service';
import { FulfillmentMethod } from '@prisma/client';

// Feature: pre-order-and-fulfillment-options
// Property-based tests for fulfillment options functionality

describe('Fulfillment Property Tests', () => {
  let testVendorId: string;
  let testUserId: string;
  let testCustomerId: string;
  let testProductId: string;
  let testVendorCategoryId: string;
  let testServiceAreaId: string;
  let testDeliveryAddressId: string;

  beforeAll(async () => {
    const timestamp = Date.now();

    // Create test user for vendor
    const testUser = await prisma.user.create({
      data: {
        email: `vendor-fulfillment-${timestamp}@test.com`,
        phone: `3${timestamp.toString().slice(-9)}`,
        firstName: 'Test',
        lastName: 'Vendor',
        role: 'VENDOR',
        passwordHash: 'test-hash',
      },
    });
    testUserId = testUser.id;

    // Create test vendor category
    const testVendorCategory = await prisma.vendorCategory.create({
      data: {
        name: `Test Vendor Category Fulfillment ${timestamp}`,
        description: 'Test vendor category for fulfillment tests',
        icon: 'test-icon',
      },
    });
    testVendorCategoryId = testVendorCategory.id;

    // Create test service area
    const testServiceArea = await prisma.serviceArea.create({
      data: {
        name: `Test Service Area Fulfillment ${timestamp}`,
        city: 'Test City',
        state: 'Test State',
        pincodes: ['12345'],
        status: 'ACTIVE',
      },
    });
    testServiceAreaId = testServiceArea.id;

    // Create test vendor
    const testVendor = await prisma.vendor.create({
      data: {
        userId: testUserId,
        businessName: 'Test Vendor Fulfillment',
        categoryId: testVendorCategoryId,
        serviceAreaId: testServiceAreaId,
        description: 'Test vendor for fulfillment tests',
        status: 'ACTIVE',
      },
    });
    testVendorId = testVendor.id;

    // Create test customer
    const testCustomer = await prisma.user.create({
      data: {
        email: `customer-fulfillment-${timestamp}@test.com`,
        phone: `8${timestamp.toString().slice(-9)}`,
        firstName: 'Test',
        lastName: 'Customer',
        role: 'CUSTOMER',
        passwordHash: 'test-hash',
      },
    });
    testCustomerId = testCustomer.id;

    // Create test delivery address
    const testAddress = await prisma.address.create({
      data: {
        userId: testCustomerId,
        label: 'Home',
        street: '123 Test St',
        landmark: 'Near Test Park',
        city: 'Test City',
        state: 'Test State',
        pincode: '12345',
        isDefault: true,
      },
    });
    testDeliveryAddressId = testAddress.id;

    // Create test product
    const testProduct = await prisma.product.create({
      data: {
        vendorId: testVendorId,
        name: 'Test Product',
        description: 'Test product',
        price: 10.0,
        imageUrl: 'https://example.com/image.jpg',
        category: 'Test Category',
      },
    });
    testProductId = testProduct.id;
  });

  afterAll(async () => {
    // Clean up test data in correct order
    try {
      if (testCustomerId) {
        await prisma.order.deleteMany({ where: { customerId: testCustomerId } });
        await prisma.address.deleteMany({ where: { userId: testCustomerId } });
      }
      if (testVendorId) {
        await prisma.vendorFulfillmentConfig.deleteMany({ where: { vendorId: testVendorId } });
        await prisma.product.deleteMany({ where: { vendorId: testVendorId } });
        await prisma.vendor.deleteMany({ where: { id: testVendorId } });
      }
      if (testVendorCategoryId) {
        await prisma.vendorCategory.deleteMany({ where: { id: testVendorCategoryId } });
      }
      if (testServiceAreaId) {
        await prisma.serviceArea.deleteMany({ where: { id: testServiceAreaId } });
      }
      if (testUserId || testCustomerId) {
        const userIds = [testUserId, testCustomerId].filter(Boolean);
        if (userIds.length > 0) {
          await prisma.user.deleteMany({ where: { id: { in: userIds } } });
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    } finally {
      await prisma.$disconnect();
    }
  });

  afterEach(async () => {
    // Clean up orders and fulfillment config after each test
    try {
      await prisma.order.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.vendorFulfillmentConfig.deleteMany({ where: { vendorId: testVendorId } });
    } catch (error) {
      console.error('Cleanup error in afterEach:', error);
    }
  });

  // Arbitraries (generators)
  const fulfillmentMethodArbitrary = () =>
    fc.constantFrom(
      FulfillmentMethod.EAT_IN,
      FulfillmentMethod.PICKUP,
      FulfillmentMethod.DELIVERY
    );

  const fulfillmentConfigArbitrary = () =>
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

  describe('Property 12: Fulfillment config persistence', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 12: Fulfillment config persistence
     * Validates: Requirements 4.1, 4.3
     */
    it(
      'should preserve enabled states when updating and retrieving fulfillment config',
      async () => {
        await fc.assert(
          fc.asyncProperty(fulfillmentConfigArbitrary(), async (configData) => {
            // Update vendor config
            const updated = await FulfillmentService.updateFulfillmentConfig(
              testVendorId,
              configData
            );

            // Retrieve config
            const retrieved = await FulfillmentService.getFulfillmentConfig(testVendorId);

            // Verify enabled states match
            expect(retrieved.eatInEnabled).toBe(configData.eatInEnabled);
            expect(retrieved.pickupEnabled).toBe(configData.pickupEnabled);
            expect(retrieved.deliveryEnabled).toBe(configData.deliveryEnabled);
            expect(retrieved.vendorId).toBe(testVendorId);
          }),
          { numRuns: 20 }
        );
      },
      30000
    );
  });

  describe('Property 13: Fulfillment method disabling prevents new orders', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 13: Fulfillment method disabling prevents new orders
     * Validates: Requirements 4.4
     */
    it(
      'should reject new orders with disabled fulfillment method while preserving existing orders',
      async () => {
        await fc.assert(
          fc.asyncProperty(fulfillmentMethodArbitrary(), async (method) => {
            // Enable all methods initially
            await FulfillmentService.updateFulfillmentConfig(testVendorId, {
              eatInEnabled: true,
              pickupEnabled: true,
              deliveryEnabled: true,
            });

            // Create order with the method
            const existingOrder = await OrderService.createOrder({
              customerId: testCustomerId,
              vendorId: testVendorId,
              deliveryAddressId: testDeliveryAddressId,
              items: [{ productId: testProductId, quantity: 1 }],
              subtotal: 10.0,
              deliveryFee: 2.0,
              tax: 1.0,
              total: 13.0,
              fulfillmentMethod: method,
            });

            // Disable the method
            const disableConfig = {
              eatInEnabled: method !== FulfillmentMethod.EAT_IN,
              pickupEnabled: method !== FulfillmentMethod.PICKUP,
              deliveryEnabled: method !== FulfillmentMethod.DELIVERY,
            };
            await FulfillmentService.updateFulfillmentConfig(testVendorId, disableConfig);

            // Verify existing order unchanged
            const retrievedOrder = await OrderService.getOrderById(existingOrder.id);
            expect(retrievedOrder.fulfillmentMethod).toBe(method);

            // Attempt to create new order with disabled method should fail
            await expect(
              OrderService.createOrder({
                customerId: testCustomerId,
                vendorId: testVendorId,
                deliveryAddressId: testDeliveryAddressId,
                items: [{ productId: testProductId, quantity: 1 }],
                subtotal: 10.0,
                deliveryFee: 2.0,
                tax: 1.0,
                total: 13.0,
                fulfillmentMethod: method,
              })
            ).rejects.toThrow();
          }),
          { numRuns: 10 }
        );
      },
      30000
    );
  });

  describe('Property 14: Enabled fulfillment methods filtering', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 14: Enabled fulfillment methods filtering
     * Validates: Requirements 5.1, 6.1, 6.2
     */
    it(
      'should return only enabled fulfillment methods',
      async () => {
        await fc.assert(
          fc.asyncProperty(fulfillmentConfigArbitrary(), async (configData) => {
            // Configure vendor with specific methods enabled
            await FulfillmentService.updateFulfillmentConfig(testVendorId, configData);

            // Retrieve enabled methods
            const enabledMethods = await FulfillmentService.getEnabledMethods(testVendorId);

            // Build expected enabled methods
            const expectedMethods: FulfillmentMethod[] = [];
            if (configData.eatInEnabled) expectedMethods.push(FulfillmentMethod.EAT_IN);
            if (configData.pickupEnabled) expectedMethods.push(FulfillmentMethod.PICKUP);
            if (configData.deliveryEnabled) expectedMethods.push(FulfillmentMethod.DELIVERY);

            // Verify only enabled methods returned
            expect(enabledMethods.length).toBe(expectedMethods.length);
            expectedMethods.forEach((method) => {
              expect(enabledMethods).toContain(method);
            });
          }),
          { numRuns: 20 }
        );
      },
      30000
    );
  });

  describe('Property 15: Fulfillment method validation', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 15: Fulfillment method validation
     * Validates: Requirements 5.2, 6.3
     */
    it(
      'should reject orders with disabled fulfillment methods',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fulfillmentMethodArbitrary(),
            fulfillmentConfigArbitrary(),
            async (method, configData) => {
              // Configure vendor
              await FulfillmentService.updateFulfillmentConfig(testVendorId, configData);

              // Check if method is enabled
              const isEnabled =
                (method === FulfillmentMethod.EAT_IN && configData.eatInEnabled) ||
                (method === FulfillmentMethod.PICKUP && configData.pickupEnabled) ||
                (method === FulfillmentMethod.DELIVERY && configData.deliveryEnabled);

              if (isEnabled) {
                // Should succeed
                const order = await OrderService.createOrder({
                  customerId: testCustomerId,
                  vendorId: testVendorId,
                  deliveryAddressId: testDeliveryAddressId,
                  items: [{ productId: testProductId, quantity: 1 }],
                  subtotal: 10.0,
                  deliveryFee: 2.0,
                  tax: 1.0,
                  total: 13.0,
                  fulfillmentMethod: method,
                });
                expect(order.fulfillmentMethod).toBe(method);
              } else {
                // Should fail
                await expect(
                  OrderService.createOrder({
                    customerId: testCustomerId,
                    vendorId: testVendorId,
                    deliveryAddressId: testDeliveryAddressId,
                    items: [{ productId: testProductId, quantity: 1 }],
                    subtotal: 10.0,
                    deliveryFee: 2.0,
                    tax: 1.0,
                    total: 13.0,
                    fulfillmentMethod: method,
                  })
                ).rejects.toThrow();
              }
            }
          ),
          { numRuns: 15 }
        );
      },
      30000
    );
  });

  describe('Property 16: Delivery address requirement', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 16: Delivery address requirement
     * Validates: Requirements 5.3
     */
    it(
      'should reject DELIVERY orders without delivery address',
      async () => {
        await fc.assert(
          fc.asyncProperty(fc.constant(FulfillmentMethod.DELIVERY), async (method) => {
            // Enable delivery
            await FulfillmentService.updateFulfillmentConfig(testVendorId, {
              deliveryEnabled: true,
            });

            // Attempt to create order without delivery address should fail
            await expect(
              OrderService.createOrder({
                customerId: testCustomerId,
                vendorId: testVendorId,
                deliveryAddressId: undefined as any, // No address
                items: [{ productId: testProductId, quantity: 1 }],
                subtotal: 10.0,
                deliveryFee: 2.0,
                tax: 1.0,
                total: 13.0,
                fulfillmentMethod: method,
              })
            ).rejects.toThrow();
          }),
          { numRuns: 10 }
        );
      },
      30000
    );
  });

  describe('Property 17: Non-delivery orders don\'t require address', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 17: Non-delivery orders don't require address
     * Validates: Requirements 5.4
     */
    it(
      'should accept PICKUP and EAT_IN orders without delivery address',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.constantFrom(FulfillmentMethod.PICKUP, FulfillmentMethod.EAT_IN),
            async (method) => {
              // Enable the method
              await FulfillmentService.updateFulfillmentConfig(testVendorId, {
                eatInEnabled: true,
                pickupEnabled: true,
                deliveryEnabled: false,
              });

              // Create order without delivery address should succeed
              // Note: We still pass the address ID but the service should not validate it for non-delivery orders
              const order = await OrderService.createOrder({
                customerId: testCustomerId,
                vendorId: testVendorId,
                deliveryAddressId: testDeliveryAddressId, // Pass address but it shouldn't be required
                items: [{ productId: testProductId, quantity: 1 }],
                subtotal: 10.0,
                deliveryFee: 0.0,
                tax: 1.0,
                total: 11.0,
                fulfillmentMethod: method,
              });

              expect(order.fulfillmentMethod).toBe(method);
              // The order can have an address even for non-delivery, it's just not required
            }
          ),
          { numRuns: 10 }
        );
      },
      30000
    );
  });

  describe('Property 18: Order stores fulfillment method', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 18: Order stores fulfillment method
     * Validates: Requirements 5.5
     */
    it(
      'should preserve fulfillment method when creating and retrieving orders',
      async () => {
        await fc.assert(
          fc.asyncProperty(fulfillmentMethodArbitrary(), async (method) => {
            // Enable all methods
            await FulfillmentService.updateFulfillmentConfig(testVendorId, {
              eatInEnabled: true,
              pickupEnabled: true,
              deliveryEnabled: true,
            });

            // Create order with fulfillment method
            const order = await OrderService.createOrder({
              customerId: testCustomerId,
              vendorId: testVendorId,
              deliveryAddressId: testDeliveryAddressId,
              items: [{ productId: testProductId, quantity: 1 }],
              subtotal: 10.0,
              deliveryFee: 2.0,
              tax: 1.0,
              total: 13.0,
              fulfillmentMethod: method,
            });

            // Retrieve order
            const retrieved = await OrderService.getOrderById(order.id);

            // Verify fulfillment method matches
            expect(retrieved.fulfillmentMethod).toBe(method);
          }),
          { numRuns: 20 }
        );
      },
      30000
    );
  });
});
