# Design Document: Geolocation and Live Tracking

## Overview

This feature adds comprehensive geolocation and real-time tracking capabilities to the marketplace platform. The design uses PostGIS for efficient spatial queries, a separate WebSocket server for real-time communication, and integrates with the existing Next.js application architecture.

The system enables:
- Vendors to set business locations with service radius
- Customers to find nearby vendors based on their location
- Real-time tracking of delivery partners during active deliveries
- Proximity-based matching of delivery partners to orders
- Live map-based tracking interface for customers

### Key Design Decisions

1. **PostGIS for Spatial Data**: Use PostgreSQL's PostGIS extension for storing and querying geographic data, providing efficient spatial indexing and distance calculations
2. **Separate WebSocket Server**: Deploy WebSocket functionality as a standalone service (Railway/Render) while keeping Next.js on Vercel, maintaining stateless architecture
3. **Shared Database**: Both Next.js and WebSocket server access the same PostgreSQL database for consistency
4. **Geography Type**: Use PostGIS Geography type (not Geometry) for accurate distance calculations on Earth's surface
5. **Client-Side Maps**: Use Mapbox GL JS or Leaflet for interactive map components in the browser

## Architecture

### System Components

```
┌─────────────────┐         ┌──────────────────┐
│   Next.js App   │────────▶│   PostgreSQL     │
│   (Vercel)      │         │   + PostGIS      │
└────────┬────────┘         └────────▲─────────┘
         │                           │
         │ HTTP API                  │
         │                           │
         ▼                           │
┌─────────────────┐                 │
│  WebSocket      │─────────────────┘
│  Server         │
│  (Railway)      │
└────────┬────────┘
         │
         │ WebSocket
         ▼
┌─────────────────┐
│   Clients       │
│  (Browsers)     │
└─────────────────┘
```

### Component Responsibilities

**Next.js Application**:
- REST API endpoints for location management
- Vendor location CRUD operations
- Customer address geocoding
- Nearby vendor search
- Delivery partner location updates (HTTP)
- Triggering WebSocket notifications via HTTP API

**WebSocket Server**:
- Real-time location broadcasting to customers
- Delivery partner notifications
- Connection management and authentication
- Event routing based on user roles and order ownership

**PostgreSQL + PostGIS**:
- Spatial data storage with Geography type
- Distance calculations using ST_Distance
- Proximity queries using spatial indexes
- Location history storage

**Client (Browser)**:
- Map rendering with Mapbox/Leaflet
- WebSocket connection for real-time updates
- Location marker updates
- ETA display


## Components and Interfaces

### Database Schema Extensions

#### Vendor Table Extensions
```prisma
model Vendor {
  // Existing fields...
  latitude          Float?
  longitude         Float?
  serviceRadiusKm   Decimal   @default(10) @db.Decimal(5, 2)
  
  // Spatial index will be created via raw SQL migration
  @@index([latitude, longitude])
}
```

**PostGIS Implementation**:
```sql
-- Migration to add PostGIS geography columns
ALTER TABLE "Vendor" 
  ADD COLUMN location geography(POINT, 4326);

-- Create spatial index
CREATE INDEX idx_vendor_location ON "Vendor" USING GIST(location);

-- Update trigger to sync lat/lng with geography column
CREATE OR REPLACE FUNCTION sync_vendor_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendor_location_sync
  BEFORE INSERT OR UPDATE ON "Vendor"
  FOR EACH ROW
  EXECUTE FUNCTION sync_vendor_location();
```

#### Address Table Extensions
```prisma
model Address {
  // Existing fields...
  latitude          Float?
  longitude         Float?
  
  @@index([latitude, longitude])
}
```

**PostGIS Implementation**:
```sql
ALTER TABLE "Address" 
  ADD COLUMN location geography(POINT, 4326);

CREATE INDEX idx_address_location ON "Address" USING GIST(location);

CREATE OR REPLACE FUNCTION sync_address_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER address_location_sync
  BEFORE INSERT OR UPDATE ON "Address"
  FOR EACH ROW
  EXECUTE FUNCTION sync_address_location();
```

#### DeliveryPartner Table Extensions
```prisma
model DeliveryPartner {
  // Existing fields...
  currentLatitude   Float?
  currentLongitude  Float?
  lastLocationUpdate DateTime?
  
  locationHistory   LocationHistory[]
  
  @@index([currentLatitude, currentLongitude])
}
```

**PostGIS Implementation**:
```sql
ALTER TABLE "DeliveryPartner" 
  ADD COLUMN currentLocation geography(POINT, 4326);

CREATE INDEX idx_delivery_partner_location ON "DeliveryPartner" USING GIST(currentLocation);

CREATE OR REPLACE FUNCTION sync_delivery_partner_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.currentLatitude IS NOT NULL AND NEW.currentLongitude IS NOT NULL THEN
    NEW.currentLocation = ST_SetSRID(ST_MakePoint(NEW.currentLongitude, NEW.currentLatitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delivery_partner_location_sync
  BEFORE INSERT OR UPDATE ON "DeliveryPartner"
  FOR EACH ROW
  EXECUTE FUNCTION sync_delivery_partner_location();
```

