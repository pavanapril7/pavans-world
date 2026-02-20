# Design Document: Polygon-Based Service Area Management

## Overview

This design implements polygon-based geographic boundaries for service areas using PostGIS spatial extensions in PostgreSQL. The system replaces the current pincode-based approach with precise polygon boundaries, enabling accurate location validation and location-aware vendor discovery.

The design introduces three major capabilities:
1. **Admin polygon management** - Interactive map interface for drawing and editing service area boundaries
2. **Customer location selection** - Address-based filtering that shows only serviceable vendors
3. **Enhanced spatial matching** - Polygon-based validation for orders and delivery partner assignment

Key technologies:
- PostGIS for spatial data storage and queries
- Leaflet with Leaflet.draw for interactive map editing
- Redis caching for spatial query optimization
- React components for location-aware UI

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  AddressSelector │ ServiceAreaMapEditor │ VendorListWithDistance │
│  LocationValidationMessage │ ServiceAreaPolygonDisplay      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
├─────────────────────────────────────────────────────────────┤
│  /api/vendors/nearby                                         │
│  /api/service-areas/for-location                            │
│  /api/admin/service-areas (CRUD)                            │
│  /api/addresses/validate                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
├─────────────────────────────────────────────────────────────┤
│  GeoLocationService (enhanced with polygon operations)       │
│  ServiceAreaService (new)                                    │
│  VendorDiscoveryService (new)                               │
│  DeliveryMatchingService (enhanced)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                 │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL + PostGIS Extension                              │
│  - ServiceArea (with boundary geometry column)               │
│  - Address (with serviceAreaId reference)                    │
│  - Spatial indexes (GIST)                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cache Layer                                │
├─────────────────────────────────────────────────────────────┤
│  Redis - Service area lookups (5 min TTL)                   │
│  Redis - Vendor discovery results (2 min TTL)               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Admin Creating Service Area:**
1. Admin draws polygon on map using Leaflet.draw
2. Frontend sends polygon coordinates (GeoJSON) to API
3. ServiceAreaService validates polygon quality
4. PostGIS stores polygon as geometry(Polygon, 4326)
5. System calculates and stores center point
6. Spatial index automatically updated

**Customer Selecting Address:**
1. Customer selects address from dropdown
2. Frontend calls /api/service-areas/for-location
3. GeoLocationService queries PostGIS with ST_Contains
4. Result cached in Redis for 5 minutes
5. serviceAreaId stored with address
6. Redux state and localStorage updated
7. Vendor list automatically filtered

**Vendor Discovery:**
1. Customer browses products with selected address
2. Frontend calls /api/vendors/nearby with coordinates
3. VendorDiscoveryService performs hybrid filtering:
   - Same service area (indexed lookup)
   - Within vendor service radius (ST_Distance)
   - ACTIVE status
4. Results sorted by distance (ST_Distance)
5. Results cached in Redis for 2 minutes

## Components and Interfaces

### Database Schema Changes

```prisma
model ServiceArea {
  id              String            @id @default(uuid())
  name            String
  city            String
  state           String
  pincodes        String[]          // Keep for backward compatibility
  boundary        Unsupported("geometry(Polygon, 4326)")?  // PostGIS polygon
  centerLatitude  Float?
  centerLongitude Float?
  status          ServiceAreaStatus @default(ACTIVE)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  // Relations
  vendors          Vendor[]
  deliveryPartners DeliveryPartner[]
  addresses        Address[]

  @@index([status])
  @@index([boundary], type: Gist)  // Spatial index
}

model Address {
  id            String   @id @default(uuid())
  userId        String
  label         String
  street        String
  landmark      String
  city          String
  state         String
  pincode       String
  latitude      Float?
  longitude     Float?
  serviceAreaId String?  // New field
  isDefault     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  serviceArea ServiceArea? @relation(fields: [serviceAreaId], references: [id])
  orders      Order[]

  @@index([userId])
  @@index([pincode])
  @@index([latitude, longitude])
  @@index([serviceAreaId])
}
```

### Service Interfaces

#### ServiceAreaService

