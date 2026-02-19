# Requirements Document: Geolocation and Live Tracking

## Introduction

This feature adds geolocation services and real-time tracking capabilities to the multi-tenant marketplace platform. It enables customers to discover nearby vendors, track delivery partners in real-time during active deliveries, and allows the system to intelligently match delivery partners based on proximity. The system uses PostGIS for efficient geospatial queries and a separate WebSocket server for real-time communication.

## Glossary

- **System**: The multi-tenant marketplace platform
- **Customer**: A user with role CUSTOMER who browses and orders products
- **Vendor**: A user with role VENDOR who lists products and fulfills orders
- **Delivery_Partner**: A user with role DELIVERY_PARTNER who delivers orders
- **Admin**: A user with role SUPER_ADMIN who manages the platform
- **Location**: A geographic coordinate pair (latitude, longitude)
- **Service_Radius**: The maximum distance in kilometers a vendor serves
- **Active_Delivery**: A delivery with status PICKED_UP or ACCEPTED
- **WebSocket_Server**: A separate service handling real-time communication
- **PostGIS**: PostgreSQL extension for geospatial data and queries
- **Geography_Type**: PostGIS data type for storing location coordinates
- **Proximity_Threshold**: Maximum distance in kilometers for delivery partner notifications
- **Location_Update_Interval**: Time between location updates (10-30 seconds)
- **ETA**: Estimated Time of Arrival calculated from current location and distance

## Requirements

### Requirement 1: Vendor Location Management

**User Story:** As a vendor, I want to set and update my business location, so that customers can find me and delivery partners can navigate to my location.

#### Acceptance Criteria

1. THE Vendor_Model SHALL store latitude and longitude as Geography_Type
2. THE Vendor_Model SHALL store serviceRadiusKm as a positive decimal value
3. WHEN a vendor creates their profile, THE System SHALL require a valid location
4. WHEN a vendor updates their location, THE System SHALL validate the coordinates are within valid geographic bounds
5. THE System SHALL reject latitude values outside the range -90 to 90
6. THE System SHALL reject longitude values outside the range -180 to 180
7. WHEN a vendor sets serviceRadiusKm, THE System SHALL validate it is between 1 and 100 kilometers

### Requirement 2: Customer Address Geolocation

**User Story:** As a customer, I want my delivery addresses to include location coordinates, so that the system can find nearby vendors and calculate accurate delivery distances.

#### Acceptance Criteria

1. THE Address_Model SHALL store latitude and longitude as Geography_Type
2. WHEN a customer adds an address, THE System SHALL accept optional latitude and longitude values
3. WHEN latitude and longitude are provided, THE System SHALL validate they are within valid geographic bounds
4. THE System SHALL allow addresses without coordinates for backward compatibility
5. WHEN an address is updated with coordinates, THE System SHALL validate the coordinates match the address text within 10 kilometers

### Requirement 3: PostGIS Database Integration

**User Story:** As a system architect, I want to use PostGIS for geospatial operations, so that location queries are efficient and accurate.

#### Acceptance Criteria

1. THE System SHALL enable the PostGIS extension in PostgreSQL
2. THE System SHALL use Geography_Type for all location storage
3. THE System SHALL create spatial indexes on all geography columns
4. WHEN calculating distances, THE System SHALL use PostGIS distance functions
5. THE System SHALL return distances in kilometers with two decimal precision
6. WHEN performing proximity queries, THE System SHALL use spatial indexes for performance

### Requirement 4: Nearby Vendor Discovery

**User Story:** As a customer, I want to find vendors near my location, so that I can order from businesses that can deliver to me quickly.

#### Acceptance Criteria

1. WHEN a customer requests nearby vendors with a location, THE System SHALL return vendors within their service radius
2. WHEN calculating vendor proximity, THE System SHALL use the straight-line distance from customer location to vendor location
3. THE System SHALL filter out vendors where the customer is beyond the vendor's serviceRadiusKm
4. THE System SHALL sort results by distance in ascending order
5. THE System SHALL include the distance in kilometers for each vendor in the response
6. WHEN a customer location is not provided, THE System SHALL return all active vendors without distance filtering
7. THE System SHALL only return vendors with isActive set to true

