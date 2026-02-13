# Design Document: Pre-order Scheduling and Fulfillment Options

## Overview

This design document outlines the implementation of a pre-order scheduling system and order fulfillment options for the multi-tenant marketplace platform. The system enables vendors and admins to configure time-based ordering windows (meal slots) with cutoff times, and allows customers to select their preferred fulfillment method (Eat-in, Pickup, or Delivery) when placing orders.

The implementation extends the existing order management system by adding:
1. Meal slot configuration at vendor and platform levels
2. Pre-order validation based on cutoff times
3. Fulfillment method configuration and selection
4. Enhanced order filtering and display capabilities

## Architecture

### High-Level Architecture

The system follows the existing layered architecture pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  (Customer/Vendor/Admin UI for meal slots & fulfillment)    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       API Layer                              │
│  (REST endpoints for meal slots, fulfillment config)        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                       │
│  (MealSlotService, FulfillmentService, OrderService)        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Data Access Layer                          │
│  (Prisma ORM with new models: MealSlot, FulfillmentConfig)  │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

**Order Creation with Meal Slot and Fulfillment Method:**

```
Customer → Checkout UI → Order API → OrderService
                                          ↓
                                    Validate Meal Slot
                                    (MealSlotService)
                                          ↓
                                    Validate Fulfillment
                                    (FulfillmentService)
                                          ↓
                                    Create Order
                                    (Prisma)
```

## Components and Interfaces

### 1. Database Schema Extensions

#### MealSlot Model
Stores meal slot configurations for vendors.

```prisma
model MealSlot {
  id                 String   @id @default(uuid())
  vendorId           String
  name               String   // e.g., "Lunch", "Dinner"
  startTime          String   // HH:MM format (e.g., "12:00")
  endTime            String   // HH:MM format (e.g., "14:00")
  cutoffTime         String   // HH:MM format (e.g., "11:00")
  timeWindowDuration Int      @default(60) // Duration in minutes (e.g., 30, 60)
  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  vendor Vendor @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  orders Order[]

  @@index([vendorId])
  @@index([isActive])
}
```

#### DefaultMealSlot Model
Stores platform-wide default meal slot templates.

```prisma
model DefaultMealSlot {
  id                 String   @id @default(uuid())
  name               String
  startTime          String
  endTime            String
  cutoffTime         String
  timeWindowDuration Int      @default(60) // Duration in minutes
  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

#### FulfillmentMethod Enum
```prisma
enum FulfillmentMethod {
  EAT_IN
  PICKUP
  DELIVERY
}
```

#### VendorFulfillmentConfig Model
Stores which fulfillment methods each vendor supports.

```prisma
model VendorFulfillmentConfig {
  id               String            @id @default(uuid())
  vendorId         String            @unique
  eatInEnabled     Boolean           @default(false)
  pickupEnabled    Boolean           @default(true)
  deliveryEnabled  Boolean           @default(true)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  vendor Vendor @relation(fields: [vendorId], references: [id], onDelete: Cascade)

  @@index([vendorId])
}
```

#### Order Model Extensions
Add new fields to the existing Order model:

```prisma
model Order {
  // ... existing fields ...
  mealSlotId              String?
  fulfillmentMethod       FulfillmentMethod @default(DELIVERY)
  preferredDeliveryStart  String?  // HH:MM format - start of delivery window
  preferredDeliveryEnd    String?  // HH:MM format - end of delivery window
  
  // ... existing relations ...
  mealSlot MealSlot? @relation(fields: [mealSlotId], references: [id])
  
  @@index([mealSlotId])
  @@index([fulfillmentMethod])
}
```

### 2. Service Layer

#### MealSlotService

```typescript
export interface CreateMealSlotInput {
  vendorId: string;
  name: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
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
  // Create meal slot for vendor
  static async createMealSlot(data: CreateMealSlotInput): Promise<MealSlot>
  
  // Get meal slots for vendor
  static async getMealSlotsByVendorId(vendorId: string): Promise<MealSlot[]>
  
  // Get active meal slots for vendor
  static async getActiveMealSlots(vendorId: string): Promise<MealSlot[]>
  
