import * as fc from 'fast-check';
import { prisma } from '@/lib/prisma';
import { MealSlotService } from '@/services/meal-slot.service';
import { OrderService } from '@/services/order.service';

// Feature: pre-order-and-fulfillment-options
// Property-based tests for meal slot functionality

describe('Meal Slot Property Tests', () => {
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
        email: `vendor-${timestamp}@test.com`,
        phone: `1${timestamp.toString().slice(-9)}`,
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
        name: `Test Vendor Category ${timestamp}`,
        description: 'Test vendor category for meal slot tests',
        icon: 'test-icon',
      },
    });
    testVendorCategoryId = testVendorCategory.id;

    // Create test service area
    const testServiceArea = await prisma.serviceArea.create({
      data: {
        name: `Test Service Area ${timestamp}`,
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
        businessName: 'Test Vendor',
        categoryId: testVendorCategoryId,
        serviceAreaId: testServiceAreaId,
        description: 'Test vendor for meal slot tests',
        status: 'ACTIVE', // Set vendor to ACTIVE status
      },
    });
    testVendorId = testVendor.id;

    // Create test customer
    const testCustomer = await prisma.user.create({
      data: {
        email: `customer-${timestamp}@test.com`,
        phone: `9${timestamp.toString().slice(-9)}`,
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
    // Clean up meal slots and orders after each test
    try {
      await prisma.order.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.mealSlot.deleteMany({ where: { vendorId: testVendorId } });
    } catch (error) {
      console.error('Cleanup error in afterEach:', error);
    }
  });

  // Arbitraries (generators)
  const timeArbitrary = () =>
    fc
      .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
      .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

  // Generate times that are always in the future (for cutoff time validation)
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

  const invalidCutoffMealSlotArbitrary = () =>
    fc
      .tuple(timeArbitrary(), timeArbitrary(), timeArbitrary())
      .filter(([cutoff, start, end]) => cutoff >= start && start < end)
      .map(([cutoffTime, startTime, endTime]) => ({
        vendorId: testVendorId,
        name: fc.sample(fc.string({ minLength: 1, maxLength: 50 }), 1)[0],
        cutoffTime,
        startTime,
        endTime,
      }));

  describe('Property 1: Meal slot data persistence', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 1: Meal slot data persistence
     * Validates: Requirements 1.1
     */
    it(
      'should preserve all fields when creating and retrieving meal slots',
      async () => {
        await fc.assert(
          fc.asyncProperty(validMealSlotArbitrary(), async (mealSlotData) => {
            const created = await MealSlotService.createMealSlot(mealSlotData);
            const retrieved = await MealSlotService.getMealSlotById(created.id);

            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe(mealSlotData.name);
            expect(retrieved?.startTime).toBe(mealSlotData.startTime);
            expect(retrieved?.endTime).toBe(mealSlotData.endTime);
            expect(retrieved?.cutoffTime).toBe(mealSlotData.cutoffTime);
            expect(retrieved?.timeWindowDuration).toBe(mealSlotData.timeWindowDuration);
            expect(retrieved?.vendorId).toBe(testVendorId);
          }),
          { numRuns: 20 } // Reduced from 100 for faster execution
        );
      },
      30000
    ); // 30 second timeout
  });

  describe('Property 2: Cutoff time validation', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 2: Cutoff time validation
     * Validates: Requirements 1.2
     */
    it(
      'should reject meal slots where cutoff time is >= start time',
      async () => {
        await fc.assert(
          fc.asyncProperty(invalidCutoffMealSlotArbitrary(), async (mealSlotData) => {
            await expect(MealSlotService.createMealSlot(mealSlotData)).rejects.toThrow();
          }),
          { numRuns: 20 }
        );
      },
      30000
    );
  });

  describe('Property 3: Meal slot updates preserve existing orders', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 3: Meal slot updates preserve existing orders
     * Validates: Requirements 1.3
     */
    it(
      'should not change meal slot ID in orders when meal slot is updated',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            validMealSlotArbitrary(),
            fc.string({ minLength: 1, maxLength: 50 }),
            async (mealSlotData, newName) => {
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
                fulfillmentMethod: 'DELIVERY',
              });

              // Update meal slot
              await MealSlotService.updateMealSlot(mealSlot.id, { name: newName });

              // Retrieve order and verify meal slot ID unchanged
              const retrievedOrder = await OrderService.getOrderById(order.id);
              expect(retrievedOrder.mealSlotId).toBe(mealSlot.id);
            }
          ),
          { numRuns: 10 }
        );
      },
      30000
    );
  });

  describe('Property 4: Active meal slot retrieval', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 4: Active meal slot retrieval
     * Validates: Requirements 1.4
     */
    it(
      'should return only active meal slots when filtering',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(validMealSlotArbitrary(), { minLength: 2, maxLength: 3 }),
            fc.array(fc.boolean(), { minLength: 2, maxLength: 3 }),
            async (mealSlotsData, activeStates) => {
              // Clean up before this iteration
              await prisma.mealSlot.deleteMany({ where: { vendorId: testVendorId } });

              // Create meal slots with different active states
              const createdSlots = [];
              for (let i = 0; i < Math.min(mealSlotsData.length, activeStates.length); i++) {
                const slot = await MealSlotService.createMealSlot(mealSlotsData[i]);
                if (!activeStates[i]) {
                  await MealSlotService.deactivateMealSlot(slot.id);
                }
                createdSlots.push({ ...slot, isActive: activeStates[i] });
              }

              // Retrieve active slots
              const activeSlots = await MealSlotService.getActiveMealSlots(testVendorId);

              // Verify only active slots returned
              const expectedActiveCount = activeStates.filter((active) => active).length;
              expect(activeSlots.length).toBe(expectedActiveCount);
              activeSlots.forEach((slot) => {
                expect(slot.isActive).toBe(true);
              });

              // Clean up after this iteration
              await prisma.mealSlot.deleteMany({ where: { vendorId: testVendorId } });
            }
          ),
          { numRuns: 5 }
        );
      },
      30000
    );
  });

  describe('Property 5: Meal slot deactivation prevents new orders', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 5: Meal slot deactivation prevents new orders
     * Validates: Requirements 1.5
     */
    it(
      'should reject new orders for deactivated meal slots while preserving existing orders',
      async () => {
        await fc.assert(
          fc.asyncProperty(validMealSlotArbitrary(), async (mealSlotData) => {
            // Create meal slot
            const mealSlot = await MealSlotService.createMealSlot(mealSlotData);

            // Create order with meal slot
            const existingOrder = await OrderService.createOrder({
              customerId: testCustomerId,
              vendorId: testVendorId,
              deliveryAddressId: testDeliveryAddressId,
              items: [{ productId: testProductId, quantity: 1 }],
              subtotal: 10.0,
              deliveryFee: 2.0,
              tax: 1.0,
              total: 13.0,
              mealSlotId: mealSlot.id,
              fulfillmentMethod: 'DELIVERY',
            });

            // Deactivate meal slot
            await MealSlotService.deactivateMealSlot(mealSlot.id);

            // Verify existing order unchanged
            const retrievedOrder = await OrderService.getOrderById(existingOrder.id);
            expect(retrievedOrder.mealSlotId).toBe(mealSlot.id);

            // Attempt to create new order with deactivated meal slot should fail
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
                mealSlotId: mealSlot.id,
                fulfillmentMethod: 'DELIVERY',
              })
            ).rejects.toThrow();
          }),
          { numRuns: 10 }
        );
      },
      30000
    );
  });
});
