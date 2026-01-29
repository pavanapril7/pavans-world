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
- **Includes**: 2 addresses (Home and Work)

### 🏪 Vendor
- **Email**: `vendor@test.com`
- **Password**: `password123`
- **Business**: Spice Garden Restaurant
- **Includes**: Operating hours (Mon-Sun, 9 AM - 10 PM)

### 🚚 Delivery Partner
- **Email**: `delivery@test.com`
- **Password**: `password123`
- **Vehicle**: Motorcycle (MH-01-AB-1234)

### 👑 Super Admin
- **Email**: `admin@test.com`
- **Password**: `admin123`
- **Access**: Full platform management

You can login at: http://localhost:3000/auth/login

---

## Individual User Creation Scripts

If you only need to create specific user types:

### Create Customer Only
```bash
npx tsx prisma/seed-customer.ts
```

### Create Vendor Only
```bash
npx tsx prisma/seed-vendor.ts
```

### Create Delivery Partner Only
```bash
npx tsx prisma/seed-delivery-partner.ts
```

### Create Super Admin Only
```bash
npx tsx prisma/seed-admin.ts
```

---

## Delivery Partner Details

When creating a delivery partner user:

- **Email**: `delivery@test.com`
- **Phone**: `+919876543210`
- **Password**: `password123`
- **Role**: `DELIVERY_PARTNER`
- **Vehicle Type**: Motorcycle
- **Vehicle Number**: MH-01-AB-1234
- **Status**: AVAILABLE

## Manual Database Queries

If you prefer to use SQL queries directly, see `prisma/delivery-partner-queries.sql` for:

1. Creating new delivery partner users
2. Converting existing users to delivery partners
3. Viewing all delivery partners
4. Updating delivery partner information
5. Managing service areas
6. And more...

## Database Structure

A delivery partner requires two database records:

### 1. User Record
- `role`: Must be `DELIVERY_PARTNER`
- `email`: Unique email address
- `phone`: Unique phone number
- `passwordHash`: Bcrypt hashed password
- `firstName`, `lastName`: User's name
- `status`: Usually `ACTIVE`

### 2. DeliveryPartner Record
- `userId`: References the User record
- `vehicleType`: Type of vehicle (e.g., "Motorcycle", "Car", "Bicycle")
- `vehicleNumber`: Vehicle registration number
- `status`: One of `AVAILABLE`, `BUSY`, or `OFFLINE`
- `serviceAreaId`: References a ServiceArea record
- `totalDeliveries`: Number of completed deliveries (default: 0)
- `rating`: Delivery partner rating (default: 4.5)

## Converting an Existing User to Delivery Partner

If you already have a user and want to convert them to a delivery partner:

1. Update the user's role to `DELIVERY_PARTNER`
2. Create a `DeliveryPartner` record linked to that user

Example using the seed script approach - modify `prisma/seed-delivery-partner.ts` to use an existing user's email.

Or use SQL:

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

## Service Areas

Delivery partners must be assigned to a service area. If no service areas exist, the seed script will automatically create a default one:

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

## Delivery Partner Statuses

- **AVAILABLE**: Ready to accept new deliveries
- **BUSY**: Currently on a delivery
- **OFFLINE**: Not available for deliveries

## Testing the Delivery Partner UI

After creating a delivery partner user:

1. Login at http://localhost:3000/auth/login
2. Use the credentials above
3. You'll be redirected to the delivery partner dashboard at http://localhost:3000/delivery/available
4. From there you can:
   - View available deliveries
   - Accept deliveries
   - Update delivery status (pickup, in-transit, delivered)
   - View delivery history
   - Manage your profile

## Troubleshooting

### "No service areas found"
The seed script will automatically create a default service area if none exist.

### "User already exists"
The seed script will detect if a user with the email already exists and will either:
- Create a delivery partner profile if one doesn't exist
- Skip creation if both user and profile exist

### Password Hashing
If you're creating users manually via SQL, you need to hash passwords using bcryptjs:

```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('your-password', 10);
console.log(hash);
```

Or use the seed script which handles this automatically.

## Additional Test Users

To create multiple delivery partners, you can:

1. Modify the seed script to use different email/phone numbers
2. Run the script multiple times with different values
3. Use the SQL queries in `delivery-partner-queries.sql`

Example modifications to the seed script:

```typescript
// Change these values:
email: 'delivery2@test.com',
phone: '+919876543211',
firstName: 'Amit',
lastName: 'Sharma',
vehicleNumber: 'MH-02-CD-5678',
```
