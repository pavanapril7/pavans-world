# Delivery Partner Management

## Overview

This page allows Super Admins to manage delivery partner profiles, including vehicle information and service area assignments.

## Workflow

### 1. Creating a Delivery Partner

1. Go to **Admin > Users** page
2. Click "Create User" button
3. Fill in basic details (name, email, phone)
4. Select role: **DELIVERY_PARTNER**
5. Click "Create User"

**What happens behind the scenes:**
- A `User` record is created with role `DELIVERY_PARTNER`
- A `DeliveryPartner` record is automatically created with default status `OFFLINE`
- The delivery partner can now log in but needs additional setup

### 2. Configuring Delivery Partner Details

1. Go to **Admin > Delivery** page
2. Find the newly created delivery partner
3. Click the edit icon
4. Set the following:
   - **Vehicle Type**: BIKE, SCOOTER, CAR, or VAN
   - **Vehicle Number**: Registration number (e.g., MH12AB1234)
   - **Service Area**: Assign to a service area for delivery assignments
5. Click "Update"

### 3. Managing Delivery Partners

The Delivery Partners page shows:
- Partner name and contact info
- Vehicle details (type and number)
- Assigned service area
- Current status (ONLINE, OFFLINE, BUSY)
- Rating (average from completed deliveries)

## Key Points

- **Automatic Record Creation**: When a user with role `DELIVERY_PARTNER` is created, the system automatically creates a corresponding `DeliveryPartner` record
- **Service Area Assignment**: Delivery partners must be assigned to a service area to receive delivery assignments
- **Vehicle Information**: Required for delivery operations and customer visibility
- **Status Management**: Partners can change their status from their dashboard (ONLINE/OFFLINE)

## API Endpoints

- `GET /api/users?role=DELIVERY_PARTNER&includeDeliveryPartner=true` - List all delivery partners
- `PATCH /api/delivery-partners/[id]` - Update delivery partner details (vehicle, service area)

## Related Pages

- `/admin/users` - Create new delivery partners
- `/admin/service-areas` - Manage service areas for assignment
- `/delivery` - Delivery partner dashboard (for partners to manage their profile)
