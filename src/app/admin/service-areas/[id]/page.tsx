'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import map components to avoid SSR issues
const ServiceAreaPolygonDisplay = dynamic(
  () => import('@/components/ServiceAreaPolygonDisplay').then((mod) => mod.ServiceAreaPolygonDisplay),
  { ssr: false }
);

const ServiceAreaCoverageStats = dynamic(
  () => import('@/components/ServiceAreaCoverageStats').then((mod) => mod.ServiceAreaCoverageStats),
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
  pincodes: string[];
  createdAt: string;
  updatedAt: string;
}

export default function ServiceAreaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const serviceAreaId = params.id as string;

  const [serviceArea, setServiceArea] = useState<ServiceArea | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServiceArea = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/service-areas/${serviceAreaId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch service area');
      }

      const data = await response.json();
      setServiceArea(data.serviceArea);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load service area');
    } finally {
      setLoading(false);
    }
  }, [serviceAreaId]);

  useEffect(() => {
    if (serviceAreaId) {
      fetchServiceArea();
    }
  }, [serviceAreaId, fetchServiceArea]);

  const handleDelete = async () => {
    if (!confirm(
      'Are you sure you want to delete this service area? This action cannot be undone. ' +
      'All associated addresses will have their service area reference removed.'
    )) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/service-areas/${serviceAreaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to delete service area');
      }

      // Redirect to list page after successful deletion
      router.push('/admin/service-areas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service area');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading service area...</div>
      </div>
    );
  }

  if (error && !serviceArea) {
    return (
      <div className="space-y-6">
        <Link href="/admin/service-areas">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Service Areas
          </Button>
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!serviceArea) {
    return (
      <div className="space-y-6">
        <Link href="/admin/service-areas">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Service Areas
          </Button>
        </Link>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-gray-600">Service area not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/service-areas">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{serviceArea.name}</h1>
            <p className="text-gray-600 mt-2">
              {serviceArea.city}, {serviceArea.state}
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <Link href={`/admin/service-areas/${serviceAreaId}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Service Area Details */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span
              className={`inline-block mt-1 px-3 py-1 text-sm font-semibold rounded-full ${
                serviceArea.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {serviceArea.status}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-500">Center Coordinates</p>
            <p className="text-sm text-gray-900 mt-1">
              {serviceArea.centerLatitude !== null && serviceArea.centerLongitude !== null
                ? `${serviceArea.centerLatitude.toFixed(6)}, ${serviceArea.centerLongitude.toFixed(6)}`
                : 'Not available'}
            </p>
          </div>

          {serviceArea.pincodes && serviceArea.pincodes.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Pincodes</p>
              <p className="text-sm text-gray-900 mt-1">
                {serviceArea.pincodes.join(', ')}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p className="text-sm text-gray-900 mt-1">
              {new Date(serviceArea.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="text-sm text-gray-900 mt-1">
              {new Date(serviceArea.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Map Display */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Area Boundary</h2>
        
        {serviceArea.boundary ? (
          <div className="h-[500px] rounded-lg overflow-hidden border border-gray-300">
            <ServiceAreaPolygonDisplay
              serviceArea={serviceArea}
              color="#8b5cf6"
              showName={true}
            />
          </div>
        ) : (
          <div className="h-[500px] rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-50">
            <div className="text-center p-6">
              <p className="text-gray-500 mb-4">No boundary data available</p>
              <p className="text-sm text-gray-400 mb-4">
                This service area was created before polygon boundaries were implemented.
              </p>
              <Link href={`/admin/service-areas/${serviceAreaId}/edit`}>
                <Button>
                  <Edit className="w-4 h-4 mr-2" />
                  Add Boundary
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Coverage Statistics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Coverage Statistics</h2>
        
        <ServiceAreaCoverageStats serviceAreaId={serviceAreaId} />
      </div>
    </div>
  );
}
