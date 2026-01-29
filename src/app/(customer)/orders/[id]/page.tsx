"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Package,
  MapPin,
  Clock,
  CheckCircle,
  Truck,
  User,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderItem {
  id: string;
  productName: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  createdAt: string;
  vendor: {
    businessName: string;
    user: {
      phone: string;
    };
  };
  deliveryAddress: {
    label: string;
    street: string;
    landmark: string;
    city: string;
    state: string;
    pincode: string;
  };
  deliveryPartner?: {
    user: {
      firstName: string;
      lastName: string;
      phone: string;
    };
    vehicleType: string;
    vehicleNumber: string;
  };
  items: OrderItem[];
  statusHistory: Array<{
    status: string;
    timestamp: string;
  }>;
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchOrder, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      }
    } catch (error) {
      console.error("Failed to fetch order:", error);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
      });

      if (response.ok) {
        fetchOrder();
        alert("Order cancelled successfully");
      } else {
        alert("Failed to cancel order");
      }
    } catch (error) {
      console.error("Failed to cancel order:", error);
      alert("Failed to cancel order");
    }
  };

  const getStatusSteps = (): Array<{
    status: string;
    label: string;
    icon: any;
    completed?: boolean;
    current?: boolean;
  }> => {
    const steps = [
      { status: "PENDING", label: "Order Placed", icon: Package },
      { status: "ACCEPTED", label: "Accepted", icon: CheckCircle },
      { status: "PREPARING", label: "Preparing", icon: Clock },
      { status: "READY_FOR_PICKUP", label: "Ready", icon: Package },
      { status: "PICKED_UP", label: "Picked Up", icon: Truck },
      { status: "IN_TRANSIT", label: "In Transit", icon: Truck },
      { status: "DELIVERED", label: "Delivered", icon: CheckCircle },
    ];

    if (!order) return steps;

    const currentIndex = steps.findIndex((s) => s.status === order.status);
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex,
    }));
  };

  const formatPrice = (price: number | any) => {
    return `₹${Number(price).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Order not found</p>
      </div>
    );
  }

  const canCancel =
    order.status === "PENDING" || order.status === "ACCEPTED";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Order #{order.orderNumber}
          </h1>
          <p className="text-gray-600 mt-2">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        {canCancel && (
          <Button variant="outline" onClick={cancelOrder}>
            Cancel Order
          </Button>
        )}
      </div>

      {/* Order Status Timeline */}
      {order.status !== "CANCELLED" && order.status !== "REJECTED" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Order Status
          </h2>
          <div className="relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{
                  width: `${
                    (getStatusSteps().filter((s) => s.completed).length /
                      getStatusSteps().length) *
                    100
                  }%`,
                }}
              ></div>
            </div>
            <div className="relative flex justify-between">
              {getStatusSteps().map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        step.completed
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`mt-2 text-xs text-center ${
                        step.completed
                          ? "text-gray-900 font-medium"
                          : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cancelled/Rejected Status */}
      {(order.status === "CANCELLED" || order.status === "REJECTED") && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">
                Order {order.status === "CANCELLED" ? "Cancelled" : "Rejected"}
              </h3>
              <p className="text-red-700 text-sm">
                {order.status === "CANCELLED"
                  ? "This order has been cancelled"
                  : "This order was rejected by the vendor"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Address */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Delivery Address
            </h2>
          </div>
          <div className="text-gray-600">
            <div className="font-semibold text-gray-900">
              {order.deliveryAddress.label}
            </div>
            <div className="mt-2 text-sm">
              {order.deliveryAddress.street}
              <br />
              {order.deliveryAddress.landmark}
              <br />
              {order.deliveryAddress.city}, {order.deliveryAddress.state}
              <br />
              {order.deliveryAddress.pincode}
            </div>
          </div>
        </div>

        {/* Vendor Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Vendor</h2>
          </div>
          <div className="text-gray-600">
            <div className="font-semibold text-gray-900">
              {order.vendor.businessName}
            </div>
            <div className="flex items-center space-x-2 mt-2 text-sm">
              <Phone className="w-4 h-4" />
              <span>{order.vendor.user.phone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Partner Info */}
      {order.deliveryPartner && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Truck className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Delivery Partner
            </h2>
          </div>
          <div className="flex items-start justify-between">
            <div className="text-gray-600">
              <div className="font-semibold text-gray-900">
                {order.deliveryPartner.user.firstName}{" "}
                {order.deliveryPartner.user.lastName}
              </div>
              <div className="flex items-center space-x-2 mt-2 text-sm">
                <Phone className="w-4 h-4" />
                <span>{order.deliveryPartner.user.phone}</span>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <div>{order.deliveryPartner.vehicleType}</div>
              <div className="font-mono">
                {order.deliveryPartner.vehicleNumber}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items</h2>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {item.productName}
                </div>
                <div className="text-sm text-gray-500">
                  {formatPrice(item.productPrice)} × {item.quantity}
                </div>
              </div>
              <div className="font-semibold text-gray-900">
                {formatPrice(item.subtotal)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Delivery Fee</span>
            <span>{formatPrice(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax</span>
            <span>{formatPrice(order.tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Status History */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Status History
        </h2>
        <div className="space-y-3">
          {order.statusHistory
            .slice()
            .reverse()
            .map((history, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {history.status.replace(/_/g, " ")}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(history.timestamp)}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
