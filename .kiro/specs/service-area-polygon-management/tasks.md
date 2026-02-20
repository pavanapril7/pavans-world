# Implementation Plan: Polygon-Based Service Area Management

## Overview

This implementation plan breaks down the polygon-based service area management feature into discrete, incremental coding tasks. Each task builds on previous work, with property-based tests integrated throughout to catch errors early. The plan follows a bottom-up approach: database schema → services → API endpoints → UI components → integration.

## Tasks

- [x] 1. Database schema migration for PostGIS polygon support
  - Create migration to enable PostGIS extension
  - Add boundary column as geometry(Polygon, 4326) to ServiceArea
  - Add centerLatitude and centerLongitude columns to ServiceArea
  - Add serviceAreaId foreign key to Address table
  - Create GIST spatial index on boundary column
  - Create index on Address.serviceAreaId
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2. Implement polygon utility functions and validation
  - [x] 2.1 Create polygon conversion utilities (GeoJSON ↔ WKT)
    - Implement geoJsonToWKT function
    - Implement wktToGeoJson function using wellknown library
    - Add coordinate validation helper
    - _Requirements: 1.6_
  
  - [ ]* 2.2 Write property test for polygon format round-trip
    - **Property 1: Polygon Format Round-Trip Consistency**
    - **Validates: Requirements 1.6**
  
  - [x] 2.3 Implement polygon validation logic
    - Validate minimum 3 coordinate points
    - Validate polygon is closed (first = last point)
    - Validate no self-intersecting edges using turf.js
    - Validate area bounds (0.1 km² to 10000 km²)
    - Return descriptive error messages
    - _Requirements: 1.5, 2.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_
  
  - [ ]* 2.4 Write property test for polygon validation
    - **Property 2: Polygon Validation Rejects Invalid Polygons**
    - **Validates: Requirements 1.5, 2.6, 14.1, 14.2, 14.3, 14.4, 14.5**
  
  - [x] 2.5 Implement polygon center calculation
    - Use turf.js centroid function
    - Return latitude and longitude
    - _Requirements: 2.3_

- [x] 3. Enhance GeoLocationService with polygon operations
  - [x] 3.1 Add findServiceAreaForPoint method
    - Query ServiceArea with ST_Contains
    - Filter by ACTIVE status
    - Return first matching service area
    - _Requirements: 7.1, 7.2_
  
  - [x] 3.2 Add validatePointInServiceArea method
    - Call findServiceAreaForPoint
    - If no match, find nearest service area with ST_Distance
    - Return PointInServiceAreaResult
    - _Requirements: 3.2, 5.1_
  
  - [ ]* 3.3 Write property test for point-in-polygon validation
    - **Property 5: Point-in-Polygon Validation Accuracy**
    - **Validates: Requirements 3.2, 5.1**
  
  - [x] 3.4 Add calculatePolygonCenter method
    - Use turf.js centroid
    - Return { latitude, longitude }
    - _Requirements: 7.5_
  
  - [x] 3.5 Add checkPolygonOverlap method
    - Query existing service areas with ST_Overlaps, ST_Contains, ST_Within
    - Calculate overlap percentage using ST_Intersection and ST_Area
    - Return overlap details
    - _Requirements: 7.6, 14.7_
  
  - [ ]* 3.6 Write property test for polygon overlap warning
    - **Property 21: Polygon Overlap Warning**
    - **Validates: Requirements 14.7**
  
  - [x] 3.7 Add calculatePolygonArea method
    - Use ST_Area with geography cast
    - Convert to square kilometers
    - _Requirements: 13.1_
  
  - [x] 3.8 Add validateCoordinates method (enhance existing)
    - Validate latitude in [-90, 90]
    - Validate longitude in [-180, 180]
    - _Requirements: 8.7_
  
  - [ ]* 3.9 Write property test for invalid coordinate handling
    - **Property 16: Invalid Coordinate Error Handling**
    - **Validates: Requirements 8.7**

