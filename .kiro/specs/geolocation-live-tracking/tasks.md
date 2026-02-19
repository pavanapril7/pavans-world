X# Implementation Plan: Geolocation and Live Tracking

## Overview

This implementation plan breaks down the geolocation and live tracking feature into discrete coding tasks. The approach follows a layered implementation strategy: database schema first, then core services, API endpoints, WebSocket server, and finally client-side components. Each task builds on previous work to ensure incremental progress with testable milestones.

## Tasks

- [x] 1. Set up PostGIS extension and database schema
  - Enable PostGIS extension in PostgreSQL
  - Add latitude, longitude, serviceRadiusKm columns to Vendor model
  - Add latitude, longitude columns to Address model
  - Add currentLatitude, currentLongitude, lastLocationUpdate columns to DeliveryPartner model
  - Create LocationHistory model with deliveryId, latitude, longitude, timestamp fields
  - Create migration with PostGIS geography columns and triggers
  - Create spatial indexes on all geography columns
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.2, 3.3, 5.1, 6.1, 18.1-18.7_

- [x] 2. Implement GeoLocationService
  - [x] 2.1 Create GeoLocationService class with coordinate validation
    - Implement validateCoordinates method
    - Implement calculateDistance method using PostGIS ST_Distance
    - Implement calculateETA method with 30 km/h average speed and 5-minute buffer
    - Implement formatETA method for display formatting
    - _Requirements: 1.4, 1.5, 1.6, 3.4, 3.5, 14.1, 14.2, 14.3, 14.6, 14.7_
  
  - [ ]* 2.2 Write property test for coordinate validation
    - **Property 1: Coordinate Validation**
    - **Validates: Requirements 1.4, 2.3, 5.3**
  
  - [ ]* 2.3 Write property test for distance precision
    - **Property 5: Distance Precision**
    - **Validates: Requirements 3.5**
  
  - [ ]* 2.4 Write property test for ETA calculation
    - **Property 30: ETA Calculation Formula**
    - **Validates: Requirements 14.2**
  
  - [ ]* 2.5 Write property test for ETA formatting
    - **Property 31: ETA Display Formatting**
    - **Validates: Requirements 14.6**
  
  - [x] 2.6 Implement findNearbyVendors method
    - Write raw SQL query using PostGIS ST_Distance and ST_DWithin
    - Filter by isActive and service radius
    - Sort by distance ascending
    - Return vendors with distance information
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_
  
  - [ ]* 2.7 Write property test for nearby vendor filtering
    - **Property 6: Nearby Vendor Service Radius Filtering**
    - **Validates: Requirements 4.1, 4.7**
  
  - [ ]* 2.8 Write property test for nearby vendor sorting
    - **Property 7: Nearby Vendor Distance Sorting**
    - **Validates: Requirements 4.4**
  
  - [ ]* 2.9 Write property test for distance inclusion
    - **Property 8: Nearby Vendor Distance Inclusion**
    - **Validates: Requirements 4.5**
  
  - [x] 2.10 Implement findNearbyDeliveryPartners method
    - Write raw SQL query using PostGIS for proximity matching
    - Filter by availabilityStatus = AVAILABLE
    - Filter by service area containment
    - Sort by distance ascending
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 15.1, 15.2_
  
  - [ ]* 2.11 Write property test for delivery partner proximity matching
    - **Property 18: Proximity Matching Distance Calculation**
    - **Validates: Requirements 8.1**
  
  - [ ]* 2.12 Write property test for availability filtering
    - **Property 19: Availability Status Filtering**
    - **Validates: Requirements 8.3**
  
  - [ ]* 2.13 Write property test for service area filtering
    - **Property 20: Service Area Containment Filtering**
    - **Validates: Requirements 8.4**
  
  - [ ]* 2.14 Write property test for delivery partner sorting
    - **Property 21: Delivery Partner Distance Sorting**
    - **Validates: Requirements 8.5**

