'use client';

import { Package, CheckCircle, DollarSign, TrendingUp } from 'lucide-react';
import { OrderStatus } from '@prisma/client';

export interface OrderStats {
  totalOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  totalRevenue: number;
  averageOrderValue: number;
}

interface OrderStatisticsProps {
  stats: OrderStats | null;
  loading: boolean;
}

export default function OrderStatistics({ stats, loading }: OrderStatisticsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white shadow rounded-lg p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Calculate active orders (not delivered, cancelled, or rejected)
  const activeOrders =
    stats.ordersByStatus.PENDING +
    stats.ordersByStatus.ACCEPTED +
    stats.ordersByStatus.PREPARING +
    stats.ordersByStatus.READY_FOR_PICKUP +
    stats.ordersByStatus.ASSIGNED_TO_DELIVERY +
    stats.ordersByStatus.PICKED_UP +
    stats.ordersByStatus.IN_TRANSIT;

  const deliveredOrders = stats.ordersByStatus.DELIVERED;
  const cancelledOrders = stats.ordersByStatus.CANCELLED + stats.ordersByStatus.REJECTED;

  // Format currency in Indian Rupees
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Orders */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Orders</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalOrders}</p>
            <p className="text-sm text-gray-600 mt-1">{activeOrders} active</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Delivered Orders */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Delivered</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{deliveredOrders}</p>
            <p className="text-sm text-gray-600 mt-1">
              {stats.totalOrders > 0
                ? `${((deliveredOrders / stats.totalOrders) * 100).toFixed(1)}% of total`
                : '0% of total'}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Total Revenue */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {formatCurrency(stats.totalRevenue)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Completed payments</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Average Order Value */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Average Order Value</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {formatCurrency(stats.averageOrderValue)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {cancelledOrders > 0 ? `${cancelledOrders} cancelled` : 'Per order'}
            </p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