  // Get available meal slots (active + not past cutoff)
  static async getAvailableMealSlots(vendorId: string): Promise<MealSlot[]>
  
  // Get delivery time windows for a meal slot
  static async getDeliveryTimeWindows(mealSlotId: string): Promise<Array<{ start: string; end: string }>>
  
  // Update meal slot
  static async updateMealSlot(id: string, data: UpdateMealSlotInput): Promise<MealSlot>
  
  // Deactivate meal slot
  static async deactivateMealSlot(id: string): Promise<MealSlot>
  
  // Validate meal slot is available for ordering
  static async validateMealSlotAvailability(mealSlotId: string): Promise<boolean>
  
  // Validate delivery time window is within meal slot
  static validateDeliveryWindow(
    mealSlot: MealSlot,
    deliveryStart: string,
    deliveryEnd: string
  ): boolean
  
  // Validate time format and constraints
  static validateTimeFormat(time: string): boolean
  static validateCutoffBeforeStart(cutoffTime: string, startTime: string): boolean
}
```

#### DefaultMealSlotService

```typescript
export interface CreateDefaultMealSlotInput {
  name: string;
  startTime: string;
  endTime: string;
  cutoffTime: string;
  timeWindowDuration?: number; // Duration in minutes (default: 60)
}

export class DefaultMealSlotService {
  // Create default meal slot (admin only)
  static async createDefaultMealSlot(data: CreateDefaultMealSlotInput): Promise<DefaultMealSlot>
  
  // List all default meal slots
  static async listDefaultMealSlots(): Promise<DefaultMealSlot[]>
  
  // Update default meal slot
  static async updateDefaultMealSlot(id: string, data: Partial<CreateDefaultMealSlotInput>): Promise<DefaultMealSlot>
  
  // Apply default meal slots to vendor
  static async applyDefaultMealSlotsToVendor(vendorId: string): Promise<MealSlot[]>
  
  // Apply default meal slots to all new vendors (called during vendor creation)
  static async applyToNewVendor(vendorId: string): Promise<void>
}
```

#### FulfillmentService

```typescript
export interface UpdateFulfillmentConfigInput {
  eatInEnabled?: boolean;
  pickupEnabled?: boolean;
  deliveryEnabled?: boolean;
}

export class FulfillmentService {
  // Get or create fulfillment config for vendor
  static async getFulfillmentConfig(vendorId: string): Promise<VendorFulfillmentConfig>
  
  // Update fulfillment config
  static async updateFulfillmentConfig(
    vendorId: string, 
    data: UpdateFulfillmentConfigInput
  ): Promise<VendorFulfillmentConfig>
  
  // Get enabled fulfillment methods for vendor
  static async getEnabledMethods(vendorId: string): Promise<FulfillmentMethod[]>
  
  // Validate fulfillment method is enabled for vendor
  static async validateFulfillmentMethod(
    vendorId: string, 
    method: FulfillmentMethod
  ): Promise<boolean>
  
  // Check if delivery address is required for fulfillment method
  static requiresDeliveryAddress(method: FulfillmentMethod): boolean
}
```

#### OrderService Extensions

Extend the existing OrderService with new methods:

```typescript
export interface CreateOrderInput {
  // ... existing fields ...
  mealSlotId?: string;
  fulfillmentMethod: FulfillmentMethod;
  preferredDeliveryStart?: string; // HH:MM format
  preferredDeliveryEnd?: string;   // HH:MM format
}

export interface OrderFilters {
  // ... existing fields ...
  mealSlotId?: string;
  fulfillmentMethod?: FulfillmentMethod;
}

export class OrderService {
  // Modified: Add meal slot, fulfillment, and delivery window validation
  static async createOrder(data: CreateOrderInput): Promise<Order>
  
  // Modified: Add meal slot and fulfillment filters
  static async listOrders(
    userId: string,
    userRole: UserRole,
    filters: OrderFilters,
    page: number,
    limit: number
  ): Promise<{ orders: Order[]; pagination: Pagination }>
}
```

### 3. API Endpoints

#### Meal Slot Endpoints

```
POST   /api/vendors/[vendorId]/meal-slots          - Create meal slot
GET    /api/vendors/[vendorId]/meal-slots          - List vendor meal slots
GET    /api/vendors/[vendorId]/meal-slots/available - Get available meal slots
GET    /api/vendors/[vendorId]/meal-slots/[id]/windows - Get delivery time windows
PATCH  /api/vendors/[vendorId]/meal-slots/[id]    - Update meal slot
DELETE /api/vendors/[vendorId]/meal-slots/[id]    - Deactivate meal slot