- [x] 4. Create ServiceAreaService for CRUD operations
  - [x] 4.1 Implement createServiceArea method
    - Validate polygon using validation logic from task 2.3
    - Check for overlaps (optional warning)
    - Calculate and store center point
    - Convert GeoJSON to WKT for storage
    - Store in database with Prisma raw query
    - _Requirements: 2.2, 2.3, 2.6_
  
  - [x] 4.2 Implement updateServiceArea method
    - Validate updated polygon if provided
    - Recalculate center point if boundary changed
    - Update database
    - Invalidate cache
    - _Requirements: 2.4_
  
  - [ ]* 4.3 Write property test for service area creation and retrieval
    - **Property 3: Service Area Creation and Retrieval Consistency**
    - **Validates: Requirements 2.2, 2.3, 2.4**
  
  - [x] 4.4 Implement deleteServiceArea method
    - Check for dependent records (vendors, delivery partners, addresses)
    - Delete service area
    - Cascade updates to addresses (set serviceAreaId to null)
    - _Requirements: 2.5_
  
  - [ ]* 4.5 Write property test for service area deletion
    - **Property 4: Service Area Deletion Completeness**
    - **Validates: Requirements 2.5**
  
  - [x] 4.6 Implement getServiceAreaWithStats method
    - Query service area
    - Calculate area using ST_Area
    - Count active vendors in service area
    - Count active delivery partners in service area
    - Count addresses in service area
    - Count orders in last 30 days
    - Return ServiceAreaWithStats
    - _Requirements: 2.7, 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ]* 4.7 Write property test for coverage statistics accuracy
    - **Property 20: Coverage Statistics Accuracy**
    - **Validates: Requirements 2.7, 13.1, 13.2, 13.3, 13.4, 13.5**
  
  - [x] 4.8 Implement listServiceAreas method
    - Query with optional filters (status, city)
    - Return array of service areas
    - _Requirements: 2.1_

- [x] 5. Create VendorDiscoveryService for location-aware vendor filtering
  - [x] 5.1 Implement findVendorsForLocation method
    - Find service area for given coordinates
    - If no service area, return empty array
    - Query vendors in same service area with ACTIVE status
    - Filter by service radius using ST_Distance
    - Calculate distance for each vendor
    - Sort by distance ascending
    - Return VendorWithLocationInfo array
    - _Requirements: 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 7.3_
  
  - [ ]* 5.2 Write property test for vendor service area filtering
    - **Property 8: Vendor Filtering by Service Area**
    - **Validates: Requirements 3.6, 4.1, 5.2, 6.1**
  
  - [ ]* 5.3 Write property test for vendor service radius constraint
    - **Property 9: Vendor Service Radius Constraint**
    - **Validates: Requirements 4.2, 5.3**
  
  - [ ]* 5.4 Write property test for vendor active status filter
    - **Property 10: Vendor Active Status Filter**
    - **Validates: Requirements 4.3**
  
  - [ ]* 5.5 Write property test for vendor distance calculation consistency
    - **Property 11: Vendor Distance Calculation Consistency**
    - **Validates: Requirements 4.4**
  
  - [ ]* 5.6 Write property test for vendor list distance ordering
    - **Property 12: Vendor List Distance Ordering**
    - **Validates: Requirements 4.5, 6.5**
  
  - [x] 5.7 Implement canVendorServeAddress method
    - Get vendor and address from database
    - Check vendor and address are in same service area
    - Check address is within vendor service radius
    - Check address is within service area polygon
    - Return { canServe, reason }
    - _Requirements: 5.2, 5.3, 12.3_
  
  - [ ]* 5.8 Write property test for vendor service polygon constraint
    - **Property 19: Vendor Service Polygon Constraint**
    - **Validates: Requirements 12.3**

