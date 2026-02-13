# Implementation Tasks

## Phase 1: Database Schema and Models

### Task 1: Create database schema for meal slots and fulfillment options

- [x] 1.1 Add FulfillmentMethod enum to Prisma schema
  - Add EAT_IN, PICKUP, DELIVERY values
  
- [x] 1.2 Create MealSlot model in Prisma schema
  - Add fields: id, vendorId, name, startTime, endTime, cutoffTime, timeWindowDuration, isActive, createdAt, updatedAt
  - Add relation to Vendor
  - Add indexes for vendorId and isActive
  
- [x] 1.3 Create DefaultMealSlot model in Prisma schema
  - Add fields: id, name, startTime, endTime, cutoffTime, timeWindowDuration, isActive, createdAt, updatedAt
  
- [x] 1.4 Create VendorFulfillmentConfig model in Prisma schema
  - Add fields: id, vendorId, eatInEnabled, pickupEnabled, deliveryEnabled, createdAt, updatedAt
  - Add unique constraint on vendorId
  - Add relation to Vendor
  
- [x] 1.5 Extend Order model with new fields
  - Add mealSlotId (nullable)
  - Add fulfillmentMethod (default: DELIVERY)
  - Add preferredDeliveryStart (nullable)
  - Add preferredDeliveryEnd (nullable)
  - Add relation to MealSlot
  - Add indexes for mealSlotId and fulfillmentMethod
  
- [x] 1.6 Create and run database migration
  - Generate migration with `npm run db:migrate`
  - Verify migration in development database
  - Backfill existing orders with fulfillmentMethod = DELIVERY

## Phase 2: Validation Schemas

### Task 2: Create Zod validation schemas

- [x] 2.1 Create meal-slot.schema.ts
  - Implement timeFormatSchema for HH:MM validation
  - Implement createMealSlotSchema with time validation refinements
  - Implement updateMealSlotSchema
  - Export TypeScript types
  
- [x] 2.2 Create fulfillment.schema.ts
  - Implement updateFulfillmentConfigSchema
  - Add refinement to ensure at least one method is enabled
  - Export TypeScript types
  
- [x] 2.3 Update order.schema.ts
  - Add mealSlotId field (optional UUID)
  - Add fulfillmentMethod field (enum)
  - Add preferredDeliveryStart and preferredDeliveryEnd fields (optional time format)
  - Add refinement for delivery address requirement
  - Add refinement for delivery window validation
  - Update CreateOrderInput type

## Phase 3: Service Layer - Meal Slots

### Task 3: Implement MealSlotService

- [x] 3.1 Create src/services/meal-slot.service.ts
  - Define CreateMealSlotInput and UpdateMealSlotInput interfaces
  - Implement validateTimeFormat() method
  - Implement validateCutoffBeforeStart() method
  
- [x] 3.2 Implement meal slot CRUD operations
  - Implement createMealSlot() - validate times, create in database
  - Implement getMealSlotById() - fetch with vendor relation
  - Implement getMealSlotsByVendorId() - fetch all for vendor
  - Implement updateMealSlot() - validate and update
  - Implement deactivateMealSlot() - set isActive to false
  
- [x] 3.3 Implement meal slot availability logic
  - Implement getActiveMealSlots() - filter by isActive
  - Implement getAvailableMealSlots() - filter by isActive and cutoff time
  - Implement validateMealSlotAvailability() - check active and cutoff
  
- [x] 3.4 Implement delivery time window generation
  - Implement getDeliveryTimeWindows() - generate windows based on timeWindowDuration
  - Implement validateDeliveryWindow() - check window is within meal slot range

### Task 4: Implement DefaultMealSlotService

- [x] 4.1 Create src/services/default-meal-slot.service.ts
  - Define CreateDefaultMealSlotInput interface
  - Implement createDefaultMealSlot() - create platform-wide template
  - Implement listDefaultMealSlots() - fetch all active defaults
  - Implement updateDefaultMealSlot() - update template
  
- [x] 4.2 Implement default application logic
  - Implement applyDefaultMealSlotsToVendor() - copy defaults to vendor
  - Implement applyToNewVendor() - called during vendor creation
  - Update VendorService.createVendor() to call applyToNewVendor()

## Phase 4: Service Layer - Fulfillment Options

### Task 5: Implement FulfillmentService

- [x] 5.1 Create src/services/fulfillment.service.ts
  - Define UpdateFulfillmentConfigInput interface
  - Implement getFulfillmentConfig() - get or create config for vendor
  - Implement updateFulfillmentConfig() - update enabled methods
  
