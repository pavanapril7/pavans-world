'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Store, ShoppingBag, Truck } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  fulfillmentMethod: string;
  mealSlot?: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  };
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
    subtotal: number;
  }>;
}

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [mealSlotFilter, setMealSlotFilter] = useState<string>('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('');
  const [mealSlots, setMealSlots] = useState<Array<{ id: string; name: string }>>([]);
  const [groupByMealSlot, setGroupByMealSlot] = useState(false);

  useEffect(() => {
    fetchMealSlots();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, mealSlotFilter, fulfillmentFilter]);

  const fetchMealSlots = async () => {
    try {
      // Assuming vendor can get their own ID from auth context
      // For now, we'll fetch from the orders endpoint which includes meal slots
      const res = await fetch('/api/orders?limit=1');
      if (res.ok) {
        const data = await res.json();
        // Extract unique meal slots from orders
        const uniqueSlots = new Map<string, { id: string; name: string }>();
        data.orders?.forEach((order: Order) => {
          if (order.mealSlot) {
            uniqueSlots.set(order.mealSlot.id, {
              id: order.mealSlot.id,
              name: order.mealSlot.name,
            });
          }
        });
        setMealSlots(Array.from(uniqueSlots.values()));
      }
    } catch (err) {
      console.error('Failed to fetch meal slots:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (mealSlotFilter) params.append('mealSlotId', mealSlotFilter);
      if (fulfillmentFilter) params.append('fulfillmentMethod', fulfillmentFilter);
      
      const url = `/api/orders?${params.toString()}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED':
      case 'PREPARING':
        return 'bg-blue-100 text-blue-800';
      case 'READY_FOR_PICKUP':
        return 'bg-green-100 text-green-800';
      case 'ASSIGNED_TO_DELIVERY':
      case 'PICKED_UP':
      case 'IN_TRANSIT':
        return 'bg-purple-100 text-purple-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const groupOrdersByMealSlot = () => {
    const grouped = new Map<string, Order[]>();
    
    orders.forEach((order) => {
      const key = order.mealSlot ? order.mealSlot.id : 'no-slot';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(order);
    });
    
    return grouped;
  };

  if (loading) {
    return (
      <div className="px-4 py-6">
        <p className="text-gray-500">Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  const renderOrders = () => {
    if (groupByMealSlot) {
      const grouped = groupOrdersByMealSlot();
      return Array.from(grouped.entries()).map(([slotId, slotOrders]) => {
        const slotName = slotId === 'no-slot' 
          ? 'No Meal Slot' 
          : slotOrders[0].mealSlot?.name || 'Unknown';
        
        return (
          <div key={slotId} className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              {slotName}
              {slotId !== 'no-slot' && slotOrders[0].mealSlot && (
                <span className="ml-2 text-sm text-gray-500 font-normal">
                  ({slotOrders[0].mealSlot.startTime} - {slotOrders[0].mealSlot.endTime})
                </span>
              )}
              <span className="ml-auto text-sm text-gray-500 font-normal">
                {slotOrders.length} order(s)
              </span>
            </h2>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-200">
                {slotOrders.map((order) => renderOrderCard(order))}
              </div>
            </div>
          </div>
        );
      });
    } else {
      return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {orders.map((order) => renderOrderCard(order))}
          </div>
        </div>
      );
    }
  };

  const renderOrderCard = (order: Order) => (
    <div key={order.id} className="p-6 hover:bg-gray-50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {order.orderNumber}
          </h3>
          <p className="text-sm text-gray-500">
            {order.customer.firstName} {order.customer.lastName}
          </p>
          <p className="text-sm text-gray-500">{order.customer.phone}</p>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
              order.status
            )}`}
          >
            {order.status}
          </span>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Meal Slot and Fulfillment Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {order.mealSlot && (
          <div className="flex items-center space-x-1 text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded">
            <Calendar className="w-3 h-3" />
            <span>{order.mealSlot.name}</span>
          </div>
        )}
        <div className="flex items-center space-x-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
          {getFulfillmentIcon(order.fulfillmentMethod)}
          <span>{getFulfillmentLabel(order.fulfillmentMethod)}</span>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Items:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          {order.items.map((item, idx) => (
            <li key={idx}>
              {item.productName} × {item.quantity} - ₹
              {Number(item.subtotal).toFixed(2)}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-lg font-semibold text-gray-900">
          Total: ₹{Number(order.total).toFixed(2)}
        </p>
        <Link
          href={`/vendor/orders/${order.id}`}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View Details →
        </Link>
      </div>
    </div>
  );

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Orders</h1>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Orders</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="PREPARING">Preparing</option>
              <option value="READY_FOR_PICKUP">Ready for Pickup</option>
              <option value="ASSIGNED_TO_DELIVERY">Assigned to Delivery</option>
              <option value="PICKED_UP">Picked Up</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Meal Slot Filter */}
          <div>
            <label htmlFor="mealSlot" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Meal Slot
            </label>
            <select
              id="mealSlot"
              value={mealSlotFilter}
              onChange={(e) => setMealSlotFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Meal Slots</option>
              {mealSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.name}
                </option>
              ))}
            </select>
          </div>

          {/* Fulfillment Method Filter */}
          <div>
            <label htmlFor="fulfillment" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Fulfillment
            </label>
            <select
              id="fulfillment"
              value={fulfillmentFilter}
              onChange={(e) => setFulfillmentFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Methods</option>
              <option value="DELIVERY">Delivery</option>
              <option value="PICKUP">Pickup</option>
              <option value="EAT_IN">Dine In</option>
            </select>
          </div>

          {/* Group By Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Options
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={groupByMealSlot}
                onChange={(e) => setGroupByMealSlot(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Group by Meal Slot</span>
            </label>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        renderOrders()
      )}
    </div>
  );
}
