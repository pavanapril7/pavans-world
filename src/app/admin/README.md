# Admin Dashboard

The super admin dashboard provides comprehensive platform management capabilities.

## Features

### 1. Dashboard Overview (`/admin/dashboard`)
- Platform statistics (users, vendors, service areas, orders)
- Quick action cards for common tasks
- Real-time metrics

### 2. User Management (`/admin/users`)
- List all users with filtering by role and status
- Search users by name, email, or phone
- Create new users with any role
- Update user information
- Deactivate users
- View user details including role and status

### 3. Vendor Management (`/admin/vendors`)
- List all vendors with filtering
- Filter by status (pending, active, inactive)
- Filter by category and service area
- Approve pending vendor applications
- Deactivate vendors
- View vendor details including orders and ratings

### 4. Service Area Management (`/admin/service-areas`)
- List all service areas
- Create new service areas with pincodes
- Edit service area details
- Activate/deactivate service areas
- Delete service areas (if no associated vendors/partners)
- View vendor and delivery partner counts per area

### 5. Category Management (`/admin/categories`)
- List all vendor categories
- Create new categories with icons
- Edit category details
- Delete categories (if no associated vendors)
- View vendor count per category

### 6. Profile (`/admin/profile`)
- View admin profile information
- Logout functionality
- Security notices

## Access Control

All admin routes require:
- Authenticated user
- `SUPER_ADMIN` role

Unauthorized access attempts will be rejected with 403 Forbidden.

## API Endpoints Used

### Dashboard
- `GET /api/admin/dashboard/stats` - Platform statistics

### User Management
- `GET /api/users` - List users with filters
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### Vendor Management
- `GET /api/vendors` - List vendors with filters
- `PUT /api/vendors/:id/status` - Update vendor status

### Service Area Management
- `GET /api/service-areas` - List service areas
- `POST /api/service-areas` - Create service area
- `PUT /api/service-areas/:id` - Update service area
- `DELETE /api/service-areas/:id` - Delete service area

### Category Management
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

## Getting Started

1. Create an admin user:
   ```bash
   npm run seed:admin
   ```

2. Login with admin credentials:
   - Email: `admin@test.com`
   - Password: `admin123`

3. Access the admin dashboard:
   - Navigate to `/admin/dashboard`

## Security Considerations

- All admin routes are protected by authentication middleware
- Role-based access control enforces SUPER_ADMIN requirement
- Session management ensures secure access
- Sensitive operations require confirmation dialogs
- User deactivation invalidates all active sessions

## UI Components

The admin dashboard uses:
- Tailwind CSS for styling
- shadcn/ui components (Button)
- Lucide React icons
- Responsive design for mobile and desktop

## Future Enhancements

Potential improvements:
- Bulk user operations
- Advanced analytics and reporting
- Audit logs for admin actions
- Email notifications for admin actions
- Export data functionality
- Advanced search and filtering
- Vendor performance metrics
- Customer behavior analytics