### Requirement 5: Delivery Partner Location Tracking

**User Story:** As a delivery partner, I want to share my location during active deliveries, so that customers can track their orders in real-time.

#### Acceptance Criteria

1. THE DeliveryPartner_Model SHALL store currentLatitude and currentLongitude as nullable Geography_Type
2. WHEN a delivery partner has an Active_Delivery, THE System SHALL accept location updates
3. WHEN a delivery partner updates their location, THE System SHALL validate the coordinates are within valid geographic bounds
4. THE System SHALL store the timestamp of each location update
5. WHEN a delivery partner has no Active_Delivery, THE System SHALL clear their current location
6. THE System SHALL reject location updates from delivery partners without an Active_Delivery
7. WHEN a location update is received, THE System SHALL calculate and update the ETA based on distance to destination

### Requirement 6: Location Update Frequency and History

**User Story:** As a system administrator, I want to track location update history, so that I can analyze delivery routes and resolve disputes.

#### Acceptance Criteria

1. THE System SHALL create a LocationHistory table to store location updates
2. WHEN a delivery partner updates their location during Active_Delivery, THE System SHALL store the update in LocationHistory
3. THE LocationHistory SHALL include deliveryId, latitude, longitude, and timestamp
4. THE System SHALL accept location updates at intervals between 10 and 30 seconds
5. WHEN location updates arrive more frequently than 10 seconds, THE System SHALL rate limit the updates
6. THE System SHALL retain LocationHistory for completed deliveries for 90 days
7. WHEN a delivery is completed, THE System SHALL calculate the total distance traveled from LocationHistory

### Requirement 7: Real-Time Location Broadcasting

**User Story:** As a customer, I want to see my delivery partner's location update in real-time, so that I know when my order will arrive.

#### Acceptance Criteria

1. WHEN a delivery partner updates their location during Active_Delivery, THE WebSocket_Server SHALL broadcast the update to the customer
2. THE WebSocket_Server SHALL only send location updates to the customer who owns the order
3. THE System SHALL include latitude, longitude, ETA, and timestamp in location broadcasts
4. WHEN a customer connects to track an order, THE WebSocket_Server SHALL send the current location immediately
5. THE WebSocket_Server SHALL authenticate customer connections before sending location data
6. WHEN a delivery is completed, THE WebSocket_Server SHALL send a final location update and close the tracking session

### Requirement 8: Proximity-Based Delivery Partner Matching

**User Story:** As a delivery partner, I want to receive notifications for nearby delivery opportunities, so that I can accept deliveries efficiently.

#### Acceptance Criteria

1. WHEN an order status changes to READY_FOR_PICKUP, THE System SHALL find available delivery partners within Proximity_Threshold
2. THE System SHALL calculate distance from vendor location to each delivery partner's current location
3. THE System SHALL filter delivery partners by availability status set to AVAILABLE
4. THE System SHALL filter delivery partners whose service areas include the vendor location
5. THE System SHALL sort eligible delivery partners by distance in ascending order
6. THE System SHALL notify up to 5 nearest delivery partners via WebSocket_Server
7. WHEN a delivery partner accepts the delivery, THE System SHALL cancel notifications to other delivery partners

### Requirement 9: WebSocket Server Communication

**User Story:** As a system architect, I want a separate WebSocket server for real-time communication, so that the Next.js application remains stateless and scalable.

#### Acceptance Criteria

1. THE WebSocket_Server SHALL run as a separate service from the Next.js application
2. THE WebSocket_Server SHALL connect to the same PostgreSQL database as the Next.js application
3. THE System SHALL provide an HTTP API endpoint for triggering WebSocket notifications
4. THE WebSocket_Server SHALL support event types: location_update, delivery_assigned, order_ready, delivery_completed
5. WHEN a client connects, THE WebSocket_Server SHALL authenticate using JWT tokens
6. THE WebSocket_Server SHALL maintain connection state for active clients
7. WHEN a connection is lost, THE WebSocket_Server SHALL clean up client state after 60 seconds

