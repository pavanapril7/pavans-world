'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DefaultMealSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  cutoffTime: string;
  timeWindowDuration: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDefaultMealSlotsPage() {
  const [mealSlots, setMealSlots] = useState<DefaultMealSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<DefaultMealSlot | null>(null);

  useEffect(() => {
    fetchDefaultMealSlots();
  }, []);

  const fetchDefaultMealSlots = async () => {
    try {
      const response = await fetch('/api/admin/default-meal-slots');
      if (response.ok) {
        const result = await response.json();
        setMealSlots(Array.isArray(result) ? result : result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch default meal slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this default meal slot? This will not affect existing vendor meal slots.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/default-meal-slots/${slotId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchDefaultMealSlots();
      } else {
        const error = await response.json();
        alert(error.error?.message || 'Failed to delete default meal slot');
      }
    } catch (error) {
      console.error('Failed to delete default meal slot:', error);
      alert('Failed to delete default meal slot');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading default meal slots...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Default Meal Slots</h1>
          <p className="text-gray-600 mt-2">
            Manage platform-wide meal slot templates that are applied to new vendors
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Default
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Clock className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">About Default Meal Slots</h3>
            <p className="text-sm text-blue-800 mt-1">
              Default meal slots are automatically applied to new vendors when they join the platform.
              Changes to defaults do not affect existing vendor configurations.
            </p>
          </div>
        </div>
      </div>

      {/* Meal Slots Table */}
      {mealSlots.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No default meal slots</h3>
          <p className="text-gray-500 mb-4">
            Create default meal slots to automatically configure new vendors
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Default
          </Button>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cutoff Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Window Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mealSlots.map((slot) => (
                <tr key={slot.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{slot.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {slot.startTime} - {slot.endTime}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{slot.cutoffTime}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{slot.timeWindowDuration} min</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        slot.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {slot.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      onClick={() => setEditingSlot(slot)}
                      variant="ghost"
                      size="sm"
                      className="mr-2"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(slot.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingSlot) && (
        <DefaultMealSlotModal
          slot={editingSlot}
          onClose={() => {
            setShowCreateModal(false);
            setEditingSlot(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingSlot(null);
            fetchDefaultMealSlots();
          }}
        />
      )}
    </div>
  );
}

function DefaultMealSlotModal({
  slot,
  onClose,
  onSuccess,
}: {
  slot: DefaultMealSlot | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: slot?.name || '',
    startTime: slot?.startTime || '',
    endTime: slot?.endTime || '',
    cutoffTime: slot?.cutoffTime || '',
    timeWindowDuration: slot?.timeWindowDuration || 30,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = slot
        ? `/api/admin/default-meal-slots/${slot.id}`
        : '/api/admin/default-meal-slots';
      const method = slot ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || `Failed to ${slot ? 'update' : 'create'} default meal slot`);
      }
    } catch (err) {
      setError(`Failed to ${slot ? 'update' : 'create'} default meal slot`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {slot ? 'Edit Default Meal Slot' : 'Create Default Meal Slot'}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Lunch, Dinner"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cutoff Time
            </label>
            <input
              type="time"
              required
              value={formData.cutoffTime}
              onChange={(e) => setFormData({ ...formData, cutoffTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Orders must be placed before this time
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Window Duration (minutes)
            </label>
            <input
              type="number"
              required
              value={formData.timeWindowDuration}
              onChange={(e) => setFormData({ ...formData, timeWindowDuration: parseInt(e.target.value) })}
              min="15"
              step="15"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Duration of each delivery time window
            </p>
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
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : slot ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