```typescript
interface ServiceAreaData {
  name: string;
  city: string;
  state: string;
  boundary: GeoJSON.Polygon;
  pincodes?: string[];
}

interface ServiceAreaWithStats {
  id: string;
  name: string;
  city: string;
  state: string;
  boundary: GeoJSON.Polygon;
  centerLatitude: number;
  centerLongitude: number;
  status: ServiceAreaStatus;
  stats: {
    areaSqKm: number;
    vendorCount: number;
    deliveryPartnerCount: number;
    addressCount: number;
    orderCount30Days: number;
  };
}

class ServiceAreaService {
  // Create service area with polygon boundary
  static async createServiceArea(data: ServiceAreaData): Promise<ServiceArea>;
  
  // Update service area polygon
  static async updateServiceArea(id: string, data: Partial<ServiceAreaData>): Promise<ServiceArea>;
  
  // Get service area with coverage statistics
  static async getServiceAreaWithStats(id: string): Promise<ServiceAreaWithStats>;
  
  // Delete service area (with validation)
  static async deleteServiceArea(id: string): Promise<void>;
  
  // List all service areas with optional filtering
  static async listServiceAreas(filters?: { status?: ServiceAreaStatus; city?: string }): Promise<ServiceArea[]>;
}
```

#### Enhanced GeoLocationService

```typescript
interface PointInServiceAreaResult {
  isWithin: boolean;
  serviceArea: ServiceArea | null;
  nearestServiceArea?: {
    id: string;
    name: string;
    distanceKm: number;
  };
}

class GeoLocationService {
  // Existing methods...
  
  // Find service area containing a point
  static async findServiceAreaForPoint(latitude: number, longitude: number): Promise<ServiceArea | null>;
  
  // Validate point is within any service area
  static async validatePointInServiceArea(latitude: number, longitude: number): Promise<PointInServiceAreaResult>;
  
  // Calculate polygon center point
  static calculatePolygonCenter(polygon: GeoJSON.Polygon): { latitude: number; longitude: number };
  
  // Check if polygon overlaps with existing service areas
  static async checkPolygonOverlap(polygon: GeoJSON.Polygon, excludeId?: string): Promise<{ overlaps: boolean; overlapPercent: number; overlappingAreas: string[] }>;
  
  // Validate polygon quality
  static validatePolygon(polygon: GeoJSON.Polygon): { valid: boolean; errors: string[] };
  
  // Calculate polygon area in square kilometers
  static async calculatePolygonArea(polygon: GeoJSON.Polygon): Promise<number>;
}
```

#### VendorDiscoveryService

```typescript
interface VendorDiscoveryFilters {
  latitude: number;
  longitude: number;
  serviceAreaId?: string;
  categoryId?: string;
  maxDistanceKm?: number;
}

interface VendorWithLocationInfo extends VendorWithDistance {
  serviceAreaName: string;
  isWithinServiceRadius: boolean;
}

class VendorDiscoveryService {
  // Find vendors for a specific location
  static async findVendorsForLocation(filters: VendorDiscoveryFilters): Promise<VendorWithLocationInfo[]>;
  
  // Check if vendor can serve an address
  static async canVendorServeAddress(vendorId: string, addressId: string): Promise<{ canServe: boolean; reason?: string }>;
}
```

### API Endpoints

#### GET /api/vendors/nearby

**Query Parameters:**
- `latitude` (required): Customer latitude
- `longitude` (required): Customer longitude
- `categoryId` (optional): Filter by vendor category
- `maxDistance` (optional): Maximum distance in km (default: 50)

**Response:**
```typescript
{
  vendors: VendorWithLocationInfo[];
  serviceArea: {
    id: string;
    name: string;
  } | null;
}
```

#### GET /api/service-areas/for-location

**Query Parameters:**
- `latitude` (required): Point latitude
- `longitude` (required): Point longitude

**Response:**
```typescript
{
  serviceArea: {
    id: string;
    name: string;
    city: string;
    state: string;
    centerLatitude: number;
    centerLongitude: number;
  } | null;
  isServiceable: boolean;
  nearestServiceArea?: {
    id: string;
    name: string;
    distanceKm: number;
  };
}
```

#### POST /api/admin/service-areas

**Request Body:**
```typescript
{
  name: string;
  city: string;
  state: string;
  boundary: GeoJSON.Polygon;
  pincodes?: string[];
}
```

**Response:**
```typescript
{
  serviceArea: ServiceArea;
  warnings?: string[];  // e.g., overlap warnings
}
```

#### PUT /api/admin/service-areas/:id

**Request Body:**
```typescript
{
  name?: string;
  city?: string;
  state?: string;
  boundary?: GeoJSON.Polygon;
  status?: ServiceAreaStatus;
}
```

