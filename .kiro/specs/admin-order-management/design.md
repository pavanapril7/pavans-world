# Design Document: Admin Order Management Page

## Overview

The admin order management page is a comprehensive interface within the multi-vendor marketplace platform that enables super administrators to monitor, filter, and manage all orders across the system. Built with Next.js 14+ (App Router), TypeScript, and React, the page provides real-time order visibility, advanced filtering capabilities, order statistics, and administrative actions to maintain platform operations and resolve order-related issues.

The design follows the existing admin dashboard patterns established in the marketplace, using consistent UI components, styling, and data fetching patterns. The page integrates with the existing order management API and extends it with admin-specific functionality.

## Architecture

### Component Structure

```mermaid
graph TB
    subgraph "Admin Order Management Page"
        Page[OrdersPage Component]
        Stats[OrderStatistics Component]
        Filters[OrderFilters Component]
        Table[OrdersTable Component]
        Detail[OrderDetailModal Component]
        Actions[OrderActions Component]
        Pagination[PaginationControls Component]
        Export[ExportButton Component]
    end
    
    subgraph "API Layer"
        OrderAPI[/api/admin/orders]
        StatsAPI[/api/admin/orders/stats]
        ActionAPI[/api/admin/orders/:id/actions]
    end
    
    subgraph "Services"
        OrderService[OrderService]
        NotificationService[NotificationService]
    end
    
    subgraph "Database"
        DB[(PostgreSQL)]
    end
    
    Page --> Stats
    Page --> Filters
    Page --> Table
    Page --> Pagination
    Page --> Export
    Table --> Detail
    Detail --> Actions
    
    Page --> OrderAPI
    Page --> StatsAPI
    Actions --> ActionAPI
    
    OrderAPI --> OrderService
    StatsAPI --> OrderService
    ActionAPI --> OrderService
    ActionAPI --> NotificationService
    
    OrderService --> DB
    NotificationService --> DB
```

### Technology Stack

- **Frontend**: Next.js 14+ (App Router), React 18+, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, lucide-react icons
- **State Management**: React hooks (useState, useEffect, useCallback)
- **Data Fetching**: Native fetch API with async/await
- **Validation**: Zod schemas (reusing existing order schemas)
- **Date Formatting**: date-fns or native Intl API
- **CSV Export**: papaparse or custom CSV generator

## Components and Interfaces

### 1. OrdersPage Component (Main Page)

**Responsibilities:**
- Orchestrate all child components
- Manage global state (orders list, filters, pagination)
- Handle data fetching and refresh
- Coordinate filter changes and pagination

**State:**
```typescript
interface OrdersPageState {
  orders: AdminOrder[];
  stats: OrderStats;
  loading: boolean;
  filters: OrderFilters;
  pagination: PaginationState;
  selectedOrder: AdminOrder | null;
  refreshing: boolean;
}
```

**Key Functions:**
- `fetchOrders()`: Load orders based on current filters and pagination
- `fetchStats()`: Load order statistics
- `handleFilterChange()`: Update filters and reset pagination
- `handlePageChange()`: Navigate between pages
- `handleRefresh()`: Reload current data
- `handleOrderSelect()`: Open order detail modal

### 2. OrderStatistics Component

**Responsibilities:**
- Display order metrics and KPIs
- Update based on applied filters
- Provide visual feedback with icons and colors

**Props:**
```typescript
interface OrderStatisticsProps {
  stats: OrderStats;
  loading: boolean;
}

interface OrderStats {
  totalOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  totalRevenue: number;
  averageOrderValue: number;
}
```

**UI Layout:**
- Grid of 4 stat cards
- Each card shows: metric name, value, icon, and contextual info
- Color-coded by metric type (orders: blue, revenue: green, etc.)

### 3. OrderFilters Component

**Responsibilities:**
- Provide filtering controls
- Emit filter changes to parent
- Maintain filter state

**Props:**
```typescript
interface OrderFiltersProps {
  filters: OrderFilters;
  onFilterChange: (filters: OrderFilters) => void;
  vendors: VendorOption[];
  customers: CustomerOption[];
}

interface OrderFilters {
  status: OrderStatus | '';
  vendorId: string;
  customerId: string;
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
}
```

**Filter Controls:**
- Status dropdown (all statuses from OrderStatus enum)
- Vendor dropdown (searchable)
- Customer dropdown (searchable)
- Date range picker (from/to dates)
- Search input (order number search)
- Clear filters button

