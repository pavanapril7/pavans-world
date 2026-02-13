'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OrderStatistics, { OrderStats } from './components/OrderStatistics';
import OrderFilters, {
  OrderFilters as OrderFiltersType,
  VendorOption,
  CustomerOption,
  MealSlotOption,
} from './components/OrderFilters';
import OrdersTable, { AdminOrder } from './components/OrdersTable';
import PaginationControls from './components/PaginationControls';
import OrderDetailModal from './components/OrderDetailModal';
import ExportButton from './components/ExportButton';

interface VendorResponse {
  id: string;
  businessName: string;
}

interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface MealSlotResponse {
  id: string;
  name: string;
  vendorId: string;
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache for vendor, customer, and meal slot lists
let vendorsCache: CacheEntry<VendorOption[]> | null = null;
let customersCache: CacheEntry<CustomerOption[]> | null = null;
let mealSlotsCache: CacheEntry<MealSlotOption[]> | null = null;

export default function AdminOrdersPage() {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [mealSlots, setMealSlots] = useState<MealSlotOption[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    pageSize: 50,
    totalItems: 0,
  });
  const [filters, setFilters] = useState<OrderFiltersType>({
    status: '',
    vendorId: '',
    customerId: '',
    dateFrom: '',
    dateTo: '',
    searchQuery: '',
    mealSlotId: '',
    fulfillmentMethod: '',
  });

  const fetchOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.vendorId) queryParams.append('vendorId', filters.vendorId);
      if (filters.customerId) queryParams.append('customerId', filters.customerId);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      if (filters.searchQuery) queryParams.append('search', filters.searchQuery);
      if (filters.mealSlotId) queryParams.append('mealSlotId', filters.mealSlotId);
      if (filters.fulfillmentMethod) queryParams.append('fulfillmentMethod', filters.fulfillmentMethod);
      queryParams.append('page', pagination.currentPage.toString());
      queryParams.append('pageSize', pagination.pageSize.toString());

      const response = await fetch(`/api/admin/orders?${queryParams.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Failed to fetch orders (${response.status})`
        );
      }
      
      const data = await response.json();
      setOrders(data.data.orders);
      setPagination(data.data.pagination);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Failed to load orders. Please try again.'
      );
    } finally {
      setOrdersLoading(false);
    }
  }, [filters, pagination.currentPage, pagination.pageSize]);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setStatsError(null);
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.vendorId) queryParams.append('vendorId', filters.vendorId);
      if (filters.customerId) queryParams.append('customerId', filters.customerId);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);

      const response = await fetch(`/api/admin/orders/stats?${queryParams.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Failed to fetch statistics (${response.status})`
        );
      }
      
      const data = await response.json();
      setStats(data.data.stats);
    } catch (error) {
      console.error('Failed to fetch order statistics:', error);
      setStatsError(
        error instanceof Error 
          ? error.message 
          : 'Failed to load statistics. Please try again.'
      );
      // Don't block the page if stats fail - graceful degradation
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchVendors = async () => {
    try {
      // Check cache first
      if (vendorsCache && Date.now() - vendorsCache.timestamp < CACHE_TTL) {
        setVendors(vendorsCache.data);
        return;
      }

      const response = await fetch('/api/admin/vendors');
      
      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }
      
      const data = await response.json();
      // API returns { success: true, data: vendors[] }
      const vendors = Array.isArray(data.data) ? data.data : [];
      const vendorOptions = vendors.map((vendor: VendorResponse) => ({
        id: vendor.id,
        businessName: vendor.businessName,
      }));
      
      // Update cache
      vendorsCache = {
        data: vendorOptions,
        timestamp: Date.now(),
      };
      
      setVendors(vendorOptions);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      // Graceful degradation - vendor filter will be disabled
      setVendors([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      // Check cache first
      if (customersCache && Date.now() - customersCache.timestamp < CACHE_TTL) {
        setCustomers(customersCache.data);
        return;
      }

      const response = await fetch('/api/users?role=CUSTOMER');
      
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      
      const data = await response.json();
      // API returns { success: true, data: users[] }
      const users = Array.isArray(data.data) ? data.data : [];
      const customerOptions = users.map((user: UserResponse) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
      }));
      
      // Update cache
      customersCache = {
        data: customerOptions,
        timestamp: Date.now(),
      };
      
      setCustomers(customerOptions);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      // Graceful degradation - customer filter will be disabled
      setCustomers([]);
    }
  };

  const fetchMealSlots = async () => {
    try {
      // Check cache first
      if (mealSlotsCache && Date.now() - mealSlotsCache.timestamp < CACHE_TTL) {
        setMealSlots(mealSlotsCache.data);
        return;
      }

      // Fetch meal slots from all vendors
      const response = await fetch('/api/admin/meal-slots');
      
      if (!response.ok) {
        throw new Error('Failed to fetch meal slots');
      }
      
      const data = await response.json();
      const slots = Array.isArray(data.data) ? data.data : [];
      const mealSlotOptions = slots.map((slot: MealSlotResponse) => ({
        id: slot.id,
        name: slot.name,
        vendorId: slot.vendorId,
      }));
      
      // Update cache
      mealSlotsCache = {
        data: mealSlotOptions,
        timestamp: Date.now(),
      };
      
      setMealSlots(mealSlotOptions);
    } catch (error) {
      console.error('Failed to fetch meal slots:', error);
      // Graceful degradation - meal slot filter will be disabled
      setMealSlots([]);
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchCustomers();
    fetchMealSlots();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [filters, pagination.currentPage, pagination.pageSize]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, filters]);

  const handleFilterChange = (newFilters: OrderFiltersType) => {
    setFilters(newFilters);
    // Reset to page 1 when filters change
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const handleOrderSelect = (order: AdminOrder) => {
    setSelectedOrder(order);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
  };

  const handleActionComplete = () => {
    // Refresh orders and stats after an action is completed
    fetchOrders();
    fetchStats();
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      setStatsError(null);
      // Refresh both orders and stats while maintaining current filters and page
      await Promise.all([fetchOrders(), fetchStats()]);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setError('Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetryOrders = () => {
    setError(null);
    fetchOrders();
  };

  const handleRetryStats = () => {
    setStatsError(null);
    fetchStats();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-2">Monitor and manage all orders across the platform</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing || ordersLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Statistics Error Message */}
      {statsError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <RefreshCw className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 text-sm font-medium">Statistics Unavailable</p>
              <p className="text-yellow-700 text-sm mt-1">{statsError}</p>
            </div>
          </div>
          <Button
            onClick={handleRetryStats}
            variant="ghost"
            size="sm"
            className="text-yellow-700 hover:text-yellow-900"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Order Statistics */}
      <OrderStatistics stats={stats} loading={loading} />

      {/* Order Filters */}
      <OrderFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        vendors={vendors}
        customers={customers}
        mealSlots={mealSlots}
        loading={loading}
      />

      {/* Export Button */}
      <div className="flex justify-end">
        <ExportButton 
          orders={orders} 
          filters={filters} 
          disabled={ordersLoading}
        />
      </div>

      {/* Orders Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <RefreshCw className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 text-sm font-medium">Failed to Load Orders</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
          <Button
            onClick={handleRetryOrders}
            variant="ghost"
            size="sm"
            className="text-red-700 hover:text-red-900"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Orders Table */}
      <OrdersTable orders={orders} loading={ordersLoading} onOrderSelect={handleOrderSelect} />

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        onPageChange={handlePageChange}
      />

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal 
          orderId={selectedOrder.id} 
          onClose={handleCloseModal}
          onActionComplete={handleActionComplete}
        />
      )}
    </div>
  );
}
