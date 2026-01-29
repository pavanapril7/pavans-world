# Test Users Setup Guide

## Quick Start - Create All Test Users at Once

The easiest way to create all test users (Customer, Vendor, Delivery Partner, and Super Admin) is to run:

```bash
npx tsx prisma/seed-all-users.ts
```

This will create:

### 👤 Customer
- **Email**: `customer@test.com`
- **Password**: `password123`
- **Dashboard**: http://localhost:3000/vendors
- **Includes**: 2 addresses (Home and Work)

### 🏪 Vendor
- **Email**: `vendor@test.com`
- **Password**: `password123`
- **Dashboard**: http://localhost:3000/vendor/dashboard
- **Business**: Spice Garden Restaurant
- **Includes**: Operating hours (Mon-Sun, 9 AM - 10 PM)

### 🚚 Delivery Partner
- **Email**: `delivery@test.com`
- **Password**: `password123`
- **Dashboard**: http://localhost:3000/delivery/available
- **Vehicle**: Motorcycle (MH-01-AB-1234)

### 👑 Super Admin
- **Email**: `admin@test.com`
- **Password**: `admin123`
- **Access**: Full platform management
- **Note**: Admin dashboard UI not yet implemented (Task 17)

**Login URL**: http://localhost:3000/auth/login

---

## Individual User Creation Scripts

If you only need to create specific user types:

### Create Customer Only
```bash
npx tsx prisma/seed-customer.ts
```

**Credentials:**
- Email: `customer@test.com`
- Password: `password123`
- Includes 2 addresses in active service area

### Create Vendor Only
```bash
npx tsx prisma/seed-vendor.ts
```

**Credentials:**
- Email: `vendor@test.com`
- Password: `password123`
- Business: Spice Garden Restaurant
- Includes operating hours

### Create Delivery Partner Only
```bash
npx tsx prisma/seed-delivery-partner.ts
```

**Credentials:**
- Email: `delivery@test.com`
- Password: `password123`
- Vehicle: Motorcycle (MH-01-AB-1234)

### Create Super Admin Only
```bash
npx tsx prisma/seed-admin.ts
```

**Credentials:**
- Email: `admin@test.com`
- Password: `admin123`
- Full platform access

---

## User Roles and Permissions

### Customer (CUSTOMER)
- Browse vendors and products
- Add items to cart
- Place orders
- Track order status
- Manage delivery addresses
- View order history

### Vendor (VENDOR)
- Manage product catalog (CRUD)
- View and manage incoming orders
- Accept/reject orders
- Mark orders as ready for pickup
- Configure operating hours
- View business analytics

### Delivery Partner (DELIVERY_PARTNER)
- View available delivery requests
- Accept delivery assignments
- Update delivery status (pickup, in-transit, delivered)
- Report delivery issues
- View delivery history
- Manage profile

### Super Admin (SUPER_ADMIN)
- User management (create, update, deactivate)
- Vendor management (approve, deactivate)
- Service area management
- Vendor category management
- Platform analytics
- View all orders across platform

---

## Database Structure

### Customer
- User record with role `CUSTOMER`
- Multiple Address records

### Vendor
- User record with role `VENDOR`
- Vendor profile (business info, category, service area)
- Operating hours (7 days)
- Products

### Delivery Partner
- User record with role `DELIVERY_PARTNER`
- DeliveryPartner profile (vehicle info, service area)

### Super Admin
- User record with role `SUPER_ADMIN`
- No additional profile needed

---

## Manual Database Queries

For advanced operations, see `prisma/delivery-partner-queries.sql` which includes:

1. Creating new users with different roles
2. Converting existing users between roles
3. Viewing all users by role
4. Updating user information
5. Managing service areas
6. And more...

---

## Converting Existing Users

### Convert User to Delivery Partner

```sql
-- Update user role
UPDATE "User"
SET role = 'DELIVERY_PARTNER', "updatedAt" = NOW()
WHERE email = 'existing@user.com';

-- Create delivery partner profile
INSERT INTO "DeliveryPartner" (id, "userId", "vehicleType", "vehicleNumber", status, "serviceAreaId", "totalDeliveries", rating, "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  u.id,
  'Motorcycle',
  'MH-01-XY-1234',
  'AVAILABLE',
  (SELECT id FROM "ServiceArea" WHERE status = 'ACTIVE' LIMIT 1),
  0,
  4.5,
  NOW(),
  NOW()
FROM "User" u
WHERE u.email = 'existing@user.com';
```