### 4. OrdersTable Component

**Responsibilities:**
- Display orders in tabular format
- Handle row selection for detail view
- Show loading and empty states

**Props:**
```typescript
interface OrdersTableProps {
  orders: AdminOrder[];
  loading: boolean;
  onOrderSelect: (order: AdminOrder) => void;
}

interface AdminOrder {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  vendor: {
    id: string;
    businessName: string;
  };
  status: OrderStatus;
  total: number;
  createdAt: string;
  deliveryPartner?: {
    id: string;
    name: string;
  };
  paymentStatus: PaymentStatus;
}
```

**Table Columns:**
- Order Number (clickable)
- Customer Name
- Vendor Name
- Status (badge with color)
- Total Amount (formatted as ₹X,XXX.XX)
- Order Date (formatted)
- Actions (view details button)

### 5. OrderDetailModal Component

**Responsibilities:**
- Display comprehensive order information
- Show order status history
- Provide access to admin actions

**Props:**
```typescript
interface OrderDetailModalProps {
  order: AdminOrder | null;
  onClose: () => void;
  onActionComplete: () => void;
}

interface OrderDetail extends AdminOrder {
  items: OrderItem[];
  deliveryAddress: Address;
  payment: PaymentInfo;
  statusHistory: OrderStatusHistory[];
  notes: OrderNote[];
}
```

**Modal Sections:**
- Header: Order number, status badge, close button
- Customer Information: Name, email, phone
- Vendor Information: Business name, contact
- Delivery Information: Address, delivery partner (if assigned)
- Order Items: Product list with quantities and prices
- Payment Information: Method, status, transaction ID
- Status History: Timeline of status changes
- Admin Notes: List of admin notes with add note form
- Admin Actions: Cancel order, reassign delivery partner buttons

### 6. OrderActions Component

**Responsibilities:**
- Provide admin action buttons
- Handle action confirmations
- Execute admin actions via API

**Props:**
```typescript
interface OrderActionsProps {
  order: AdminOrder;
  onActionComplete: () => void;
}
```

**Actions:**
- Cancel Order: Confirm dialog → API call → Refund initiation
- Add Note: Text input → Save note
- Reassign Delivery Partner: Dropdown → Confirm → Update assignment

### 7. PaginationControls Component

**Responsibilities:**
- Display pagination information
- Provide navigation controls
- Handle page changes

**Props:**
```typescript
interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}
```

**UI Elements:**
- Current page / Total pages display
- Previous/Next buttons
- First/Last page buttons
- Page size selector (optional)

### 8. ExportButton Component

**Responsibilities:**
- Generate CSV export of visible orders
- Handle export errors
- Provide download

**Props:**
```typescript
interface ExportButtonProps {
  orders: AdminOrder[];
  filters: OrderFilters;
  disabled: boolean;
}
```

**Export Format:**
```csv
Order Number,Customer Name,Customer Email,Vendor Name,Status,Total Amount,Order Date,Payment Status
ORD-001,John Doe,john@example.com,Food Vendor,DELIVERED,₹500.00,2026-01-31 10:30,COMPLETED
```

## Data Models

### AdminOrder Model (Extended)
```typescript
interface AdminOrder {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  vendor: {
    id: string;
    businessName: string;
    user: {
      email: string;
      phone: string;
    };
  };
  deliveryPartner?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  deliveryAddress: {
    street: string;
    landmark: string;
    city: string;
    state: string;
    pincode: string;
  };
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  items: OrderItem[];
  payment: {
    id: string;
    method: PaymentMethod;
    status: PaymentStatus;
    gatewayTransactionId?: string;
  };
  statusHistory: OrderStatusHistory[];
  notes: OrderNote[];
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  id: string;
  productName: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
}

interface OrderStatusHistory {
  id: string;
  status: OrderStatus;
  timestamp: string;
  notes?: string;
}

interface OrderNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
}
```

### OrderStats Model
```typescript
interface OrderStats {
  totalOrders: number;
  ordersByStatus: {
    PENDING: number;
    ACCEPTED: number;
    PREPARING: number;
    READY_FOR_PICKUP: number;
    ASSIGNED_TO_DELIVERY: number;
    PICKED_UP: number;
    IN_TRANSIT: number;
    DELIVERED: number;
    CANCELLED: number;
    REJECTED: number;
  };
  totalRevenue: number;
  averageOrderValue: number;
}
```