#### GET /api/admin/service-areas/:id/coverage

**Response:**
```typescript
{
  serviceArea: ServiceAreaWithStats;
}
```

#### POST /api/addresses/validate

**Request Body:**
```typescript
{
  latitude: number;
  longitude: number;
  addressId?: string;  // Optional, for updating existing address
}
```

**Response:**
```typescript
{
  isServiceable: boolean;
  serviceAreaId?: string;
  serviceAreaName?: string;
  reason?: string;  // If not serviceable
  nearestServiceArea?: {
    id: string;
    name: string;
    distanceKm: number;
  };
}
```

## Data Models

### Polygon Storage Format

Polygons are stored in PostGIS as `geometry(Polygon, 4326)` where:
- **4326** is the SRID (Spatial Reference System Identifier) for WGS 84 (standard GPS coordinates)
- Coordinates are stored as longitude, latitude (PostGIS convention)
- Frontend uses GeoJSON format (latitude, longitude pairs)

**Conversion between formats:**

```typescript
// GeoJSON to WKT (for PostGIS)
function geoJsonToWKT(polygon: GeoJSON.Polygon): string {
  const coords = polygon.coordinates[0]
    .map(([lng, lat]) => `${lng} ${lat}`)
    .join(', ');
  return `POLYGON((${coords}))`;
}

// WKT to GeoJSON (from PostGIS)
function wktToGeoJson(wkt: string): GeoJSON.Polygon {
  // Parse WKT string and convert to GeoJSON
  // Implementation uses wellknown library
}
```

### Spatial Query Patterns

**Find service area containing a point:**
```sql
SELECT * FROM "ServiceArea"
WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326))
AND status = 'ACTIVE'
LIMIT 1;
```

**Find vendors in service area within radius:**
```sql
SELECT 
  v.*,
  ST_Distance(
    ST_SetSRID(ST_MakePoint(v.longitude, v.latitude), 4326)::geography,
    ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326)::geography
  ) / 1000 as "distanceKm"
FROM "Vendor" v
WHERE 
  v.status = 'ACTIVE'
  AND v."serviceAreaId" = $serviceAreaId
  AND ST_DWithin(
    ST_SetSRID(ST_MakePoint(v.longitude, v.latitude), 4326)::geography,
    ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326)::geography,
    v."serviceRadiusKm" * 1000
  )
ORDER BY "distanceKm" ASC;
```

**Check polygon overlap:**
```sql
SELECT 
  id, 
  name,
  ST_Area(ST_Intersection(boundary, ST_GeomFromText($wkt, 4326))::geography) / 
  ST_Area(boundary::geography) * 100 as "overlapPercent"
FROM "ServiceArea"
WHERE 
  id != $excludeId
  AND ST_Overlaps(boundary, ST_GeomFromText($wkt, 4326))
  OR ST_Contains(boundary, ST_GeomFromText($wkt, 4326))
  OR ST_Within(boundary, ST_GeomFromText($wkt, 4326));
```

### Redux State Management

```typescript
interface LocationState {
  selectedAddress: {
    id: string;
    label: string;
    street: string;
    city: string;
    latitude: number;
    longitude: number;
    serviceAreaId: string;
    serviceAreaName: string;
  } | null;
  serviceableVendors: VendorWithLocationInfo[];
  isLoadingVendors: boolean;
}

// Actions
const locationSlice = createSlice({
  name: 'location',
  initialState: {
    selectedAddress: null,
    serviceableVendors: [],
    isLoadingVendors: false,
  },
  reducers: {
    setSelectedAddress: (state, action: PayloadAction<LocationState['selectedAddress']>) => {
      state.selectedAddress = action.payload;
      // Persist to localStorage
      if (action.payload) {
        localStorage.setItem('selectedAddress', JSON.stringify(action.payload));
      } else {
        localStorage.removeItem('selectedAddress');
      }
    },
    setServiceableVendors: (state, action: PayloadAction<VendorWithLocationInfo[]>) => {
      state.serviceableVendors = action.payload;
    },
    setLoadingVendors: (state, action: PayloadAction<boolean>) => {
      state.isLoadingVendors = action.payload;
    },
  },
});
```

## Correctness Properties


A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Polygon Format Round-Trip Consistency

*For any* valid service area polygon, converting from GeoJSON to WKT and back to GeoJSON should produce an equivalent polygon with the same coordinate points.

**Validates: Requirements 1.6**

### Property 2: Polygon Validation Rejects Invalid Polygons

