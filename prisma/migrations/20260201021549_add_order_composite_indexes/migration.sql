-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_vendorId_createdAt_idx" ON "Order"("vendorId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_vendorId_idx" ON "Order"("status", "vendorId");

-- CreateIndex
CREATE INDEX "Order_status_customerId_idx" ON "Order"("status", "customerId");