#### LocationHistory Table (New)
```prisma
model LocationHistory {
  id                String   @id @default(uuid())
  deliveryId        String
  delivery          Delivery @relation(fields: [deliveryId], references: [id], onDelete: Cascade)
  latitude          Float
  longitude         Float
  timestamp         DateTime @default(now())
  createdAt         DateTime @default(now())
  
  deliveryPartnerId String
  deliveryPartner   DeliveryPartner @relation(fields: [deliveryPartnerId], references: [id])
  
  @@index([deliveryId, timestamp])
  @@index([deliveryPartnerId])
}
```

**PostGIS Implementation**:
```sql
ALTER TABLE "LocationHistory" 
  ADD COLUMN location geography(POINT, 4326);

CREATE INDEX idx_location_history_location ON "LocationHistory" USING GIST(location);
CREATE INDEX idx_location_history_delivery_time ON "LocationHistory" (deliveryId, timestamp);

CREATE OR REPLACE FUNCTION sync_location_history()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER location_history_sync
  BEFORE INSERT ON "LocationHistory"
  FOR EACH ROW
  EXECUTE FUNCTION sync_location_history();
```

### API Endpoints

#### GET /api/vendors/nearby
Find vendors near a customer location.

**Query Parameters**:
- `latitude` (required): Customer latitude
- `longitude` (required): Customer longitude
- `radius` (optional): Search radius in km (default: 50)

**Response**:
```typescript
{
  vendors: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    serviceRadiusKm: number;
    distanceKm: number;
    isActive: boolean;
  }>;
}
```

**Implementation**:
```typescript
// Uses PostGIS ST_Distance for accurate calculations
const query = `
  SELECT 
    id, name, latitude, longitude, "serviceRadiusKm", "isActive",
    ST_Distance(
      location,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
    ) / 1000 as "distanceKm"
  FROM "Vendor"
  WHERE 
    "isActive" = true
    AND location IS NOT NULL
    AND ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
      $3 * 1000
    )
    AND ST_Distance(
      location,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
    ) / 1000 <= "serviceRadiusKm"
  ORDER BY "distanceKm" ASC
`;
```

#### PATCH /api/vendors/[id]/location
Update vendor location and service radius.

**Request Body**:
```typescript
{
  latitude: number;    // -90 to 90
  longitude: number;   // -180 to 180
  serviceRadiusKm: number; // 1 to 100
}
```

**Authorization**: Vendor role, must own the vendor profile

**Validation**:
- Coordinates within valid bounds
- Service radius between 1-100 km
- Vendor exists and user has permission

#### POST /api/delivery-partners/location
Update delivery partner's current location during active delivery.

**Request Body**:
```typescript
{
  latitude: number;
  longitude: number;
}
```

**Authorization**: Delivery partner role with active delivery

**Rate Limiting**: 1 request per 10 seconds per delivery partner

**Side Effects**:
- Updates DeliveryPartner.currentLatitude/currentLongitude
- Creates LocationHistory record
- Calculates and updates ETA
- Broadcasts location_update event via WebSocket

#### GET /api/deliveries/[id]/location
Get current location of delivery partner for a specific delivery.

**Response**:
```typescript
{
  deliveryId: string;
  latitude: number | null;
  longitude: number | null;
  lastUpdate: string | null; // ISO timestamp
  eta: number | null; // minutes
}
```

**Authorization**: Customer who owns the order, or delivery partner assigned to delivery

#### GET /api/deliveries/[id]/route
Get location history for a delivery (route tracking).

**Response**:
```typescript
{
  deliveryId: string;
  route: Array<{
    latitude: number;
    longitude: number;
    timestamp: string; // ISO timestamp
  }>;
  totalDistanceKm: number;
}
```

**Authorization**: Customer who owns the order, delivery partner, or admin

#### POST /api/orders/[id]/notify-delivery-partners
Trigger proximity-based delivery partner notifications.

**Authorization**: System internal or admin

**Process**:
1. Get order and vendor location
2. Find available delivery partners within proximity threshold
3. Filter by service area containment
4. Sort by distance
5. Send notifications to top 5 via WebSocket
6. Set 60-second expiry timer

### Service Layer

#### GeoLocationService

**Responsibilities**:
- Coordinate validation
- Distance calculations
- Proximity queries
- ETA calculations

**Methods**:

