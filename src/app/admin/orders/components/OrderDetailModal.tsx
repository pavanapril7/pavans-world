'use client';

import { useEffect, useState, useCallback } from 'react';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { X, Loader2, User, Store, MapPin, Package, CreditCard, Clock, Calendar, Truck } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import OrderActions from './OrderActions';

export interface OrderItem {
  id: string;
  productName: string;
  productPrice: number | string;
  quantity: number;
  subtotal: number | string;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
}

export interface OrderStatusHistory {
  id: string;
  status: OrderStatus;
  timestamp: string | Date;
  notes?: string | null;
}

export interface OrderDetail {
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
    vehicleType: string | null;
    vehicleNumber: string | null;
  } | null;
  deliveryAddress: {
    id: string;
    street: string;
    landmark: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  status: OrderStatus;
  subtotal: number | string;
  deliveryFee: number | string;
  tax: number | string;
  total: number | string;
  fulfillmentMethod: string;
  mealSlot?: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  } | null;
  preferredDeliveryStart?: string | null;
  preferredDeliveryEnd?: string | null;
  items: OrderItem[];
  payment: {
    id: string;
    method: string;
    status: PaymentStatus;
    gatewayTransactionId?: string | null;
  } | null;
  statusHistory: OrderStatusHistory[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface OrderDetailModalProps {
  orderId: string | null;
  onClose: () => void;
  onActionComplete?: () => void;
}

// Status badge color mapping
const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  READY_FOR_PICKUP: 'bg-indigo-100 text-indigo-800',
  ASSIGNED_TO_DELIVERY: 'bg-cyan-100 text-cyan-800',
  PICKED_UP: 'bg-teal-100 text-teal-800',
  IN_TRANSIT: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-gray-100 text-gray-800',
};

// Status display labels
const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  ASSIGNED_TO_DELIVERY: 'Assigned to Delivery',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

// Payment status labels
const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

// Fulfillment method labels
const FULFILLMENT_METHOD_LABELS: Record<string, string> = {
  DELIVERY: 'Delivery',
  PICKUP: 'Pickup',
  EAT_IN: 'Dine In',
};

