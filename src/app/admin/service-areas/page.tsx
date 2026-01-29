'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServiceArea {
  id: string;
  name: string;
  city: string;
  state: string;
  pincodes: string[];
  status: string;
  createdAt: string;
  _count?: {
    vendors: number;
    deliveryPartners: number;
  };
}

export default function AdminServiceAreasPage() {
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingArea, setEditingArea] = useState<ServiceArea | null>(null);

  useEffect(() => {
    fetchServiceAreas();
  }, []);

  const fetchServiceAreas = async () => {
    try {
      const response = await fetch('/api/service-areas');
      if (response.ok) {
        const result = await response.json();
        setServiceAreas(Array.isArray(result) ? result : result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch service areas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (areaId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const action = newStatus === 'ACTIVE' ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${action} this service area?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/service-areas/${areaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchServiceAreas();
      } else {
        alert(`Failed to ${action} service area`);
      }
    } catch (error) {
      console.error(`Failed to ${action} service area:`, error);
      alert(`Failed to ${action} service area`);
    }
  };

  const handleDelete = async (areaId: string) => {
    if (!confirm('Are you sure you want to delete this service area? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/service-areas/${areaId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchServiceAreas();
      } else {
        const error = await response.json();
        alert(error.error?.message || 'Failed to delete service area');
      }
    } catch (error) {
      console.error('Failed to delete service area:', error);
      alert('Failed to delete service area');
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
          <p className="text-gray-600 mt-2">Manage geographic service areas</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Service Area
        </Button>
      </div>

      {/* Service Areas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {serviceAreas.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No service areas found. Create one to get started.
          </div>
        ) : (
          serviceAreas.map((area) => (
            <div key={area.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{area.name}</h3>
                  <p className="text-sm text-gray-500">
                    {area.city}, {area.state}
                  </p>
                </div>
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

              <div className="space-y-2 mb-4">
                <div className="text-sm">
                  <span className="text-gray-500">Pincodes:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {area.pincodes.slice(0, 5).map((pincode) => (
                      <span
                        key={pincode}
                        className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                      >
                        {pincode}
                      </span>
                    ))}
                    {area.pincodes.length > 5 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        +{area.pincodes.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Vendors: {area._count?.vendors || 0} | Delivery Partners:{' '}
                  {area._count?.deliveryPartners || 0}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => setEditingArea(area)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  onClick={() => handleToggleStatus(area.id, area.status)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {area.status === 'ACTIVE' ? (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Activate
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleDelete(area.id)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingArea) && (
        <ServiceAreaModal
          area={editingArea}
          onClose={() => {
            setShowCreateModal(false);
            setEditingArea(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingArea(null);
            fetchServiceAreas();
          }}
        />
      )}
    </div>
  );
}

function ServiceAreaModal({
  area,
  onClose,
  onSuccess,
}: {
  area: ServiceArea | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: area?.name || '',
    city: area?.city || '',
    state: area?.state || '',
    pincodes: area?.pincodes.join(', ') || '',
    status: area?.status || 'ACTIVE',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const pincodesArray = formData.pincodes
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p);

      const payload = {
        name: formData.name,
        city: formData.city,
        state: formData.state,
        pincodes: pincodesArray,
        status: formData.status,
      };

      const url = area ? `/api/service-areas/${area.id}` : '/api/service-areas';
      const method = area ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error?.message || `Failed to ${area ? 'update' : 'create'} service area`);
      }
    } catch (error) {
      console.error(`Failed to ${area ? 'update' : 'create'} service area:`, error);
      alert(`Failed to ${area ? 'update' : 'create'} service area`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {area ? 'Edit Service Area' : 'Create Service Area'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Bagalakunte, Bangalore"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="e.g., Bangalore"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              type="text"
              required
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="e.g., Karnataka"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pincodes (comma-separated)
            </label>
            <textarea
              required
              value={formData.pincodes}
              onChange={(e) => setFormData({ ...formData, pincodes: e.target.value })}
              placeholder="e.g., 560073, 560074, 560075"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : area ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
