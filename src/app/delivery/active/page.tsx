'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Package, Navigation, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActiveDelivery {
  id: string;
  orderNumber: string;
  status: string;
  vendor: {
    businessName: string;
    user: {
      phone: string;
      addresses: Array<{
        street: string;
        landmark: string;
        city: string;
        pincode: string;
      }>;
    };
  };
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  deliveryAddress: {
    street: string;
    landmark: string;
    city: string;
    pincode: string;
  };
  total: number;
  items: Array<{
    productName: string;
    quantity: number;
  }>;
  createdAt: string;
}

export default function ActiveDeliveriesPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<ActiveDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveDeliveries();
  }, []);

  const fetchActiveDeliveries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/deliveries/active');
      
      if (!response.ok) {
        throw new Error('Failed to fetch active deliveries');
      }

      const data = await response.json();
      setDeliveries(data.deliveries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (deliveryId: string, action: 'pickup' | 'in-transit' | 'delivered') => {
    try {
      setUpdatingId(deliveryId);
      const response = await fetch(`/api/deliveries/${deliveryId}/${action}`, {
        method: 'PUT',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to update delivery status`);
      }

      // Refresh the list
      await fetchActiveDeliveries();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update delivery status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReportIssue = async (deliveryId: string) => {
    const issue = prompt('Please describe the issue:');
    if (!issue) return;

    try {
      setUpdatingId(deliveryId);
      const response = await fetch(`/api/deliveries/${deliveryId}/issue`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ issue }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to report issue');
      }

      alert('Issue reported successfully');
      await fetchActiveDeliveries();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to report issue');
    } finally {
      setUpdatingId(null);
    }
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case 'READY_FOR_PICKUP':
      case 'ASSIGNED_TO_DELIVERY':
        return { action: 'pickup' as const, label: 'Mark as Picked Up', icon: Package };
      case 'PICKED_UP':
        return { action: 'in-transit' as const, label: 'Mark In Transit', icon: Navigation };
      case 'IN_TRANSIT':
        return { action: 'delivered' as const, label: 'Mark as Delivered', icon: CheckCircle };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading active deliveries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <Button onClick={fetchActiveDeliveries} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Active Deliveries</h1>
        <Button onClick={fetchActiveDeliveries} variant="outline">
          Refresh
        </Button>
      </div>

      {deliveries.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Active Deliveries
          </h2>
          <p className="text-gray-600 mb-4">
            You don&apos;t have any active deliveries at the moment.
          </p>
          <Button onClick={() => router.push('/delivery/available')}>
            View Available Deliveries
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {deliveries.map((delivery) => {
            const nextAction = getNextAction(delivery.status);
            const NextIcon = nextAction?.icon;

            return (
              <div
                key={delivery.id}
                className="bg-white shadow rounded-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{delivery.orderNumber}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {delivery.vendor.businessName}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        delivery.status === 'PICKED_UP'
                          ? 'bg-blue-100 text-blue-800'
                          : delivery.status === 'IN_TRANSIT'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {delivery.status.replace(/_/g, ' ')}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      ₹{Number(delivery.total).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-2">Order Items:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {delivery.items.map((item, idx) => (
                      <li key={idx}>
                        {item.quantity}x {item.productName}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 mb-4">
                  {/* Pickup Location */}
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Pickup Location</p>
                      <p className="text-sm text-gray-600">
                        {delivery.vendor.user.addresses[0]?.street},{' '}
                        {delivery.vendor.user.addresses[0]?.landmark}
                      </p>
                      <p className="text-sm text-gray-600">
                        {delivery.vendor.user.addresses[0]?.city},{' '}
                        {delivery.vendor.user.addresses[0]?.pincode}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Contact: {delivery.vendor.user.phone}
                      </p>
                    </div>
                  </div>

                  {/* Delivery Location */}
                  <div className="flex items-start space-x-3">
                    <Navigation className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Delivery Location</p>
                      <p className="text-sm text-gray-600">
                        {delivery.deliveryAddress.street},{' '}
                        {delivery.deliveryAddress.landmark}
                      </p>
                      <p className="text-sm text-gray-600">
                        {delivery.deliveryAddress.city},{' '}
                        {delivery.deliveryAddress.pincode}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Customer: {delivery.customer.firstName} {delivery.customer.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Contact: {delivery.customer.phone}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  {nextAction && (
                    <Button
                      onClick={() => handleStatusUpdate(delivery.id, nextAction.action)}
                      disabled={updatingId === delivery.id}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {NextIcon && <NextIcon className="w-4 h-4 mr-2" />}
                      {updatingId === delivery.id ? 'Updating...' : nextAction.label}
                    </Button>
                  )}
                  <Button
                    onClick={() => handleReportIssue(delivery.id)}
                    disabled={updatingId === delivery.id}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Report Issue
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
