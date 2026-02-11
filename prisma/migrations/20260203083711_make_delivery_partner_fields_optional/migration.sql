-- DropForeignKey
ALTER TABLE "DeliveryPartner" DROP CONSTRAINT "DeliveryPartner_serviceAreaId_fkey";

-- AlterTable
ALTER TABLE "DeliveryPartner" ALTER COLUMN "vehicleType" DROP NOT NULL,
ALTER COLUMN "vehicleNumber" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'OFFLINE',
ALTER COLUMN "serviceAreaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "DeliveryPartner" ADD CONSTRAINT "DeliveryPartner_serviceAreaId_fkey" FOREIGN KEY ("serviceAreaId") REFERENCES "ServiceArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