## API Endpoints

### GET /api/admin/orders

**Purpose:** Retrieve paginated list of orders with filters

**Query Parameters:**
```typescript
{
  page?: number;           // Default: 1
  pageSize?: number;       // Default: 50, Max: 100
  status?: OrderStatus;
  vendorId?: string;
  customerId?: string;
  dateFrom?: string;       // ISO date
  dateTo?: string;         // ISO date
  search?: string;         // Order number search
}
```

**Response:**
```typescript
{
  orders: AdminOrder[];
  pagination: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
  };
}
```

**Authorization:** Requires SUPER_ADMIN role

### GET /api/admin/orders/stats

**Purpose:** Retrieve order statistics based on filters

**Query Parameters:**
```typescript
{
  status?: OrderStatus;
  vendorId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}
```

**Response:**
```typescript
{
  stats: OrderStats;
}
```

**Authorization:** Requires SUPER_ADMIN role

### GET /api/admin/orders/:id

**Purpose:** Retrieve detailed order information

**Response:**
```typescript
{
  order: OrderDetail;
}
```

**Authorization:** Requires SUPER_ADMIN role

### POST /api/admin/orders/:id/cancel

**Purpose:** Cancel an order and initiate refund

**Request Body:**
```typescript
{
  reason: string;
  notifyCustomer: boolean;
}
```

**Response:**
```typescript
{
  success: boolean;
  order: AdminOrder;
  refund?: {
    id: string;
    amount: number;
    status: string;
  };
}
```

**Authorization:** Requires SUPER_ADMIN role

### POST /api/admin/orders/:id/notes

**Purpose:** Add an admin note to an order

**Request Body:**
```typescript
{
  content: string;
}
```

**Response:**
```typescript
{
  note: OrderNote;
}
```

**Authorization:** Requires SUPER_ADMIN role

### PUT /api/admin/orders/:id/reassign-delivery

**Purpose:** Reassign order to a different delivery partner

**Request Body:**
```typescript
{
  deliveryPartnerId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  order: AdminOrder;
}
```

**Authorization:** Requires SUPER_ADMIN role

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Display and Formatting Properties

Property 1: Order list completeness
*For any* request to fetch orders, all returned orders should contain order number, customer name, vendor name, status, total amount, and order date
**Validates: Requirements 1.1**

Property 2: Amount formatting consistency
*For any* order amount displayed, it should be formatted in Indian Rupees with exactly two decimal places
**Validates: Requirements 1.4**

Property 3: Date formatting consistency
*For any* order date displayed, it should be in a human-readable format with time information
**Validates: Requirements 1.5**

Property 4: Most recent first ordering
*For any* order list without explicit sorting, orders should be sorted by creation date in descending order (most recent first)
**Validates: Requirements 1.2**

### Filtering Properties

Property 5: Status filter accuracy
*For any* status filter applied, all returned orders should have the selected status
**Validates: Requirements 2.1**

Property 6: Date range filter accuracy
*For any* date range filter applied, all returned orders should have creation dates within the specified range (inclusive)
**Validates: Requirements 2.2**

Property 7: Order number search exactness
*For any* order number search query, the system should return only the order with that exact order number
**Validates: Requirements 2.3**

Property 8: Vendor filter accuracy
*For any* vendor filter applied, all returned orders should belong to the selected vendor
**Validates: Requirements 2.4**

Property 9: Customer filter accuracy
*For any* customer filter applied, all returned orders should belong to the selected customer
**Validates: Requirements 2.5**

### Order Detail Properties

Property 10: Order detail completeness
*For any* order detail view, it should display customer information, vendor information, delivery address, all order items with quantities and prices, payment status, and delivery partner information (if assigned)
**Validates: Requirements 3.1**

Property 11: Status history completeness
*For any* order detail view, the status history should contain all status transitions with timestamps in chronological order
**Validates: Requirements 3.2**

Property 12: Order item calculation accuracy
*For any* order item, the displayed subtotal should equal quantity multiplied by unit price
**Validates: Requirements 3.5**

### Statistics Properties

Property 13: Total order count accuracy
*For any* set of visible orders, the total order count should equal the number of orders matching the current filters
**Validates: Requirements 4.1**

Property 14: Status count accuracy
*For any* order status, the count for that status should equal the number of orders with that status in the filtered set
**Validates: Requirements 4.2**