- [x] 5.2 Implement fulfillment validation logic
  - Implement getEnabledMethods() - return array of enabled methods
  - Implement validateFulfillmentMethod() - check if method is enabled
  - Implement requiresDeliveryAddress() - static method for address requirement

## Phase 6: Service Layer - Order Extensions

### Task 6: Extend OrderService for meal slots and fulfillment

- [x] 6.1 Update OrderService.createOrder()
  - Add mealSlotId, fulfillmentMethod, preferredDeliveryStart, preferredDeliveryEnd to CreateOrderInput
  - Validate meal slot availability if mealSlotId provided
  - Validate fulfillment method is enabled for vendor
  - Validate delivery address if fulfillment method is DELIVERY
  - Validate delivery window is within meal slot if provided
  - Store new fields in order creation
  
- [x] 6.2 Update OrderService.getOrderById()
  - Include mealSlot relation in query
  - Return meal slot details with order
  
- [x] 6.3 Update OrderService.listOrders()
  - Add mealSlotId and fulfillmentMethod to OrderFilters
  - Apply filters in where clause
  - Include meal slot in response

## Phase 7: API Routes - Meal Slots

### Task 7: Implement vendor meal slot API routes

- [x] 7.1 Create POST /api/vendors/[vendorId]/meal-slots/route.ts
  - Implement POST handler for creating meal slots
  - Validate with createMealSlotSchema
  - Check vendor ownership with auth middleware
  - Call MealSlotService.createMealSlot()
  - Return created meal slot
  
- [x] 7.2 Create GET /api/vendors/[vendorId]/meal-slots/route.ts
  - Implement GET handler for listing meal slots
  - Support ?available=true query param for available slots only
  - Call appropriate service method
  - Return meal slots array
  
- [x] 7.3 Create PATCH /api/vendors/[vendorId]/meal-slots/[id]/route.ts
  - Implement PATCH handler for updating meal slot
  - Validate with updateMealSlotSchema
  - Check vendor ownership
  - Call MealSlotService.updateMealSlot()
  - Return updated meal slot
  
- [x] 7.4 Create DELETE /api/vendors/[vendorId]/meal-slots/[id]/route.ts
  - Implement DELETE handler for deactivating meal slot
  - Check vendor ownership
  - Call MealSlotService.deactivateMealSlot()
  - Return success response
  
- [x] 7.5 Create GET /api/vendors/[vendorId]/meal-slots/[id]/windows/route.ts
  - Implement GET handler for delivery time windows
  - Call MealSlotService.getDeliveryTimeWindows()
  - Return array of time windows

### Task 8: Implement admin default meal slot API routes

- [x] 8.1 Create POST /api/admin/default-meal-slots/route.ts
  - Implement POST handler for creating default meal slots
  - Validate with createMealSlotSchema
  - Check SUPER_ADMIN role
  - Call DefaultMealSlotService.createDefaultMealSlot()
  - Return created default
  
- [x] 8.2 Create GET /api/admin/default-meal-slots/route.ts
  - Implement GET handler for listing defaults
  - Check SUPER_ADMIN role
  - Call DefaultMealSlotService.listDefaultMealSlots()
  - Return defaults array
  
- [x] 8.3 Create PATCH /api/admin/default-meal-slots/[id]/route.ts
  - Implement PATCH handler for updating default
  - Validate with updateMealSlotSchema
  - Check SUPER_ADMIN role
  - Call DefaultMealSlotService.updateDefaultMealSlot()
  - Return updated default
  
- [x] 8.4 Create POST /api/admin/vendors/[vendorId]/apply-defaults/route.ts
  - Implement POST handler for applying defaults to vendor
  - Check SUPER_ADMIN role
  - Call DefaultMealSlotService.applyDefaultMealSlotsToVendor()
  - Return created meal slots

## Phase 8: API Routes - Fulfillment Configuration

### Task 9: Implement fulfillment configuration API routes

- [x] 9.1 Create GET /api/vendors/[vendorId]/fulfillment-config/route.ts
  - Implement GET handler for fetching config
  - Check vendor ownership or public access
  - Call FulfillmentService.getFulfillmentConfig()
  - Return config
  
- [x] 9.2 Create PATCH /api/vendors/[vendorId]/fulfillment-config/route.ts
  - Implement PATCH handler for updating config
  - Validate with updateFulfillmentConfigSchema
  - Check vendor ownership
  - Call FulfillmentService.updateFulfillmentConfig()
  - Return updated config

## Phase 9: API Routes - Order Extensions

### Task 10: Update order API routes

