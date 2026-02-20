-- Fix for missing PostGIS geography columns
-- Run this if you encounter "column 'new' does not exist" error

-- Ensure PostGIS extension is enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add PostGIS geography columns if they don't exist
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);
ALTER TABLE "DeliveryPartner" ADD COLUMN IF NOT EXISTS "currentLocation" geography(POINT, 4326);
ALTER TABLE "LocationHistory" ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

-- Create spatial indexes
CREATE INDEX IF NOT EXISTS idx_vendor_location ON "Vendor" USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_address_location ON "Address" USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_delivery_partner_location ON "DeliveryPartner" USING GIST("currentLocation");
CREATE INDEX IF NOT EXISTS idx_location_history_location ON "LocationHistory" USING GIST(location);

-- Verify columns were created
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('Vendor', 'Address', 'DeliveryPartner', 'LocationHistory')
    AND column_name IN ('location', 'currentLocation')
ORDER BY table_name, column_name;
