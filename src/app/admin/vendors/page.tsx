'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Check, Ban, Plus, X, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface Category {
  id: string;
  name: string;
}

interface ServiceArea {
  id: string;
  name: string;
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [serviceAreaFilter, setServiceAreaFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editForm, setEditForm] = useState({
    businessName: '',
    description: '',
    categoryId: '',
    serviceAreaId: '',
    status: '',
  });
  const [createFormData, setCreateFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    businessName: '',
    description: '',
    categoryId: '',
    serviceAreaId: '',
  });

  const fetchVendors = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('categoryId', categoryFilter);
      if (serviceAreaFilter) params.append('serviceAreaId', serviceAreaFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/vendors?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, serviceAreaFilter, searchTerm]);

  useEffect(() => {
    fetchVendors();
    fetchCategories();
    fetchServiceAreas();
  }, [fetchVendors, statusFilter, categoryFilter, serviceAreaFilter]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const result = await response.json();
        setCategories(Array.isArray(result) ? result : result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchServiceAreas = async () => {
    try {
      const response = await fetch('/api/service-areas');
      if (response.ok) {
        const result = await response.json();
        setServiceAreas(Array.isArray(result) ? result : result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch service areas:', error);
    }
  };

  const handleSearch = () => {
    fetchVendors();
  };

  const handleApprove = async (vendorId: string) => {
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
        fetchVendors();
      } else {
        alert('Failed to approve vendor');
      }
    } catch (error) {
      console.error('Failed to approve vendor:', error);
      alert('Failed to approve vendor');
    }
  };

  const handleDeactivate = async (vendorId: string) => {
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
        fetchVendors();
      } else {
        alert('Failed to deactivate vendor');
      }
    } catch (error) {
      console.error('Failed to deactivate vendor:', error);
      alert('Failed to deactivate vendor');
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateFormData({ ...createFormData, password });
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createFormData),
      });

      if (response.ok) {
        setCreatedCredentials({
          email: createFormData.email,
          password: createFormData.password,
        });
        setShowCreateForm(false);
        setCreateFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          businessName: '',
          description: '',
          categoryId: '',
          serviceAreaId: '',
        });
        fetchVendors();
      } else {
        const error = await response.json();
        alert(error.error?.message || 'Failed to create vendor');
      }
    } catch (error) {
      console.error('Failed to create vendor:', error);
      alert('Failed to create vendor');
    }
  };

  const openEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setEditForm({
      businessName: vendor.businessName,
      description: vendor.description,
      categoryId: vendor.category.id,
      serviceAreaId: vendor.serviceArea.id,
      status: vendor.status,
    });
  };

  const closeEditModal = () => {
    setEditingVendor(null);
    setEditForm({
      businessName: '',
      description: '',
      categoryId: '',
      serviceAreaId: '',
      status: '',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor) return;

    try {
      const response = await fetch(`/api/admin/vendors/${editingVendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update vendor');
      }

      closeEditModal();
      fetchVendors();
      alert('Vendor updated successfully');
    } catch (error) {
      console.error('Error updating vendor:', error);
      alert(error instanceof Error ? error.message : 'Failed to update vendor');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-600 mt-2">Manage vendors and approvals</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Vendor
        </Button>
      </div>

      {/* Credentials Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Vendor Created Successfully!</h3>
            <p className="text-gray-600 mb-4">
              Please share these credentials with the vendor. They will need these to log in.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-mono font-semibold text-gray-900">{createdCredentials.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Password</p>
                <p className="font-mono font-semibold text-gray-900">{createdCredentials.password}</p>
              </div>
            </div>
            <p className="text-sm text-amber-600 mb-4">
              ⚠️ Make sure to copy these credentials now. You won&apos;t be able to see the password again.
            </p>
            <Button
              onClick={() => setCreatedCredentials(null)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Create Vendor Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Create New Vendor</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={createFormData.firstName}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={createFormData.lastName}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={createFormData.email}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={createFormData.phone}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="+919876543210"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={createFormData.password}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, password: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                    minLength={8}
                  />
                  <Button type="button" onClick={generatePassword} variant="outline">
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 8 characters. Click Generate for a secure password.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={createFormData.businessName}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, businessName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={createFormData.description}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={createFormData.categoryId}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, categoryId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Area *
                  </label>
                  <select
                    value={createFormData.serviceAreaId}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, serviceAreaId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select Service Area</option>
                    {serviceAreas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="submit" className="flex-1">
                  Create Vendor
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search vendors..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <Button onClick={handleSearch} variant="outline">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
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
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Area
            </label>
            <select
              value={serviceAreaFilter}
              onChange={(e) => setServiceAreaFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Areas</option>
              {serviceAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Business
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service Area
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Orders
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No vendors found
                </td>
              </tr>
            ) : (
              vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {vendor.businessName}
                    </div>
                    <div className="text-sm text-gray-500">
                      Rating: {vendor.rating ? Number(vendor.rating).toFixed(1) : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {vendor.user.firstName} {vendor.user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{vendor.user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {vendor.category.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vendor.serviceArea.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        vendor.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : vendor.status === 'PENDING_APPROVAL'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {vendor.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vendor.totalOrders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => openEditModal(vendor)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 inline" />
                      </button>
                      {vendor.status === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => handleApprove(vendor.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Approve"
                        >
                          <Check className="w-4 h-4 inline" />
                        </button>
                      )}
                      {vendor.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleDeactivate(vendor.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Deactivate"
                        >
                          <Ban className="w-4 h-4 inline" />
                        </button>
                      )}
                      {vendor.status === 'INACTIVE' && (
                        <button
                          onClick={() => handleApprove(vendor.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Activate"
                        >
                          <Check className="w-4 h-4 inline" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Vendor Modal */}
      {editingVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Edit Vendor</h2>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={editForm.businessName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, businessName: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={editForm.categoryId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, categoryId: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Area
                  </label>
                  <select
                    value={editForm.serviceAreaId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, serviceAreaId: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select Service Area</option>
                    {serviceAreas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Owner Information
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Name:</span>{' '}
                    {editingVendor.user.firstName} {editingVendor.user.lastName}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{' '}
                    {editingVendor.user.email}
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span>{' '}
                    {editingVendor.user.phone}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button type="button" onClick={closeEditModal} variant="outline">
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
