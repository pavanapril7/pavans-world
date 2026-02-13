-- CreateEnum
CREATE TYPE "FulfillmentMethod" AS ENUM ('EAT_IN', 'PICKUP', 'DELIVERY');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "fulfillmentMethod" "FulfillmentMethod" NOT NULL DEFAULT 'DELIVERY',
ADD COLUMN     "mealSlotId" TEXT,
ADD COLUMN     "preferredDeliveryEnd" TEXT,
ADD COLUMN     "preferredDeliveryStart" TEXT;

-- CreateTable
CREATE TABLE "MealSlot" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "cutoffTime" TEXT NOT NULL,
    "timeWindowDuration" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefaultMealSlot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "cutoffTime" TEXT NOT NULL,
    "timeWindowDuration" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DefaultMealSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorFulfillmentConfig" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "eatInEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorFulfillmentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealSlot_vendorId_idx" ON "MealSlot"("vendorId");

-- CreateIndex
CREATE INDEX "MealSlot_isActive_idx" ON "MealSlot"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VendorFulfillmentConfig_vendorId_key" ON "VendorFulfillmentConfig"("vendorId");

-- CreateIndex
CREATE INDEX "VendorFulfillmentConfig_vendorId_idx" ON "VendorFulfillmentConfig"("vendorId");

-- CreateIndex
CREATE INDEX "Order_mealSlotId_idx" ON "Order"("mealSlotId");

-- CreateIndex
CREATE INDEX "Order_fulfillmentMethod_idx" ON "Order"("fulfillmentMethod");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_mealSlotId_fkey" FOREIGN KEY ("mealSlotId") REFERENCES "MealSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealSlot" ADD CONSTRAINT "MealSlot_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorFulfillmentConfig" ADD CONSTRAINT "VendorFulfillmentConfig_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