```typescript
class GeoLocationService {
  // Validate coordinates are within valid geographic bounds
  static validateCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
  
  // Find vendors near a location using PostGIS
  static async findNearbyVendors(
    latitude: number,
    longitude: number,
    radiusKm: number = 50
  ): Promise<VendorWithDistance[]> {
    // Uses raw SQL with PostGIS functions
    // Returns vendors within radius and their service area
  }
  
  // Calculate distance between two points using PostGIS
  static async calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): Promise<number> {
    // Returns distance in kilometers
  }
  
  // Calculate ETA based on distance
  static calculateETA(distanceKm: number): number {
    const avgSpeedKmh = 30;
    const bufferMinutes = 5;
    const travelTimeMinutes = (distanceKm / avgSpeedKmh) * 60;
    return Math.ceil(travelTimeMinutes + bufferMinutes);
  }
  
  // Format ETA for display
  static formatETA(minutes: number, distanceKm: number): string {
    if (distanceKm < 1) return "Arriving soon";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  
  // Find delivery partners near a location
  static async findNearbyDeliveryPartners(
    latitude: number,
    longitude: number,
    radiusKm: number,
    serviceAreaId: string
  ): Promise<DeliveryPartnerWithDistance[]> {
    // Uses PostGIS to find available delivery partners
    // Filters by service area and availability status
    // Returns sorted by distance
  }
  
  // Check if point is within service area
  static async isWithinServiceArea(
    latitude: number,
    longitude: number,
    serviceAreaId: string
  ): Promise<boolean> {
    // Uses PostGIS ST_Contains for polygon containment
  }
}
```

#### LocationTrackingService

**Responsibilities**:
- Delivery partner location updates
- Location history management
- Real-time broadcasting coordination

**Methods**:

```typescript
class LocationTrackingService {
  // Update delivery partner location during active delivery
  static async updateDeliveryPartnerLocation(
    deliveryPartnerId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    // 1. Verify delivery partner has active delivery
    // 2. Validate coordinates
    // 3. Update DeliveryPartner current location
    // 4. Create LocationHistory record
    // 5. Calculate ETA to destination
    // 6. Trigger WebSocket broadcast
  }
  
  // Get current location for a delivery
  static async getDeliveryLocation(
    deliveryId: string
  ): Promise<DeliveryLocation | null> {
    // Returns current location and ETA
  }
  
  // Get location history (route) for a delivery
  static async getDeliveryRoute(
    deliveryId: string
  ): Promise<LocationHistory[]> {
    // Returns ordered location history
  }
  
  // Calculate total distance traveled
  static async calculateTotalDistance(
    deliveryId: string
  ): Promise<number> {
    // Sum distances between consecutive location points
  }
  
  // Clear location when delivery completes
  static async clearDeliveryPartnerLocation(
    deliveryPartnerId: string
  ): Promise<void> {
    // Set currentLatitude/currentLongitude to null
  }
  
  // Clean up old location history (90 days retention)
  static async cleanupOldLocationHistory(): Promise<void> {
    // Delete LocationHistory older than 90 days
  }
}
```

#### DeliveryMatchingService

**Responsibilities**:
- Proximity-based delivery partner matching
- Notification triggering
- Retry logic with expanding radius

**Methods**:

```typescript
class DeliveryMatchingService {
  // Find and notify nearby delivery partners
  static async notifyNearbyDeliveryPartners(
    orderId: string,
    proximityThresholdKm: number = 5
  ): Promise<void> {
    // 1. Get order and vendor location
    // 2. Find available delivery partners within threshold
    // 3. Filter by service area
    // 4. Sort by distance
    // 5. Take top 5
    // 6. Send notifications via WebSocket API
    // 7. Set 60-second expiry
  }
  
  // Retry with expanded radius
  static async retryWithExpandedRadius(
    orderId: string,
    attempt: number
  ): Promise<void> {
    // Expand radius by 5km per attempt (max 3 attempts)
    const radius = 5 + (attempt * 5);
    if (attempt >= 3) {
      // Mark order as requiring manual assignment
      return;
    }
    await this.notifyNearbyDeliveryPartners(orderId, radius);
  }
  
  // Cancel notifications when delivery accepted
  static async cancelPendingNotifications(
    orderId: string,
    acceptedByPartnerId: string
  ): Promise<void> {
    // Send cancellation event via WebSocket
  }
}
```

### WebSocket Server

#### Architecture

The WebSocket server is a separate Node.js application deployed independently from Next.js.

**Technology Stack**:
- Node.js with TypeScript
- ws library for WebSocket server
- Prisma Client for database access
- JWT for authentication

**Project Structure**:
```
websocket-server/
├── src/
│   ├── server.ts           # Main WebSocket server
│   ├── auth.ts             # JWT authentication
│   ├── connection-manager.ts # Connection state management
│   ├── event-handlers.ts   # Event routing logic
│   ├── http-api.ts         # HTTP API for triggering events
│   └── types.ts            # TypeScript types
├── prisma/
│   └── schema.prisma       # Shared schema (symlink or copy)
├── package.json
└── tsconfig.json
```

#### Connection Manager

