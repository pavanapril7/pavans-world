'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import map component to avoid SSR issues
const ServiceAreaMapEditor = dynamic(
  () => import('@/components/ServiceAreaMapEditor').then((mod) => mod.ServiceAreaMapEditor),
  { ssr: false }
);

export default function NewServiceAreaPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    state: '',
    pincodes: '',
  });
  const [polygon, setPolygon] = useState<GeoJSON.Polygon | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

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
      const response = await fetch('/api/admin/service-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          city: formData.city,
          state: formData.state,
          boundary: polygon,
          pincodes: formData.pincodes
            ? formData.pincodes.split(',').map((p) => p.trim()).filter(Boolean)
            : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create service area');
      }

      // Check for warnings (e.g., polygon overlap)
      if (data.warnings && data.warnings.length > 0) {
        setWarnings(data.warnings);
      }

      // Redirect to the service area detail page
      router.push(`/admin/service-areas/${data.serviceArea.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create service area');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/admin/service-areas">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Service Area</h1>
          <p className="text-gray-600 mt-2">Define a new geographic service boundary</p>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Draw Service Area Boundary *</h2>
          <p className="text-sm text-gray-600 mb-4">
            Use the drawing tools on the map to define the service area boundary. Click on the polygon tool
            to start drawing, then click points on the map to create the boundary.
          </p>
          
          <div className="h-[500px] rounded-lg overflow-hidden border border-gray-300">
            <ServiceAreaMapEditor
              onSave={handleSavePolygon}
              existingServiceAreas={[]}
            />
          </div>

          {polygon && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">
                ✓ Service area boundary drawn successfully
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Link href="/admin/service-areas">
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving || !polygon}>
            {saving ? 'Creating...' : 'Create Service Area'}
          </Button>
        </div>
      </form>
    </div>
  );
}
