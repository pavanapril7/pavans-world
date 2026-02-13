'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, Ban, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Vendor {
  id: string;
  businessName: string;
  description: string;
  status: string;
  rating: number;
  totalOrders: number;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  category: {
    id: string;
    name: string;
  };
  serviceArea: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface MealSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  cutoffTime: string;
  timeWindowDuration: number;
  isActive: boolean;
}

export default function AdminVendorDetailPage() {
  const params = useParams();
  const vendorId = params?.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [mealSlots, setMealSlots] = useState<MealSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingDefaults, setApplyingDefaults] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchVendorDetails = async () => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}`);
      if (response.ok) {
        const data = await response.json();
        setVendor(data);
      } else {
        setMessage({ type: 'error', text: 'Failed to load vendor details' });
      }
    } catch (error) {
      console.error('Failed to fetch vendor:', error);
      setMessage({ type: 'error', text: 'Failed to load vendor details' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMealSlots = async () => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}/meal-slots`);
      if (response.ok) {
        const data = await response.json();
        // API returns array directly, not wrapped in mealSlots property
        setMealSlots(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch meal slots:', error);
    }
  };

  useEffect(() => {
    if (vendorId) {
      fetchVendorDetails();
      fetchMealSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const handleApplyDefaults = async () => {
    if (!confirm('Apply default meal slots to this vendor? This will create new meal slots based on platform defaults.')) {
      return;
    }

    setApplyingDefaults(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}/apply-defaults`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: `Successfully applied ${data.mealSlots?.length || 0} default meal slots`,
        });
        fetchMealSlots();
      } else {
        const error = await response.json();
        setMessage({
          type: 'error',
          text: error.error?.message || 'Failed to apply default meal slots',
        });
      }
    } catch (error) {
      console.error('Failed to apply defaults:', error);
      setMessage({ type: 'error', text: 'Failed to apply default meal slots' });
    } finally {
      setApplyingDefaults(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this vendor?')) {
      return;
    }

    try {
      const response = await fetch(`/api/vendors/${vendorId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Vendor approved successfully' });
        fetchVendorDetails();
      } else {
        setMessage({ type: 'error', text: 'Failed to approve vendor' });
      }
    } catch (error) {
      console.error('Failed to approve vendor:', error);
      setMessage({ type: 'error', text: 'Failed to approve vendor' });
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this vendor?')) {
      return;
    }

    try {
      const response = await fetch(`/api/vendors/${vendorId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INACTIVE' }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Vendor deactivated successfully' });
        fetchVendorDetails();
      } else {
        setMessage({ type: 'error', text: 'Failed to deactivate vendor' });
      }
    } catch (error) {
      console.error('Failed to deactivate vendor:', error);
      setMessage({ type: 'error', text: 'Failed to deactivate vendor' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading vendor details...</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/admin/vendors">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Vendors
            </Button>
          </Link>
        </div>
        <div className="text-center py-12 text-gray-500">
          Vendor not found
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/vendors">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{vendor.businessName}</h1>
            <p className="text-gray-600 mt-1">{vendor.category.name}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {vendor.status === 'PENDING_APPROVAL' && (
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-2" />
              Approve
            </Button>
          )}
          {vendor.status === 'ACTIVE' && (
            <Button onClick={handleDeactivate} variant="outline" className="text-red-600 hover:text-red-700">
              <Ban className="w-4 h-4 mr-2" />
              Deactivate
            </Button>
          )}
          {vendor.status === 'INACTIVE' && (
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-2" />
              Activate
            </Button>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Vendor Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Business Name</p>
              <p className="text-gray-900 font-medium">{vendor.businessName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-gray-900">{vendor.description}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  vendor.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : vendor.status === 'PENDING_APPROVAL'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {vendor.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Service Area</p>
              <p className="text-gray-900">{vendor.serviceArea.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Rating</p>
              <p className="text-gray-900">{vendor.rating ? Number(vendor.rating).toFixed(1) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-gray-900">{vendor.totalOrders}</p>
            </div>
          </div>
        </div>

        {/* Owner Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Owner Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="text-gray-900 font-medium">
                {vendor.user.firstName} {vendor.user.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-gray-900">{vendor.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-gray-900">{vendor.user.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="text-gray-900">
                {new Date(vendor.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Meal Slots Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Meal Slots</h2>
          <Button
            onClick={handleApplyDefaults}
            disabled={applyingDefaults}
            variant="outline"
          >
            <Calendar className="w-4 h-4 mr-2" />
            {applyingDefaults ? 'Applying...' : 'Apply Default Meal Slots'}
          </Button>
        </div>

        {mealSlots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No meal slots configured for this vendor.</p>
            <p className="text-sm mt-2">Click &quot;Apply Default Meal Slots&quot; to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mealSlots.map((slot) => (
                  <tr key={slot.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {slot.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {slot.startTime} - {slot.endTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {slot.cutoffTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {slot.timeWindowDuration} min
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href={`/vendors/${vendor.id}`}>
            <Button variant="outline">View Products</Button>
          </Link>
          <Link href={`/admin/orders?vendorId=${vendor.id}`}>
            <Button variant="outline">View Orders</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