- [x] 10.1 Update POST /api/orders/route.ts
  - Update request validation to include new fields
  - Pass mealSlotId, fulfillmentMethod, delivery window to OrderService
  - Handle validation errors with appropriate error codes
  - Return order with meal slot and fulfillment details
  
- [x] 10.2 Update GET /api/orders/route.ts
  - Add mealSlotId and fulfillmentMethod query params
  - Pass filters to OrderService.listOrders()
  - Include meal slot in response

## Phase 10: Property-Based Tests

### Task 11: Write property-based tests for meal slots

- [x] 11.1 Create __tests__/meal-slot-properties.test.ts
  - Set up test database and cleanup
  - Create test vendors and users
  
- [x] 11.2 Write Property 1: Meal slot data persistence
  - Generate valid meal slot configurations
  - Create meal slot and retrieve it
  - Assert all fields match
  
- [x] 11.3 Write Property 2: Cutoff time validation
  - Generate invalid meal slots (cutoff >= start)
  - Assert creation is rejected
  
- [x] 11.4 Write Property 3: Meal slot updates preserve existing orders
  - Create order with meal slot
  - Update meal slot configuration
  - Assert order's mealSlotId unchanged
  
- [x] 11.5 Write Property 4: Active meal slot retrieval
  - Create multiple meal slots (some active, some inactive)
  - Retrieve active slots
  - Assert only active slots returned
  
- [x] 11.6 Write Property 5: Meal slot deactivation prevents new orders
  - Create meal slot and order
  - Deactivate meal slot
  - Assert new orders rejected
  - Assert existing order unchanged

### Task 12: Write property-based tests for default meal slots

- [x] 12.1 Create __tests__/default-meal-slot-properties.test.ts
  - Set up test database and cleanup
  
- [x] 12.2 Write Property 6: Default meal slot persistence
  - Generate valid default configurations
  - Create and retrieve defaults
  - Assert all fields match
  
- [x] 12.3 Write Property 7: Default meal slots applied to new vendors
  - Create default meal slots
  - Create new vendor
  - Assert vendor has meal slots matching defaults
  
- [x] 12.4 Write Property 8: Default updates don't affect vendor configs
  - Create defaults and apply to vendor
  - Update defaults
  - Assert vendor's meal slots unchanged

### Task 13: Write property-based tests for fulfillment options

- [x] 13.1 Create __tests__/fulfillment-properties.test.ts
  - Set up test database and cleanup
  - Create test vendors
  
- [x] 13.2 Write Property 12: Fulfillment config persistence
  - Generate valid fulfillment configurations
  - Update vendor config and retrieve
  - Assert enabled states match
  
- [x] 13.3 Write Property 13: Fulfillment method disabling prevents new orders
  - Create order with fulfillment method
  - Disable that method
  - Assert new orders rejected
  - Assert existing order unchanged
  
- [x] 13.4 Write Property 14: Enabled fulfillment methods filtering
  - Configure vendor with specific methods enabled
  - Retrieve enabled methods
  - Assert only enabled methods returned
  
- [x] 13.5 Write Property 15: Fulfillment method validation
  - Generate orders with various fulfillment methods
  - Assert orders with disabled methods rejected
  
- [x] 13.6 Write Property 16: Delivery address requirement
  - Generate DELIVERY orders without address
  - Assert orders rejected
  
- [x] 13.7 Write Property 17: Non-delivery orders don't require address
  - Generate PICKUP/EAT_IN orders without address
  - Assert orders accepted
  
- [x] 13.8 Write Property 18: Order stores fulfillment method
  - Create orders with various fulfillment methods
  - Retrieve orders
  - Assert fulfillment methods match

### Task 14: Write property-based tests for order integration

- [x] 14.1 Create __tests__/order-meal-slot-properties.test.ts
  - Set up test database and cleanup
  - Create test data (vendors, products, customers)
  
- [x] 14.2 Write Property 9: Active meal slots display
  - Create vendor with meal slots
  - Retrieve for display
  - Assert all active slots with time ranges returned
  
- [x] 14.3 Write Property 10: Meal slot selection requires valid slot
  - Generate orders with invalid meal slot IDs
  - Assert orders rejected
  
- [x] 14.4 Write Property 11: Order stores meal slot reference
  - Create orders with meal slots
  - Retrieve orders
  - Assert meal slot IDs match
  
- [x] 14.5 Write Property 19: Order filtering by meal slot
  - Create orders with various meal slots
  - Filter by specific meal slot
  - Assert only matching orders returned
  
- [x] 14.6 Write Property 20: Order filtering by fulfillment method
  - Create orders with various fulfillment methods
  - Filter by specific method
  - Assert only matching orders returned
  
