'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';

// Dynamically import map component to avoid SSR issues
const ServiceAreaPolygonDisplay = dynamic(
  () => import('@/components/ServiceAreaPolygonDisplay').then((mod) => mod.ServiceAreaPolygonDisplay),
  { ssr: false }
);

interface ServiceArea {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  boundary: GeoJSON.Polygon;
  centerLatitude: number;
  centerLongitude: number;
  createdAt: string;
  _count?: {
    vendors: number;
    deliveryPartners: number;
    addresses: number;
  };
}

export default function AdminServiceAreasPage() {
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => {
    fetchServiceAreas();
  }, [statusFilter, cityFilter]);

  const fetchServiceAreas = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (cityFilter) params.append('city', cityFilter);

      const response = await fetch(`/api/admin/service-areas?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setServiceAreas(data.serviceAreas || []);
      }
    } catch (error) {
      console.error('Failed to fetch service areas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading service areas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Area Management</h1>
          <p className="text-gray-600 mt-2">Manage geographic service boundaries</p>
        </div>
        <Link href="/admin/service-areas/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Service Area
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City
            </label>
            <input
              type="text"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Filter by city..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Service Areas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {serviceAreas.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No service areas found</p>
            <Link href="/admin/service-areas/new">
              <Button className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Service Area
              </Button>
            </Link>
          </div>
        ) : (
          serviceAreas.map((area) => (
            <Link
              key={area.id}
              href={`/admin/service-areas/${area.id}`}
              className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Map Preview */}
              <div className="h-48 bg-gray-100">
                {area.boundary ? (
                  <ServiceAreaPolygonDisplay
                    serviceArea={area}
                    color="#8b5cf6"
                    showName={false}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-50">
                    <p className="text-sm text-gray-400">No boundary data</p>
                  </div>
                )}
              </div>

              {/* Service Area Info */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{area.name}</h3>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      area.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {area.status}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-3">
                  {area.city}, {area.state}
                </p>

                {/* Basic Stats */}
                {area._count && (
                  <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-200 pt-3">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {area._count.vendors}
                      </div>
                      <div className="text-xs text-gray-500">Vendors</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {area._count.deliveryPartners}
                      </div>
                      <div className="text-xs text-gray-500">Partners</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {area._count.addresses}
                      </div>
                      <div className="text-xs text-gray-500">Addresses</div>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
