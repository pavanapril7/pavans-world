-- Add polygon boundary column to ServiceArea
ALTER TABLE "ServiceArea" ADD COLUMN boundary geometry(Polygon, 4326);

-- Add center coordinates to ServiceArea for performance optimization
ALTER TABLE "ServiceArea" ADD COLUMN "centerLatitude" DOUBLE PRECISION;
ALTER TABLE "ServiceArea" ADD COLUMN "centerLongitude" DOUBLE PRECISION;

-- Add serviceAreaId foreign key to Address
ALTER TABLE "Address" ADD COLUMN "serviceAreaId" TEXT;

-- Create spatial index on ServiceArea boundary for efficient polygon queries
CREATE INDEX idx_service_area_boundary ON "ServiceArea" USING GIST(boundary);

-- Create index on ServiceArea center coordinates
CREATE INDEX "ServiceArea_centerLatitude_centerLongitude_idx" ON "ServiceArea"("centerLatitude", "centerLongitude");

-- Create index on Address serviceAreaId
CREATE INDEX "Address_serviceAreaId_idx" ON "Address"("serviceAreaId");

-- Add foreign key constraint
ALTER TABLE "Address" ADD CONSTRAINT "Address_serviceAreaId_fkey" FOREIGN KEY ("serviceAreaId") REFERENCES "ServiceArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create trigger function to sync ServiceArea center point when boundary changes
CREATE OR REPLACE FUNCTION sync_service_area_center()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.boundary IS NOT NULL THEN
    -- Calculate centroid and update center coordinates
    NEW."centerLatitude" = ST_Y(ST_Centroid(NEW.boundary::geometry));
    NEW."centerLongitude" = ST_X(ST_Centroid(NEW.boundary::geometry));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_area_center_sync
  BEFORE INSERT OR UPDATE OF boundary ON "ServiceArea"
  FOR EACH ROW
  EXECUTE FUNCTION sync_service_area_center();
