import * as fc from 'fast-check';
import { prisma } from '@/lib/prisma';
import { MealSlotService } from '@/services/meal-slot.service';
import { OrderService } from '@/services/order.service';
import { FulfillmentService } from '@/services/fulfillment.service';
import { FulfillmentMethod } from '@prisma/client';

// Feature: pre-order-and-fulfillment-options
// Property-based tests for order integration with meal slots and fulfillment

describe('Order Meal Slot Integration Property Tests', () => {
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
        email: `vendor-order-${timestamp}@test.com`,
        phone: `2${timestamp.toString().slice(-9)}`,
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
        name: `Test Vendor Category Order ${timestamp}`,
        description: 'Test vendor category for order integration tests',
        icon: 'test-icon',
      },
    });
    testVendorCategoryId = testVendorCategory.id;

    // Create test service area
    const testServiceArea = await prisma.serviceArea.create({
      data: {
        name: `Test Service Area Order ${timestamp}`,
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
        businessName: 'Test Vendor Order',
        categoryId: testVendorCategoryId,
        serviceAreaId: testServiceAreaId,
        description: 'Test vendor for order integration tests',
        status: 'ACTIVE',
      },
    });
    testVendorId = testVendor.id;

    // Create test customer
    const testCustomer = await prisma.user.create({
      data: {
        email: `customer-order-${timestamp}@test.com`,
        phone: `7${timestamp.toString().slice(-9)}`,
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
        await prisma.mealSlot.deleteMany({ where: { vendorId: testVendorId } });
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
    // Clean up orders, meal slots, and fulfillment config after each test
    try {
      await prisma.order.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.mealSlot.deleteMany({ where: { vendorId: testVendorId } });
      await prisma.vendorFulfillmentConfig.deleteMany({ where: { vendorId: testVendorId } });
    } catch (error) {
      console.error('Cleanup error in afterEach:', error);
    }
  });

  // Arbitraries (generators)
  const futureTimeArbitrary = () =>
    fc
      .tuple(fc.integer({ min: 20, max: 23 }), fc.integer({ min: 0, max: 59 }))
      .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

  const validMealSlotArbitrary = () =>
    fc
      .tuple(futureTimeArbitrary(), futureTimeArbitrary(), futureTimeArbitrary())
      .filter(([cutoff, start, end]) => cutoff < start && start < end)
      .map(([cutoffTime, startTime, endTime]) => ({
        vendorId: testVendorId,
        name: fc.sample(fc.string({ minLength: 1, maxLength: 50 }), 1)[0],
        cutoffTime,
        startTime,
        endTime,
        timeWindowDuration: fc.sample(fc.integer({ min: 15, max: 120 }), 1)[0],
      }));

  const fulfillmentMethodArbitrary = () =>
    fc.constantFrom(
      FulfillmentMethod.EAT_IN,
      FulfillmentMethod.PICKUP,
      FulfillmentMethod.DELIVERY
    );

  describe('Property 9: Active meal slots display', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 9: Active meal slots display
     * Validates: Requirements 3.1
     */
    it(
      'should return all active meal slots with complete time range information',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(validMealSlotArbitrary(), { minLength: 1, maxLength: 3 }),
            async (mealSlotsData) => {
              // Clean up before this iteration
              await prisma.mealSlot.deleteMany({ where: { vendorId: testVendorId } });

              // Create meal slots
              const createdSlots = [];
              for (const slotData of mealSlotsData) {
                const slot = await MealSlotService.createMealSlot(slotData);
                createdSlots.push(slot);
              }

              // Retrieve active meal slots
              const activeSlots = await MealSlotService.getActiveMealSlots(testVendorId);

              // Verify all active slots returned with complete information
              expect(activeSlots.length).toBe(createdSlots.length);
              activeSlots.forEach((slot) => {
                expect(slot.name).toBeDefined();
                expect(slot.startTime).toBeDefined();
                expect(slot.endTime).toBeDefined();
                expect(slot.cutoffTime).toBeDefined();
                expect(slot.isActive).toBe(true);
              });

              // Clean up after this iteration
              await prisma.mealSlot.deleteMany({ where: { vendorId: testVendorId } });
            }
          ),
          { numRuns: 10 }
        );
      },
      30000
    );
  });

  describe('Property 10: Meal slot selection requires valid slot', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 10: Meal slot selection requires valid slot
     * Validates: Requirements 3.5
     */
    it(
      'should reject orders with invalid meal slot IDs',
      async () => {
        await fc.assert(
          fc.asyncProperty(fc.uuid(), async (invalidMealSlotId) => {
            // Enable delivery
            await FulfillmentService.updateFulfillmentConfig(testVendorId, {
              deliveryEnabled: true,
            });

            // Attempt to create order with non-existent meal slot ID should fail
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
                mealSlotId: invalidMealSlotId,
                fulfillmentMethod: FulfillmentMethod.DELIVERY,
              })
            ).rejects.toThrow();
          }),
          { numRuns: 10 }
        );
      },
      30000
    );
  });

  describe('Property 11: Order stores meal slot reference', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 11: Order stores meal slot reference
     * Validates: Requirements 3.7, 9.3, 9.4
     */
    it(
      'should preserve meal slot ID when creating and retrieving orders',
      async () => {
        await fc.assert(
          fc.asyncProperty(validMealSlotArbitrary(), async (mealSlotData) => {
            // Enable delivery
            await FulfillmentService.updateFulfillmentConfig(testVendorId, {
              deliveryEnabled: true,
            });

            // Create meal slot
            const mealSlot = await MealSlotService.createMealSlot(mealSlotData);

            // Create order with meal slot
            const order = await OrderService.createOrder({
              customerId: testCustomerId,
              vendorId: testVendorId,
              deliveryAddressId: testDeliveryAddressId,
              items: [{ productId: testProductId, quantity: 1 }],
              subtotal: 10.0,
              deliveryFee: 2.0,
              tax: 1.0,
              total: 13.0,
              mealSlotId: mealSlot.id,
              fulfillmentMethod: FulfillmentMethod.DELIVERY,
            });

            // Retrieve order
            const retrieved = await OrderService.getOrderById(order.id);

            // Verify meal slot ID matches
            expect(retrieved.mealSlotId).toBe(mealSlot.id);
          }),
          { numRuns: 15 }
        );
      },
      30000
    );
  });

  describe('Property 19: Order filtering by meal slot', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 19: Order filtering by meal slot
     * Validates: Requirements 7.1, 8.3
     */
    it(
      'should return only orders with specified meal slot when filtering',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(validMealSlotArbitrary(), { minLength: 2, maxLength: 3 }),
            async (mealSlotsData) => {
              // Clean up before this iteration
              await prisma.order.deleteMany({ where: { customerId: testCustomerId } });
              await prisma.mealSlot.deleteMany({ where: { vendorId: testVendorId } });

              // Enable delivery
              await FulfillmentService.updateFulfillmentConfig(testVendorId, {
                deliveryEnabled: true,
              });

              // Create meal slots
              const createdSlots = [];
              for (const slotData of mealSlotsData) {
                const slot = await MealSlotService.createMealSlot(slotData);
                createdSlots.push(slot);
              }

              // Create orders with different meal slots
              const createdOrders = [];
              for (const slot of createdSlots) {
                const order = await OrderService.createOrder({
                  customerId: testCustomerId,
                  vendorId: testVendorId,
                  deliveryAddressId: testDeliveryAddressId,
                  items: [{ productId: testProductId, quantity: 1 }],
                  subtotal: 10.0,
                  deliveryFee: 2.0,
                  tax: 1.0,
                  total: 13.0,
                  mealSlotId: slot.id,
                  fulfillmentMethod: FulfillmentMethod.DELIVERY,
                });
                createdOrders.push(order);
              }

              // Filter by first meal slot
              const targetMealSlotId = createdSlots[0].id;
              const { orders: filteredOrders } = await OrderService.listOrders(
                testCustomerId,
                'CUSTOMER',
                { mealSlotId: targetMealSlotId },
                1,
                10
              );

              // Verify only orders with target meal slot returned
              expect(filteredOrders.length).toBeGreaterThan(0);
              filteredOrders.forEach((order) => {
                expect(order.mealSlotId).toBe(targetMealSlotId);
              });

              // Clean up after this iteration
              await prisma.order.deleteMany({ where: { customerId: testCustomerId } });
              await prisma.mealSlot.deleteMany({ where: { vendorId: testVendorId } });
            }
          ),
          { numRuns: 5 }
        );
      },
      30000
    );
  });

  describe('Property 20: Order filtering by fulfillment method', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 20: Order filtering by fulfillment method
     * Validates: Requirements 7.2, 8.4
     */
    it(
      'should return only orders with specified fulfillment method when filtering',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(fulfillmentMethodArbitrary(), { minLength: 2, maxLength: 3 }),
            async (methods) => {
              // Clean up before this iteration
              await prisma.order.deleteMany({ where: { customerId: testCustomerId } });

              // Enable all fulfillment methods
              await FulfillmentService.updateFulfillmentConfig(testVendorId, {
                eatInEnabled: true,
                pickupEnabled: true,
                deliveryEnabled: true,
              });

              // Create orders with different fulfillment methods
              const createdOrders = [];
              for (const method of methods) {
                const order = await OrderService.createOrder({
                  customerId: testCustomerId,
                  vendorId: testVendorId,
                  deliveryAddressId: testDeliveryAddressId,
                  items: [{ productId: testProductId, quantity: 1 }],
                  subtotal: 10.0,
                  deliveryFee: method === FulfillmentMethod.DELIVERY ? 2.0 : 0.0,
                  tax: 1.0,
                  total: method === FulfillmentMethod.DELIVERY ? 13.0 : 11.0,
                  fulfillmentMethod: method,
                });
                createdOrders.push(order);
              }

              // Filter by first fulfillment method
              const targetMethod = methods[0];
              const { orders: filteredOrders } = await OrderService.listOrders(
                testCustomerId,
                'CUSTOMER',
                { fulfillmentMethod: targetMethod },
                1,
                10
              );

              // Verify only orders with target fulfillment method returned
              expect(filteredOrders.length).toBeGreaterThan(0);
              filteredOrders.forEach((order) => {
                expect(order.fulfillmentMethod).toBe(targetMethod);
              });

              // Clean up after this iteration
              await prisma.order.deleteMany({ where: { customerId: testCustomerId } });
            }
          ),
          { numRuns: 5 }
        );
      },
      30000
    );
  });

  describe('Property 21: Order display includes meal slot and fulfillment', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 21: Order display includes meal slot and fulfillment
     * Validates: Requirements 7.3, 7.4, 8.1, 8.2
     */
    it(
      'should include both meal slot and fulfillment method when displaying orders',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            validMealSlotArbitrary(),
            fulfillmentMethodArbitrary(),
            async (mealSlotData, method) => {
              // Enable all fulfillment methods
              await FulfillmentService.updateFulfillmentConfig(testVendorId, {
                eatInEnabled: true,
                pickupEnabled: true,
                deliveryEnabled: true,
              });

              // Create meal slot
              const mealSlot = await MealSlotService.createMealSlot(mealSlotData);

              // Create order with meal slot and fulfillment method
              const order = await OrderService.createOrder({
                customerId: testCustomerId,
                vendorId: testVendorId,
                deliveryAddressId: testDeliveryAddressId,
                items: [{ productId: testProductId, quantity: 1 }],
                subtotal: 10.0,
                deliveryFee: method === FulfillmentMethod.DELIVERY ? 2.0 : 0.0,
                tax: 1.0,
                total: method === FulfillmentMethod.DELIVERY ? 13.0 : 11.0,
                mealSlotId: mealSlot.id,
                fulfillmentMethod: method,
              });

              // Retrieve order details
              const retrieved = await OrderService.getOrderById(order.id);

              // Verify both fields included
              expect(retrieved.mealSlotId).toBe(mealSlot.id);
              expect(retrieved.fulfillmentMethod).toBe(method);
              expect(retrieved.mealSlot).toBeDefined();
              expect(retrieved.mealSlot?.name).toBe(mealSlotData.name);
              expect(retrieved.mealSlot?.startTime).toBe(mealSlotData.startTime);
              expect(retrieved.mealSlot?.endTime).toBe(mealSlotData.endTime);
            }
          ),
          { numRuns: 15 }
        );
      },
      30000
    );
  });
});
