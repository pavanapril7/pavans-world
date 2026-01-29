'use client';

import { useEffect, useState } from 'react';
import { Package, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeliveryHistory {
  id: string;
  orderNumber: string;
  status: string;
  vendor: {
    businessName: string;
  };
  customer: {
    firstName: string;
    lastName: string;
  };
  deliveryAddress: {
    street: string;
    city: string;
    pincode: string;
  };
  total: number;
  createdAt: string;
  updatedAt: string;
}

export default function DeliveryHistoryPage() {
  const [deliveries, setDeliveries] = useState<DeliveryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'delivered' | 'cancelled'>('all');

  useEffect(() => {
    fetchDeliveryHistory();
  }, []);

  const fetchDeliveryHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/deliveries/history');
      
      if (!response.ok) {
        throw new Error('Failed to fetch delivery history');
      }

      const data = await response.json();
      setDeliveries(data.deliveries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'CANCELLED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDeliveries = deliveries.filter((delivery) => {
    if (filter === 'all') return true;
    if (filter === 'delivered') return delivery.status === 'DELIVERED';
    if (filter === 'cancelled') return delivery.status === 'CANCELLED';
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading delivery history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <Button onClick={fetchDeliveryHistory} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Delivery History</h1>
        <Button onClick={fetchDeliveryHistory} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({deliveries.length})
          </button>
          <button
            onClick={() => setFilter('delivered')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'delivered'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Delivered ({deliveries.filter((d) => d.status === 'DELIVERED').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'cancelled'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Cancelled ({deliveries.filter((d) => d.status === 'CANCELLED').length})
          </button>
        </div>
      </div>

      {filteredDeliveries.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Delivery History
          </h2>
          <p className="text-gray-600">
            {filter === 'all'
              ? 'You haven\'t completed any deliveries yet.'
              : `No ${filter} deliveries found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDeliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start space-x-3">
                  {getStatusIcon(delivery.status)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{delivery.orderNumber}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {delivery.vendor.businessName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      delivery.status
                    )}`}
                  >
                    {delivery.status}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    ₹{Number(delivery.total).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Customer</p>
                  <p className="text-sm text-gray-600">
                    {delivery.customer.firstName} {delivery.customer.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Delivery Address</p>
                  <p className="text-sm text-gray-600">
                    {delivery.deliveryAddress.street}, {delivery.deliveryAddress.city},{' '}
                    {delivery.deliveryAddress.pincode}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  <span className="font-medium">Completed:</span>{' '}
                  {new Date(delivery.updatedAt).toLocaleDateString()} at{' '}
                  {new Date(delivery.updatedAt).toLocaleTimeString()}
                </div>
                <div className="text-sm text-gray-500">
                  <span className="font-medium">Ordered:</span>{' '}
                  {new Date(delivery.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {deliveries.length > 0 && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Deliveries</p>
              <p className="text-2xl font-bold text-gray-900">{deliveries.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Successful Deliveries</p>
              <p className="text-2xl font-bold text-green-600">
                {deliveries.filter((d) => d.status === 'DELIVERED').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹
                {deliveries
                  .filter((d) => d.status === 'DELIVERED')
                  .reduce((sum, d) => sum + Number(d.total), 0)
                  .toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
