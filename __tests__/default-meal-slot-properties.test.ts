import * as fc from 'fast-check';
import { prisma } from '@/lib/prisma';
import { DefaultMealSlotService } from '@/services/default-meal-slot.service';
import { MealSlotService } from '@/services/meal-slot.service';

// Feature: pre-order-and-fulfillment-options
// Property-based tests for default meal slot functionality

describe('Default Meal Slot Property Tests', () => {
  let testVendorId: string;
  let testUserId: string;
  let testVendorCategoryId: string;
  let testServiceAreaId: string;

  beforeAll(async () => {
    const timestamp = Date.now();

    // Create test user for vendor
    const testUser = await prisma.user.create({
      data: {
        email: `vendor-default-${timestamp}@test.com`,
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
        name: `Test Vendor Category Default ${timestamp}`,
        description: 'Test vendor category for default meal slot tests',
        icon: 'test-icon',
      },
    });
    testVendorCategoryId = testVendorCategory.id;

    // Create test service area
    const testServiceArea = await prisma.serviceArea.create({
      data: {
        name: `Test Service Area Default ${timestamp}`,
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
        businessName: 'Test Vendor Default',
        categoryId: testVendorCategoryId,
        serviceAreaId: testServiceAreaId,
        description: 'Test vendor for default meal slot tests',
        status: 'ACTIVE',
      },
    });
    testVendorId = testVendor.id;
  });

  afterAll(async () => {
    // Clean up test data in correct order
    try {
      if (testVendorId) {
        await prisma.mealSlot.deleteMany({ where: { vendorId: testVendorId } });
        await prisma.vendor.deleteMany({ where: { id: testVendorId } });
      }
      if (testVendorCategoryId) {
        await prisma.vendorCategory.deleteMany({ where: { id: testVendorCategoryId } });
      }
      if (testServiceAreaId) {
        await prisma.serviceArea.deleteMany({ where: { id: testServiceAreaId } });
      }
      if (testUserId) {
        await prisma.user.deleteMany({ where: { id: testUserId } });
      }
      // Clean up all default meal slots created during tests
      await prisma.defaultMealSlot.deleteMany({});
    } catch (error) {
      console.error('Cleanup error:', error);
    } finally {
      await prisma.$disconnect();
    }
  });

  afterEach(async () => {
    // Clean up default meal slots and vendor meal slots after each test
    try {
      await prisma.mealSlot.deleteMany({ where: { vendorId: testVendorId } });
      await prisma.defaultMealSlot.deleteMany({});
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

  const validDefaultMealSlotArbitrary = () =>
    fc
      .tuple(futureTimeArbitrary(), futureTimeArbitrary(), futureTimeArbitrary())
      .filter(([cutoff, start, end]) => cutoff < start && start < end)
      .map(([cutoffTime, startTime, endTime]) => ({
        name: fc.sample(fc.string({ minLength: 1, maxLength: 50 }), 1)[0],
        cutoffTime,
        startTime,
        endTime,
        timeWindowDuration: fc.sample(fc.integer({ min: 15, max: 120 }), 1)[0],
      }));

  describe('Property 6: Default meal slot persistence', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 6: Default meal slot persistence
     * Validates: Requirements 2.1, 2.4
     */
    it(
      'should preserve all fields when creating and retrieving default meal slots',
      async () => {
        await fc.assert(
          fc.asyncProperty(validDefaultMealSlotArbitrary(), async (defaultData) => {
            const created = await DefaultMealSlotService.createDefaultMealSlot(defaultData);
            const allDefaults = await DefaultMealSlotService.listDefaultMealSlots();
            const retrieved = allDefaults.find((d) => d.id === created.id);

            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe(defaultData.name);
            expect(retrieved?.startTime).toBe(defaultData.startTime);
            expect(retrieved?.endTime).toBe(defaultData.endTime);
            expect(retrieved?.cutoffTime).toBe(defaultData.cutoffTime);
            expect(retrieved?.timeWindowDuration).toBe(defaultData.timeWindowDuration);
            expect(retrieved?.isActive).toBe(true);
          }),
          { numRuns: 20 }
        );
      },
      30000
    );
  });

  describe('Property 7: Default meal slots applied to new vendors', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 7: Default meal slots applied to new vendors
     * Validates: Requirements 2.2
     */
    it(
      'should create vendor meal slots matching default configurations',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(validDefaultMealSlotArbitrary(), { minLength: 1, maxLength: 3 }),
            async (defaultsData) => {
              // Clean up before this iteration
              await prisma.mealSlot.deleteMany({ where: { vendorId: testVendorId } });
              await prisma.defaultMealSlot.deleteMany({});

              // Create default meal slots
              const createdDefaults = [];
              for (const defaultData of defaultsData) {
                const created = await DefaultMealSlotService.createDefaultMealSlot(defaultData);
                createdDefaults.push(created);
              }

              // Apply defaults to vendor
              const vendorMealSlots =
                await DefaultMealSlotService.applyDefaultMealSlotsToVendor(testVendorId);

              // Verify vendor has meal slots matching defaults
              expect(vendorMealSlots.length).toBe(createdDefaults.length);

              for (let i = 0; i < createdDefaults.length; i++) {
                const defaultSlot = createdDefaults[i];
                const vendorSlot = vendorMealSlots.find((s) => s.name === defaultSlot.name);

                expect(vendorSlot).toBeDefined();
                expect(vendorSlot?.startTime).toBe(defaultSlot.startTime);
                expect(vendorSlot?.endTime).toBe(defaultSlot.endTime);
                expect(vendorSlot?.cutoffTime).toBe(defaultSlot.cutoffTime);
                expect(vendorSlot?.timeWindowDuration).toBe(defaultSlot.timeWindowDuration);
                expect(vendorSlot?.vendorId).toBe(testVendorId);
                expect(vendorSlot?.isActive).toBe(true);
              }

              // Clean up after this iteration
              await prisma.mealSlot.deleteMany({ where: { vendorId: testVendorId } });
              await prisma.defaultMealSlot.deleteMany({});
            }
          ),
          { numRuns: 10 }
        );
      },
      30000
    );
  });

  describe('Property 8: Default updates don\'t affect vendor configs', () => {
    /**
     * Feature: pre-order-and-fulfillment-options, Property 8: Default updates don't affect vendor configs
     * Validates: Requirements 2.3
     */
    it(
      'should not change vendor meal slots when default meal slots are updated',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            validDefaultMealSlotArbitrary(),
            fc.string({ minLength: 1, maxLength: 50 }),
            async (defaultData, newName) => {
              // Create default meal slot
              const defaultSlot = await DefaultMealSlotService.createDefaultMealSlot(defaultData);

              // Apply to vendor
              const vendorMealSlots =
                await DefaultMealSlotService.applyDefaultMealSlotsToVendor(testVendorId);
              const vendorSlot = vendorMealSlots[0];

              // Store original vendor slot values
              const originalName = vendorSlot.name;
              const originalStartTime = vendorSlot.startTime;
              const originalEndTime = vendorSlot.endTime;
              const originalCutoffTime = vendorSlot.cutoffTime;

              // Update default meal slot
              await DefaultMealSlotService.updateDefaultMealSlot(defaultSlot.id, {
                name: newName,
              });

              // Retrieve vendor's meal slot
              const retrievedVendorSlot = await MealSlotService.getMealSlotById(vendorSlot.id);

              // Verify vendor's meal slot unchanged
              expect(retrievedVendorSlot?.name).toBe(originalName);
              expect(retrievedVendorSlot?.startTime).toBe(originalStartTime);
              expect(retrievedVendorSlot?.endTime).toBe(originalEndTime);
              expect(retrievedVendorSlot?.cutoffTime).toBe(originalCutoffTime);
            }
          ),
          { numRuns: 10 }
        );
      },
      30000
    );
  });
});