### Requirement 10: Delivery Partner Notification System

**User Story:** As a delivery partner, I want to receive real-time notifications for new delivery opportunities, so that I can respond quickly.

#### Acceptance Criteria

1. WHEN a delivery opportunity is available, THE WebSocket_Server SHALL send a delivery_assigned event to eligible delivery partners
2. THE notification SHALL include orderId, vendorLocation, deliveryAddress, estimatedDistance, and payment amount
3. THE System SHALL set a notification expiry time of 60 seconds
4. WHEN no delivery partner accepts within 60 seconds, THE System SHALL expand the Proximity_Threshold by 5 kilometers and retry
5. THE System SHALL retry proximity matching up to 3 times with expanding radius
6. WHEN a delivery partner accepts, THE System SHALL send acceptance confirmation via WebSocket
7. WHEN all retries fail, THE System SHALL mark the order as requiring manual assignment

### Requirement 11: Customer Order Tracking Interface

**User Story:** As a customer, I want to view my delivery partner's location on a map, so that I can see when my order will arrive.

#### Acceptance Criteria

1. WHEN a customer views an order with Active_Delivery, THE System SHALL display a map component
2. THE map SHALL show the delivery partner's current location as a moving marker
3. THE map SHALL show the delivery destination as a fixed marker
4. THE map SHALL display the estimated route between current location and destination
5. THE map SHALL update the delivery partner marker position when location_update events are received
6. THE map SHALL display the current ETA prominently
7. WHEN the delivery is completed, THE map SHALL show a completion message and stop updating

### Requirement 12: Vendor Location Selection Interface

**User Story:** As a vendor, I want to select my business location on a map, so that I can accurately set my coordinates.

#### Acceptance Criteria

1. WHEN a vendor accesses location settings, THE System SHALL display a map interface
2. THE map SHALL allow the vendor to click or drag a marker to set their location
3. THE map SHALL display the current latitude and longitude values
4. THE map SHALL allow manual entry of latitude and longitude coordinates
5. WHEN coordinates are entered manually, THE map SHALL update the marker position
6. THE System SHALL validate the selected location is within supported geographic regions
7. THE System SHALL save the location only after vendor confirmation

### Requirement 13: Security and Privacy Controls

**User Story:** As a customer, I want my location data to be private and secure, so that my privacy is protected.

#### Acceptance Criteria

1. THE System SHALL only share delivery partner locations during Active_Delivery
2. WHEN a delivery is completed, THE System SHALL clear the delivery partner's current location
3. THE System SHALL only allow customers to track their own orders
4. WHEN a customer requests order tracking, THE System SHALL verify order ownership
5. THE System SHALL rate limit location update endpoints to 1 request per 10 seconds per delivery partner
6. THE System SHALL validate all location coordinates are within reasonable geographic bounds before storage
7. THE System SHALL encrypt WebSocket connections using TLS

### Requirement 14: Distance and ETA Calculations

**User Story:** As a customer, I want to see accurate delivery time estimates, so that I can plan accordingly.

#### Acceptance Criteria

1. WHEN calculating ETA, THE System SHALL use the straight-line distance from current location to destination
2. THE System SHALL apply an average speed of 30 kilometers per hour for ETA calculation
3. THE System SHALL add a 5-minute buffer to the calculated ETA
4. WHEN a delivery partner is stationary for more than 5 minutes, THE System SHALL recalculate ETA
5. THE System SHALL update ETA with each location update
6. THE System SHALL display ETA in minutes when less than 60 minutes, otherwise in hours and minutes
7. WHEN distance is less than 1 kilometer, THE System SHALL display "Arriving soon" instead of ETA

### Requirement 15: Service Area Validation

**User Story:** As an admin, I want delivery partners to only receive notifications for orders within their service areas, so that assignments are geographically appropriate.

#### Acceptance Criteria

1. WHEN matching delivery partners, THE System SHALL check if the vendor location is within the delivery partner's service areas
2. THE System SHALL use PostGIS containment queries to validate service area boundaries
3. WHEN a delivery partner has multiple service areas, THE System SHALL include them if any service area contains the vendor location
4. THE System SHALL exclude delivery partners with no service areas defined
5. WHEN service area boundaries are updated, THE System SHALL revalidate active delivery assignments
6. THE System SHALL log service area validation failures for admin review

