# Requirements Document

## Introduction

This document specifies the requirements for implementing polygon-based geographic boundaries for service areas in the multi-tenant marketplace platform. The system will replace the current pincode-based approach with PostGIS polygon boundaries, enabling precise location validation and location-aware vendor discovery. This enhancement allows administrators to define exact service area coverage using map-drawn polygons, and enables customers to select delivery locations to see only vendors that serve their specific area.

## Glossary

- **Service_Area**: A geographic region defined by a polygon boundary where the platform provides delivery services
- **Polygon_Boundary**: A closed geometric shape defined by multiple coordinate points representing the exact coverage area
- **PostGIS**: PostgreSQL extension providing geographic object support and spatial query capabilities
- **Center_Point**: The geographic center (latitude/longitude) of a service area polygon used for performance optimization
- **Spatial_Query**: A database query that uses geographic relationships (contains, within, distance) to filter results
- **Service_Radius**: The maximum distance a vendor is willing to deliver from their location
- **Delivery_Address**: A customer address where orders will be delivered
- **Address_Selector**: UI component allowing customers to choose their delivery location
- **Vendor_Discovery**: The process of finding vendors that can serve a specific customer location
- **Delivery_Partner_Matching**: The process of finding eligible delivery partners for an order based on location
- **Coverage_Statistics**: Metrics about a service area including size, vendor count, and delivery partner count
- **WKT**: Well-Known Text format for representing geometric shapes
- **GeoJSON**: JSON format for encoding geographic data structures
- **ST_Contains**: PostGIS function that tests if one geometry completely contains another
- **ST_Within**: PostGIS function that tests if one geometry is completely within another
- **ST_Distance**: PostGIS function that calculates the distance between two geometries
- **Spatial_Index**: Database index optimized for geographic queries

## Requirements

### Requirement 1: Database Schema for Polygon Boundaries

**User Story:** As a system architect, I want to store service area boundaries as PostGIS polygons, so that the system can perform precise spatial queries for location validation and vendor discovery.

#### Acceptance Criteria

1. THE System SHALL store service area boundaries as PostGIS geometry type Polygon with SRID 4326
2. THE System SHALL store center latitude and center longitude for each service area
3. THE System SHALL maintain a service area identifier reference in the Address model
4. THE System SHALL create spatial indexes on polygon boundary columns for query performance
5. WHEN a service area polygon is stored, THE System SHALL validate it is a valid closed polygon
6. THE System SHALL support storing polygons in both WKT and GeoJSON formats

### Requirement 2: Admin Service Area Polygon Management

**User Story:** As an administrator, I want to draw and edit service area boundaries on an interactive map, so that I can define exact coverage areas for the platform.

#### Acceptance Criteria

1. WHEN an administrator accesses the service area management interface, THE System SHALL display an interactive map with drawing tools
2. WHEN an administrator draws a polygon on the map, THE System SHALL capture the coordinate points and create a service area boundary
3. WHEN an administrator saves a service area polygon, THE System SHALL automatically calculate and store the center point
4. WHEN an administrator edits an existing service area, THE System SHALL display the current polygon boundary on the map
5. WHEN an administrator deletes a service area, THE System SHALL remove the polygon boundary and associated data
6. WHEN an administrator saves a service area polygon, THE System SHALL validate the polygon does not have self-intersecting edges
7. WHEN an administrator views a service area, THE System SHALL display coverage statistics including area size, vendor count, and delivery partner count

### Requirement 3: Customer Address Selection and Validation

**User Story:** As a customer, I want to select my delivery address from the header, so that I only see vendors that deliver to my location.

#### Acceptance Criteria

1. WHEN a customer views any page, THE System SHALL display an address selector component in the header
2. WHEN a customer selects an address, THE System SHALL validate the address coordinates are within a service area polygon using ST_Contains
3. IF an address is outside all service area polygons, THEN THE System SHALL display a message "We don't serve this location yet"
4. WHEN an address is validated as serviceable, THE System SHALL store the service area identifier with the address record
5. WHEN a customer selects an address, THE System SHALL persist the selection in Redux state and localStorage
6. WHEN a customer has a selected address, THE System SHALL use it to filter vendor listings automatically

### Requirement 4: Location-Aware Vendor Discovery

**User Story:** As a customer, I want to see only vendors that can deliver to my selected address, so that I don't waste time browsing vendors that cannot serve my location.

#### Acceptance Criteria

1. WHEN a customer has a selected address, THE System SHALL filter vendors to only those in the same service area
2. WHEN displaying vendors, THE System SHALL verify the customer address is within each vendor's service radius
3. WHEN displaying vendors, THE System SHALL only include vendors with ACTIVE status
4. WHEN displaying vendors, THE System SHALL calculate and display the distance from customer address to each vendor
5. WHEN displaying vendors, THE System SHALL sort results by distance with nearest vendors first
6. IF no vendors match the customer location criteria, THEN THE System SHALL display "No vendors available in your area"
7. WHEN calculating vendor distance, THE System SHALL use ST_Distance with coordinates in meters

