# Project Structure

## Architecture Pattern

This project follows a **layered architecture** with clear separation of concerns:

1. **Presentation Layer** - `src/app/` (Next.js App Router pages and layouts)
2. **API Layer** - `src/app/api/` (REST API route handlers)
3. **Business Logic Layer** - `src/services/` (Service classes with business logic)
4. **Data Access Layer** - `prisma/` (Database schema and Prisma ORM)
5. **Validation Layer** - `src/schemas/` (Zod schemas for input validation)
6. **Middleware Layer** - `src/middleware/` (Auth, rate limiting, etc.)

## Directory Structure

### `/src/app/` - Next.js App Router
Role-based route organization with grouped layouts:

- `(customer)/` - Customer-facing pages (cart, orders, products, profile)
- `admin/` - Admin dashboard (orders, products, users, vendors, delivery-partners, service areas)
- `vendor/` - Vendor dashboard (products, orders, profile)
- `delivery/` - Delivery partner dashboard (active, available, history)
- `auth/` - Authentication pages (login, register)
- `api/` - API routes organized by resource

### `/src/app/api/` - API Routes
RESTful API organized by resource with nested actions:

```
api/
├── auth/              # Authentication endpoints
├── users/[id]/        # User CRUD with nested addresses
├── orders/[id]/       # Orders with status actions (accept, cancel, ready)
├── admin/orders/      # Admin-specific order management
├── cart/items/        # Cart management
├── deliveries/[id]/   # Delivery actions (accept, pickup, delivered)
├── delivery-partners/[id]/ # Delivery partner profile management
├── payments/          # Payment processing (initiate, verify, refund)
├── products/          # Product management
├── categories/        # Category management
├── service-areas/     # Service area management
└── notifications/     # Notification management
```

### `/src/services/` - Business Logic
Service classes encapsulate business logic and database operations:

- `auth.service.ts` - Authentication, OTP, session management
- `user.service.ts` - User CRUD operations
- `order.service.ts` - Order creation and management
- `admin-order.service.ts` - Admin-specific order operations
- `cart.service.ts` - Shopping cart operations
- `payment.service.ts` - Payment processing
- `delivery.service.ts` - Delivery partner operations
- `product.service.ts` - Product management
- `vendor.service.ts` - Vendor operations
- `notification.service.ts` - Notification creation and delivery
- `audit-log.service.ts` - Audit trail logging
- `geo-validation.service.ts` - Service area validation

### `/src/schemas/` - Zod Validation
Input validation schemas with TypeScript type inference:

- `auth.schema.ts` - Registration, login, OTP schemas
- `user.schema.ts` - User profile schemas
- `order.schema.ts` - Order creation and update schemas
- `admin-order.schema.ts` - Admin order management schemas
- `cart.schema.ts` - Cart item schemas
- `payment.schema.ts` - Payment schemas
- `product.schema.ts` - Product CRUD schemas
- `vendor.schema.ts` - Vendor management schemas
- `service-area.schema.ts` - Service area schemas

### `/src/middleware/` - Middleware
Request processing middleware:

- `auth.middleware.ts` - JWT authentication, role-based access control
- `rate-limit.middleware.ts` - Rate limiting protection

### `/src/components/` - React Components
Reusable UI components:

- `ui/` - shadcn/ui components (button, etc.)
- Feature-specific components (CartBadge, LogoutButton, UserForm)

### `/src/lib/` - Utilities
Shared utilities and configurations:

- `prisma.ts` - Prisma client singleton
- `utils.ts` - Utility functions (cn for className merging)
- `sanitization.ts` - Input sanitization utilities
- `redux/` - Redux store, provider, hooks, and slices

### `/prisma/` - Database
Database schema and migrations:

- `schema.prisma` - Complete database schema with enums, models, relations, indexes
- `migrations/` - Database migration history
- `seed-*.ts` - Database seeding scripts for different user roles

### `/__tests__/` - Tests
Test files organized by feature/component

## Key Conventions

### API Routes
- Use Next.js App Router route handlers (`route.ts`)
- Wrap handlers with `withAuth()` for authentication
- Validate input with Zod schemas before processing
- Return standardized error responses: `{ error: { code, message } }`
- Use HTTP status codes correctly (401, 403, 404, 500)

### Services
- Export service classes with static methods
- Handle all business logic in services, not in route handlers
- Throw errors with descriptive messages
- Use Prisma for all database operations
- Include proper transaction handling where needed

### Schemas
- Define Zod schemas for all API inputs
- Export TypeScript types using `z.infer<typeof schema>`
- Use Prisma enums in schemas with `z.nativeEnum()`
- Validate nested objects and arrays appropriately

### Authentication
- JWT tokens stored in cookies or Authorization header
- Session-based authentication with expiry
- Role-based access control using `UserRole` enum
- Use `withAuth()` wrapper for protected routes
- Support both password and OTP authentication

### Database
- Use Prisma enums for status fields
- Include composite indexes for common query patterns
- Use `@default(uuid())` for IDs
- Add `createdAt` and `updatedAt` timestamps
- Use cascade deletes where appropriate
- Maintain audit logs for sensitive operations

### Styling
- Use Tailwind utility classes
- Follow shadcn/ui patterns for components
- Use CSS variables for theming (defined in globals.css)
- Support dark mode with `class` strategy

### Path Aliases
- Use `@/*` to import from `src/` directory
- Example: `import { prisma } from '@/lib/prisma'`