### Requirement 16: API Endpoint Specifications

**User Story:** As a developer, I want well-defined API endpoints for geolocation features, so that I can integrate them into the application.

#### Acceptance Criteria

1. THE System SHALL provide GET /api/vendors/nearby endpoint accepting latitude, longitude, and optional radius parameters
2. THE System SHALL provide PATCH /api/vendors/[id]/location endpoint for updating vendor location
3. THE System SHALL provide POST /api/delivery-partners/location endpoint for location updates during active deliveries
4. THE System SHALL provide GET /api/deliveries/[id]/location endpoint for retrieving current delivery location
5. THE System SHALL provide GET /api/deliveries/[id]/route endpoint for retrieving location history
6. THE System SHALL provide POST /api/orders/[id]/notify-delivery-partners endpoint for triggering proximity matching
7. THE System SHALL return standardized error responses with appropriate HTTP status codes

### Requirement 17: WebSocket Event Specifications

**User Story:** As a developer, I want standardized WebSocket event formats, so that client implementations are consistent.

#### Acceptance Criteria

1. THE WebSocket_Server SHALL use JSON format for all event messages
2. THE location_update event SHALL include type, deliveryId, latitude, longitude, eta, and timestamp fields
3. THE delivery_assigned event SHALL include type, orderId, vendorLocation, deliveryAddress, distance, and paymentAmount fields
4. THE order_ready event SHALL include type, orderId, vendorLocation, and expiresAt fields
5. THE delivery_completed event SHALL include type, deliveryId, and completedAt fields
6. THE System SHALL include an eventId field in all events for deduplication
7. WHEN an event fails to deliver, THE WebSocket_Server SHALL retry up to 3 times with exponential backoff

### Requirement 18: Database Schema Changes

**User Story:** As a database administrator, I want clear schema changes for geolocation features, so that migrations are applied correctly.

#### Acceptance Criteria

1. THE System SHALL add latitude and longitude columns to the Vendor table as Geography_Type
2. THE System SHALL add serviceRadiusKm column to the Vendor table as Decimal with default 10
3. THE System SHALL add latitude and longitude columns to the Address table as nullable Geography_Type
4. THE System SHALL add currentLatitude and currentLongitude columns to the DeliveryPartner table as nullable Geography_Type
5. THE System SHALL add lastLocationUpdate column to the DeliveryPartner table as nullable DateTime
6. THE System SHALL create a LocationHistory table with columns: id, deliveryId, latitude, longitude, timestamp, createdAt
7. THE System SHALL create spatial indexes on all geography columns for query performance

### Requirement 19: Testing Requirements

**User Story:** As a quality assurance engineer, I want comprehensive tests for geolocation features, so that the system is reliable.

#### Acceptance Criteria

1. THE System SHALL include unit tests for distance calculation functions
2. THE System SHALL include unit tests for coordinate validation functions
3. THE System SHALL include property-based tests for proximity matching with random locations
4. THE System SHALL include property-based tests for ETA calculation with random distances
5. THE System SHALL include integration tests for nearby vendor discovery API
6. THE System SHALL include integration tests for location update API with rate limiting
7. THE System SHALL include tests for WebSocket connection authentication and event delivery

### Requirement 20: Performance and Scalability

**User Story:** As a system administrator, I want geolocation queries to be performant at scale, so that the system handles high traffic.

#### Acceptance Criteria

1. WHEN querying nearby vendors, THE System SHALL return results within 200 milliseconds for up to 10,000 vendors
2. THE System SHALL use spatial indexes for all proximity queries
3. WHEN processing location updates, THE System SHALL handle at least 100 updates per second
4. THE WebSocket_Server SHALL support at least 10,000 concurrent connections
5. THE System SHALL use connection pooling for database queries
6. WHEN calculating distances, THE System SHALL cache vendor locations for 5 minutes
7. THE System SHALL monitor query performance and log slow queries exceeding 500 milliseconds