- [x] 6. Enhance DeliveryMatchingService with polygon validation
  - [x] 6.1 Update notifyNearbyDeliveryPartners method
    - Get order with vendor and delivery address
    - Find delivery partners in same service area
    - Validate partner location is within service area polygon using ST_Contains
    - Validate partner is within proximity threshold of vendor
    - Validate delivery address is within service area polygon
    - Sort by distance to vendor
    - Take top 5 nearest partners
    - Trigger WebSocket notifications
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [ ]* 6.2 Write property test for delivery partner service area containment
    - **Property 13: Delivery Partner Service Area Containment**
    - **Validates: Requirements 6.2, 6.4**
  
  - [ ]* 6.3 Write property test for delivery partner proximity constraint
    - **Property 14: Delivery Partner Proximity Constraint**
    - **Validates: Requirements 6.3**
  
  - [ ]* 6.4 Write property test for top N delivery partner notification
    - **Property 15: Top N Delivery Partner Notification**
    - **Validates: Requirements 6.6**

- [x] 7. Create Zod schemas for service area validation
  - Create service-area.schema.ts
  - Define polygonSchema for GeoJSON.Polygon validation
  - Define createServiceAreaSchema
  - Define updateServiceAreaSchema
  - Export TypeScript types using z.infer
  - _Requirements: 8.3, 8.4_

- [x] 8. Implement admin API endpoints for service area management
  - [x] 8.1 Create POST /api/admin/service-areas endpoint
    - Validate request with createServiceAreaSchema
    - Check authentication (SUPER_ADMIN only)
    - Call ServiceAreaService.createServiceArea
    - Return service area with optional warnings
    - Handle errors (invalid polygon, database errors)
    - _Requirements: 8.3_
  
  - [x] 8.2 Create PUT /api/admin/service-areas/[id] endpoint
    - Validate request with updateServiceAreaSchema
    - Check authentication (SUPER_ADMIN only)
    - Call ServiceAreaService.updateServiceArea
    - Return updated service area
    - Handle errors
    - _Requirements: 8.4_
  
  - [x] 8.3 Create GET /api/admin/service-areas/[id]/coverage endpoint
    - Check authentication (SUPER_ADMIN only)
    - Call ServiceAreaService.getServiceAreaWithStats
    - Return coverage statistics
    - Handle errors (not found)
    - _Requirements: 8.5_
  
  - [x] 8.4 Create DELETE /api/admin/service-areas/[id] endpoint
    - Check authentication (SUPER_ADMIN only)
    - Call ServiceAreaService.deleteServiceArea
    - Return success response
    - Handle errors (dependent records)
    - _Requirements: 2.5_

- [x] 9. Implement customer-facing API endpoints
  - [x] 9.1 Create GET /api/vendors/nearby endpoint
    - Validate latitude and longitude query parameters
    - Call VendorDiscoveryService.findVendorsForLocation
    - Return vendors with service area info
    - Handle errors (invalid coordinates)
    - _Requirements: 8.1_
  
  - [x] 9.2 Create GET /api/service-areas/for-location endpoint
    - Validate latitude and longitude query parameters
    - Call GeoLocationService.validatePointInServiceArea
    - Return service area or nearest service area
    - Handle errors (invalid coordinates)
    - _Requirements: 8.2_
  
  - [x] 9.3 Create POST /api/addresses/validate endpoint
    - Validate request body (latitude, longitude, optional addressId)
    - Call GeoLocationService.validatePointInServiceArea
    - If serviceable, update address with serviceAreaId
    - Return validation result with proper format
    - Handle errors
    - _Requirements: 8.6, 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [ ]* 9.4 Write property test for address validation response format
    - **Property 22: Address Validation Response Format**
    - **Validates: Requirements 15.1, 15.2, 15.4, 15.5**
  
  - [ ]* 9.5 Write property test for validation error response format
    - **Property 23: Validation Error Response Format**
    - **Validates: Requirements 15.3**

- [x] 10. Enhance order validation with polygon checks
  - [x] 10.1 Update order creation validation in order.service.ts
    - Validate delivery address is within service area polygon
    - Validate vendor serves delivery address service area
    - Validate delivery address is within vendor service radius
    - Return specific error messages for each validation failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x]* 10.2 Write unit tests for order validation error messages
    - Test "Delivery address is outside serviceable area"
    - Test "Vendor does not serve this location"
    - Test "Address is beyond vendor's delivery range"
    - _Requirements: 5.4, 5.5, 5.6_