POST   /api/admin/default-meal-slots               - Create default meal slot
GET    /api/admin/default-meal-slots               - List default meal slots
PATCH  /api/admin/default-meal-slots/[id]          - Update default meal slot
POST   /api/admin/vendors/[vendorId]/apply-defaults - Apply defaults to vendor
```

#### Fulfillment Configuration Endpoints

```
GET    /api/vendors/[vendorId]/fulfillment-config  - Get fulfillment config
PATCH  /api/vendors/[vendorId]/fulfillment-config  - Update fulfillment config
```

#### Order Endpoints (Modified)

```
POST   /api/orders                                  - Create order (with mealSlotId, fulfillmentMethod, delivery window)
GET    /api/orders                                  - List orders (with new filters)
```

### 4. Validation Schemas

#### Meal Slot Schemas

```typescript
export const timeFormatSchema = z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)');

export const createMealSlotSchema = z.object({
  name: z.string().min(1).max(100),
  startTime: timeFormatSchema,
  endTime: timeFormatSchema,
  cutoffTime: timeFormatSchema,
  timeWindowDuration: z.number().int().positive().optional().default(60),
}).refine(
  (data) => data.cutoffTime < data.startTime,
  { message: 'Cutoff time must be before start time', path: ['cutoffTime'] }
).refine(
  (data) => data.startTime < data.endTime,
  { message: 'Start time must be before end time', path: ['startTime'] }
);

export const updateMealSlotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startTime: timeFormatSchema.optional(),
  endTime: timeFormatSchema.optional(),
  cutoffTime: timeFormatSchema.optional(),
  timeWindowDuration: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});
