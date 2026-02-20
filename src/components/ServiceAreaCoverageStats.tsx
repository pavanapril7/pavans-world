'use client';

import { useEffect, useState } from 'react';
import { MapPin, Store, Users, Package, TrendingUp } from 'lucide-react';

interface CoverageStats {
  serviceArea: {
    id: string;
    name: string;
    city: string;
    state: string;
    status: string;
  };
  stats: {
    areaSqKm: number;
    vendorCount: number;
    deliveryPartnerCount: number;
    addressCount: number;
    orderCount30Days: number;
  };
}

interface ServiceAreaCoverageStatsProps {
  serviceAreaId: string;
}

/**
 * ServiceAreaCoverageStats component
 * Displays coverage statistics for a service area
 * Fetches data from GET /api/admin/service-areas/[id]/coverage
 */
export function ServiceAreaCoverageStats({ serviceAreaId }: ServiceAreaCoverageStatsProps) {
  const [stats, setStats] = useState<CoverageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceAreaId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/service-areas/${serviceAreaId}/coverage`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch coverage statistics');
      }

      const data = await response.json();
      setStats(data.serviceArea);
    } catch (err) {
      console.error('Error fetching coverage stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Coverage Statistics</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Statistics</h3>
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statItems = [
    {
      icon: MapPin,
      label: 'Coverage Area',
      value: `${stats.stats.areaSqKm.toFixed(2)} km²`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Store,
      label: 'Active Vendors',
      value: stats.stats.vendorCount.toString(),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: Users,
      label: 'Delivery Partners',
      value: stats.stats.deliveryPartnerCount.toString(),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: MapPin,
      label: 'Customer Addresses',
      value: stats.stats.addressCount.toString(),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      icon: Package,
      label: 'Orders (Last 30 Days)',
      value: stats.stats.orderCount30Days.toString(),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Coverage Statistics</h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            stats.serviceArea.status === 'ACTIVE'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {stats.serviceArea.status}
        </span>
      </div>

      <div className="mb-6 pb-6 border-b border-gray-200">
        <h4 className="text-xl font-bold text-gray-900">{stats.serviceArea.name}</h4>
        <p className="text-sm text-gray-600 mt-1">
          {stats.serviceArea.city}, {stats.serviceArea.state}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statItems.map((item, index) => (
          <div
            key={index}
            className={`${item.bgColor} rounded-lg p-4 transition-all duration-200 hover:shadow-md`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">{item.label}</p>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              </div>
              <div className={`${item.bgColor} p-2 rounded-lg`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {stats.stats.orderCount30Days > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span>
              Average {(stats.stats.orderCount30Days / 30).toFixed(1)} orders per day
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