```typescript
class ConnectionManager {
  private connections: Map<string, WebSocket>; // userId -> WebSocket
  private userRoles: Map<string, UserRole>;    // userId -> role
  private orderSubscriptions: Map<string, Set<string>>; // orderId -> Set<userId>
  
  // Add authenticated connection
  addConnection(userId: string, role: UserRole, ws: WebSocket): void;
  
  // Remove connection
  removeConnection(userId: string): void;
  
  // Subscribe user to order updates
  subscribeToOrder(userId: string, orderId: string): void;
  
  // Get all subscribers for an order
  getOrderSubscribers(orderId: string): string[];
  
  // Send event to specific user
  sendToUser(userId: string, event: WebSocketEvent): void;
  
  // Send event to multiple users
  sendToUsers(userIds: string[], event: WebSocketEvent): void;
  
  // Broadcast to all delivery partners in a region
  broadcastToDeliveryPartners(event: WebSocketEvent): void;
}
```

#### Event Types

```typescript
type WebSocketEvent = 
  | LocationUpdateEvent
  | DeliveryAssignedEvent
  | OrderReadyEvent
  | DeliveryCompletedEvent
  | NotificationCancelledEvent;

interface LocationUpdateEvent {
  type: 'location_update';
  eventId: string;
  deliveryId: string;
  latitude: number;
  longitude: number;
  eta: number; // minutes
  timestamp: string; // ISO
}

interface DeliveryAssignedEvent {
  type: 'delivery_assigned';
  eventId: string;
  orderId: string;
  vendorLocation: { latitude: number; longitude: number };
  deliveryAddress: { latitude: number; longitude: number; address: string };
  estimatedDistanceKm: number;
  paymentAmount: number;
  expiresAt: string; // ISO timestamp
}

interface OrderReadyEvent {
  type: 'order_ready';
  eventId: string;
  orderId: string;
  vendorLocation: { latitude: number; longitude: number };
  expiresAt: string;
}

interface DeliveryCompletedEvent {
  type: 'delivery_completed';
  eventId: string;
  deliveryId: string;
  completedAt: string;
}

interface NotificationCancelledEvent {
  type: 'notification_cancelled';
  eventId: string;
  orderId: string;
  reason: 'accepted_by_other' | 'cancelled';
}
```

#### HTTP API for Event Triggering

The WebSocket server exposes an HTTP API that the Next.js application calls to trigger events.

**POST /trigger/location-update**
```typescript
{
  deliveryId: string;
  latitude: number;
  longitude: number;
  eta: number;
}
```

**POST /trigger/delivery-assigned**
```typescript
{
  deliveryPartnerIds: string[];
  orderId: string;
  vendorLocation: { latitude: number; longitude: number };
  deliveryAddress: { latitude: number; longitude: number; address: string };
  estimatedDistanceKm: number;
  paymentAmount: number;
}
```

**POST /trigger/notification-cancelled**
```typescript
{
  deliveryPartnerIds: string[];
  orderId: string;
  reason: string;
}
```

**Authentication**: Shared secret or JWT for server-to-server communication

#### WebSocket Authentication Flow

1. Client connects to WebSocket server
2. Client sends authentication message with JWT token
3. Server validates JWT and extracts userId and role
4. Server adds connection to ConnectionManager
5. Server sends authentication success message
6. Client can now receive events

```typescript
// Client authentication message
{
  type: 'auth',
  token: 'jwt-token-here'
}

// Server response
{
  type: 'auth_success',
  userId: 'user-id'
}
```

### Client-Side Components

#### TrackingMap Component

React component for displaying real-time delivery tracking.

**Props**:
```typescript
interface TrackingMapProps {
  orderId: string;
  deliveryId: string;
  destination: { latitude: number; longitude: number; address: string };
}
```

**State**:
```typescript
interface TrackingMapState {
  currentLocation: { latitude: number; longitude: number } | null;
  eta: number | null;
  isConnected: boolean;
  deliveryStatus: DeliveryStatus;
}
```

**Functionality**:
- Initialize map with Mapbox/Leaflet
- Connect to WebSocket server with JWT
- Subscribe to location updates for the delivery
- Update delivery partner marker on location_update events
- Display route line from current location to destination
- Show ETA badge
- Handle delivery_completed event

**Libraries**:
- Mapbox GL JS or Leaflet for map rendering
- WebSocket client for real-time updates

#### VendorLocationPicker Component

React component for vendors to set their location.

**Props**:
```typescript
interface VendorLocationPickerProps {
  initialLocation?: { latitude: number; longitude: number };
  initialRadius?: number;
  onSave: (location: { latitude: number; longitude: number; serviceRadiusKm: number }) => Promise<void>;
}
```

**Functionality**:
- Display interactive map
- Allow clicking/dragging marker to set location
- Show latitude/longitude inputs for manual entry
- Display service radius circle overlay
- Validate coordinates before saving
- Call API to update vendor location

### Validation Schemas

#### Location Update Schema
```typescript
import { z } from 'zod';

export const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type LocationUpdate = z.infer<typeof locationUpdateSchema>;
```

#### Vendor Location Schema
```typescript
export const vendorLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  serviceRadiusKm: z.number().min(1).max(100),
});

export type VendorLocation = z.infer<typeof vendorLocationSchema>;
```

