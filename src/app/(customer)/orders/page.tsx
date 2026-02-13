"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, Clock, CheckCircle, XCircle, Calendar, Store, ShoppingBag, Truck } from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
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
  vendor: {
    businessName: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
  }>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>("");

  useEffect(() => {
    fetchOrders();
  }, [fulfillmentFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fulfillmentFilter) {
        params.append('fulfillmentMethod', fulfillmentFilter);
      }
      
      const response = await fetch(`/api/orders?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // API returns { orders: [], pagination: {} }
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-700";
      case "CANCELLED":
      case "REJECTED":
        return "bg-red-100 text-red-700";
      case "IN_TRANSIT":
      case "PICKED_UP":
        return "bg-blue-100 text-blue-700";
      case "PENDING":
      case "ACCEPTED":
      case "PREPARING":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <CheckCircle className="w-5 h-5" />;
      case "CANCELLED":
      case "REJECTED":
        return <XCircle className="w-5 h-5" />;
      case "IN_TRANSIT":
      case "PICKED_UP":
        return <Package className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getFulfillmentIcon = (method: string) => {
    switch (method) {
      case 'EAT_IN':
        return <Store className="w-4 h-4" />;
      case 'PICKUP':
        return <ShoppingBag className="w-4 h-4" />;
      case 'DELIVERY':
        return <Truck className="w-4 h-4" />;
      default:
        return <Truck className="w-4 h-4" />;
    }
  };

  const getFulfillmentLabel = (method: string) => {
    switch (method) {
      case 'EAT_IN':
        return 'Dine In';
      case 'PICKUP':
        return 'Pickup';
      case 'DELIVERY':
        return 'Delivery';
      default:
        return 'Delivery';
    }
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-600 mt-2">Track and manage your orders</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">
            Filter by Fulfillment:
          </label>
          <select
            value={fulfillmentFilter}
            onChange={(e) => setFulfillmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Methods</option>
            <option value="DELIVERY">Delivery</option>
            <option value="PICKUP">Pickup</option>
            <option value="EAT_IN">Dine In</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No orders yet
          </h2>
          <p className="text-gray-600 mb-6">
            Start shopping to see your orders here
          </p>
          <Link
            href="/vendors"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Browse Vendors
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{order.orderNumber}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusIcon(order.status)}
                      <span>{order.status.replace(/_/g, " ")}</span>
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {order.vendor.businessName}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    {formatPrice(order.total)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {order.items.length} item(s)
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-start justify-between">
                  <div className="text-sm text-gray-600 flex-1">
                    {order.items.slice(0, 2).map((item, index) => (
                      <div key={index}>
                        {item.productName} × {item.quantity}
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <div className="text-gray-500 mt-1">
                        +{order.items.length - 2} more item(s)
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 space-y-2">
                    {/* Fulfillment Method Badge */}
                    <div className="flex items-center space-x-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {getFulfillmentIcon(order.fulfillmentMethod)}
                      <span>{getFulfillmentLabel(order.fulfillmentMethod)}</span>
                    </div>
                    
                    {/* Meal Slot Info */}
                    {order.mealSlot && (
                      <div className="flex items-center space-x-1 text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded">
                        <Calendar className="w-3 h-3" />
                        <span>{order.mealSlot.name}</span>
                      </div>
                    )}
                    
                    {/* Delivery Window */}
                    {order.preferredDeliveryStart && order.preferredDeliveryEnd && (
                      <div className="flex items-center space-x-1 text-xs text-gray-600 bg-green-50 px-2 py-1 rounded">
                        <Clock className="w-3 h-3" />
                        <span>
                          {order.preferredDeliveryStart} - {order.preferredDeliveryEnd}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
