'use client';

import { useEffect, useState } from 'react';

interface VendorProfile {
  id: string;
  businessName: string;
  description: string;
  status: string;
  rating: number | null;
  totalOrders: number;
  category: {
    id: string;
    name: string;
  };
  serviceArea: {
    id: string;
    name: string;
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export default function VendorProfilePage() {
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
  });

  useEffect(() => {
    fetchVendorProfile();
  }, []);

  const fetchVendorProfile = async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) {
        throw new Error('Not authenticated');
      }
      const sessionData = await sessionRes.json();
      
      const vendorRes = await fetch(`/api/users/${sessionData.user.id}`);
      if (!vendorRes.ok) {
        throw new Error('Failed to fetch vendor profile');
      }
      const userData = await vendorRes.json();
      
      if (!userData.data?.vendor) {
        throw new Error('No vendor profile found');
      }
      
      setVendor(userData.data.vendor);
      setFormData({
        businessName: userData.data.vendor.businessName,
        description: userData.data.vendor.description,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (!vendor) {
        throw new Error('Vendor profile not loaded');
      }

      const res = await fetch(`/api/vendors/${vendor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Failed to update profile');
      }

      setSuccess(true);
      await fetchVendorProfile();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return (
      <div className="px-4 py-6">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Vendor profile not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Vendor Profile</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">Profile updated successfully!</p>
        </div>
      )}

      {/* Read-only Information */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Owner Name</p>
            <p className="text-base font-medium">
              {vendor.user.firstName} {vendor.user.lastName}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-base font-medium">{vendor.user.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="text-base font-medium">{vendor.user.phone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="text-base font-medium">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  vendor.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : vendor.status === 'PENDING_APPROVAL'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {vendor.status}
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Category</p>
            <p className="text-base font-medium">{vendor.category.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Service Area</p>
            <p className="text-base font-medium">{vendor.serviceArea.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-base font-medium">{vendor.totalOrders}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Rating</p>
            <p className="text-base font-medium">
              {vendor.rating ? `${Number(vendor.rating).toFixed(1)} / 5.0` : 'No ratings yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Editable Information */}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Business Information</h2>
        <div className="space-y-6">
          <div>
            <label
              htmlFor="businessName"
              className="block text-sm font-medium text-gray-700"
            >
              Business Name *
            </label>
            <input
              type="text"
              id="businessName"
              name="businessName"
              required
              value={formData.businessName}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Describe your business and what makes it special
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {vendor.status === 'PENDING_APPROVAL' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <p className="text-yellow-800">
            Your vendor account is pending approval. You will be notified once an
            administrator reviews and approves your account.
          </p>
        </div>
      )}
    </div>
  );
}