Property 15: Total revenue calculation
*For any* set of orders, the total revenue should equal the sum of all order totals for orders with payment status COMPLETED
**Validates: Requirements 4.3**

Property 16: Average order value calculation
*For any* set of orders with at least one order, the average order value should equal total revenue divided by total order count
**Validates: Requirements 4.4**

Property 17: Statistics filter consistency
*For any* filter change, the displayed statistics should update to reflect only the filtered orders
**Validates: Requirements 4.5**

### Export Properties

Property 18: Export data completeness
*For any* CSV export, each row should contain order number, customer name, vendor name, status, total amount, order date, and payment status
**Validates: Requirements 5.2**

Property 19: Export filter consistency
*For any* CSV export, the exported orders should match exactly the orders visible in the current filtered view
**Validates: Requirements 5.1**

Property 20: Export format validity
*For any* CSV export, the file should be valid CSV format with proper escaping of special characters
**Validates: Requirements 5.3, 5.5**

### Admin Action Properties

Property 21: Cancel order refund initiation
*For any* order cancellation where payment status is COMPLETED, a refund record should be created
**Validates: Requirements 6.1**

Property 22: Cancel order notification
*For any* order cancellation, notifications should be sent to the customer, vendor, and delivery partner (if assigned)
**Validates: Requirements 6.4**

Property 23: Admin note persistence
*For any* admin note added to an order, the note should be saved and displayed in the order history
**Validates: Requirements 6.3**

Property 24: Delivery partner reassignment notification
*For any* delivery partner reassignment, notifications should be sent to both the old and new delivery partners
**Validates: Requirements 6.5**

### Pagination Properties

Property 25: Page size enforcement
*For any* page of orders, the number of orders should not exceed the specified page size (default 50)
**Validates: Requirements 7.1**

Property 26: Pagination navigation accuracy
*For any* page navigation, the displayed orders should correspond to the correct page based on page size and total count
**Validates: Requirements 7.2**

Property 27: Pagination information accuracy
*For any* pagination display, the current page, total pages, and total items should accurately reflect the filtered dataset
**Validates: Requirements 7.3**

Property 28: Filter pagination reset
*For any* filter change, the pagination should reset to page 1
**Validates: Requirements 7.4**

### Refresh Properties

Property 29: Refresh filter preservation
*For any* refresh action, the currently applied filters should remain unchanged
**Validates: Requirements 8.2**

Property 30: Refresh page preservation
*For any* refresh action, the current page number should be maintained if that page still exists in the refreshed data
**Validates: Requirements 8.3**

## Error Handling

### Error Categories

1. **Authorization Errors**
   - Non-admin users attempting to access the page
   - Response: 403 Forbidden, redirect to appropriate dashboard

2. **Data Fetch Errors**
   - Failed to load orders or statistics
   - Response: Display error message, provide retry button

3. **Filter Validation Errors**
   - Invalid date ranges (from > to)
   - Response: Show validation message, prevent filter application

4. **Action Errors**
   - Failed to cancel order
   - Failed to add note
   - Failed to reassign delivery partner
   - Response: Display error alert with specific message

5. **Export Errors**
   - No orders to export
   - Export generation failure
   - Response: Show error message, prevent download

### Error Handling Strategies

1. **Graceful Degradation**
   - If statistics fail to load, show orders table without stats
   - If vendor/customer lists fail to load, disable those filters

2. **User Feedback**
   - Loading states for all async operations
   - Success messages for completed actions
   - Clear error messages with actionable guidance

3. **Retry Mechanisms**
   - Provide refresh button for failed data loads
   - Allow retry for failed actions

## Testing Strategy

### Unit Testing

Unit tests will verify individual components and functions:

- **Component Tests**: Test each component in isolation with mock data
- **Filter Logic Tests**: Test filter combination and validation
- **Calculation Tests**: Test statistics calculations (total, average, counts)
- **Formatting Tests**: Test date and currency formatting
- **Export Tests**: Test CSV generation with various data sets

**Testing Framework**: Jest with React Testing Library

### Property-Based Testing

Property-based tests will verify universal properties across many randomly generated inputs:

- **Testing Framework**: fast-check (JavaScript/TypeScript property-based testing library)
- **Configuration**: Each property test should run a minimum of 100 iterations
- **Tagging**: Each property-based test must include a comment with the format:
  `// Feature: admin-order-management, Property {number}: {property_text}`