export default function OrderDetailModal({ orderId, onClose, onActionComplete }: OrderDetailModalProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/orders/${orderId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Failed to fetch order details (${response.status})`
        );
      }

      const data = await response.json();
      setOrder(data.data.order);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleRetry = () => {
    setError(null);
    fetchOrderDetails();
  };

  const handleActionComplete = () => {
    // Refresh order details
    fetchOrderDetails();
    
    // Notify parent component
    if (onActionComplete) {
      onActionComplete();
    }
  };

  // Format currency in Indian Rupees with two decimal places
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  };

  // Format date in human-readable format with time
  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(dateObj);
  };

  if (!orderId) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-900">
              {loading ? 'Loading...' : order?.orderNumber || 'Order Details'}
            </h2>
            {order && (
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  STATUS_COLORS[order.status]
                }`}
              >
                {STATUS_LABELS[order.status]}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading order details...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3 mb-3">
                <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium">Failed to Load Order Details</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button onClick={handleRetry} variant="outline" size="sm">
                  Retry
                </Button>
                <Button onClick={onClose} variant="ghost" size="sm">
                  Close
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && order && (
            <div className="space-y-6">
              {/* Customer Information */}
              <section className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <User className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {order.customer.firstName} {order.customer.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium text-gray-900">{order.customer.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 font-medium text-gray-900">{order.customer.phone}</span>
                  </div>
                </div>
              </section>

              {/* Vendor Information */}
              <section className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Store className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Vendor Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Business Name:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {order.vendor.businessName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {order.vendor.user.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {order.vendor.user.phone}
                    </span>
                  </div>
                </div>
              </section>

              {/* Meal Slot and Fulfillment Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Meal Slot */}
                {order.mealSlot && (
                  <section className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Meal Slot</h3>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 mb-2">{order.mealSlot.name}</div>
                      <div className="text-gray-600">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {order.mealSlot.startTime} - {order.mealSlot.endTime}
                      </div>
                      {order.preferredDeliveryStart && order.preferredDeliveryEnd && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs text-gray-500 mb-1">
                            Preferred Delivery Window
                          </div>
                          <div className="text-gray-600">
                            <Clock className="w-4 h-4 inline mr-1" />
                            {order.preferredDeliveryStart} - {order.preferredDeliveryEnd}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Fulfillment Method */}
                <section className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Truck className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Fulfillment Method</h3>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {FULFILLMENT_METHOD_LABELS[order.fulfillmentMethod] || order.fulfillmentMethod}
                    </div>
                    <div className="text-gray-600 mt-2">
                      {order.fulfillmentMethod === 'EAT_IN' && 'Customer will dine in at the restaurant'}
                      {order.fulfillmentMethod === 'PICKUP' && 'Customer will pick up from the restaurant'}
                      {order.fulfillmentMethod === 'DELIVERY' && 'Order will be delivered to customer address'}
                    </div>
                  </div>
                </section>
              </div>

              {/* Delivery Information */}
              {order.fulfillmentMethod === 'DELIVERY' && (
                <section className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Delivery Information</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-600 block mb-1">Delivery Address:</span>
                      <div className="font-medium text-gray-900">
                        <p>{order.deliveryAddress.street}</p>
                        {order.deliveryAddress.landmark && (
                          <p className="text-gray-600">Landmark: {order.deliveryAddress.landmark}</p>
                        )}
                        <p>
                          {order.deliveryAddress.city}, {order.deliveryAddress.state} -{' '}
                          {order.deliveryAddress.pincode}
                        </p>
                      </div>
                    </div>
                    {order.deliveryPartner && (
                      <div className="pt-3 border-t border-gray-200">
                        <span className="text-gray-600 block mb-1">Delivery Partner:</span>
                        <div className="font-medium text-gray-900">
                          <p>
                            {order.deliveryPartner.user.firstName}{' '}
                            {order.deliveryPartner.user.lastName}
                          </p>
                          <p className="text-gray-600">
                            Phone: {order.deliveryPartner.user.phone}
                          </p>
                          {order.deliveryPartner.vehicleType && (
                            <p className="text-gray-600">
                              Vehicle: {order.deliveryPartner.vehicleType}
                              {order.deliveryPartner.vehicleNumber &&
                                ` - ${order.deliveryPartner.vehicleNumber}`}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Order Items */}
              <section className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Package className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
                </div>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-white rounded p-3 border border-gray-200"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        {item.product.imageUrl && (
                          <div className="relative w-12 h-12 flex-shrink-0">
                            <Image
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              fill
                              className="object-cover rounded"
                            />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{item.product.name}</p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(item.productPrice)} × {item.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-gray-300 pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(order.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Delivery Fee:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(order.deliveryFee)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(order.tax)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-gray-900">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Payment Information */}
              {order.payment && (
                <section className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Payment Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="ml-2 font-medium text-gray-900 uppercase">
                        {order.payment.method}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Payment Status:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {PAYMENT_STATUS_LABELS[order.payment.status]}
                      </span>
                    </div>
                    {order.payment.gatewayTransactionId && (
                      <div className="md:col-span-2">
                        <span className="text-gray-600">Transaction ID:</span>
                        <span className="ml-2 font-mono text-sm text-gray-900">
                          {order.payment.gatewayTransactionId}
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Order Status History */}
              <section className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Order Status History</h3>
                </div>
                <div className="space-y-3">
                  {order.statusHistory.map((history, index) => (
                    <div
                      key={history.id}
                      className="flex items-start space-x-3 bg-white rounded p-3 border border-gray-200"
                    >
                      <div className="flex-shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            STATUS_COLORS[history.status]
                          }`}
                        >
                          <span className="text-xs font-bold">
                            {order.statusHistory.length - index}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">
                            {STATUS_LABELS[history.status]}
                          </p>
                          <p className="text-sm text-gray-500">{formatDate(history.timestamp)}</p>
                        </div>
                        {history.notes && (
                          <p className="text-sm text-gray-600 mt-1">{history.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Admin Actions */}
              <section className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Actions</h3>
                <OrderActions order={order} onActionComplete={handleActionComplete} />
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