- [x] 3. Implement LocationTrackingService
  - [x] 3.1 Create LocationTrackingService class
    - Implement updateDeliveryPartnerLocation method
    - Verify delivery partner has active delivery
    - Validate coordinates
    - Update DeliveryPartner current location and lastLocationUpdate
    - Create LocationHistory record
    - Calculate ETA to destination
    - _Requirements: 5.2, 5.3, 5.4, 5.6, 5.7, 6.2, 6.3_
  
  - [ ]* 3.2 Write property test for location update authorization
    - **Property 9: Location Updates Require Active Delivery**
    - **Validates: Requirements 5.2, 5.6**
  
  - [ ]* 3.3 Write property test for timestamp recording
    - **Property 10: Location Update Timestamp Recording**
    - **Validates: Requirements 5.4**
  
  - [ ]* 3.4 Write property test for ETA calculation on update
    - **Property 12: ETA Calculation on Location Update**
    - **Validates: Requirements 5.7**
  
  - [ ]* 3.5 Write property test for location history recording
    - **Property 13: Location History Recording**
    - **Validates: Requirements 6.2, 6.3**
  
  - [x] 3.6 Implement getDeliveryLocation method
    - Query current location for a delivery
    - Return location, ETA, and lastUpdate timestamp
    - _Requirements: 16.4_
  
  - [x] 3.7 Implement getDeliveryRoute method
    - Query LocationHistory for a delivery ordered by timestamp
    - Return array of location points
    - _Requirements: 16.5_
  
  - [x] 3.8 Implement calculateTotalDistance method
    - Query LocationHistory for delivery
    - Calculate distance between consecutive points
    - Sum all distances
    - _Requirements: 6.7_
  
  - [ ]* 3.9 Write property test for total distance calculation
    - **Property 14: Total Distance Calculation**
    - **Validates: Requirements 6.7**
  
  - [x] 3.10 Implement clearDeliveryPartnerLocation method
    - Set currentLatitude and currentLongitude to null
    - _Requirements: 5.5, 13.2_
  
  - [ ]* 3.11 Write property test for location clearing
    - **Property 11: Location Cleared on Delivery Completion**
    - **Validates: Requirements 5.5**
  
  - [x] 3.12 Implement cleanupOldLocationHistory method
    - Delete LocationHistory records older than 90 days
    - _Requirements: 6.6_

- [x] 4. Implement DeliveryMatchingService
  - [x] 4.1 Create DeliveryMatchingService class
    - Implement notifyNearbyDeliveryPartners method
    - Get order and vendor location
    - Find available delivery partners within proximity threshold
    - Filter by service area
    - Sort by distance and take top 5
    - Call WebSocket API to send notifications
    - Set 60-second expiry
    - _Requirements: 8.1-8.7, 10.1, 10.2, 10.3_
  
  - [ ]* 4.2 Write property test for notification limit
    - **Property 22: Notification Limit**
    - **Validates: Requirements 8.6**
  
  - [ ]* 4.3 Write property test for multiple service areas
    - **Property 32: Multiple Service Area Matching**
    - **Validates: Requirements 15.3**
  
  - [ ]* 4.4 Write property test for service area requirement
    - **Property 33: Service Area Requirement**
    - **Validates: Requirements 15.4**
  
  - [x] 4.5 Implement retryWithExpandedRadius method
    - Expand proximity threshold by 5km per attempt
    - Retry up to 3 times
    - Mark order as requiring manual assignment after 3 failures
    - _Requirements: 10.4, 10.5, 10.7_
  
  - [x] 4.6 Implement cancelPendingNotifications method
    - Send cancellation event via WebSocket API
    - _Requirements: 8.7, 10.6_

- [x] 5. Create validation schemas
  - Create src/schemas/geolocation.schema.ts
  - Define locationUpdateSchema with lat/lng validation
  - Define vendorLocationSchema with serviceRadiusKm validation
  - Define nearbyVendorsQuerySchema with query parameter parsing
  - Export TypeScript types using z.infer
  - _Requirements: 1.4, 1.5, 1.6, 1.7, 2.3_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement vendor location API endpoints
  - [x] 7.1 Create PATCH /api/vendors/[id]/location endpoint
    - Validate request body with vendorLocationSchema
    - Verify user is vendor and owns the vendor profile
    - Update vendor latitude, longitude, serviceRadiusKm
    - Return updated vendor data
    - _Requirements: 1.3, 1.4, 1.7, 16.2_
  
  - [ ]* 7.2 Write property test for service radius validation
    - **Property 2: Service Radius Validation**
    - **Validates: Requirements 1.7**
  
  - [x] 7.3 Create GET /api/vendors/nearby endpoint
    - Validate query parameters with nearbyVendorsQuerySchema
    - Call GeoLocationService.findNearbyVendors
    - Return vendors with distance information
    - Handle case where no location provided (return all active vendors)
    - _Requirements: 4.1-4.7, 16.1_
  
  - [ ]* 7.4 Write unit test for nearby vendors without location
    - Test that all active vendors returned when location not provided
    - **Validates: Requirements 4.6**

