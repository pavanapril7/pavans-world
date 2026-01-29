-- ============================================
-- SQL Queries for Delivery Partner Management
-- ============================================

-- 1. CREATE A NEW DELIVERY PARTNER USER
-- First, create the user (replace values as needed)
-- Note: Password hash for 'password123' is generated using bcryptjs with 10 rounds
INSERT INTO "User" (id, email, phone, "passwordHash", role, status, "firstName", "lastName", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'delivery2@test.com',
  '+919876543211',
  '$2a$10$YourHashedPasswordHere',  -- Use bcrypt to hash the password
  'DELIVERY_PARTNER',
  'ACTIVE',
  'Amit',
  'Sharma',
  NOW(),
  NOW()
);

-- Then, create the delivery partner profile (replace userId and serviceAreaId)
INSERT INTO "DeliveryPartner" (id, "userId", "vehicleType", "vehicleNumber", status, "serviceAreaId", "totalDeliveries", rating, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'USER_ID_FROM_ABOVE',  -- Replace with the user ID from the previous insert
  'Motorcycle',
  'MH-02-CD-5678',
  'AVAILABLE',
  'SERVICE_AREA_ID',  -- Replace with an actual service area ID
  0,
  4.5,
  NOW(),
  NOW()
);

-- ============================================
-- 2. CONVERT EXISTING USER TO DELIVERY PARTNER
-- ============================================

-- First, update the user's role
UPDATE "User"
SET role = 'DELIVERY_PARTNER', "updatedAt" = NOW()
WHERE email = 'user@example.com';  -- Replace with actual email

-- Then, create the delivery partner profile
INSERT INTO "DeliveryPartner" (id, "userId", "vehicleType", "vehicleNumber", status, "serviceAreaId", "totalDeliveries", rating, "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  u.id,
  'Motorcycle',
  'MH-03-EF-9012',
  'AVAILABLE',
  (SELECT id FROM "ServiceArea" WHERE status = 'ACTIVE' LIMIT 1),  -- Gets first active service area
  0,
  4.5,
  NOW(),
  NOW()
FROM "User" u
WHERE u.email = 'user@example.com';  -- Replace with actual email

-- ============================================
-- 3. VIEW ALL DELIVERY PARTNERS
-- ============================================

SELECT 
  u.id as user_id,
  u.email,
  u.phone,
  u."firstName",
  u."lastName",
  u.status as user_status,
  dp.id as delivery_partner_id,
  dp."vehicleType",
  dp."vehicleNumber",
  dp.status as delivery_status,
  dp."totalDeliveries",
  dp.rating,
  sa.name as service_area_name,
  sa.city
FROM "User" u
JOIN "DeliveryPartner" dp ON u.id = dp."userId"
JOIN "ServiceArea" sa ON dp."serviceAreaId" = sa.id
WHERE u.role = 'DELIVERY_PARTNER';

-- ============================================
-- 4. VIEW ALL SERVICE AREAS (to get IDs)
-- ============================================

SELECT id, name, city, state, pincodes, status
FROM "ServiceArea"
WHERE status = 'ACTIVE';

-- ============================================
-- 5. UPDATE DELIVERY PARTNER STATUS
-- ============================================

UPDATE "DeliveryPartner"
SET status = 'AVAILABLE', "updatedAt" = NOW()
WHERE "userId" = 'USER_ID_HERE';  -- Replace with actual user ID

-- Possible statuses: 'AVAILABLE', 'BUSY', 'OFFLINE'

-- ============================================
-- 6. UPDATE DELIVERY PARTNER VEHICLE INFO
-- ============================================

UPDATE "DeliveryPartner"
SET 
  "vehicleType" = 'Car',
  "vehicleNumber" = 'MH-04-GH-3456',
  "updatedAt" = NOW()
WHERE "userId" = 'USER_ID_HERE';  -- Replace with actual user ID

-- ============================================
-- 7. DELETE DELIVERY PARTNER (CASCADE DELETE)
-- ============================================

-- This will delete both the delivery partner profile and the user
DELETE FROM "User"
WHERE id = 'USER_ID_HERE' AND role = 'DELIVERY_PARTNER';

-- ============================================
-- 8. FIND DELIVERY PARTNER BY EMAIL
-- ============================================

SELECT 
  u.*,
  dp.*
FROM "User" u
LEFT JOIN "DeliveryPartner" dp ON u.id = dp."userId"
WHERE u.email = 'delivery@test.com';

-- ============================================
-- 9. GET DELIVERY PARTNER'S DELIVERY HISTORY
-- ============================================

SELECT 
  o.id,
  o."orderNumber",
  o.status,
  o.total,
  o."createdAt",
  o."updatedAt",
  v."businessName" as vendor_name,
  CONCAT(c."firstName", ' ', c."lastName") as customer_name
FROM "Order" o
JOIN "User" c ON o."customerId" = c.id
JOIN "Vendor" v ON o."vendorId" = v.id
WHERE o."deliveryPartnerId" = 'DELIVERY_PARTNER_ID_HERE'  -- Replace with actual delivery partner ID
ORDER BY o."createdAt" DESC;

-- ============================================
-- 10. CREATE SERVICE AREA (if needed)
-- ============================================

INSERT INTO "ServiceArea" (id, name, city, state, pincodes, status, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'South Mumbai',
  'Mumbai',
  'Maharashtra',
  ARRAY['400001', '400002', '400003', '400004', '400005'],
  'ACTIVE',
  NOW(),
  NOW()
);
