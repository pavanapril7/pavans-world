'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Package, MapPin, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Dynamically import TrackingMap to avoid SSR issues with Leaflet
const TrackingMap = dynamic(
  () => import('@/components/TrackingMap').then((mod) => mod.TrackingMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[500px] bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading map...</p>
        </div>
      </div>
    ),
  }
);

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  deliveryPartner?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  deliveryAddress: {
    id: string;
    street: string;
    landmark: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number | null;
    longitude: number | null;
  };
  vendor: {
    id: string;
    businessName: string;
    latitude: number | null;
    longitude: number | null;
  };
}

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Get JWT token from the ws-token endpoint (since auth_token cookie is HttpOnly)
      try {
        const tokenResponse = await fetch('/api/auth/ws-token');
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          setJwtToken(tokenData.token);
        }
      } catch (err) {
        console.error('Failed to get WebSocket token:', err);
      }

      // Fetch order details
      await fetchOrderDetails();
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Order not found');
        }
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      setOrder(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error || 'Order not found'}</p>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={() => router.push('/orders')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if order has active delivery
  const hasActiveDelivery = order.deliveryPartner && 
    (order.status === 'PICKED_UP' || order.status === 'IN_TRANSIT' || order.status === 'ASSIGNED_TO_DELIVERY');

  if (!hasActiveDelivery) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="text-lg font-medium text-yellow-900">
                Tracking Not Available
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Live tracking is only available when your order is out for delivery.
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Current status: <span className="font-medium">{order.status}</span>
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={() => router.push(`/orders/${orderId}`)} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              View Order Details
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if delivery address has coordinates
  if (!order.deliveryAddress.latitude || !order.deliveryAddress.longitude) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="text-lg font-medium text-yellow-900">
                Location Not Available
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your delivery address does not have location coordinates set up.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={() => router.push(`/orders/${orderId}`)} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              View Order Details
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          onClick={() => router.push(`/orders/${orderId}`)}
          variant="outline"
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Order
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Track Your Order</h1>
            <p className="text-gray-600 mt-2">
              Order #{order.orderNumber}
            </p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <Clock className="w-4 h-4 mr-1" />
              Out for Delivery
            </div>
          </div>
        </div>
      </div>

      {/* Order Info Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Vendor</h3>
            <p className="text-base font-semibold text-gray-900">
              {order.vendor.businessName}
            </p>
          </div>
          
          {order.deliveryPartner && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Delivery Partner
              </h3>
              <p className="text-base font-semibold text-gray-900">
                {order.deliveryPartner.user.firstName}{' '}
                {order.deliveryPartner.user.lastName}
              </p>
              <p className="text-sm text-gray-600">
                {order.deliveryPartner.user.phone}
              </p>
            </div>
          )}
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Delivery Address
            </h3>
            <p className="text-sm text-gray-900">
              {order.deliveryAddress.street}
            </p>
            <p className="text-sm text-gray-600">
              {order.deliveryAddress.city}, {order.deliveryAddress.state}
            </p>
          </div>
        </div>
      </div>

      {/* Tracking Map */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Live Location</h2>
        {jwtToken ? (
          <TrackingMap
            orderId={order.id}
            deliveryId={order.id}
            destination={{
              latitude: order.deliveryAddress.latitude,
              longitude: order.deliveryAddress.longitude,
              address: `${order.deliveryAddress.street}, ${order.deliveryAddress.city}`,
            }}
            jwtToken={jwtToken}
          />
        ) : (
          <div className="flex items-center justify-center h-[500px] bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading tracking...</p>
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 text-sm text-gray-500 text-center">
        <p>
          The map shows the real-time location of your delivery partner.
          The location updates automatically every few seconds.
        </p>
      </div>
    </div>
  );
}