```

#### Fulfillment Schemas

```typescript
export const updateFulfillmentConfigSchema = z.object({
  eatInEnabled: z.boolean().optional(),
  pickupEnabled: z.boolean().optional(),
  deliveryEnabled: z.boolean().optional(),
}).refine(
  (data) => {
    // At least one method must be enabled
    const values = Object.values(data);
    return values.length === 0 || values.some(v => v === true);
  },
  { message: 'At least one fulfillment method must be enabled' }
);
```

#### Order Schema Extensions

```typescript
export const createOrderSchema = z.object({
  // ... existing fields ...
  mealSlotId: z.string().uuid().optional(),
  fulfillmentMethod: z.nativeEnum(FulfillmentMethod),
  preferredDeliveryStart: timeFormatSchema.optional(),
  preferredDeliveryEnd: timeFormatSchema.optional(),
}).refine(
  (data) => {
    // Delivery requires address, others don't
    if (data.fulfillmentMethod === FulfillmentMethod.DELIVERY) {
      return !!data.deliveryAddressId;
    }
    return true;
  },
  { message: 'Delivery address required for delivery orders', path: ['deliveryAddressId'] }
).refine(
  (data) => {
    // If delivery window is specified, both start and end must be provided
    if (data.preferredDeliveryStart || data.preferredDeliveryEnd) {
      return !!data.preferredDeliveryStart && !!data.preferredDeliveryEnd;
    }
    return true;
  },
  { message: 'Both delivery start and end times must be provided', path: ['preferredDeliveryStart'] }
).refine(
  (data) => {
    // Delivery start must be before delivery end
    if (data.preferredDeliveryStart && data.preferredDeliveryEnd) {
      return data.preferredDeliveryStart < data.preferredDeliveryEnd;
    }
    return true;
  },
  { message: 'Delivery start time must be before end time', path: ['preferredDeliveryStart'] }
);
```

## Data Models

### Time Representation

All times are stored as strings in HH:MM format (24-hour) for simplicity and consistency:
- `startTime`: "12:00" (noon)
- `endTime`: "14:00" (2 PM)
- `cutoffTime`: "11:00" (11 AM)

Time comparisons are performed using string comparison since HH:MM format maintains lexicographic ordering.

### Meal Slot Lifecycle

1. **Creation**: Admin creates default meal slots or vendor creates custom slots
2. **Active**: Meal slot is available for selection (isActive = true)
3. **Available**: Meal slot is active AND current time < cutoff time
4. **Past Cutoff**: Meal slot is active but current time >= cutoff time (not available for new orders)
5. **Inactive**: Meal slot is deactivated (isActive = false)

### Fulfillment Method Priority

When displaying fulfillment options to customers:
1. Check vendor's fulfillment config
2. Display only enabled methods
3. Default to DELIVERY if enabled
4. Validate selection against enabled methods during order creation

## 
Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After reviewing all acceptance criteria, I've identified properties that can be combined or are redundant. Several criteria test similar concepts (data persistence, filtering, validation) and can be consolidated into comprehensive properties.

### Property 1: Meal slot data persistence
*For any* valid meal slot configuration (name, start time, end time, cutoff time), creating a meal slot and then retrieving it should return all the same field values.
**Validates: Requirements 1.1**

### Property 2: Cutoff time validation
*For any* meal slot configuration where cutoff time is greater than or equal to start time, the system should reject the configuration with a validation error.
**Validates: Requirements 1.2**

### Property 3: Meal slot updates preserve existing orders
*For any* order created with a meal slot, updating that meal slot's configuration should not change the meal slot ID stored in the order.
**Validates: Requirements 1.3**

### Property 4: Active meal slot retrieval
*For any* vendor with multiple meal slots (some active, some inactive), retrieving the vendor's active meal slots should return only those where isActive is true.
**Validates: Requirements 1.4**

### Property 5: Meal slot deactivation prevents new orders
*For any* meal slot, after deactivating it, attempting to create a new order with that meal slot should be rejected, while existing orders with that meal slot remain unchanged.
**Validates: Requirements 1.5**

### Property 6: Default meal slot persistence
*For any* valid default meal slot configuration, creating it should result in the configuration being retrievable from the platform settings.
**Validates: Requirements 2.1, 2.4**

### Property 7: Default meal slots applied to new vendors
*For any* set of active default meal slots, creating a new vendor should result in that vendor having meal slots with the same configurations (name, times) as the defaults.
**Validates: Requirements 2.2**

### Property 8: Default updates don't affect vendor configs
*For any* vendor with meal slots copied from defaults, updating the default meal slot configurations should not change the vendor's existing meal slot configurations.
**Validates: Requirements 2.3**

### Property 9: Active meal slots display
*For any* vendor with meal slots, retrieving meal slots for display should return all active meal slots with their complete time range information (name, start time, end time).
**Validates: Requirements 3.1**

### Property 10: Meal slot selection requires valid slot
*For any* order creation request, if a meal slot ID is provided, it must reference an existing, active meal slot, otherwise the order should be rejected.
**Validates: Requirements 3.5**

### Property 11: Order stores meal slot reference
*For any* order created with a meal slot ID, retrieving that order should return the same meal slot ID.
**Validates: Requirements 3.7, 9.3, 9.4**

### Property 12: Fulfillment config persistence
*For any* valid fulfillment configuration update (eatInEnabled, pickupEnabled, deliveryEnabled), applying it to a vendor and then retrieving the vendor's config should return the same enabled/disabled states.
**Validates: Requirements 4.1, 4.3**

### Property 13: Fulfillment method disabling prevents new orders
*For any* fulfillment method, after disabling it for a vendor, attempting to create a new order with that method should be rejected, while existing orders with that method remain unchanged.
**Validates: Requirements 4.4**

### Property 14: Enabled fulfillment methods filtering
*For any* vendor with specific fulfillment methods enabled, retrieving available fulfillment methods should return only those that are enabled.
**Validates: Requirements 5.1, 6.1, 6.2**

### Property 15: Fulfillment method validation
*For any* order creation request with a fulfillment method, if that method is not enabled for the vendor, the order should be rejected.
**Validates: Requirements 5.2, 6.3**

### Property 16: Delivery address requirement
*For any* order with fulfillment method set to DELIVERY, the order must include a valid delivery address ID, otherwise it should be rejected.
**Validates: Requirements 5.3**

### Property 17: Non-delivery orders don't require address
*For any* order with fulfillment method set to PICKUP or EAT_IN, the order should be accepted even without a delivery address ID.
**Validates: Requirements 5.4**

### Property 18: Order stores fulfillment method
*For any* order created with a fulfillment method, retrieving that order should return the same fulfillment method.
**Validates: Requirements 5.5**

### Property 19: Order filtering by meal slot
*For any* set of orders with various meal slots, filtering by a specific meal slot ID should return only orders with that meal slot ID.
**Validates: Requirements 7.1, 8.3**

### Property 20: Order filtering by fulfillment method
*For any* set of orders with various fulfillment methods, filtering by a specific fulfillment method should return only orders with that fulfillment method.
**Validates: Requirements 7.2, 8.4**

### Property 21: Order display includes meal slot and fulfillment
*For any* order with a meal slot and fulfillment method, displaying or exporting the order should include both the meal slot information and fulfillment method.
**Validates: Requirements 7.3, 7.4, 8.1, 8.2**

## Error Handling

### Validation Errors

1. **Invalid Time Format**
   - Error Code: `INVALID_TIME_FORMAT`
   - Message: "Time must be in HH:MM format (00:00 to 23:59)"
   - HTTP Status: 400

2. **Cutoff After Start Time**
   - Error Code: `INVALID_CUTOFF_TIME`
   - Message: "Cutoff time must be before start time"
   - HTTP Status: 400

3. **Start After End Time**
   - Error Code: `INVALID_TIME_RANGE`
   - Message: "Start time must be before end time"
   - HTTP Status: 400

4. **Past Cutoff Time**
   - Error Code: `MEAL_SLOT_UNAVAILABLE`
   - Message: "This meal slot is no longer available. Cutoff time was {cutoffTime}"
   - HTTP Status: 400

5. **Inactive Meal Slot**
   - Error Code: `MEAL_SLOT_INACTIVE`
   - Message: "This meal slot is not currently available"
   - HTTP Status: 400

6. **Invalid Fulfillment Method**
   - Error Code: `FULFILLMENT_METHOD_NOT_ENABLED`
   - Message: "{method} is not available for this vendor"
   - HTTP Status: 400

7. **Missing Delivery Address**
   - Error Code: `DELIVERY_ADDRESS_REQUIRED`
   - Message: "Delivery address is required for delivery orders"
   - HTTP Status: 400

8. **No Fulfillment Methods Enabled**
   - Error Code: `NO_FULFILLMENT_METHODS`
   - Message: "At least one fulfillment method must be enabled"
   - HTTP Status: 400

### Business Logic Errors

1. **Meal Slot Not Found**
   - Error Code: `MEAL_SLOT_NOT_FOUND`
   - Message: "Meal slot not found"
   - HTTP Status: 404

2. **Vendor Not Found**
   - Error Code: `VENDOR_NOT_FOUND`
   - Message: "Vendor not found"
   - HTTP Status: 404

3. **Unauthorized Access**
   - Error Code: `UNAUTHORIZED`
   - Message: "You do not have permission to perform this action"
   - HTTP Status: 403

### Error Response Format

All errors follow the standard format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional context
  }
}
```

