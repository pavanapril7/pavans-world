'use client';

import { useState, useEffect, useCallback } from 'react';
import { OrderStatus } from '@prisma/client';
import { Search, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface OrderFilters {
  status: OrderStatus | '';
  vendorId: string;
  customerId: string;
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
}

export interface VendorOption {
  id: string;
  businessName: string;
}

export interface CustomerOption {
  id: string;
  name: string;
  email: string;
}

interface OrderFiltersProps {
  filters: OrderFilters;
  onFilterChange: (filters: OrderFilters) => void;
  vendors: VendorOption[];
  customers: CustomerOption[];
  loading?: boolean;
}

const ORDER_STATUS_OPTIONS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'PREPARING', label: 'Preparing' },
  { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
  { value: 'ASSIGNED_TO_DELIVERY', label: 'Assigned to Delivery' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function OrderFilters({
  filters,
  onFilterChange,
  vendors,
  customers,
  loading = false,
}: OrderFiltersProps) {
  const [localFilters, setLocalFilters] = useState<OrderFilters>(filters);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Update local filters when parent filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Validate date range
  const validateDateRange = useCallback((dateFrom: string, dateTo: string): boolean => {
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      
      if (fromDate > toDate) {
        setValidationError('Start date must be before or equal to end date');
        return false;
      }
    }
    setValidationError(null);
    return true;
  }, []);

  // Debounced search handler
  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalFilters((prev) => ({ ...prev, searchQuery: value }));

      // Clear existing timer
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }

      // Set new timer for 300ms debounce
      const timer = setTimeout(() => {
        onFilterChange({ ...localFilters, searchQuery: value });
      }, 300);

      setSearchDebounceTimer(timer);
    },
    [localFilters, onFilterChange, searchDebounceTimer]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    };
  }, [searchDebounceTimer]);

  const handleFilterUpdate = (key: keyof OrderFilters, value: string) => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
    
    // Validate date range if updating date fields
    if (key === 'dateFrom' || key === 'dateTo') {
      const isValid = validateDateRange(
        key === 'dateFrom' ? value : updatedFilters.dateFrom,
        key === 'dateTo' ? value : updatedFilters.dateTo
      );
      
      // Only apply filter if validation passes
      if (isValid) {
        onFilterChange(updatedFilters);
      }
    } else {
      onFilterChange(updatedFilters);
    }
  };

  const handleClearFilters = () => {
    const clearedFilters: OrderFilters = {
      status: '',
      vendorId: '',
      customerId: '',
      dateFrom: '',
      dateTo: '',
      searchQuery: '',
    };
    setLocalFilters(clearedFilters);
    setValidationError(null);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters =
    localFilters.status ||
    localFilters.vendorId ||
    localFilters.customerId ||
    localFilters.dateFrom ||
    localFilters.dateTo ||
    localFilters.searchQuery;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            disabled={loading}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Validation Error Message */}
      {validationError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
          <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{validationError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search Input */}
        <div className="lg:col-span-3">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search by Order Number
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="search"
              type="text"
              value={localFilters.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Enter order number..."
              disabled={loading}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={localFilters.status}
            onChange={(e) => handleFilterUpdate('status', e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {ORDER_STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Vendor Filter */}
        <div>
          <label htmlFor="vendor" className="block text-sm font-medium text-gray-700 mb-1">
            Vendor
          </label>
          <select
            id="vendor"
            value={localFilters.vendorId}
            onChange={(e) => handleFilterUpdate('vendorId', e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">All Vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.businessName}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Filter */}
        <div>
          <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
            Customer
          </label>
          <select
            id="customer"
            value={localFilters.customerId}
            onChange={(e) => handleFilterUpdate('customerId', e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">All Customers</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} ({customer.email})
              </option>
            ))}
          </select>
        </div>

        {/* Date From Filter */}
        <div>
          <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
            From Date
          </label>
          <input
            id="dateFrom"
            type="date"
            value={localFilters.dateFrom ? localFilters.dateFrom.split('T')[0] : ''}
            onChange={(e) => {
              const value = e.target.value ? `${e.target.value}T00:00:00.000Z` : '';
              handleFilterUpdate('dateFrom', value);
            }}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Date To Filter */}
        <div>
          <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
            To Date
          </label>
          <input
            id="dateTo"
            type="date"
            value={localFilters.dateTo ? localFilters.dateTo.split('T')[0] : ''}
            onChange={(e) => {
              const value = e.target.value ? `${e.target.value}T23:59:59.999Z` : '';
              handleFilterUpdate('dateTo', value);
            }}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}
