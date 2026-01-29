'use client';

import { useEffect, useState } from 'react';
import { Users, Store, MapPin, Package } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalVendors: number;
  totalServiceAreas: number;
  totalOrders: number;
  activeVendors: number;
  pendingVendors: number;
  activeUsers: number;
  inactiveUsers: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Platform overview and analytics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.totalUsers || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {stats?.activeUsers || 0} active
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Vendors</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.totalVendors || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {stats?.pendingVendors || 0} pending approval
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Service Areas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.totalServiceAreas || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">Active regions</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.totalOrders || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">All time</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/users?action=create"
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <Users className="w-8 h-8 text-blue-600 mb-2" />
            <h3 className="font-medium text-gray-900">Create User</h3>
            <p className="text-sm text-gray-600 mt-1">Add a new user to the platform</p>
          </a>
          <a
            href="/admin/vendors?filter=pending"
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <Store className="w-8 h-8 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">Approve Vendors</h3>
            <p className="text-sm text-gray-600 mt-1">Review pending vendor applications</p>
          </a>
          <a
            href="/admin/service-areas?action=create"
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <MapPin className="w-8 h-8 text-purple-600 mb-2" />
            <h3 className="font-medium text-gray-900">Add Service Area</h3>
            <p className="text-sm text-gray-600 mt-1">Expand to new geographic regions</p>
          </a>
        </div>
      </div>
    </div>
  );
}