- [x] 8. Implement address geolocation API endpoints
  - [x] 8.1 Update POST /api/users/[id]/addresses endpoint
    - Accept optional latitude and longitude in request body
    - Validate coordinates if provided
    - Store coordinates with address
    - _Requirements: 2.2, 2.3_
  
  - [ ]* 8.2 Write property test for optional coordinates
    - **Property 3: Optional Address Coordinates**
    - **Validates: Requirements 2.2**
  
  - [x] 8.3 Update PATCH /api/users/[id]/addresses/[addressId] endpoint
    - Accept optional latitude and longitude
    - Validate coordinate-address consistency (within 10km)
    - Update address coordinates
    - _Requirements: 2.5_
  
  - [ ]* 8.4 Write property test for address coordinate consistency
    - **Property 4: Address Coordinate Consistency**
    - **Validates: Requirements 2.5**

- [x] 9. Implement delivery partner location API endpoints
  - [x] 9.1 Create POST /api/delivery-partners/location endpoint
    - Validate request body with locationUpdateSchema
    - Verify user is delivery partner with active delivery
    - Apply rate limiting (1 request per 10 seconds)
    - Call LocationTrackingService.updateDeliveryPartnerLocation
    - Trigger WebSocket location broadcast
    - Return success with ETA
    - _Requirements: 5.2-5.7, 6.2-6.5, 13.5, 16.3_
  
  - [ ]* 9.2 Write unit test for rate limiting
    - Test that rapid updates are rejected
    - **Validates: Requirements 6.5**
  
  - [x] 9.3 Create GET /api/deliveries/[id]/location endpoint
    - Verify user is customer who owns order or assigned delivery partner
    - Call LocationTrackingService.getDeliveryLocation
    - Return current location and ETA
    - _Requirements: 13.3, 13.4, 16.4_
  
  - [ ]* 9.4 Write property test for tracking authorization
    - **Property 29: Order Tracking Authorization**
    - **Validates: Requirements 13.3**
  
  - [ ]* 9.5 Write property test for location privacy
    - **Property 28: Location Privacy During Active Delivery Only**
    - **Validates: Requirements 13.1**
  
  - [x] 9.6 Create GET /api/deliveries/[id]/route endpoint
    - Verify user is customer, delivery partner, or admin
    - Call LocationTrackingService.getDeliveryRoute
    - Calculate total distance
    - Return route and total distance
    - _Requirements: 16.5_

- [x] 10. Implement order notification endpoint
  - [x] 10.1 Create POST /api/orders/[id]/notify-delivery-partners endpoint
    - Verify user is admin or system internal
    - Call DeliveryMatchingService.notifyNearbyDeliveryPartners
    - Return list of notified delivery partners
    - _Requirements: 8.1-8.7, 10.1-10.3, 16.6_
  
  - [ ]* 10.2 Write property test for notification content
    - **Property 25: Delivery Assignment Notification Content**
    - **Validates: Requirements 10.1, 10.2**
  
  - [ ]* 10.3 Write property test for notification expiry
    - **Property 26: Notification Expiry Time**
    - **Validates: Requirements 10.3**

- [x] 11. Checkpoint - Ensure all API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Set up WebSocket server project
  - Create websocket-server directory
  - Initialize Node.js project with TypeScript
  - Install dependencies: ws, @types/ws, jsonwebtoken, @types/jsonwebtoken
  - Copy or symlink Prisma schema
  - Set up tsconfig.json
  - Create src directory structure
  - _Requirements: 9.1, 9.2_

- [x] 13. Implement WebSocket server core
  - [x] 13.1 Create ConnectionManager class
    - Implement connection storage (userId -> WebSocket)
    - Implement role storage (userId -> UserRole)
    - Implement order subscriptions (orderId -> Set<userId>)
    - Implement addConnection, removeConnection methods
    - Implement subscribeToOrder, getOrderSubscribers methods
    - Implement sendToUser, sendToUsers methods
    - _Requirements: 9.6_
  
  - [x] 13.2 Create authentication module
    - Implement JWT validation
    - Extract userId and role from token
    - Handle authentication errors
    - _Requirements: 7.5, 9.5_
  
  - [ ]* 13.3 Write property test for WebSocket authentication
    - **Property 17: WebSocket Authentication Required**
    - **Property 24: WebSocket JWT Authentication**
    - **Validates: Requirements 7.5, 9.5**
  
  - [x] 13.4 Create WebSocket server
    - Initialize ws.Server
    - Handle connection events
    - Authenticate connections
    - Handle disconnection and cleanup
    - Implement 60-second cleanup timeout
    - _Requirements: 9.5, 9.7_
  
  - [x] 13.5 Create event type definitions
    - Define LocationUpdateEvent interface
    - Define DeliveryAssignedEvent interface
    - Define OrderReadyEvent interface
    - Define DeliveryCompletedEvent interface
    - Define NotificationCancelledEvent interface
    - _Requirements: 9.4, 17.1-17.7_
  
  - [ ]* 13.6 Write property test for event types
    - **Property 23: WebSocket Event Type Support**
    - **Validates: Requirements 9.4**

