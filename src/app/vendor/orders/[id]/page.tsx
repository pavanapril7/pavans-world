'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, Store, ShoppingBag, Truck } from 'lucide-react';

interface OrderDetails {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  createdAt: string;
  fulfillmentMethod: string;
  preferredDeliveryStart?: string;
  preferredDeliveryEnd?: string;
  mealSlot?: {
    name: string;
    startTime: string;
    endTime: string;
  };
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  deliveryAddress: {
    street: string;
    landmark: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: Array<{
    id: string;
    productName: string;
    productPrice: number;
    quantity: number;
    subtotal: number;
  }>;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    notes: string;
  }>;
  deliveryPartner?: {
    user: {
      firstName: string;
      lastName: string;
      phone: string;
    };
    vehicleType: string;
    vehicleNumber: string;
  };
}

export default function VendorOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, []);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${resolvedParams.id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch order');
      }
      const data = await res.json();
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!confirm('Accept this order?')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${resolvedParams.id}/accept`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Failed to accept order');
      }

      await fetchOrder();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to accept order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return; // User cancelled

    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${resolvedParams.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason || undefined }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Failed to reject order');
      }

      await fetchOrder();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReady = async () => {
    if (!confirm('Mark this order as ready for pickup?')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${resolvedParams.id}/ready`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Failed to mark order as ready');
      }

      await fetchOrder();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark order as ready');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6">
        <p className="text-gray-500">Loading order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Order not found'}</p>
        </div>
        <Link href="/vendor/orders" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const canAccept = order.status === 'PENDING';
  const canReject = order.status === 'PENDING';
  const canMarkReady = order.status === 'ACCEPTED' || order.status === 'PREPARING';

  const getFulfillmentMethodDetails = () => {
    const method = order.fulfillmentMethod || 'DELIVERY';
    const details: Record<string, { icon: any; label: string; color: string; instructions: string }> = {
      EAT_IN: { 
        icon: Store, 
        label: 'Dine In', 
        color: 'text-purple-600',
        instructions: 'Prepare for dine-in service. Ensure table setup and in-restaurant service.'
      },
      PICKUP: { 
        icon: ShoppingBag, 
        label: 'Pickup', 
        color: 'text-orange-600',
        instructions: 'Prepare for customer pickup. Package order securely and notify customer when ready.'
      },
      DELIVERY: { 
        icon: Truck, 
        label: 'Delivery', 
        color: 'text-blue-600',
        instructions: 'Prepare for delivery. Package order securely and ensure it\'s ready for delivery partner pickup.'
      },
    };
    return details[method] || details.DELIVERY;
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <Link href="/vendor/orders" className="text-blue-600 hover:text-blue-800">
          ← Back to Orders
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{order.orderNumber}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              order.status === 'PENDING'
                ? 'bg-yellow-100 text-yellow-800'
                : order.status === 'ACCEPTED' || order.status === 'PREPARING'
                ? 'bg-blue-100 text-blue-800'
                : order.status === 'READY_FOR_PICKUP'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {order.status}
          </span>
        </div>

        {/* Action Buttons */}
        {(canAccept || canReject || canMarkReady) && (
          <div className="flex space-x-3 mb-6">
            {canAccept && (
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Accept Order
              </button>
            )}
            {canReject && (
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reject Order
              </button>
            )}
            {canMarkReady && (
              <button
                onClick={handleMarkReady}
                disabled={actionLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Mark as Ready
              </button>
            )}
          </div>
        )}

        {/* Meal Slot and Fulfillment Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Meal Slot */}
          {order.mealSlot && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Meal Slot</h3>
              </div>
              <div className="text-gray-600">
                <div className="font-semibold text-gray-900">
                  {order.mealSlot.name}
                </div>
                <div className="flex items-center space-x-2 mt-2 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>
                    {order.mealSlot.startTime} - {order.mealSlot.endTime}
                  </span>
                </div>
                {order.preferredDeliveryStart && order.preferredDeliveryEnd && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">
                      Preferred Delivery Window
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>
                        {order.preferredDeliveryStart} - {order.preferredDeliveryEnd}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fulfillment Method */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Truck className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Fulfillment Method
              </h3>
            </div>
            <div className="flex items-center space-x-3 mb-3">
              {(() => {
                const methodDetails = getFulfillmentMethodDetails();
                const MethodIcon = methodDetails.icon;
                return (
                  <>
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <MethodIcon className={`w-6 h-6 ${methodDetails.color}`} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {methodDetails.label}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700">
              <div className="font-medium text-gray-900 mb-1">Preparation Instructions:</div>
              {getFulfillmentMethodDetails().instructions}
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="text-base font-medium">
                {order.customer.firstName} {order.customer.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-base font-medium">{order.customer.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-base font-medium">{order.customer.email}</p>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        {order.fulfillmentMethod === 'DELIVERY' && (
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>
            <p className="text-base">
              {order.deliveryAddress.street}
              {order.deliveryAddress.landmark && `, ${order.deliveryAddress.landmark}`}
              <br />
              {order.deliveryAddress.city}, {order.deliveryAddress.state} -{' '}
              {order.deliveryAddress.pincode}
            </p>
          </div>
        )}

        {/* Delivery Partner */}
        {order.deliveryPartner && (
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Delivery Partner</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-base font-medium">
                  {order.deliveryPartner.user.firstName}{' '}
                  {order.deliveryPartner.user.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-base font-medium">{order.deliveryPartner.user.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vehicle</p>
                <p className="text-base font-medium">
                  {order.deliveryPartner.vehicleType || 'Not set'} - {order.deliveryPartner.vehicleNumber || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Items</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-gray-500">
                    ₹{Number(item.productPrice).toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <p className="font-medium">₹{Number(item.subtotal).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₹{Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Fee</span>
              <span className="font-medium">₹{Number(order.deliveryFee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium">₹{Number(order.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
              <span>Total</span>
              <span>₹{Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Status History */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold mb-4">Status History</h2>
          <div className="space-y-3">
            {order.statusHistory.map((history, idx) => (
              <div key={idx} className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                <div>
                  <p className="font-medium">{history.status}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(history.timestamp).toLocaleString()}
                  </p>
                  {history.notes && (
                    <p className="text-sm text-gray-600 mt-1">{history.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