### Requirement 5: Order Creation Validation with Polygons

**User Story:** As a vendor, I want orders to only come from addresses I can actually serve, so that I don't receive orders I cannot fulfill.

#### Acceptance Criteria

1. WHEN a customer creates an order, THE System SHALL validate the delivery address is within a service area polygon using ST_Contains
2. WHEN a customer creates an order, THE System SHALL validate the vendor serves the delivery address service area
3. WHEN a customer creates an order, THE System SHALL validate the delivery address is within the vendor's service radius
4. IF delivery address validation fails, THEN THE System SHALL return an error message "Delivery address is outside serviceable area"
5. IF vendor service area validation fails, THEN THE System SHALL return an error message "Vendor does not serve this location"
6. IF service radius validation fails, THEN THE System SHALL return an error message "Address is beyond vendor's delivery range"

### Requirement 6: Enhanced Delivery Partner Matching with Polygons

**User Story:** As a delivery partner, I want to only receive notifications for orders in my service area that I can reach, so that I don't get irrelevant delivery requests.

#### Acceptance Criteria

1. WHEN matching delivery partners for an order, THE System SHALL filter partners to those in the same service area as the order
2. WHEN matching delivery partners for an order, THE System SHALL validate the partner's current location is within the service area polygon using ST_Contains
3. WHEN matching delivery partners for an order, THE System SHALL validate the partner is within proximity threshold of the vendor location
4. WHEN matching delivery partners for an order, THE System SHALL validate the delivery address is within the service area polygon
5. WHEN matching delivery partners for an order, THE System SHALL sort eligible partners by distance to vendor location
6. WHEN eligible delivery partners are found, THE System SHALL notify the top 5 nearest partners
7. WHEN calculating partner distance, THE System SHALL use ST_Distance with coordinates in meters

### Requirement 7: GeoLocation Service Spatial Operations

**User Story:** As a developer, I want a centralized geolocation service with spatial query methods, so that location-based features can reuse consistent spatial logic.

#### Acceptance Criteria

1. THE GeoLocation_Service SHALL provide a method to find the service area containing a given point using ST_Contains
2. THE GeoLocation_Service SHALL provide a method to validate a point is within a service area polygon
3. THE GeoLocation_Service SHALL provide a method to find vendors for a specific latitude and longitude
4. THE GeoLocation_Service SHALL provide a method to find eligible delivery partners with polygon validation
5. THE GeoLocation_Service SHALL provide a method to calculate the center point of a polygon
6. THE GeoLocation_Service SHALL provide a method to check if a polygon overlaps with existing service areas using ST_Overlaps
7. WHEN spatial queries are executed, THE GeoLocation_Service SHALL use spatial indexes for performance optimization

### Requirement 8: API Endpoints for Location Services

**User Story:** As a frontend developer, I want REST API endpoints for location-based operations, so that I can build location-aware user interfaces.

#### Acceptance Criteria

1. THE System SHALL provide GET /api/vendors/nearby endpoint accepting latitude and longitude query parameters
2. THE System SHALL provide GET /api/service-areas/for-location endpoint accepting latitude and longitude query parameters
3. THE System SHALL provide POST /api/admin/service-areas endpoint accepting polygon boundary data
4. THE System SHALL provide PUT /api/admin/service-areas/:id endpoint accepting updated polygon boundary data
5. THE System SHALL provide GET /api/admin/service-areas/:id/coverage endpoint returning coverage statistics
6. THE System SHALL provide POST /api/addresses/validate endpoint accepting address coordinates
7. WHEN API endpoints receive invalid coordinates, THE System SHALL return HTTP 400 with error message "Invalid coordinates provided"
8. WHEN API endpoints perform spatial queries, THE System SHALL return results within 100 milliseconds for typical queries

### Requirement 9: UI Components for Location Management

**User Story:** As a user, I want intuitive UI components for location selection and management, so that I can easily interact with location-based features.

#### Acceptance Criteria

1. THE System SHALL provide an AddressSelector component displayed in the application header
2. THE System SHALL provide a ServiceAreaMapEditor component with polygon drawing tools for administrators
3. THE System SHALL provide a ServiceAreaPolygonDisplay component for read-only map visualization
4. THE System SHALL provide a LocationValidationMessage component for displaying serviceability status
5. THE System SHALL provide a VendorListWithDistance component showing vendor distance information
6. WHEN a user interacts with map components, THE System SHALL display loading indicators during spatial query execution
7. WHEN map components render polygons, THE System SHALL use distinct colors for different service areas

### Requirement 10: Database Migration and Data Backfill