## Testing Strategy

### Unit Testing

Unit tests will cover:

1. **Time Validation Functions**
   - Valid and invalid time format strings
   - Cutoff time before start time validation
   - Start time before end time validation

2. **Service Methods**
   - Meal slot CRUD operations
   - Fulfillment config CRUD operations
   - Order creation with meal slots and fulfillment methods
   - Filtering logic for orders

3. **API Route Handlers**
   - Request validation
   - Authorization checks
   - Error responses

### Property-Based Testing

Property-based tests will use the fast-check library to verify universal properties across many randomly generated inputs. Each property test will run a minimum of 100 iterations.

**Test Configuration:**
```typescript
import * as fc from 'fast-check';

// Run each property test with 100 iterations
const testConfig = { numRuns: 100 };
```

**Property Test Implementation:**

Each correctness property from the design document will be implemented as a single property-based test. Tests will be tagged with comments referencing the specific property:

```typescript
/**
 * Feature: pre-order-and-fulfillment-options, Property 1: Meal slot data persistence
 */
test('meal slot round trip preserves all fields', () => {
  fc.assert(
    fc.asyncProperty(
      mealSlotArbitrary(),
      async (mealSlot) => {
        const created = await MealSlotService.createMealSlot(mealSlot);
        const retrieved = await MealSlotService.getMealSlotById(created.id);
        
        expect(retrieved.name).toBe(mealSlot.name);
        expect(retrieved.startTime).toBe(mealSlot.startTime);
        expect(retrieved.endTime).toBe(mealSlot.endTime);
        expect(retrieved.cutoffTime).toBe(mealSlot.cutoffTime);
      }
    ),
    testConfig
  );
});
```