- [x] 14. Implement WebSocket HTTP API
  - [x] 14.1 Create HTTP server for event triggering
    - Set up Express server
    - Implement authentication middleware (shared secret or JWT)
    - _Requirements: 9.3_
  
  - [x] 14.2 Create POST /trigger/location-update endpoint
    - Validate request body
    - Get order subscribers from ConnectionManager
    - Create LocationUpdateEvent
    - Send to customer who owns the order
    - Implement retry logic (3 attempts with exponential backoff)
    - _Requirements: 7.1, 7.2, 7.3, 17.2, 17.7_
  
  - [ ]* 14.3 Write property test for location broadcast routing
    - **Property 15: Location Broadcast to Order Owner**
    - **Validates: Requirements 7.1, 7.2**
  
  - [ ]* 14.4 Write property test for location broadcast content
    - **Property 16: Location Broadcast Content**
    - **Validates: Requirements 7.3**
  
  - [x] 14.5 Create POST /trigger/delivery-assigned endpoint
    - Validate request body
    - Create DeliveryAssignedEvent for each delivery partner
    - Send to specified delivery partners
    - Set expiry timestamp (60 seconds)
    - _Requirements: 10.1, 10.2, 10.3, 17.3_
  
  - [x] 14.6 Create POST /trigger/notification-cancelled endpoint
    - Validate request body
    - Create NotificationCancelledEvent
    - Send to specified delivery partners
    - _Requirements: 8.7, 17.3_
  
  - [ ]* 14.7 Write unit test for HTTP API authentication
    - Test valid and invalid authentication
    - **Validates: Requirements 9.3**

- [x] 15. Integrate WebSocket notifications in Next.js services
  - [x] 15.1 Create WebSocket client utility
    - Implement HTTP client for WebSocket server API
    - Handle connection errors gracefully
    - Log failures without blocking main flow
    - _Requirements: 9.3_
  
  - [x] 15.2 Update LocationTrackingService to trigger WebSocket
    - Call WebSocket API after location update
    - Pass deliveryId, latitude, longitude, ETA
    - Handle WebSocket server unavailable (degraded mode)
    - _Requirements: 7.1_
  
  - [x] 15.3 Update DeliveryMatchingService to trigger WebSocket
    - Call WebSocket API for delivery assignments
    - Pass delivery partner IDs and order details
    - _Requirements: 10.1_

- [x] 16. Checkpoint - Test WebSocket integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Implement TrackingMap client component
  - [x] 17.1 Create TrackingMap component
    - Set up Mapbox GL JS or Leaflet
    - Initialize map with destination marker
    - Connect to WebSocket server with JWT
    - Subscribe to delivery location updates
    - Handle location_update events
    - Update delivery partner marker position
    - Display ETA badge
    - Handle delivery_completed event
    - Show completion message
    - _Requirements: 11.1-11.7_
  
  - [ ]* 17.2 Write unit test for WebSocket connection
    - Test connection with valid JWT
    - Test initial location sync
    - **Validates: Requirements 7.4**
  
  - [ ]* 17.3 Write unit test for delivery completion
    - Test completion message display
    - Test tracking stops after completion
    - **Validates: Requirements 7.6**

- [x] 18. Implement VendorLocationPicker client component
  - [x] 18.1 Create VendorLocationPicker component
    - Set up interactive map
    - Display draggable marker for location selection
    - Show latitude/longitude input fields
    - Sync marker with manual coordinate entry
    - Display service radius circle overlay
    - Validate coordinates before saving
    - Call PATCH /api/vendors/[id]/location on save
    - _Requirements: 12.1-12.7_
  
  - [ ]* 18.2 Write property test for geographic region validation
    - **Property 27: Geographic Region Validation**
    - **Validates: Requirements 12.6**

- [x] 19. Create vendor location settings page
  - Create src/app/vendor/location/page.tsx
  - Render VendorLocationPicker component
  - Load current vendor location
  - Handle save success/error states
  - _Requirements: 12.1_

