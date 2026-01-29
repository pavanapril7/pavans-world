# Database Migration Summary

## Existing Migrations

You have **2 migrations** in your database:

### 1. Initial Migration (20260119122945_init)
**Created**: January 19, 2026

**What it does**:
- Creates a basic `User` table with minimal fields:
  - `id` (UUID primary key)
  - `email` (unique)
  - `name` (optional)
  - `createdAt`, `updatedAt` timestamps

This was the starting point - a very simple user table.

---

### 2. Marketplace Schema Migration (20260129062510_marketplace_schema)
**Created**: January 29, 2026

**⚠️ BREAKING CHANGES TO USER TABLE**:
- **Drops** the `name` column
- **Adds required columns** (will fail if User table has existing data without defaults):
  - `firstName` (required)
  - `lastName` (required)
  - `phone` (required, unique)
  - `role` (required - CUSTOMER, VENDOR, DELIVERY_PARTNER, SUPER_ADMIN)
  - `status` (defaults to ACTIVE)
  - `passwordHash` (optional)

**Creates 13 new enums**:
1. `UserRole` - CUSTOMER, VENDOR, DELIVERY_PARTNER, SUPER_ADMIN
2. `UserStatus` - ACTIVE, INACTIVE, SUSPENDED
3. `VendorStatus` - PENDING_APPROVAL, ACTIVE, INACTIVE, SUSPENDED
4. `ProductStatus` - AVAILABLE, OUT_OF_STOCK, DISCONTINUED
5. `OrderStatus` - PENDING, ACCEPTED, PREPARING, READY_FOR_PICKUP, ASSIGNED_TO_DELIVERY, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED, REJECTED
6. `PaymentStatus` - PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED
7. `PaymentMethod` - CARD, UPI, NET_BANKING, CASH_ON_DELIVERY
8. `DeliveryPartnerStatus` - AVAILABLE, BUSY, OFFLINE
9. `ServiceAreaStatus` - ACTIVE, INACTIVE
10. `DayOfWeek` - MONDAY through SUNDAY
11. `OTPStatus` - PENDING, VERIFIED, EXPIRED, INVALIDATED
12. `NotificationType` - ORDER_PLACED, ORDER_ACCEPTED, ORDER_READY, ORDER_PICKED_UP, ORDER_DELIVERED, ORDER_CANCELLED, PAYMENT_SUCCESS, PAYMENT_FAILED

**Creates 14 new tables**:
1. **VendorCategory** - Categories for vendors (e.g., Restaurant, Grocery)
2. **ServiceArea** - Geographic service areas with pincodes
3. **Vendor** - Vendor business profiles linked to users
4. **Product** - Products sold by vendors
5. **Address** - Customer delivery addresses
6. **DeliveryPartner** - Delivery partner profiles linked to users
7. **Cart** - Shopping carts for customers
8. **CartItem** - Items in shopping carts
9. **Order** - Customer orders
10. **OrderItem** - Items in orders
11. **OrderStatusHistory** - Audit trail of order status changes
12. **Payment** - Payment records for orders
13. **Refund** - Refund records for payments
14. **OperatingHours** - Vendor operating hours by day of week
15. **Session** - User authentication sessions
16. **OTP** - One-time passwords for authentication
17. **Notification** - User notifications

**Creates extensive indexes** for query performance on:
- Foreign keys
- Status fields
- Timestamps
- Unique constraints

**Sets up foreign key relationships** with proper cascade rules:
- User → Vendor (CASCADE on delete)
- User → DeliveryPartner (CASCADE on delete)
- User → Address (CASCADE on delete)
- Vendor → Product (CASCADE on delete)
- Order → OrderItem (CASCADE on delete)
- And many more...

---

## Migration Status Check

To see if migrations have been applied to your database:

```bash
npx prisma migrate status
```

## Running Migrations

### If you have an EMPTY database:
```bash
npx prisma migrate deploy
```

### If you have EXISTING data in the User table:
**⚠️ WARNING**: The migration will **FAIL** because it tries to:
1. Drop the `name` column (data loss)
2. Add required columns (`firstName`, `lastName`, `phone`, `role`) without defaults

**Options**:

#### Option 1: Reset database (DELETES ALL DATA)
```bash
npx prisma migrate reset
```
This will:
- Drop all tables
- Run all migrations from scratch
- Run seed scripts if configured

#### Option 2: Manual data migration (PRESERVES DATA)
Before running the migration:

1. Backup your database
2. Manually update existing users:
```sql
-- Split name into firstName/lastName
UPDATE "User" 
SET 
  "firstName" = SPLIT_PART(name, ' ', 1),
  "lastName" = COALESCE(SPLIT_PART(name, ' ', 2), ''),
  "phone" = '+91' || id::text,  -- Generate temporary phone
  "role" = 'CUSTOMER',
  "status" = 'ACTIVE'
WHERE name IS NOT NULL;
```

3. Then run:
```bash
npx prisma migrate deploy
```

#### Option 3: Fresh start (RECOMMENDED for development)
If this is a development database with test data:

```bash
# Reset database and apply all migrations
npx prisma migrate reset

# Create test users
npx tsx prisma/seed-all-users.ts
```

---

## After Migration

Once migrations are applied, you can create test users:

```bash
# Create all test users (customer, vendor, delivery partner, admin)
npx tsx prisma/seed-all-users.ts

# Or create individual users
npx tsx prisma/seed-customer.ts
npx tsx prisma/seed-vendor.ts
npx tsx prisma/seed-delivery-partner.ts
npx tsx prisma/seed-admin.ts
```

---

## Current Schema Summary

After both migrations, your database will have:

- **1 User table** (modified with roles and authentication)
- **14 new tables** for the marketplace functionality
- **13 enums** for type safety
- **Extensive indexes** for performance
- **Foreign key relationships** with proper cascade rules

This creates a complete multi-vendor marketplace platform supporting:
- Customer shopping and orders
- Vendor product management
- Delivery partner logistics
- Admin management
- Payment processing
- Notifications
- Authentication with OTP

---

## Checking Migration Status

```bash
# See which migrations have been applied
npx prisma migrate status

# See the current database schema
npx prisma db pull

# Generate Prisma Client after migrations
npx prisma generate
```