#### Nearby Vendors Query Schema
```typescript
export const nearbyVendorsQuerySchema = z.object({
  latitude: z.string().transform(Number).pipe(z.number().min(-90).max(90)),
  longitude: z.string().transform(Number).pipe(z.number().min(-180).max(180)),
  radius: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
});

export type NearbyVendorsQuery = z.infer<typeof nearbyVendorsQuerySchema>;
```

## Data Models

### TypeScript Types

```typescript
// Vendor with distance information
interface VendorWithDistance {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  distanceKm: number;
  isActive: boolean;
}

// Delivery partner with distance
interface DeliveryPartnerWithDistance {
  id: string;
  userId: string;
  currentLatitude: number;
  currentLongitude: number;
  distanceKm: number;
  availabilityStatus: AvailabilityStatus;
}

// Current delivery location
interface DeliveryLocation {
  deliveryId: string;
  latitude: number | null;
  longitude: number | null;
  lastUpdate: Date | null;
  eta: number | null; // minutes
}

// Location history point
interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

// Delivery route
interface DeliveryRoute {
  deliveryId: string;
  route: LocationPoint[];
  totalDistanceKm: number;
}
```

### Database Indexes

**Performance-Critical Indexes**:

1. **Vendor location spatial index**: For nearby vendor queries
   ```sql
   CREATE INDEX idx_vendor_location ON "Vendor" USING GIST(location);
   ```

2. **DeliveryPartner location spatial index**: For proximity matching
   ```sql
   CREATE INDEX idx_delivery_partner_location ON "DeliveryPartner" USING GIST(currentLocation);
   ```

3. **LocationHistory composite index**: For route queries
   ```sql
   CREATE INDEX idx_location_history_delivery_time ON "LocationHistory" (deliveryId, timestamp);
   ```

4. **Address location spatial index**: For customer location queries
   ```sql
   CREATE INDEX idx_address_location ON "Address" USING GIST(location);
   ```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Coordinate Validation
*For any* latitude and longitude values, the system should accept coordinates only when latitude is between -90 and 90 (inclusive) and longitude is between -180 and 180 (inclusive).

**Validates: Requirements 1.4, 2.3, 5.3**

### Property 2: Service Radius Validation
*For any* service radius value, the system should accept it only when it is between 1 and 100 kilometers (inclusive).

**Validates: Requirements 1.7**

### Property 3: Optional Address Coordinates
*For any* address creation or update, the system should accept addresses with or without latitude/longitude coordinates, treating null coordinates as valid.

**Validates: Requirements 2.2**

### Property 4: Address Coordinate Consistency
*For any* address with both text and coordinates, if the coordinates are more than 10 kilometers from the address text location, the system should reject the update.

**Validates: Requirements 2.5**

### Property 5: Distance Precision
*For any* two valid geographic coordinates, the calculated distance should be returned in kilometers with exactly two decimal places of precision.

**Validates: Requirements 3.5**

### Property 6: Nearby Vendor Service Radius Filtering
*For any* customer location and set of vendors, the nearby vendor search should return only vendors where the customer is within the vendor's service radius, and all returned vendors should be active.

**Validates: Requirements 4.1, 4.7**

### Property 7: Nearby Vendor Distance Sorting
*For any* nearby vendor search results, the vendors should be sorted by distance in ascending order (closest first).

**Validates: Requirements 4.4**

### Property 8: Nearby Vendor Distance Inclusion
*For any* nearby vendor search result, each vendor record should include the calculated distance in kilometers from the customer location.

**Validates: Requirements 4.5**

### Property 9: Location Updates Require Active Delivery
*For any* delivery partner, location updates should be accepted only when the delivery partner has an active delivery (status PICKED_UP or ACCEPTED).

**Validates: Requirements 5.2, 5.6**

### Property 10: Location Update Timestamp Recording
*For any* accepted location update, the system should record a timestamp indicating when the update was received.

**Validates: Requirements 5.4**

### Property 11: Location Cleared on Delivery Completion
*For any* delivery partner, when their active delivery is completed, the system should clear their currentLatitude and currentLongitude values (set to null).

**Validates: Requirements 5.5**

### Property 12: ETA Calculation on Location Update
*For any* location update during an active delivery, the system should calculate and store an updated ETA based on the distance from the current location to the destination.

**Validates: Requirements 5.7**

### Property 13: Location History Recording
*For any* location update during an active delivery, the system should create a LocationHistory record containing deliveryId, latitude, longitude, and timestamp.

**Validates: Requirements 6.2, 6.3**

### Property 14: Total Distance Calculation
*For any* completed delivery with location history, the total distance traveled should equal the sum of distances between consecutive location points in the history.

**Validates: Requirements 6.7**

### Property 15: Location Broadcast to Order Owner
*For any* location update during an active delivery, the WebSocket server should broadcast the update only to the customer who owns the associated order.

**Validates: Requirements 7.1, 7.2**

### Property 16: Location Broadcast Content
*For any* location broadcast via WebSocket, the message should include latitude, longitude, ETA, and timestamp fields.

