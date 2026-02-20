-- Fix trigger functions by recreating them with correct syntax

-- Drop existing triggers first
DROP TRIGGER IF EXISTS vendor_location_sync ON "Vendor";
DROP TRIGGER IF EXISTS address_location_sync ON "Address";
DROP TRIGGER IF EXISTS delivery_partner_location_sync ON "DeliveryPartner";
DROP TRIGGER IF EXISTS location_history_sync ON "LocationHistory";

-- Drop existing functions
DROP FUNCTION IF EXISTS sync_vendor_location();
DROP FUNCTION IF EXISTS sync_address_location();
DROP FUNCTION IF EXISTS sync_delivery_partner_location();
DROP FUNCTION IF EXISTS sync_location_history();

-- Recreate trigger function for Vendor location
CREATE OR REPLACE FUNCTION sync_vendor_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.location = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendor_location_sync
  BEFORE INSERT OR UPDATE ON "Vendor"
  FOR EACH ROW
  EXECUTE FUNCTION sync_vendor_location();

-- Recreate trigger function for Address location
CREATE OR REPLACE FUNCTION sync_address_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.location = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER address_location_sync
  BEFORE INSERT OR UPDATE ON "Address"
  FOR EACH ROW
  EXECUTE FUNCTION sync_address_location();

-- Recreate trigger function for DeliveryPartner location
CREATE OR REPLACE FUNCTION sync_delivery_partner_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."currentLatitude" IS NOT NULL AND NEW."currentLongitude" IS NOT NULL THEN
    NEW."currentLocation" = ST_SetSRID(ST_MakePoint(NEW."currentLongitude", NEW."currentLatitude"), 4326)::geography;
  ELSE
    NEW."currentLocation" = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delivery_partner_location_sync
  BEFORE INSERT OR UPDATE ON "DeliveryPartner"
  FOR EACH ROW
  EXECUTE FUNCTION sync_delivery_partner_location();

-- Recreate trigger function for LocationHistory
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