*For any* polygon that violates validation rules (fewer than 3 points, not closed, self-intersecting edges, area < 0.1 km² or > 10000 km²), the system should reject it with a descriptive error message.

**Validates: Requirements 1.5, 2.6, 14.1, 14.2, 14.3, 14.4, 14.5**

### Property 3: Service Area Creation and Retrieval Consistency

*For any* valid service area polygon saved by an administrator, retrieving that service area should return the same polygon boundary with automatically calculated center point.

**Validates: Requirements 2.2, 2.3, 2.4**

### Property 4: Service Area Deletion Completeness

*For any* service area that is deleted, all associated polygon boundary data should be removed and the service area should no longer be retrievable.

**Validates: Requirements 2.5**

### Property 5: Point-in-Polygon Validation Accuracy

*For any* address coordinates and service area polygon, if the point is geometrically within the polygon boundary, validation should succeed and return the service area; if outside all polygons, validation should fail.

**Validates: Requirements 3.2, 5.1**

### Property 6: Address Service Area Assignment

*For any* address validated as serviceable, the serviceAreaId should be stored with the address record and be retrievable in subsequent queries.

**Validates: Requirements 3.4**

### Property 7: Address Selection Persistence

*For any* customer address selection, storing it in Redux state and localStorage then retrieving it should return the same address data.

**Validates: Requirements 3.5**

### Property 8: Vendor Filtering by Service Area

*For any* customer address with a service area, all vendors returned by the discovery service should be in the same service area as the customer address.

**Validates: Requirements 3.6, 4.1, 5.2, 6.1**

### Property 9: Vendor Service Radius Constraint

*For any* customer address, all vendors returned by the discovery service should have the customer address within their service radius distance.

**Validates: Requirements 4.2, 5.3**

### Property 10: Vendor Active Status Filter

*For any* vendor discovery query, all returned vendors should have ACTIVE status.

**Validates: Requirements 4.3**

### Property 11: Vendor Distance Calculation Consistency

*For any* vendor-customer address pair, calculating the distance multiple times should return the same value, and the distance should be symmetric (distance A to B equals distance B to A).

**Validates: Requirements 4.4**

### Property 12: Vendor List Distance Ordering

*For any* list of vendors returned for a customer location, the vendors should be sorted in ascending order by distance from the customer address.

**Validates: Requirements 4.5, 6.5**

### Property 13: Delivery Partner Service Area Containment

*For any* delivery partner matched to an order, the partner's current location should be within the service area polygon, and the partner should be in the same service area as the order.

**Validates: Requirements 6.2, 6.4**

### Property 14: Delivery Partner Proximity Constraint

*For any* delivery partner matched to an order, the partner should be within the proximity threshold distance of the vendor location.

**Validates: Requirements 6.3**

### Property 15: Top N Delivery Partner Notification

*For any* order with eligible delivery partners, the system should notify exactly the N nearest partners (where N = 5 or the total number of eligible partners if fewer than 5).

**Validates: Requirements 6.6**

### Property 16: Invalid Coordinate Error Handling

*For any* API endpoint that receives coordinates outside valid geographic bounds (latitude not in [-90, 90] or longitude not in [-180, 180]), the system should return HTTP 400 with error message "Invalid coordinates provided".

**Validates: Requirements 8.7**

### Property 17: Service Area Lookup Caching

*For any* address coordinates, looking up the service area twice within 5 minutes should return the cached result on the second lookup without querying the database.

**Validates: Requirements 11.2**

### Property 18: Overlapping Service Area Resolution

*For any* address that falls within multiple overlapping service areas, the system should select the service area with the smallest area.

**Validates: Requirements 12.2**

### Property 19: Vendor Service Polygon Constraint

*For any* vendor with a service radius extending beyond their service area polygon, only addresses within the polygon boundary should be considered serviceable regardless of radius.

**Validates: Requirements 12.3**

### Property 20: Coverage Statistics Accuracy

*For any* service area, the coverage statistics (area size, vendor count, delivery partner count, address count, order count) should match the actual counts from the database at query time.

**Validates: Requirements 2.7, 13.1, 13.2, 13.3, 13.4, 13.5**

### Property 21: Polygon Overlap Warning

*For any* service area polygon that overlaps with existing service areas by more than 10 percent, the system should generate a warning message indicating the overlap.

**Validates: Requirements 14.7**

### Property 22: Address Validation Response Format

