'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Package, Clock, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeliveryRequest {
  id: string;
  orderNumber: string;
  vendor: {
    id: string;
    businessName: string;
    user: {
      phone: string;
    };
  };
  deliveryAddress: {
    street: string;
    landmark: string;
    city: string;
    state?: string;
    pincode: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
  }>;
  total: string | number;
  createdAt: string;
  estimatedDistance?: number;
}

export default function AvailableDeliveriesPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableDeliveries();
  }, []);

  const fetchAvailableDeliveries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/deliveries/available');
      
      if (!response.ok) {
        throw new Error('Failed to fetch available deliveries');
      }

      const result = await response.json();
      setDeliveries(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDelivery = async (deliveryId: string) => {
    try {
      setAcceptingId(deliveryId);
      const response = await fetch(`/api/deliveries/${deliveryId}/accept`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to accept delivery');
      }

      // Refresh the list and navigate to active deliveries
      await fetchAvailableDeliveries();
      router.push('/delivery/active');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to accept delivery');
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading available deliveries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <Button onClick={fetchAvailableDeliveries} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Available Deliveries</h1>
        <Button onClick={fetchAvailableDeliveries} variant="outline">
          Refresh
        </Button>
      </div>

      {deliveries.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Available Deliveries
          </h2>
          <p className="text-gray-600">
            Check back later for new delivery requests in your area.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
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
                  <p className="text-lg font-bold text-gray-900">
                    ₹{Number(delivery.total).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(delivery.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {/* Pickup Location - Vendor Info */}
                <div className="flex items-start space-x-3">
                  <Package className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Pickup from</p>
                    <p className="text-sm text-gray-900 font-medium">
                      {delivery.vendor.businessName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {delivery.vendor.user.phone}
                    </p>
                  </div>
                </div>

                {/* Delivery Location */}
                <div className="flex items-start space-x-3">
                  <Navigation className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Deliver to</p>
                    <p className="text-sm text-gray-600">
                      {delivery.deliveryAddress.street},{' '}
                      {delivery.deliveryAddress.landmark}
                    </p>
                    <p className="text-sm text-gray-600">
                      {delivery.deliveryAddress.city},{' '}
                      {delivery.deliveryAddress.pincode}
                    </p>
                  </div>
                </div>

                {/* Items */}
                {delivery.items && delivery.items.length > 0 && (
                  <div className="flex items-start space-x-3">
                    <Package className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Items</p>
                      {delivery.items.map((item, idx) => (
                        <p key={idx} className="text-sm text-gray-600">
                          {item.quantity}x {item.productName}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {delivery.estimatedDistance && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Estimated: {delivery.estimatedDistance} km</span>
                  </div>
                )}
              </div>

              <Button
                onClick={() => handleAcceptDelivery(delivery.id)}
                disabled={acceptingId === delivery.id}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {acceptingId === delivery.id ? 'Accepting...' : 'Accept Delivery'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