- [x] 11. Implement Redis caching for spatial queries
  - [x] 11.1 Create cache utility functions
    - Implement getCachedServiceArea function
    - Implement setCachedServiceArea function (5 min TTL)
    - Implement getCachedVendors function
    - Implement setCachedVendors function (2 min TTL)
    - Implement invalidateServiceAreaCache function
    - _Requirements: 11.2_
  
  - [x] 11.2 Integrate caching in GeoLocationService
    - Check cache before querying database in findServiceAreaForPoint
    - Store results in cache after database query
    - _Requirements: 11.2_
  
  - [ ]* 11.3 Write property test for service area lookup caching
    - **Property 17: Service Area Lookup Caching**
    - **Validates: Requirements 11.2**
  
  - [x] 11.4 Integrate caching in VendorDiscoveryService
    - Check cache before querying in findVendorsForLocation
    - Store results in cache
    - _Requirements: 11.2_

- [x] 12. Create Redux slice for location state management
  - Create locationSlice in src/lib/redux/slices/
  - Define LocationState interface
  - Implement setSelectedAddress action with localStorage persistence
  - Implement setServiceableVendors action
  - Implement setLoadingVendors action
  - Export actions and selectors
  - _Requirements: 3.5_

- [ ]* 13. Write property test for address selection persistence
  - **Property 7: Address Selection Persistence**
  - **Validates: Requirements 3.5**

- [x] 14. Create AddressSelector component for header
  - [x] 14.1 Create AddressSelector.tsx component
    - Fetch user addresses from API
    - Display dropdown with address options
    - On selection, validate address with /api/addresses/validate
    - If serviceable, dispatch setSelectedAddress action
    - If not serviceable, show LocationValidationMessage
    - Persist selection to localStorage
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 14.2 Create LocationValidationMessage.tsx component
    - Display "We don't serve this location yet" for non-serviceable addresses
    - Display nearest service area information
    - Style with Tailwind CSS
    - _Requirements: 3.3, 9.4_
  
  - [x] 14.3 Integrate AddressSelector into app header
    - Add to src/app/layout.tsx or header component
    - Position next to logo
    - Ensure responsive design
    - _Requirements: 3.1_

- [x] 15. Create VendorListWithDistance component
  - Create VendorListWithDistance.tsx component
  - Display vendor cards with distance information
  - Sort vendors by distance (already sorted from API)
  - Show "No vendors available in your area" if empty
  - Style with Tailwind CSS and shadcn/ui
  - _Requirements: 4.4, 4.5, 4.6, 9.5_

- [x] 16. Update vendor listing page to use location-aware filtering
  - [x] 16.1 Update src/app/(customer)/products/page.tsx
    - Get selectedAddress from Redux state
    - If address selected, call /api/vendors/nearby with coordinates
    - If no address selected, show prompt to select address
    - Display VendorListWithDistance component
    - Handle loading and error states
    - _Requirements: 3.6, 4.1, 4.2, 4.3_
  
  - [ ]* 16.2 Write integration test for vendor filtering
    - Test that selecting address filters vendor list
    - Test that vendors are sorted by distance
    - Test "No vendors available" message
    - _Requirements: 3.6, 4.1, 4.5, 4.6_