**Generators (Arbitraries):**

Custom generators will be created for domain objects:

```typescript
// Time string generator (HH:MM format)
const timeArbitrary = () => 
  fc.tuple(
    fc.integer({ min: 0, max: 23 }),
    fc.integer({ min: 0, max: 59 })
  ).map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

// Valid meal slot generator (cutoff < start < end)
const validMealSlotArbitrary = () =>
  fc.record({
    vendorId: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    cutoffTime: timeArbitrary(),
    startTime: timeArbitrary(),
    endTime: timeArbitrary(),
  }).filter(slot => 
    slot.cutoffTime < slot.startTime && slot.startTime < slot.endTime
  );

// Invalid meal slot generator (cutoff >= start)
const invalidCutoffMealSlotArbitrary = () =>
  fc.record({
    vendorId: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    cutoffTime: timeArbitrary(),
    startTime: timeArbitrary(),
    endTime: timeArbitrary(),
  }).filter(slot => slot.cutoffTime >= slot.startTime);

// Fulfillment method generator
const fulfillmentMethodArbitrary = () =>
  fc.constantFrom('EAT_IN', 'PICKUP', 'DELIVERY');

// Fulfillment config generator
const fulfillmentConfigArbitrary = () =>
  fc.record({
    eatInEnabled: fc.boolean(),
    pickupEnabled: fc.boolean(),
    deliveryEnabled: fc.boolean(),
  }).filter(config => 
    // At least one method must be enabled
    config.eatInEnabled || config.pickupEnabled || config.deliveryEnabled
  );
```

**Edge Cases:**

Property tests will naturally cover edge cases through random generation:
- Boundary times (00:00, 23:59)
- Same times for different fields
- All fulfillment methods enabled/disabled combinations
- Empty and maximum length strings

### Integration Testing

Integration tests will verify:

1. **End-to-End Order Flow**
   - Customer selects meal slot and fulfillment method
   - Order is created with correct associations
   - Order can be filtered and retrieved with meal slot and fulfillment data

2. **Vendor Configuration Flow**
   - Vendor creates meal slots
   - Vendor configures fulfillment methods
   - Customers see correct available options

3. **Admin Default Application**
   - Admin creates default meal slots
   - New vendor is created
   - Vendor automatically receives default meal slots

4. **Time-Based Availability**
   - Mock current time to test cutoff logic
   - Verify meal slots become unavailable after cutoff
   - Verify error messages include correct cutoff times

### Test Database Setup

Tests will use a separate test database with:
- Transaction rollback after each test
- Seeded test data for vendors, products, and users
- Isolated test execution to prevent interference

```typescript
beforeEach(async () => {
  await prisma.$transaction(async (tx) => {
    // Test runs within transaction
  });
});

afterEach(async () => {
  // Transaction automatically rolls back
});
```

## Security Considerations

### Authorization

1. **Meal Slot Management**
   - Only vendors can create/update their own meal slots
   - Only admins can create/update default meal slots
   - Customers can only view available meal slots

2. **Fulfillment Configuration**
   - Only vendors can update their own fulfillment config
   - Admins can view all fulfillment configs

3. **Order Creation**
   - Customers can only create orders for themselves
   - Meal slot and fulfillment method must be validated against vendor config

### Input Validation

1. **Time Format Validation**
   - Strict regex validation for HH:MM format
   - Range validation (00:00 to 23:59)

2. **SQL Injection Prevention**
   - All database queries use Prisma's parameterized queries
   - No raw SQL with user input