*For any* address validation request, the response should include isServiceable boolean, and if serviceable should include serviceAreaId and serviceAreaName, and if not serviceable should include reason and nearest service area distance.

**Validates: Requirements 15.1, 15.2, 15.4, 15.5**

### Property 23: Validation Error Response Format

*For any* address validation that encounters an error (invalid input, database error), the system should return HTTP 400 or 500 with JSON containing error code and message.

**Validates: Requirements 15.3**

## Error Handling

### Validation Errors

**Invalid Coordinates:**
- Latitude outside [-90, 90] or longitude outside [-180, 180]
- Response: HTTP 400 with `{ error: { code: "INVALID_COORDINATES", message: "Invalid coordinates provided" } }`

**Invalid Polygon:**
- Fewer than 3 coordinate points
- Polygon not closed (first and last points differ)
- Self-intersecting edges
- Area < 0.1 km² or > 10000 km²
- Response: HTTP 400 with `{ error: { code: "INVALID_POLYGON", message: "<specific validation failure>" } }`

**Address Not Serviceable:**
- Address outside all service area polygons
- Response: HTTP 200 with `{ isServiceable: false, reason: "We don't serve this location yet", nearestServiceArea: {...} }`

**Vendor Cannot Serve Address:**
- Vendor not in same service area as address
- Response: HTTP 400 with `{ error: { code: "VENDOR_SERVICE_AREA_MISMATCH", message: "Vendor does not serve this location" } }`

**Address Beyond Service Radius:**
- Address outside vendor's service radius
- Response: HTTP 400 with `{ error: { code: "BEYOND_SERVICE_RADIUS", message: "Address is beyond vendor's delivery range" } }`

### Database Errors

**PostGIS Extension Not Available:**
- PostGIS functions fail
- Response: HTTP 500 with `{ error: { code: "DATABASE_ERROR", message: "Spatial operations unavailable" } }`
- Fallback: Log error and notify administrators

**Spatial Query Timeout:**
- Query exceeds 100ms threshold
- Action: Log performance warning with query details
- Continue execution (non-blocking)

**Migration Failures:**
- PostGIS extension installation fails
- Schema changes fail
- Action: Rollback migration, log detailed error, halt deployment

### Service Errors

**No Delivery Partners Available:**
- No partners match order criteria after 3 retry attempts with expanded radius
- Action: Create order status history note "Requires manual assignment"
- Notify administrators via audit log

**Cache Unavailable:**
- Redis connection fails
- Fallback: Execute queries directly against database
- Log warning for monitoring

**Polygon Overlap Warning:**
- New service area overlaps existing by > 10%
- Action: Return warning in response, allow creation
- Log overlap details for administrator review

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of polygon validation (valid polygon, invalid polygon with 2 points, self-intersecting polygon)
- Edge cases (address exactly on boundary, empty service area list)
- Error conditions (invalid coordinates, missing PostGIS extension)
- Integration points (API endpoint responses, database migrations)
- UI component rendering (AddressSelector, ServiceAreaMapEditor)

**Property-Based Tests** focus on:
- Universal properties across all inputs (polygon round-trip, distance symmetry)
- Comprehensive input coverage through randomization (random polygons, random coordinates)
- Invariants (vendor filtering always returns same service area, distance ordering)
- Statistical properties (caching reduces database queries)

### Property-Based Testing Configuration

**Library:** fast-check (already in project dependencies)

**Test Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `// Feature: service-area-polygon-management, Property N: <property text>`

**Example Property Test Structure:**