**Validates: Requirements 7.3**

### Property 17: WebSocket Authentication Required
*For any* WebSocket connection attempt, the server should authenticate the connection using a JWT token before allowing any location data to be sent.

**Validates: Requirements 7.5**

### Property 18: Proximity Matching Distance Calculation
*For any* order ready for pickup, the system should find delivery partners by calculating the distance from the vendor location to each delivery partner's current location.

**Validates: Requirements 8.1**

### Property 19: Availability Status Filtering
*For any* proximity matching query, the system should include only delivery partners with availability status set to AVAILABLE.

**Validates: Requirements 8.3**

### Property 20: Service Area Containment Filtering
*For any* proximity matching query, the system should include only delivery partners whose service areas contain the vendor location.

**Validates: Requirements 8.4**

### Property 21: Delivery Partner Distance Sorting
*For any* proximity matching results, eligible delivery partners should be sorted by distance from the vendor in ascending order (closest first).

**Validates: Requirements 8.5**

### Property 22: Notification Limit
*For any* proximity matching result, the system should notify at most 5 delivery partners, selecting the 5 nearest eligible partners.

**Validates: Requirements 8.6**

### Property 23: WebSocket Event Type Support
*For any* WebSocket event, the event type should be one of: location_update, delivery_assigned, order_ready, delivery_completed, or notification_cancelled.

**Validates: Requirements 9.4**

### Property 24: WebSocket JWT Authentication
*For any* WebSocket client connection, the server should validate the JWT token and extract userId and role before accepting the connection.

**Validates: Requirements 9.5**

### Property 25: Delivery Assignment Notification Content
*For any* delivery assignment notification, the message should include orderId, vendorLocation, deliveryAddress, estimatedDistanceKm, and paymentAmount fields.

**Validates: Requirements 10.1, 10.2**

### Property 26: Notification Expiry Time
*For any* delivery assignment notification, the system should set an expiry timestamp of 60 seconds from the notification time.

**Validates: Requirements 10.3**

### Property 27: Geographic Region Validation
*For any* vendor location selection, the system should validate that the coordinates are within supported geographic regions before saving.

**Validates: Requirements 12.6**

### Property 28: Location Privacy During Active Delivery Only
*For any* delivery partner, their current location should be accessible via API only when they have an active delivery (status PICKED_UP or ACCEPTED).

**Validates: Requirements 13.1**

### Property 29: Order Tracking Authorization
*For any* order tracking request, the system should verify that the requesting customer owns the order before returning location data.

**Validates: Requirements 13.3**

### Property 30: ETA Calculation Formula
*For any* distance in kilometers, the calculated ETA should equal (distance / 30) * 60 + 5 minutes, rounded up to the nearest minute.

**Validates: Requirements 14.2**

### Property 31: ETA Display Formatting
*For any* ETA value, if the ETA is less than 60 minutes, it should be displayed as "{minutes} min", otherwise as "{hours}h {minutes}m".

**Validates: Requirements 14.6**

### Property 32: Multiple Service Area Matching
*For any* delivery partner with multiple service areas, they should be included in proximity matching if any of their service areas contains the vendor location.

**Validates: Requirements 15.3**

### Property 33: Service Area Requirement
*For any* proximity matching query, delivery partners with no service areas defined should be excluded from results.

**Validates: Requirements 15.4**

## Error Handling

### Validation Errors

**Invalid Coordinates**:
- HTTP 400 Bad Request
- Error message: "Invalid coordinates: latitude must be between -90 and 90, longitude must be between -180 and 180"

**Invalid Service Radius**:
- HTTP 400 Bad Request
- Error message: "Invalid service radius: must be between 1 and 100 kilometers"

**Address Coordinate Mismatch**:
- HTTP 400 Bad Request
- Error message: "Coordinates do not match address location (distance exceeds 10km)"

### Authorization Errors

**Unauthorized Location Update**:
- HTTP 403 Forbidden
- Error message: "Cannot update location: no active delivery assigned"

**Unauthorized Tracking Access**:
- HTTP 403 Forbidden
- Error message: "Cannot access tracking: order does not belong to user"

**Invalid WebSocket Token**:
- WebSocket close with code 4001
- Error message: "Authentication failed: invalid or expired token"

### Rate Limiting Errors

**Location Update Rate Limit**:
- HTTP 429 Too Many Requests
- Error message: "Location update rate limit exceeded: maximum 1 update per 10 seconds"
- Retry-After header: seconds until next allowed request

### Resource Not Found Errors

**Vendor Not Found**:
- HTTP 404 Not Found
- Error message: "Vendor not found"

**Delivery Not Found**:
- HTTP 404 Not Found
- Error message: "Delivery not found"

**Order Not Found**:
- HTTP 404 Not Found
- Error message: "Order not found"

### Database Errors

**PostGIS Extension Not Enabled**:
- HTTP 500 Internal Server Error
- Error message: "Geolocation service unavailable"
- Log: "PostGIS extension not enabled in database"

