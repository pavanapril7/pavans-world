# Geolocation Support Troubleshooting

## Issue: "Column 'new' does not exist" Error

If you encounter an error like:
```
The column `new` does not exist in the current database.
```

This means the PostGIS geography columns are missing from your database tables.

## Root Cause

The migration `20260216100220_add_geolocation_support` adds PostGIS geography columns and triggers. If this migration was partially applied or failed silently, the triggers will reference columns that don't exist.

## Quick Fix

Run this SQL script to add the missing columns and indexes:

```sql
-- Add PostGIS geography columns
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);
ALTER TABLE "DeliveryPartner" ADD COLUMN IF NOT EXISTS "currentLocation" geography(POINT, 4326);
ALTER TABLE "LocationHistory" ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

-- Create spatial indexes
CREATE INDEX IF NOT EXISTS idx_vendor_location ON "Vendor" USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_address_location ON "Address" USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_delivery_partner_location ON "DeliveryPartner" USING GIST("currentLocation");
CREATE INDEX IF NOT EXISTS idx_location_history_location ON "LocationHistory" USING GIST(location);
```

### Using psql:
```bash
psql "postgresql://postgres@localhost:5432/pavans-world" -f fix-geolocation.sql
```

### Using Prisma:
```bash
npx prisma db execute --file ./fix-geolocation.sql --schema ./prisma/schema.prisma
```

## Verification

Check if the columns exist:

```bash
psql "postgresql://postgres@localhost:5432/pavans-world" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Vendor' AND column_name = 'location';"
```

Should return:
```
 column_name |  data_type  
-------------+-------------
 location    | USER-DEFINED
```

## Prevention for New Environments

### 1. Fresh Database Setup

For new environments, always:

```bash
# Ensure PostGIS is installed
psql -d pavans-world -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run migrations
npm run db:migrate

# Verify geography columns exist
psql "postgresql://postgres@localhost:5432/pavans-world" -c "\d+ Vendor" | grep location
```

### 2. Reset Database (Development Only)

If you need to completely reset:

```bash
# WARNING: This deletes all data
npx prisma migrate reset

# This will:
# 1. Drop the database
# 2. Create a new database
# 3. Apply all migrations in order
# 4. Run seed scripts
```

### 3. Production Deployment

For production, ensure PostGIS is installed BEFORE running migrations:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Then run migrations:
```bash
npm run db:migrate
```

## Common Issues

### Issue 1: PostGIS Extension Not Installed

**Error:** `type "geography" does not exist`

**Fix:**
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Issue 2: Migration Marked as Applied but Columns Missing

**Error:** `The column 'new' does not exist`

**Fix:** Run the quick fix SQL script above

### Issue 3: Trigger Function Syntax Error

**Error:** `syntax error at or near "$"`

**Fix:** Ensure trigger functions use `$$` (double dollar signs) as delimiters, not single `$`

## Files Involved

- `prisma/migrations/20260216100220_add_geolocation_support/migration.sql` - Original migration
- `fix-geolocation.sql` - Quick fix script (create if needed)
- `fix-triggers.sql` - Trigger recreation script

## Related Services

These services depend on geolocation columns:

- `src/services/geolocation.service.ts` - Distance calculations
- `src/services/delivery-matching.service.ts` - Finding nearby delivery partners
- `src/services/vendor-discovery.service.ts` - Finding vendors in service area
- `src/services/location-tracking.service.ts` - Real-time location updates

## Testing

After applying the fix, test vendor creation:

```bash
curl -X POST http://localhost:3000/api/admin/vendors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "firstName": "Test",
    "lastName": "Vendor",
    "email": "test@vendor.com",
    "phone": "+1234567890",
    "password": "password123",
    "businessName": "Test Business",
    "description": "Test Description",
    "categoryId": "CATEGORY_ID",
    "serviceAreaId": "SERVICE_AREA_ID"
  }'
```

Should return success without "column 'new' does not exist" error.
