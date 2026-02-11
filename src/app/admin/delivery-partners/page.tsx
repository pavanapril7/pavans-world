'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, Edit, MapPin, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeliveryPartner {
  id: string;
  userId: string;
  vehicleType: string | null;
  vehicleNumber: string | null;
  status: string;
  rating: number | string; // Prisma Decimal type
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: string;
  };
  serviceArea: {
    id: string;
    name: string;
  } | null;
}

interface ServiceArea {
  id: string;
  name: string;
}

export default function AdminDeliveryPartnersPage() {
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<DeliveryPartner | null>(null);

  useEffect(() => {
    fetchPartners();
    fetchServiceAreas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchPartners = async () => {
    try {
      const params = new URLSearchParams();
      params.append('role', 'DELIVERY_PARTNER');
      params.append('includeDeliveryPartner', 'true');
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/users?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        const users = result.data || result;
        
        // Transform to include delivery partner data
        const partnersData = users
          .filter((u: { deliveryPartner?: unknown }) => u.deliveryPartner)
          .map((u: { deliveryPartner: DeliveryPartner; firstName: string; lastName: string; email: string; phone: string; status: string }) => ({
            ...u.deliveryPartner,
            user: {
              firstName: u.firstName,
              lastName: u.lastName,
              email: u.email,
              phone: u.phone,
              status: u.status,
            },
          }));
        
        setPartners(partnersData);
      }
    } catch (error) {
      console.error('Failed to fetch delivery partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceAreas = async () => {
    try {
      const response = await fetch('/api/service-areas');
      if (response.ok) {
        const result = await response.json();
        setServiceAreas(result.data || result);
      }
    } catch (error) {
      console.error('Failed to fetch service areas:', error);
    }
  };

  const handleSearch = () => {
    fetchPartners();
  };

  const handleEdit = (partner: DeliveryPartner) => {
    setSelectedPartner(partner);
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading delivery partners...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Partners</h1>
          <p className="text-gray-600 mt-2">Manage delivery partner profiles and assignments</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Delivery Partner
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name, email, or phone..."
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
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
              <option value="BUSY">Busy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Partners Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Partner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service Area
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {partners.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No delivery partners found
                </td>
              </tr>
            ) : (
              partners.map((partner) => (
                <tr key={partner.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {partner.user.firstName} {partner.user.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{partner.user.email}</div>
                    <div className="text-sm text-gray-500">{partner.user.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {partner.vehicleType ? (
                      <div>
                        <div className="text-sm text-gray-900 flex items-center">
                          <Truck className="w-4 h-4 mr-1" />
                          {partner.vehicleType}
                        </div>
                        <div className="text-sm text-gray-500">{partner.vehicleNumber}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {partner.serviceArea ? (
                      <div className="text-sm text-gray-900 flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {partner.serviceArea.name}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        partner.status === 'ONLINE'
                          ? 'bg-green-100 text-green-800'
                          : partner.status === 'BUSY'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {partner.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ⭐ {Number(partner.rating).toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(partner)}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      <Edit className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedPartner && (
        <EditPartnerModal
          partner={selectedPartner}
          serviceAreas={serviceAreas}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPartner(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedPartner(null);
            fetchPartners();
          }}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePartnerModal
          serviceAreas={serviceAreas}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchPartners();
          }}
        />
      )}
    </div>
  );
}

function EditPartnerModal({
  partner,
  serviceAreas,
  onClose,
  onSuccess,
}: {
  partner: DeliveryPartner;
  serviceAreas: ServiceArea[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    vehicleType: partner.vehicleType || '',
    vehicleNumber: partner.vehicleNumber || '',
    serviceAreaId: partner.serviceArea?.id || '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/delivery-partners/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Delivery partner updated successfully');
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error?.message || 'Failed to update delivery partner');
      }
    } catch (error) {
      console.error('Failed to update delivery partner:', error);
      alert('Failed to update delivery partner');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Edit Delivery Partner
          </h2>
          <div className="mt-3 p-3 bg-gray-50 rounded">
            <div className="text-sm font-medium text-gray-900">
              {partner.user.firstName} {partner.user.lastName}
            </div>
            <div className="text-sm text-gray-500">{partner.user.email}</div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Type
            </label>
            <select
              value={formData.vehicleType}
              onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select vehicle type</option>
              <option value="BIKE">Bike</option>
              <option value="SCOOTER">Scooter</option>
              <option value="CAR">Car</option>
              <option value="VAN">Van</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Number
            </label>
            <input
              type="text"
              value={formData.vehicleNumber}
              onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
              placeholder="e.g., MH12AB1234"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Area
            </label>
            <select
              value={formData.serviceAreaId}
              onChange={(e) => setFormData({ ...formData, serviceAreaId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select service area</option>
              {serviceAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
          </div>
          
          <div className="p-6 border-t bg-gray-50">
            <div className="flex space-x-3">
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
                {submitting ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreatePartnerModal({
  serviceAreas,
  onClose,
  onSuccess,
}: {
  serviceAreas: ServiceArea[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    vehicleType: '',
    vehicleNumber: '',
    serviceAreaId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // First create the user with DELIVERY_PARTNER role
      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          phone: formData.phone,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: 'DELIVERY_PARTNER',
        }),
      });

      if (!userResponse.ok) {
        const error = await userResponse.json();
        alert(error.error?.message || 'Failed to create delivery partner');
        setSubmitting(false);
        return;
      }

      const userData = await userResponse.json();
      const userId = userData.data.id;

      // Get the delivery partner ID
      const partnerResponse = await fetch(`/api/users/${userId}`);
      if (!partnerResponse.ok) {
        alert('Failed to fetch delivery partner details');
        setSubmitting(false);
        return;
      }

      const partnerData = await partnerResponse.json();
      const deliveryPartnerId = partnerData.data.deliveryPartner?.id;

      if (!deliveryPartnerId) {
        alert('Delivery partner record not found');
        setSubmitting(false);
        return;
      }

      // Update delivery partner details if provided
      if (formData.vehicleType || formData.vehicleNumber || formData.serviceAreaId) {
        const updateResponse = await fetch(`/api/delivery-partners/${deliveryPartnerId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicleType: formData.vehicleType || undefined,
            vehicleNumber: formData.vehicleNumber || undefined,
            serviceAreaId: formData.serviceAreaId || undefined,
          }),
        });

        if (!updateResponse.ok) {
          alert('User created but failed to update vehicle details. You can edit them later.');
        }
      }

      alert('Delivery partner created successfully');
      onSuccess();
    } catch (error) {
      console.error('Failed to create delivery partner:', error);
      alert('Failed to create delivery partner');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Add Delivery Partner
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">Vehicle Details (Optional - can be added later)</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select vehicle type</option>
                  <option value="BIKE">Bike</option>
                  <option value="SCOOTER">Scooter</option>
                  <option value="CAR">Car</option>
                  <option value="VAN">Van</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  placeholder="e.g., MH12AB1234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Area
                </label>
                <select
                  value={formData.serviceAreaId}
                  onChange={(e) => setFormData({ ...formData, serviceAreaId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select service area</option>
                  {serviceAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          </div>
          
          <div className="p-6 border-t bg-gray-50">
            <div className="flex space-x-3">
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
                {submitting ? 'Creating...' : 'Create Partner'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
