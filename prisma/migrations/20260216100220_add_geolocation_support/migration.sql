-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "DeliveryPartner" ADD COLUMN     "currentLatitude" DOUBLE PRECISION,
ADD COLUMN     "currentLongitude" DOUBLE PRECISION,
ADD COLUMN     "lastLocationUpdate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "serviceRadiusKm" DECIMAL(5,2) NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "LocationHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "deliveryPartnerId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LocationHistory_orderId_timestamp_idx" ON "LocationHistory"("orderId", "timestamp");

-- CreateIndex
CREATE INDEX "LocationHistory_deliveryPartnerId_idx" ON "LocationHistory"("deliveryPartnerId");

-- CreateIndex
CREATE INDEX "Address_latitude_longitude_idx" ON "Address"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "DeliveryPartner_currentLatitude_currentLongitude_idx" ON "DeliveryPartner"("currentLatitude", "currentLongitude");

-- CreateIndex
CREATE INDEX "Vendor_latitude_longitude_idx" ON "Vendor"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "LocationHistory" ADD CONSTRAINT "LocationHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationHistory" ADD CONSTRAINT "LocationHistory_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "DeliveryPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add PostGIS geography columns
ALTER TABLE "Vendor" ADD COLUMN location geography(POINT, 4326);
ALTER TABLE "Address" ADD COLUMN location geography(POINT, 4326);
ALTER TABLE "DeliveryPartner" ADD COLUMN currentLocation geography(POINT, 4326);
ALTER TABLE "LocationHistory" ADD COLUMN location geography(POINT, 4326);

-- Create spatial indexes
CREATE INDEX idx_vendor_location ON "Vendor" USING GIST(location);
CREATE INDEX idx_address_location ON "Address" USING GIST(location);
CREATE INDEX idx_delivery_partner_location ON "DeliveryPartner" USING GIST(currentLocation);
CREATE INDEX idx_location_history_location ON "LocationHistory" USING GIST(location);

-- Create trigger function to sync Vendor location
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

-- Create trigger function to sync Address location
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

-- Create trigger function to sync DeliveryPartner location
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

-- Create trigger function to sync LocationHistory location
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