### Convert User to Vendor

```sql
-- Update user role
UPDATE "User"
SET role = 'VENDOR', "updatedAt" = NOW()
WHERE email = 'existing@user.com';

-- Create vendor profile
INSERT INTO "Vendor" (id, "userId", "businessName", "categoryId", description, rating, "totalOrders", status, "serviceAreaId", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  u.id,
  'My Business Name',
  (SELECT id FROM "VendorCategory" LIMIT 1),
  'Business description',
  4.5,
  0,
  'PENDING_APPROVAL',
  (SELECT id FROM "ServiceArea" WHERE status = 'ACTIVE' LIMIT 1),
  NOW(),
  NOW()
FROM "User" u
WHERE u.email = 'existing@user.com';
```

### Convert User to Super Admin

```sql
UPDATE "User"
SET role = 'SUPER_ADMIN', "updatedAt" = NOW()
WHERE email = 'existing@user.com';
```

---

## Service Areas

All users (except super admin) need to be associated with service areas:
- Vendors operate within service areas
- Delivery partners serve specific service areas
- Customers can only order from vendors in their service area

If no service areas exist, the seed scripts will automatically create a default one:

- **Name**: Downtown Area
- **City**: Mumbai
- **State**: Maharashtra
- **Pincodes**: 400001, 400002, 400003, 400004, 400005

To view existing service areas:

```sql
SELECT id, name, city, state, pincodes, status
FROM "ServiceArea"
WHERE status = 'ACTIVE';
```

---

## Troubleshooting

### "No service areas found"
The seed scripts will automatically create a default service area if none exist.

### "No vendor categories found"
The seed scripts will automatically create a default "Restaurant" category if none exist.

### "User already exists"
The seed scripts will detect existing users and skip creation. They will update roles if needed.

### Password Hashing
If you're creating users manually via SQL, you need to hash passwords using bcryptjs:

```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('your-password', 10);
console.log(hash);
```

Or use the seed scripts which handle this automatically.

---

## Testing Workflows

### Customer Flow
1. Login as customer
2. Browse vendors at `/vendors`
3. View vendor products
4. Add items to cart
5. Checkout with address selection
6. Track order at `/orders`

### Vendor Flow
1. Login as vendor
2. View dashboard at `/vendor/dashboard`
3. Manage products at `/vendor/products`
4. View orders at `/vendor/orders`
5. Accept/reject orders
6. Mark orders as ready

### Delivery Partner Flow
1. Login as delivery partner
2. View available deliveries at `/delivery/available`
3. Accept a delivery
4. Update status: pickup → in-transit → delivered
5. View history at `/delivery/history`

### Admin Flow
1. Login as admin
2. Use API endpoints for management (UI not yet implemented)
3. Manage users, vendors, service areas via API

---

## Additional Test Users

To create multiple test users, you can:

1. Modify the seed scripts with different email/phone numbers
2. Run the scripts multiple times with different values
3. Use the SQL queries for bulk operations

Example modifications:

```typescript
// In seed-customer.ts
email: 'customer2@test.com',
phone: '+919876543201',
firstName: 'Amit',
lastName: 'Patel',
```

---

## Security Notes

⚠️ **IMPORTANT**: These are test users for development only!

- Never use these credentials in production
- Change default passwords before deploying
- Use strong passwords in production
- Enable additional security measures (2FA, rate limiting, etc.)
- The super admin account has full platform access - protect it carefully

---

## Quick Reference

| Role | Email | Password | Dashboard |
|------|-------|----------|-----------|
| Customer | customer@test.com | password123 | /vendors |
| Vendor | vendor@test.com | password123 | /vendor/dashboard |
| Delivery Partner | delivery@test.com | password123 | /delivery/available |
| Super Admin | admin@test.com | admin123 | (Not yet implemented) |

**Login**: http://localhost:3000/auth/login