- [x] 14.7 Write Property 21: Order display includes meal slot and fulfillment
  - Create orders with meal slots and fulfillment methods
  - Retrieve order details
  - Assert both fields included

### Task 15: Write property-based test generators (arbitraries)

- [x] 15.1 Create __tests__/arbitraries/meal-slot.arbitrary.ts
  - Implement timeArbitrary() for HH:MM format
  - Implement validMealSlotArbitrary() with cutoff < start < end
  - Implement invalidCutoffMealSlotArbitrary() with cutoff >= start
  - Implement deliveryWindowArbitrary() for time windows
  
- [x] 15.2 Create __tests__/arbitraries/fulfillment.arbitrary.ts
  - Implement fulfillmentMethodArbitrary()
  - Implement fulfillmentConfigArbitrary() with at least one enabled
  - Implement invalidFulfillmentConfigArbitrary() with all disabled

## Phase 11: Unit Tests

### Task 16: Write unit tests for services

- [x] 16.1 Create __tests__/meal-slot.service.test.ts
  - Test time format validation
  - Test cutoff time validation
  - Test CRUD operations
  - Test availability logic
  - Test delivery window generation
  
- [x] 16.2 Create __tests__/fulfillment.service.test.ts
  - Test config CRUD operations
  - Test enabled methods retrieval
  - Test fulfillment method validation
  - Test address requirement logic
  
- [x] 16.3 Update __tests__/order.service.test.ts
  - Test order creation with meal slots
  - Test order creation with fulfillment methods
  - Test delivery window validation
  - Test order filtering

### Task 17: Write unit tests for API routes

- [x] 17.1 Create __tests__/meal-slot-api.test.ts
  - Test POST /api/vendors/[vendorId]/meal-slots
  - Test GET /api/vendors/[vendorId]/meal-slots
  - Test PATCH /api/vendors/[vendorId]/meal-slots/[id]
  - Test DELETE /api/vendors/[vendorId]/meal-slots/[id]
  - Test authorization checks
  
- [x] 17.2 Create __tests__/fulfillment-api.test.ts
  - Test GET /api/vendors/[vendorId]/fulfillment-config
  - Test PATCH /api/vendors/[vendorId]/fulfillment-config
  - Test authorization checks
  
- [x] 17.3 Update __tests__/order-api.test.ts
  - Test order creation with new fields
  - Test order filtering with new params
  - Test validation errors

## Phase 12: Frontend - Vendor Configuration UI

### Task 18: Implement vendor meal slot management UI

- [x] 18.1 Create src/app/vendor/meal-slots/page.tsx
  - Display list of vendor's meal slots
  - Show active/inactive status
  - Add "Create Meal Slot" button
  - Add edit and deactivate actions
  
- [x] 18.2 Create src/app/vendor/meal-slots/components/MealSlotForm.tsx
  - Form fields: name, startTime, endTime, cutoffTime, timeWindowDuration
  - Time input components
  - Validation with Zod schema
  - Submit to API
  
- [x] 18.3 Create src/app/vendor/meal-slots/components/MealSlotList.tsx
  - Display meal slots in table/card format
  - Show time ranges and cutoff times
  - Edit and deactivate buttons
  - Confirm deactivation dialog

### Task 19: Implement vendor fulfillment configuration UI

- [x] 19.1 Create src/app/vendor/settings/fulfillment/page.tsx
  - Display current fulfillment config
  - Toggle switches for EAT_IN, PICKUP, DELIVERY
  - Save button
  - Fetch and update via API
  
- [x] 19.2 Create src/app/vendor/settings/fulfillment/components/FulfillmentToggle.tsx
  - Reusable toggle component
  - Label and description
  - Disabled state handling

## Phase 13: Frontend - Admin Configuration UI

### Task 20: Implement admin default meal slot management UI

- [x] 20.1 Create src/app/admin/default-meal-slots/page.tsx
  - Display list of default meal slots
  - Add "Create Default" button
  - Edit and delete actions
  
- [x] 20.2 Create src/app/admin/default-meal-slots/components/DefaultMealSlotForm.tsx
  - Form fields matching meal slot form
  - Submit to admin API
  
- [x] 20.3 Update src/app/admin/vendors/[id]/page.tsx
  - Add "Apply Default Meal Slots" button
  - Call apply defaults API
  - Show success message

## Phase 14: Frontend - Customer Order UI

### Task 21: Implement customer meal slot selection UI

- [x] 21.1 Update src/app/(customer)/checkout/page.tsx
  - Fetch available meal slots for vendor
  - Display meal slot selection dropdown/cards
  - Show time ranges and cutoff information
  - Require selection before proceeding
  