- [x] 20. Implement AddressLocationPicker client component
  - [x] 20.1 Create AddressLocationPicker component
    - Set up interactive map (reuse map setup from VendorLocationPicker)
    - Display draggable marker for address location selection
    - Show latitude/longitude input fields
    - Sync marker with manual coordinate entry
    - Support initial location from browser geolocation API
    - Validate coordinates before saving
    - Return coordinates to parent form component
    - _Requirements: 2.2, 2.3, 2.5_
  
  - [ ]* 20.2 Write unit test for coordinate validation
    - Test coordinate bounds validation
    - Test marker-input synchronization
    - **Validates: Requirements 2.3**

- [x] 21. Integrate AddressLocationPicker into address forms
  - [x] 21.1 Update customer address creation form
    - Add optional map section with AddressLocationPicker
    - Allow customers to skip location selection
    - Pass coordinates to POST /api/users/[id]/addresses
    - _Requirements: 2.2_
  
  - [x] 21.2 Update customer address edit form
    - Display AddressLocationPicker with existing coordinates
    - Validate coordinate-address consistency (within 10km)
    - Pass updated coordinates to PATCH /api/users/[id]/addresses/[addressId]
    - _Requirements: 2.5_

- [x] 22. Create customer order tracking page
  - Create src/app/(customer)/orders/[id]/track/page.tsx
  - Fetch order and delivery details
  - Verify order has active delivery
  - Render TrackingMap component
  - Display order information and ETA
  - _Requirements: 11.1_

- [x] 23. Update order status change handlers
  - [x] 23.1 Update vendor order acceptance flow
    - When vendor marks order as READY_FOR_PICKUP
    - Call POST /api/orders/[id]/notify-delivery-partners
    - Trigger proximity-based delivery partner notifications
    - _Requirements: 8.1, 10.1_
  
  - [x] 23.2 Update delivery completion flow
    - When delivery partner marks delivery as DELIVERED
    - Call LocationTrackingService.clearDeliveryPartnerLocation
    - Send delivery_completed event via WebSocket
    - _Requirements: 5.5, 7.6_

- [x] 24. Add environment variables
  - Add WEBSOCKET_SERVER_URL to .env
  - Add WEBSOCKET_SERVER_SECRET to .env
  - Add MAPBOX_ACCESS_TOKEN or LEAFLET_TILE_URL to .env
  - Update src/lib/env.ts with new variables
  - _Requirements: 9.3_

- [x] 25. Implement delivery partner real-time notifications UI
  - [x] 25.1 Create DeliveryNotificationListener component
    - Connect to WebSocket server with JWT authentication
    - Subscribe to delivery_assigned events
    - Handle connection/disconnection states
    - Display toast notifications for new delivery opportunities
    - Auto-dismiss notifications after 60 seconds (expiry time)
    - Play notification sound (optional)
    - _Requirements: 10.1, 10.2, 10.3, 17.1_
  
  - [x] 25.2 Integrate DeliveryNotificationListener into delivery partner layout
    - Add component to src/app/delivery/layout.tsx
    - Ensure WebSocket connection is active when delivery partner is logged in
    - Handle authentication token refresh
    - _Requirements: 9.5, 9.6_
  
  - [x] 25.3 Update Available Deliveries page with WebSocket integration
    - Auto-refresh delivery list when delivery_assigned event received
    - Show real-time badge/indicator for new deliveries
    - Highlight newly arrived deliveries
    - _Requirements: 8.6, 10.1_
  
  - [x] 25.4 Handle notification cancellation
    - Listen for notification_cancelled events
    - Remove cancelled delivery from available list
    - Show toast message when delivery is no longer available
    - _Requirements: 8.7, 10.6_
  
  - [ ]* 25.5 Add notification preferences
    - Allow delivery partners to enable/disable sound notifications
    - Allow delivery partners to set notification radius preferences
    - Store preferences in local storage or user profile
    - _Requirements: User experience enhancement_

- [ ] 26. Create database migration
  - Run npm run db:migrate to create migration
  - Verify migration includes all schema changes
  - Verify PostGIS extension enabled
  - Verify spatial indexes created
  - Test migration on clean database
  - _Requirements: 3.1, 18.1-18.7_

- [ ] 27. Final checkpoint - Integration testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- WebSocket server is deployed separately from Next.js application
- PostGIS extension must be enabled before running migrations
- Map library choice (Mapbox vs Leaflet) can be decided during implementation