```typescript
import fc from 'fast-check';

describe('Service Area Polygon Management Properties', () => {
  // Feature: service-area-polygon-management, Property 1: Polygon Format Round-Trip Consistency
  it('should preserve polygon coordinates through GeoJSON-WKT-GeoJSON conversion', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.double(-180, 180), fc.double(-90, 90)), { minLength: 4, maxLength: 20 }),
        (coords) => {
          // Ensure polygon is closed
          const closedCoords = [...coords, coords[0]];
          const geoJson: GeoJSON.Polygon = {
            type: 'Polygon',
            coordinates: [closedCoords],
          };
          
          const wkt = geoJsonToWKT(geoJson);
          const roundTripped = wktToGeoJson(wkt);
          
          // Verify coordinates match (within floating point precision)
          expect(roundTripped.coordinates[0]).toHaveLength(closedCoords.length);
          roundTripped.coordinates[0].forEach((coord, i) => {
            expect(coord[0]).toBeCloseTo(closedCoords[i][0], 6);
            expect(coord[1]).toBeCloseTo(closedCoords[i][1], 6);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: service-area-polygon-management, Property 11: Vendor Distance Calculation Consistency
  it('should calculate symmetric distances between vendor and customer', () => {
    fc.assert(
      fc.property(
        fc.double(-90, 90), // vendor lat
        fc.double(-180, 180), // vendor lng
        fc.double(-90, 90), // customer lat
        fc.double(-180, 180), // customer lng
        async (vendorLat, vendorLng, customerLat, customerLng) => {
          const distanceAtoB = await GeoLocationService.calculateDistance(
            vendorLat, vendorLng, customerLat, customerLng
          );
          const distanceBtoA = await GeoLocationService.calculateDistance(
            customerLat, customerLng, vendorLat, vendorLng
          );
          
          expect(distanceAtoB).toBeCloseTo(distanceBtoA, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Examples

**Polygon Validation:**
```typescript
describe('ServiceAreaService.createServiceArea', () => {
  it('should reject polygon with fewer than 3 points', async () => {
    const invalidPolygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 1]]],
    };
    
    await expect(
      ServiceAreaService.createServiceArea({
        name: 'Test Area',
        city: 'Test City',
        state: 'Test State',
        boundary: invalidPolygon,
      })
    ).rejects.toThrow('Polygon must have at least 3 coordinate points');
  });

  it('should create service area with valid polygon and calculate center', async () => {
    const validPolygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
    };
    
    const serviceArea = await ServiceAreaService.createServiceArea({
      name: 'Test Area',
      city: 'Test City',
      state: 'Test State',
      boundary: validPolygon,
    });
    
    expect(serviceArea.centerLatitude).toBeCloseTo(0.5, 1);
    expect(serviceArea.centerLongitude).toBeCloseTo(0.5, 1);
  });
});
```

**Address Validation:**
```typescript
describe('Address Validation', () => {
  it('should return "We don\'t serve this location yet" for address outside all service areas', async () => {
    const response = await fetch('/api/addresses/validate', {
      method: 'POST',
      body: JSON.stringify({ latitude: 0, longitude: 0 }),
    });
    
    const data = await response.json();
    expect(data.isServiceable).toBe(false);
    expect(data.reason).toBe("We don't serve this location yet");
    expect(data.nearestServiceArea).toBeDefined();
  });
});
```

### Integration Testing

**Database Migration Testing:**
- Test PostGIS extension installation
- Verify spatial indexes created correctly
- Test backfill logic with sample data
- Verify foreign key constraints

**API Endpoint Testing:**
- Test all endpoints with valid and invalid inputs
- Verify response formats match specifications
- Test authentication and authorization
- Test rate limiting

**UI Component Testing:**
- Test AddressSelector dropdown functionality
- Test ServiceAreaMapEditor polygon drawing
- Test map rendering with multiple service areas
- Test loading states and error messages

### Performance Testing

**Spatial Query Performance:**
- Measure query time for 100, 500, 1000 service areas
- Verify spatial indexes improve query performance
- Test cache hit rates for repeated lookups
- Verify 100ms threshold for typical queries

**Load Testing:**
- Simulate concurrent vendor discovery requests
- Test cache effectiveness under load
- Verify database connection pooling
- Monitor memory usage with large polygons

## Migration Strategy

### Phase 1: Database Schema Migration

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add polygon boundary column
ALTER TABLE "ServiceArea" 
ADD COLUMN boundary geometry(Polygon, 4326);

-- Add center point columns
ALTER TABLE "ServiceArea"
ADD COLUMN "centerLatitude" DOUBLE PRECISION,
ADD COLUMN "centerLongitude" DOUBLE PRECISION;

-- Add service area reference to Address
ALTER TABLE "Address"
ADD COLUMN "serviceAreaId" TEXT,
ADD CONSTRAINT "Address_serviceAreaId_fkey" 
  FOREIGN KEY ("serviceAreaId") 
  REFERENCES "ServiceArea"(id) 
  ON DELETE SET NULL;

-- Create spatial index
CREATE INDEX "ServiceArea_boundary_idx" 
ON "ServiceArea" 
USING GIST (boundary);

-- Create index on serviceAreaId
CREATE INDEX "Address_serviceAreaId_idx" 
ON "Address"("serviceAreaId");
```