**Spatial Index Missing**:
- HTTP 500 Internal Server Error
- Error message: "Geolocation query failed"
- Log: "Spatial index missing on table {table_name}"

### WebSocket Errors

**Connection Timeout**:
- WebSocket close with code 1000
- Clean up connection state after 60 seconds of inactivity

**Event Delivery Failure**:
- Retry up to 3 times with exponential backoff (1s, 2s, 4s)
- Log failure after all retries exhausted
- Do not block other event deliveries

**Invalid Event Format**:
- Log error and discard event
- Do not close connection

### External Service Errors

**WebSocket Server Unavailable**:
- Log error: "Failed to trigger WebSocket notification: server unavailable"
- Continue processing (location update still saved to database)
- Return success to client (degraded mode)

**Database Connection Pool Exhausted**:
- HTTP 503 Service Unavailable
- Error message: "Service temporarily unavailable, please try again"
- Retry-After header: 5 seconds

## Testing Strategy

### Unit Testing

Unit tests focus on specific functions and edge cases:

**Coordinate Validation**:
- Test valid coordinates at boundaries (-90, 90, -180, 180)
- Test invalid coordinates outside boundaries
- Test null/undefined handling

**Distance Calculation**:
- Test known coordinate pairs with expected distances
- Test same location (distance = 0)
- Test antipodal points (maximum distance)

**ETA Calculation**:
- Test various distances (0.5km, 5km, 50km)
- Test buffer addition (5 minutes)
- Test rounding behavior

**ETA Formatting**:
- Test minutes display (< 60 minutes)
- Test hours and minutes display (>= 60 minutes)
- Test "Arriving soon" for < 1km

**Service Area Containment**:
- Test point inside polygon
- Test point outside polygon
- Test point on polygon boundary

### Property-Based Testing

Property-based tests verify universal properties across randomized inputs using fast-check. Each test runs a minimum of 100 iterations.

**Configuration**:
```typescript
import fc from 'fast-check';

// Run each property test with 100 iterations
const testConfig = { numRuns: 100 };
```

**Property Test Examples**:

**Property 1: Coordinate Validation**
```typescript
// Feature: geolocation-live-tracking, Property 1: Coordinate Validation
fc.assert(
  fc.property(
    fc.float({ min: -180, max: 180 }),
    fc.float({ min: -180, max: 180 }),
    (lat, lng) => {
      const isValid = GeoLocationService.validateCoordinates(lat, lng);
      const expectedValid = lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      return isValid === expectedValid;
    }
  ),
  testConfig
);
```

**Property 6: Nearby Vendor Service Radius Filtering**
```typescript
// Feature: geolocation-live-tracking, Property 6: Nearby Vendor Service Radius Filtering
fc.assert(
  fc.property(
    fc.record({
      customerLat: fc.float({ min: -90, max: 90 }),
      customerLng: fc.float({ min: -180, max: 180 }),
      vendors: fc.array(fc.record({
        id: fc.uuid(),
        latitude: fc.float({ min: -90, max: 90 }),
        longitude: fc.float({ min: -180, max: 180 }),
        serviceRadiusKm: fc.float({ min: 1, max: 100 }),
        isActive: fc.boolean(),
      })),
    }),
    async ({ customerLat, customerLng, vendors }) => {
      // Setup: Insert vendors into test database
      await setupTestVendors(vendors);
      
      // Execute: Search for nearby vendors
      const results = await GeoLocationService.findNearbyVendors(
        customerLat,
        customerLng,
        100 // max radius
      );
      
      // Verify: All results are within service radius and active
      return results.every(vendor => {
        const matchingVendor = vendors.find(v => v.id === vendor.id);
        return matchingVendor.isActive && 
               vendor.distanceKm <= matchingVendor.serviceRadiusKm;
      });
    }
  ),
  testConfig
);
```

**Property 7: Nearby Vendor Distance Sorting**
```typescript
// Feature: geolocation-live-tracking, Property 7: Nearby Vendor Distance Sorting
fc.assert(
  fc.property(
    fc.record({
      customerLat: fc.float({ min: -90, max: 90 }),
      customerLng: fc.float({ min: -180, max: 180 }),
      vendors: fc.array(fc.record({
        latitude: fc.float({ min: -90, max: 90 }),
        longitude: fc.float({ min: -180, max: 180 }),
        serviceRadiusKm: fc.float({ min: 1, max: 100 }),
        isActive: fc.constant(true),
      }), { minLength: 2 }),
    }),
    async ({ customerLat, customerLng, vendors }) => {
      await setupTestVendors(vendors);
      
      const results = await GeoLocationService.findNearbyVendors(
        customerLat,
        customerLng,
        100
      );
      
      // Verify: Results are sorted by distance ascending
      for (let i = 1; i < results.length; i++) {
        if (results[i].distanceKm < results[i - 1].distanceKm) {
          return false;
        }
      }
      return true;
    }
  ),
  testConfig
);
```