- [x] 21.2 Create src/app/(customer)/checkout/components/MealSlotSelector.tsx
  - Display available meal slots
  - Show "Not available" for past cutoff slots
  - Highlight selected slot
  - Show next available time if none available
  
- [x] 21.3 Create src/app/(customer)/checkout/components/DeliveryWindowSelector.tsx
  - Fetch delivery windows for selected meal slot
  - Display time window options
  - Allow customer to select preferred window
  - Update order data

### Task 22: Implement customer fulfillment method selection UI

- [x] 22.1 Update src/app/(customer)/checkout/page.tsx
  - Fetch vendor's enabled fulfillment methods
  - Display fulfillment method selection
  - Conditionally show/hide delivery address based on selection
  - Validate before order submission
  
- [x] 22.2 Create src/app/(customer)/checkout/components/FulfillmentMethodSelector.tsx
  - Display enabled methods as radio buttons or cards
  - Icons for each method (EAT_IN, PICKUP, DELIVERY)
  - Descriptions for each method
  - Update order data on selection

### Task 23: Update customer order display UI

- [x] 23.1 Update src/app/(customer)/orders/[id]/page.tsx
  - Display meal slot information (name, time range)
  - Display delivery window if selected
  - Display fulfillment method
  - Show appropriate icon/badge
  
- [x] 23.2 Update src/app/(customer)/orders/page.tsx
  - Show meal slot and fulfillment method in order list
  - Add filter options for fulfillment method
  - Display delivery window in order cards

## Phase 15: Frontend - Vendor Order Management UI

### Task 24: Update vendor order management UI

- [x] 24.1 Update src/app/vendor/orders/page.tsx
  - Add meal slot filter dropdown
  - Add fulfillment method filter
  - Display meal slot and fulfillment in order list
  - Group orders by meal slot option
  
- [x] 24.2 Update src/app/vendor/orders/[id]/page.tsx
  - Display meal slot details
  - Display delivery window
  - Display fulfillment method
  - Show appropriate preparation instructions based on fulfillment

## Phase 16: Frontend - Admin Order Management UI

### Task 25: Update admin order management UI

- [x] 25.1 Update src/app/admin/orders/components/OrderFilters.tsx
  - Add meal slot filter
  - Add fulfillment method filter
  
- [x] 25.2 Update src/app/admin/orders/components/OrdersTable.tsx
  - Add meal slot column
  - Add fulfillment method column
  - Add delivery window column
  
- [x] 25.3 Update src/app/admin/orders/components/OrderDetailModal.tsx
  - Display meal slot information
  - Display delivery window
  - Display fulfillment method

## Phase 17: Integration Testing

### Task 26: End-to-end integration tests

- [ ] 26.1 Test complete vendor configuration flow
  - Vendor creates meal slots
  - Vendor configures fulfillment methods
  - Verify configurations saved
  
- [ ] 26.2 Test complete customer order flow
  - Customer views vendor with meal slots
  - Customer selects meal slot and delivery window
  - Customer selects fulfillment method
  - Customer places order
  - Verify order created with all fields
  
- [ ] 26.3 Test admin default application flow
  - Admin creates default meal slots
  - Admin creates new vendor
  - Verify vendor has default meal slots
  
- [ ] 26.4 Test order filtering and display
  - Create orders with various meal slots and fulfillment methods
  - Test filtering in vendor, customer, and admin views
  - Verify correct orders displayed

## Phase 18: Documentation and Deployment

### Task 27: Documentation

- [ ] 27.1 Update API documentation
  - Document new endpoints
  - Document request/response schemas
  - Add example requests
  
- [ ] 27.2 Create user guides
  - Vendor guide for meal slot configuration
  - Vendor guide for fulfillment method setup
  - Customer guide for meal slot selection
  - Admin guide for default meal slots
  
- [ ] 27.3 Update README.md
  - Add feature description
  - Add setup instructions
  - Add configuration examples

### Task 28: Deployment preparation

- [ ] 28.1 Run all tests
  - Unit tests
  - Property-based tests
  - Integration tests
  
- [ ] 28.2 Performance testing
  - Test meal slot availability queries
  - Test order filtering with new indexes
  - Verify query performance
  
- [ ] 28.3 Create deployment checklist
  - Database migration steps
  - Environment variable updates
  - Rollback plan
  
- [ ] 28.4 Deploy to staging
  - Run migration
  - Verify functionality
  - Test with sample data
  
- [ ] 28.5 Deploy to production
  - Run migration
  - Monitor error rates
  - Monitor performance metrics