### Phase 2: Data Backfill

```typescript
// Backfill script to assign service areas to existing addresses
async function backfillAddressServiceAreas() {
  const addresses = await prisma.address.findMany({
    where: {
      serviceAreaId: null,
      latitude: { not: null },
      longitude: { not: null },
    },
  });

  let matched = 0;
  let unmatched = 0;

  for (const address of addresses) {
    const serviceArea = await GeoLocationService.findServiceAreaForPoint(
      address.latitude!,
      address.longitude!
    );

    if (serviceArea) {
      await prisma.address.update({
        where: { id: address.id },
        data: { serviceAreaId: serviceArea.id },
      });
      matched++;
    } else {
      console.log(`Address ${address.id} could not be matched to service area`);
      unmatched++;
    }
  }

  console.log(`Backfill complete: ${matched} matched, ${unmatched} unmatched`);
}
```

### Phase 3: Gradual Rollout

1. **Week 1:** Deploy database schema changes, run backfill script
2. **Week 2:** Deploy backend services with polygon support (backward compatible)
3. **Week 3:** Deploy admin UI for polygon management
4. **Week 4:** Deploy customer-facing address selector and vendor filtering
5. **Week 5:** Monitor performance, adjust caching strategy
6. **Week 6:** Deprecate pincode-based filtering (keep pincodes for backward compatibility)

### Rollback Plan

If issues arise:
1. Revert frontend changes (address selector, vendor filtering)
2. Revert backend to use pincode-based filtering
3. Keep database schema changes (no data loss)
4. Investigate and fix issues
5. Re-deploy with fixes

## Security Considerations

### Input Validation

- Validate all coordinates are within valid geographic bounds
- Sanitize polygon coordinate arrays to prevent injection attacks
- Limit polygon complexity (max 1000 coordinate points)
- Validate GeoJSON structure before parsing

### Authorization

- Only SUPER_ADMIN role can create/update/delete service areas
- Customers can only validate their own addresses
- Vendors can only query their own service area
- Delivery partners can only query their assigned service area

### Rate Limiting

- Address validation: 60 requests per minute per user
- Vendor discovery: 30 requests per minute per user
- Admin service area operations: 10 requests per minute per admin
- Prevent abuse of spatial query endpoints

### Data Privacy

- Don't expose exact customer coordinates in logs
- Aggregate location data for analytics
- Comply with GDPR for location data storage
- Allow customers to delete location history

## Performance Optimization

### Caching Strategy

**Redis Cache Keys:**
- `service-area:point:{lat}:{lng}` - Service area lookup (TTL: 5 min)
- `vendors:nearby:{lat}:{lng}:{radius}` - Vendor discovery (TTL: 2 min)
- `service-area:stats:{id}` - Coverage statistics (TTL: 10 min)

**Cache Invalidation:**
- Invalidate service area cache when polygon is updated
- Invalidate vendor cache when vendor location changes
- Invalidate stats cache when related data changes

### Database Optimization

**Spatial Indexes:**
- GIST index on ServiceArea.boundary for ST_Contains queries
- Composite index on (serviceAreaId, status) for vendor filtering
- Index on (currentLatitude, currentLongitude) for delivery partner queries

**Query Optimization:**
- Use ST_DWithin for initial radius filtering before ST_Distance
- Use service area center point for coarse filtering
- Batch spatial queries where possible
- Use connection pooling for concurrent requests

### Frontend Optimization

**Map Rendering:**
- Lazy load map libraries (Leaflet) only when needed
- Simplify polygon rendering for distant zoom levels
- Cache rendered map tiles
- Use web workers for complex polygon calculations

**Data Fetching:**
- Debounce address selector queries (300ms)
- Prefetch vendor data when address is selected
- Use SWR for automatic cache revalidation
- Implement optimistic UI updates

## Monitoring and Observability

### Metrics to Track

- Spatial query execution time (p50, p95, p99)
- Cache hit rate for service area lookups
- Number of addresses outside service areas
- Polygon overlap warnings generated
- Delivery partner matching success rate

### Logging

- Log all service area CRUD operations (audit trail)
- Log performance warnings for slow queries (> 100ms)
- Log addresses that cannot be matched to service areas
- Log polygon validation failures with details

### Alerts

- Alert if spatial query p95 exceeds 200ms
- Alert if cache hit rate drops below 70%
- Alert if > 10% of addresses are unserviceable
- Alert if PostGIS extension becomes unavailable