**Property 14: Total Distance Calculation**
```typescript
// Feature: geolocation-live-tracking, Property 14: Total Distance Calculation
fc.assert(
  fc.property(
    fc.array(
      fc.record({
        latitude: fc.float({ min: -90, max: 90 }),
        longitude: fc.float({ min: -180, max: 180 }),
        timestamp: fc.date(),
      }),
      { minLength: 2, maxLength: 20 }
    ),
    async (locationHistory) => {
      // Setup: Create delivery with location history
      const deliveryId = await setupTestDeliveryWithHistory(locationHistory);
      
      // Execute: Calculate total distance
      const totalDistance = await LocationTrackingService.calculateTotalDistance(deliveryId);
      
      // Verify: Total equals sum of consecutive point distances
      let expectedTotal = 0;
      for (let i = 1; i < locationHistory.length; i++) {
        const dist = await GeoLocationService.calculateDistance(
          locationHistory[i - 1].latitude,
          locationHistory[i - 1].longitude,
          locationHistory[i].latitude,
          locationHistory[i].longitude
        );
        expectedTotal += dist;
      }
      
      // Allow small floating point difference
      return Math.abs(totalDistance - expectedTotal) < 0.01;
    }
  ),
  testConfig
);
```

**Property 30: ETA Calculation Formula**
```typescript
// Feature: geolocation-live-tracking, Property 30: ETA Calculation Formula
fc.assert(
  fc.property(
    fc.float({ min: 0.1, max: 100 }), // distance in km
    (distanceKm) => {
      const eta = GeoLocationService.calculateETA(distanceKm);
      const expected = Math.ceil((distanceKm / 30) * 60 + 5);
      return eta === expected;
    }
  ),
  testConfig
);
```

### Integration Testing

Integration tests verify interactions between components:

**Nearby Vendor API**:
- Test GET /api/vendors/nearby with valid coordinates
- Test response format and data structure
- Test with no nearby vendors
- Test with vendors outside service radius

**Location Update API**:
- Test POST /api/delivery-partners/location with active delivery
- Test rejection without active delivery
- Test rate limiting (multiple rapid requests)
- Test WebSocket notification triggering

**Delivery Tracking API**:
- Test GET /api/deliveries/[id]/location with valid delivery
- Test authorization (customer owns order)
- Test with no location data available

**WebSocket Connection**:
- Test connection with valid JWT
- Test connection with invalid JWT
- Test receiving location updates
- Test connection cleanup on disconnect

### End-to-End Testing

E2E tests verify complete user workflows:

**Vendor Location Setup**:
1. Vendor logs in
2. Navigates to location settings
3. Sets location on map
4. Saves location
5. Verify location stored in database

**Customer Nearby Vendor Search**:
1. Customer logs in
2. Provides location
3. Searches for nearby vendors
4. Verify results show only nearby vendors
5. Verify results sorted by distance

**Delivery Tracking**:
1. Customer places order
2. Vendor accepts and marks ready
3. Delivery partner accepts delivery
4. Delivery partner updates location
5. Customer views tracking map
6. Verify map shows current location
7. Delivery partner completes delivery
8. Verify tracking stops

### Performance Testing

**Nearby Vendor Query Performance**:
- Test with 10,000 vendors in database
- Verify query completes within 200ms
- Verify spatial indexes are used (EXPLAIN ANALYZE)

**Location Update Throughput**:
- Simulate 100 concurrent delivery partners
- Each updates location every 15 seconds
- Verify system handles load without errors
- Verify database connection pool not exhausted

**WebSocket Concurrent Connections**:
- Establish 1,000 concurrent WebSocket connections
- Verify all connections authenticated
- Send location updates to random connections
- Verify messages delivered correctly
- Measure memory usage and connection overhead

### Test Data Generators

**Random Coordinate Generator**:
```typescript
const randomCoordinate = () => ({
  latitude: Math.random() * 180 - 90,
  longitude: Math.random() * 360 - 180,
});
```

**Random Vendor Generator**:
```typescript
const randomVendor = () => ({
  id: uuid(),
  name: faker.company.name(),
  latitude: Math.random() * 180 - 90,
  longitude: Math.random() * 360 - 180,
  serviceRadiusKm: Math.random() * 99 + 1,
  isActive: Math.random() > 0.2, // 80% active
});
```

**Random Location History Generator**:
```typescript
const randomLocationHistory = (count: number) => {
  const startLat = Math.random() * 180 - 90;
  const startLng = Math.random() * 360 - 180;
  const history = [{ latitude: startLat, longitude: startLng, timestamp: new Date() }];
  
  for (let i = 1; i < count; i++) {
    // Move slightly from previous position
    const prevLat = history[i - 1].latitude;
    const prevLng = history[i - 1].longitude;
    history.push({
      latitude: prevLat + (Math.random() - 0.5) * 0.01,
      longitude: prevLng + (Math.random() - 0.5) * 0.01,
      timestamp: new Date(history[i - 1].timestamp.getTime() + 15000), // +15 seconds
    });
  }
  
  return history;
};
```