3. **XSS Prevention**
   - All user input sanitized before storage
   - Output encoding in UI components

### Rate Limiting

Apply existing rate limiting middleware to new endpoints:
- Meal slot creation: 10 requests per minute per vendor
- Fulfillment config updates: 10 requests per minute per vendor
- Order creation: 5 requests per minute per customer

## Performance Considerations

### Database Indexes

New indexes to support efficient queries:

```prisma
@@index([vendorId])           // Meal slot lookup by vendor
@@index([isActive])           // Active meal slot filtering
@@index([mealSlotId])         // Order lookup by meal slot
@@index([fulfillmentMethod])  // Order filtering by fulfillment
```

### Query Optimization

1. **Meal Slot Availability Check**
   - Single query with WHERE clause for active status
   - In-memory filtering for cutoff time comparison

2. **Order Filtering**
   - Composite indexes for common filter combinations
   - Pagination to limit result set size

3. **Vendor Details with Meal Slots**
   - Use Prisma's include to fetch related data in single query
   - Avoid N+1 queries

### Caching Strategy

Consider caching for:
1. **Default Meal Slots** - Rarely change, can be cached for 1 hour
2. **Vendor Fulfillment Config** - Cache for 5 minutes
3. **Available Meal Slots** - Short TTL (1 minute) due to time-based availability

## Migration Strategy

### Database Migration

1. **Create new tables**
   - MealSlot
   - DefaultMealSlot
   - VendorFulfillmentConfig

2. **Add new enum**
   - FulfillmentMethod

3. **Modify Order table**
   - Add mealSlotId (nullable, optional)
   - Add fulfillmentMethod (default: DELIVERY)

4. **Backfill existing orders**
   - Set fulfillmentMethod to DELIVERY for all existing orders
   - Leave mealSlotId as null

### Deployment Steps

1. **Phase 1: Database Migration**
   - Run migration to add new tables and columns
   - Backfill existing data
   - Verify data integrity

2. **Phase 2: API Deployment**
   - Deploy new API endpoints
   - Deploy updated order creation endpoint
   - Maintain backward compatibility (mealSlotId optional)

3. **Phase 3: UI Deployment**
   - Deploy vendor configuration UI
   - Deploy customer order UI with meal slot and fulfillment selection
   - Deploy admin default meal slot management UI

4. **Phase 4: Monitoring**
   - Monitor error rates for new endpoints
   - Track meal slot usage metrics
   - Monitor order creation success rates

### Rollback Plan

If issues arise:
1. Revert UI changes (meal slot and fulfillment selection become optional)
2. Keep API changes (backward compatible)
3. Database changes remain (no data loss)
4. Investigate and fix issues before re-deployment

## Monitoring and Metrics

### Key Metrics

1. **Meal Slot Usage**
   - Number of orders per meal slot
   - Most popular meal slots
   - Meal slots with zero orders

2. **Fulfillment Method Distribution**
   - Percentage of orders by fulfillment method
   - Vendor-specific fulfillment method preferences

3. **Cutoff Time Violations**
   - Number of rejected orders due to past cutoff
   - Time distribution of order attempts

4. **Configuration Changes**
   - Frequency of meal slot updates
   - Frequency of fulfillment config changes

### Alerts

1. **High Error Rate**
   - Alert if meal slot validation errors exceed 10% of requests
   - Alert if fulfillment method validation errors exceed 5% of requests

2. **No Available Meal Slots**
   - Alert if vendors have no available meal slots during business hours

3. **Configuration Issues**
   - Alert if vendor has no fulfillment methods enabled

## Future Enhancements

1. **Dynamic Pricing by Meal Slot**
   - Different prices for different meal slots
   - Peak hour pricing

2. **Capacity Management**
   - Limit number of orders per meal slot
   - Automatic slot closure when capacity reached

3. **Recurring Meal Slots**
   - Weekly recurring meal slot templates
   - Holiday-specific meal slots

4. **Customer Preferences**
   - Save preferred meal slot and fulfillment method
   - Auto-select based on order history

5. **Vendor Analytics**
   - Meal slot performance reports
   - Fulfillment method profitability analysis