**User Story:** As a database administrator, I want a safe migration strategy from pincode-based to polygon-based service areas, so that existing data remains functional during the transition.

#### Acceptance Criteria

1. THE Migration SHALL enable the PostGIS extension in PostgreSQL if not already enabled
2. THE Migration SHALL add a boundary column as geometry type Polygon with SRID 4326 to ServiceArea table
3. THE Migration SHALL add centerLatitude and centerLongitude columns to ServiceArea table
4. THE Migration SHALL add serviceAreaId foreign key column to Address table
5. THE Migration SHALL create spatial indexes on the boundary column using GIST index type
6. WHEN the migration runs, THE System SHALL backfill existing addresses with service area identifiers based on pincode matching
7. WHEN backfilling addresses, THE System SHALL log any addresses that cannot be matched to a service area

### Requirement 11: Performance and Caching for Spatial Queries

**User Story:** As a system administrator, I want spatial queries to perform efficiently at scale, so that the platform remains responsive under high load.

#### Acceptance Criteria

1. WHEN executing spatial queries, THE System SHALL use spatial indexes to optimize query performance
2. WHEN looking up service areas for addresses, THE System SHALL cache results for 5 minutes
3. WHEN calculating vendor distances, THE System SHALL use the service area center point for initial filtering before precise distance calculation
4. WHEN multiple spatial queries are needed, THE System SHALL batch queries where possible to reduce database round trips
5. WHEN spatial query execution time exceeds 100 milliseconds, THE System SHALL log a performance warning
6. THE System SHALL support querying up to 1000 service area polygons without performance degradation

### Requirement 12: Edge Case Handling for Boundary Locations

**User Story:** As a customer with an address near service area boundaries, I want consistent and predictable behavior, so that I have a reliable experience.

#### Acceptance Criteria

1. WHEN an address is exactly on a service area boundary, THE System SHALL consider it within the service area using ST_Contains
2. WHEN an address matches multiple overlapping service areas, THE System SHALL use the service area with the smallest area
3. WHEN a vendor's service radius extends beyond their service area polygon, THE System SHALL only serve addresses within the polygon
4. WHEN a delivery partner's location is near a service area boundary, THE System SHALL validate their exact coordinates are within the polygon
5. IF spatial query results are ambiguous, THEN THE System SHALL log the ambiguity and default to the most restrictive interpretation

### Requirement 13: Admin Coverage Statistics and Reporting

**User Story:** As an administrator, I want to see detailed coverage statistics for each service area, so that I can optimize platform operations and identify coverage gaps.

#### Acceptance Criteria

1. WHEN an administrator views a service area, THE System SHALL display the total area size in square kilometers
2. WHEN an administrator views a service area, THE System SHALL display the count of active vendors in that area
3. WHEN an administrator views a service area, THE System SHALL display the count of active delivery partners in that area
4. WHEN an administrator views a service area, THE System SHALL display the count of registered customer addresses in that area
5. WHEN an administrator views a service area, THE System SHALL display the total number of orders fulfilled in that area in the last 30 days
6. WHEN calculating coverage statistics, THE System SHALL update counts in real-time based on current database state

### Requirement 14: Polygon Validation and Quality Checks

**User Story:** As an administrator, I want the system to validate polygon quality when I draw service areas, so that I don't create invalid or problematic boundaries.

#### Acceptance Criteria

1. WHEN an administrator saves a service area polygon, THE System SHALL validate the polygon has at least 3 coordinate points
2. WHEN an administrator saves a service area polygon, THE System SHALL validate the polygon is closed (first and last points are identical)
3. WHEN an administrator saves a service area polygon, THE System SHALL validate the polygon does not have self-intersecting edges
4. WHEN an administrator saves a service area polygon, THE System SHALL validate the polygon area is greater than 0.1 square kilometers
5. WHEN an administrator saves a service area polygon, THE System SHALL validate the polygon area is less than 10000 square kilometers
6. IF polygon validation fails, THEN THE System SHALL return a descriptive error message indicating the specific validation failure
7. WHEN an administrator saves a service area polygon, THE System SHALL optionally warn if the polygon overlaps with existing service areas by more than 10 percent

### Requirement 15: Address Validation API Response Format

**User Story:** As a frontend developer, I want consistent API response formats for address validation, so that I can build reliable UI feedback.

#### Acceptance Criteria

1. WHEN an address validation succeeds, THE System SHALL return HTTP 200 with JSON containing serviceAreaId and isServiceable true
2. WHEN an address validation fails, THE System SHALL return HTTP 200 with JSON containing isServiceable false and reason message
3. WHEN an address validation encounters an error, THE System SHALL return HTTP 400 or 500 with JSON containing error code and message
4. WHEN returning validation results, THE System SHALL include the nearest service area distance if address is outside all polygons
5. WHEN returning validation results for serviceable addresses, THE System SHALL include the service area name and center coordinates