**Key Property Tests:**
- Filter accuracy with random order datasets and filter combinations
- Statistics calculations with random order amounts and statuses
- Pagination with random page sizes and total counts
- Date range filtering with random date ranges
- Amount formatting with random decimal values
- Export data completeness with random order sets

### Integration Testing

Integration tests will verify interactions between components and API:

- **API Integration**: Test complete request/response cycles for all endpoints
- **Filter Integration**: Test filter changes triggering correct API calls
- **Action Integration**: Test admin actions updating orders correctly
- **Pagination Integration**: Test page navigation with API calls

### End-to-End Testing

E2E tests will verify complete admin workflows:

- Admin views orders → Applies filters → Views order details → Cancels order
- Admin searches by order number → Views details → Adds note
- Admin filters by date range → Exports to CSV
- Admin filters by vendor → Views statistics → Reassigns delivery partner

**Testing Framework**: Playwright or Cypress

## Security Considerations

### Authorization

1. **Role-Based Access Control**
   - Verify SUPER_ADMIN role on all admin order endpoints
   - Implement middleware to check role before processing requests
   - Return 403 Forbidden for unauthorized access attempts

2. **Data Access Control**
   - Admins can view all orders across all vendors and customers
   - Log all admin actions for audit trail

### Data Protection

1. **Sensitive Information**
   - Display customer phone numbers only to admins
   - Mask payment transaction IDs partially in list view
   - Show full payment details only in detail modal

2. **Action Logging**
   - Log all admin actions (cancellations, notes, reassignments)
   - Include admin user ID, timestamp, and action details
   - Store logs for compliance and audit purposes

### Input Validation

1. **Filter Validation**
   - Validate date ranges (from <= to)
   - Sanitize search queries to prevent injection
   - Validate enum values for status filters

2. **Action Validation**
   - Validate order state before allowing cancellation
   - Validate delivery partner exists before reassignment
   - Validate note content length and format

## Performance Considerations

### Database Optimization

1. **Indexing**
   - Index on orderNumber for fast search
   - Composite index on (status, createdAt) for filtered queries
   - Index on customerId and vendorId for filter queries

2. **Query Optimization**
   - Use Prisma select to fetch only needed fields for list view
   - Use include for related data (customer, vendor, delivery partner)
   - Implement cursor-based pagination for large datasets

3. **Caching**
   - Cache vendor and customer lists for filter dropdowns (5 min TTL)
   - Cache statistics for frequently used filter combinations (2 min TTL)

### Frontend Optimization

1. **Data Fetching**
   - Debounce search input (300ms delay)
   - Implement loading states for all async operations
   - Use SWR or React Query for automatic revalidation

2. **Rendering Optimization**
   - Virtualize order table for large datasets (react-window)
   - Memoize expensive calculations (useMemo)
   - Optimize re-renders with useCallback

3. **Export Optimization**
   - Generate CSV on client-side for small datasets (< 1000 orders)
   - Use server-side generation for large exports
   - Stream large exports to prevent memory issues

## UI/UX Considerations

### Responsive Design

- Mobile: Stack filters vertically, simplify table to cards
- Tablet: 2-column filter grid, scrollable table
- Desktop: Full layout with all features visible

### Accessibility

- Keyboard navigation for all interactive elements
- ARIA labels for screen readers
- Focus management in modals
- Color contrast compliance (WCAG AA)

### User Experience

- Auto-refresh option (every 30 seconds)
- Persistent filters in URL query parameters
- Remember last used filters in localStorage
- Bulk actions for future enhancement
- Quick filters (Today's Orders, Pending Orders, etc.)

## Future Enhancements

### Phase 2 Features

1. **Advanced Analytics**
   - Order trends over time (charts)
   - Vendor performance comparison
   - Delivery partner efficiency metrics

2. **Bulk Actions**
   - Bulk order cancellation
   - Bulk status updates
   - Bulk export with custom fields

3. **Real-time Updates**
   - WebSocket integration for live order updates
   - Push notifications for critical orders
   - Live status change indicators

4. **Advanced Filtering**
   - Saved filter presets
   - Complex filter combinations (AND/OR logic)
   - Custom date ranges (last 7 days, last month, etc.)

5. **Enhanced Export**
   - Multiple export formats (Excel, PDF)
   - Custom field selection for export
   - Scheduled exports via email
