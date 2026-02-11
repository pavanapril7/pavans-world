'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  vendor?: {
    id: string;
    businessName: string;
    status: string;
    category: {
      name: string;
    };
    serviceArea: {
      name: string;
    };
  };
  deliveryPartner?: {
    id: string;
    vehicleType: string;
    vehicleNumber: string;
    status: string;
    serviceArea: {
      name: string;
    };
  };
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        const userData = data.data || data;
        setUser(userData);
        setFormData({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone,
        });
      } else {
        alert('User not found');
        router.push('/admin/users');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      alert('Failed to fetch user');
      router.push('/admin/users');
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('User updated successfully');
        fetchUser();
      } else {
        const error = await response.json();
        alert(error.error?.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this user? This will log them out immediately.')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('User deactivated successfully');
        router.push('/admin/users');
      } else {
        const error = await response.json();
        alert(error.error?.message || 'Failed to deactivate user');
      }
    } catch (error) {
      console.error('Failed to deactivate user:', error);
      alert('Failed to deactivate user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading user details...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">User not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => router.push('/admin/users')}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
            <p className="text-gray-600 mt-1">
              {user.firstName} {user.lastName}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {user.status === 'ACTIVE' && (
            <Button
              onClick={handleDeactivate}
              variant="outline"
              className="text-red-600 hover:text-red-700"
            >
              <Ban className="w-4 h-4 mr-2" />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <input
              type="text"
              value={user.role}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                user.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : user.status === 'INACTIVE'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {user.status}
            </span>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">User ID</p>
            <p className="text-sm font-mono text-gray-900 mt-1">{user.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created At</p>
            <p className="text-sm text-gray-900 mt-1">
              {new Date(user.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="text-sm text-gray-900 mt-1">
              {new Date(user.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Vendor Information (if applicable) */}
      {user.vendor && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Vendor Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Business Name</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {user.vendor.businessName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  user.vendor.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : user.vendor.status === 'PENDING_APPROVAL'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {user.vendor.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Category</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {user.vendor.category.name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Service Area</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {user.vendor.serviceArea.name}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button
              onClick={() => router.push(`/admin/vendors?vendorId=${user.vendor?.id}`)}
              variant="outline"
              size="sm"
            >
              View Vendor Details
            </Button>
          </div>
        </div>
      )}

      {/* Delivery Partner Information (if applicable) */}
      {user.deliveryPartner && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Delivery Partner Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Vehicle Type</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {user.deliveryPartner.vehicleType || 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Vehicle Number</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {user.deliveryPartner.vehicleNumber || 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  user.deliveryPartner.status === 'AVAILABLE'
                    ? 'bg-green-100 text-green-800'
                    : user.deliveryPartner.status === 'BUSY'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {user.deliveryPartner.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Service Area</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {user.deliveryPartner.serviceArea?.name || 'Not assigned'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