- [x] 17. Create admin service area management UI components
  - [x] 17.1 Create ServiceAreaMapEditor.tsx component
    - Integrate Leaflet with Leaflet.draw plugin
    - Display existing service area polygons on map
    - Enable polygon drawing tools
    - On save, convert drawn polygon to GeoJSON
    - Call POST /api/admin/service-areas
    - Display validation errors and overlap warnings
    - _Requirements: 2.1, 2.2, 2.6, 9.2_
  
  - [x] 17.2 Create ServiceAreaPolygonDisplay.tsx component
    - Display service area polygon on read-only map
    - Use distinct colors for different service areas
    - Show service area name and boundaries
    - _Requirements: 2.4, 9.3, 9.7_
  
  - [x] 17.3 Create ServiceAreaCoverageStats.tsx component
    - Display coverage statistics (area, vendor count, etc.)
    - Fetch from GET /api/admin/service-areas/[id]/coverage
    - Format statistics with proper units
    - _Requirements: 2.7, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 18. Create admin service area management pages
  - [x] 18.1 Create src/app/admin/service-areas/page.tsx
    - List all service areas with map preview
    - Add "Create New Service Area" button
    - Show status, city, and basic stats for each area
    - _Requirements: 2.1_
  
  - [x] 18.2 Create src/app/admin/service-areas/new/page.tsx
    - Display ServiceAreaMapEditor component
    - Form for name, city, state, pincodes
    - Handle creation success and errors
    - Redirect to list page on success
    - _Requirements: 2.2, 2.3, 2.6_
  
  - [x] 18.3 Create src/app/admin/service-areas/[id]/page.tsx
    - Display ServiceAreaPolygonDisplay component
    - Display ServiceAreaCoverageStats component
    - Add "Edit" and "Delete" buttons
    - Handle delete with confirmation
    - _Requirements: 2.4, 2.5, 2.7_
  
  - [x] 18.4 Create src/app/admin/service-areas/[id]/edit/page.tsx
    - Display ServiceAreaMapEditor with existing polygon
    - Allow editing polygon boundary
    - Handle update success and errors
    - _Requirements: 2.4_

- [ ] 19. Create database backfill script
  - [ ] 19.1 Create prisma/backfill-service-areas.ts script
    - Query all addresses with null serviceAreaId
    - For each address with coordinates, call findServiceAreaForPoint
    - Update address with serviceAreaId if found
    - Log addresses that cannot be matched
    - Display summary statistics
    - _Requirements: 10.6, 10.7_
  
  - [ ] 19.2 Add npm script to run backfill
    - Add "db:backfill-service-areas" to package.json scripts
    - Document usage in README
    - _Requirements: 10.6_

- [ ] 20. Add performance monitoring and logging
  - [ ] 20.1 Add performance logging to spatial queries
    - Measure query execution time
    - Log warning if exceeds 100ms threshold
    - Include query details in log
    - _Requirements: 11.5_
  
  - [ ] 20.2 Add audit logging for service area operations
    - Log all create/update/delete operations
    - Include admin user ID and timestamp
    - Log polygon overlap warnings
    - _Requirements: 2.2, 2.4, 2.5, 14.7_

- [ ] 21. Handle edge cases and boundary conditions
  - [ ]* 21.1 Write unit test for address on service area boundary
    - Test that ST_Contains considers boundary points as inside
    - _Requirements: 12.1_
  
  - [ ]* 21.2 Write property test for overlapping service area resolution
    - **Property 18: Overlapping Service Area Resolution**
    - **Validates: Requirements 12.2**
  
  - [ ]* 21.3 Write unit test for ambiguous spatial query results
    - Test logging and restrictive interpretation
    - _Requirements: 12.5_

- [ ] 22. Update API documentation
  - Document new endpoints in API documentation
  - Include request/response examples
  - Document error codes and messages
  - Add PostGIS setup instructions
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 23. Final integration testing and checkpoint
  - [ ]* 23.1 Run all property-based tests
    - Ensure all 23 properties pass with 100+ iterations
    - Fix any failures
  
  - [ ]* 23.2 Run all unit tests
    - Ensure all edge cases and examples pass
    - Fix any failures
  
  - [ ] 23.3 Test end-to-end user flows
    - Admin creates service area with polygon
    - Customer selects address and sees filtered vendors
    - Customer places order with polygon validation
    - Delivery partner matching uses polygon validation
  
  - [ ] 23.4 Performance testing
    - Test spatial query performance with 100+ service areas
    - Verify cache effectiveness
    - Ensure queries complete within 100ms threshold
  
  - [ ] 23.5 Checkpoint - Ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests verify end-to-end flows work correctly
- The implementation follows a bottom-up approach: database → services → API → UI
- PostGIS extension must be installed in PostgreSQL before running migrations
- Redis is required for caching functionality (graceful degradation if unavailable)
- Leaflet and Leaflet.draw libraries needed for map components
- turf.js library needed for polygon calculations
- wellknown library needed for WKT parsing
