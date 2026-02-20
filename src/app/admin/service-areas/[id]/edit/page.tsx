'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import map component to avoid SSR issues
const ServiceAreaMapEditor = dynamic(
  () => import('@/components/ServiceAreaMapEditor').then((mod) => mod.ServiceAreaMapEditor),
  { ssr: false }
);

interface ServiceArea {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  boundary: GeoJSON.Polygon;
  pincodes: string[];
}

export default function EditServiceAreaPage() {
  const router = useRouter();
  const params = useParams();
  const serviceAreaId = params.id as string;

  const [serviceArea, setServiceArea] = useState<ServiceArea | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    state: '',
    status: 'ACTIVE',
    pincodes: '',
  });
  const [polygon, setPolygon] = useState<GeoJSON.Polygon | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const fetchServiceArea = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/service-areas/${serviceAreaId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch service area');
      }

      const data = await response.json();
      const area = data.serviceArea;
      
      setServiceArea(area);
      setFormData({
        name: area.name,
        city: area.city,
        state: area.state,
        status: area.status,
        pincodes: area.pincodes ? area.pincodes.join(', ') : '',
      });
      setPolygon(area.boundary);
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

  const handleSavePolygon = async (drawnPolygon: GeoJSON.Polygon) => {
    setPolygon(drawnPolygon);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!polygon) {
      setError('Please draw a service area boundary on the map');
      return;
    }

    setSaving(true);
    setError(null);
    setWarnings([]);

    try {
      const response = await fetch(`/api/admin/service-areas/${serviceAreaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          city: formData.city,
          state: formData.state,
          status: formData.status,
          boundary: polygon,
          pincodes: formData.pincodes
            ? formData.pincodes.split(',').map((p) => p.trim()).filter(Boolean)
            : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update service area');
      }

      // Check for warnings (e.g., polygon overlap)
      if (data.warnings && data.warnings.length > 0) {
        setWarnings(data.warnings);
      }

      // Redirect to the service area detail page
      router.push(`/admin/service-areas/${serviceAreaId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service area');
      setSaving(false);
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
      <div className="flex items-center space-x-4">
        <Link href={`/admin/service-areas/${serviceAreaId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Service Area</h1>
          <p className="text-gray-600 mt-2">Update service area details and boundary</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Warning Messages */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm font-medium mb-2">Warnings:</p>
          <ul className="list-disc list-inside space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="text-yellow-700 text-sm">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Service Area Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Area Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Downtown Mumbai"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Mumbai"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State *
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Maharashtra"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pincodes (Optional)
              </label>
              <input
                type="text"
                value={formData.pincodes}
                onChange={(e) => setFormData({ ...formData, pincodes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., 400001, 400002, 400003"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated list of pincodes (for backward compatibility)
              </p>
            </div>
          </div>
        </div>

        {/* Map Editor */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Service Area Boundary *</h2>
          <p className="text-sm text-gray-600 mb-4">
            Use the drawing tools on the map to modify the service area boundary. You can edit the existing
            polygon or draw a new one.
          </p>
          
          <div className="h-[700px] rounded-lg overflow-hidden border border-gray-300">
            <ServiceAreaMapEditor
              initialPolygon={serviceArea.boundary}
              onSave={handleSavePolygon}
              existingServiceAreas={[]}
            />
          </div>

          {polygon && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">
                ✓ Service area boundary updated
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Link href={`/admin/service-areas/${serviceAreaId}`}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving || !polygon}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
