"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { MapPin, Plus, Edit, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

// Dynamically import AddressLocationPicker to avoid SSR issues with Leaflet
const AddressLocationPicker = dynamic(
  () => import('@/components/AddressLocationPicker').then((mod) => mod.AddressLocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[200px] bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading map...</p>
        </div>
      </div>
    ),
  }
);

interface Address {
  id: string;
  label: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    street: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false,
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Memoized callback to prevent infinite re-renders
  const handleLocationChange = useCallback((location: { latitude: number; longitude: number } | null) => {
    setFormData((prev) => ({
      ...prev,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
    }));
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/session");
      if (response.ok) {
        const session = await response.json();
        const addressResponse = await fetch(
          `/api/users/${session.user.id}/addresses`
        );
        if (addressResponse.ok) {
          const data = await addressResponse.json();
          setAddresses(data.data || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const session = await fetch("/api/auth/session").then((r) => r.json());

      if (editingId) {
        // Update existing address
        const response = await fetch(`/api/users/${session.user.id}/addresses/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          await fetchAddresses();
          resetForm();
          alert("Address updated successfully");
        } else {
          const errorData = await response.json();
          alert(errorData.error?.message || "Failed to update address");
        }
      } else {
        // Create new address
        const response = await fetch(`/api/users/${session.user.id}/addresses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          await fetchAddresses();
          resetForm();
          alert("Address added successfully");
        } else {
          const errorData = await response.json();
          alert(errorData.error?.message || "Failed to add address");
        }
      }
    } catch (error) {
      console.error("Failed to save address:", error);
      alert("Failed to save address");
    }
  };

  const handleEdit = (address: Address) => {
    setFormData({
      label: address.label,
      street: address.street,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault,
      latitude: address.latitude || null,
      longitude: address.longitude || null,
    });
    setEditingId(address.id);
    setShowForm(true);
    setShowLocationPicker(!!(address.latitude && address.longitude));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) {
      return;
    }

    try {
      const session = await fetch("/api/auth/session").then((r) => r.json());
      const response = await fetch(`/api/users/${session.user.id}/addresses/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchAddresses();
        alert("Address deleted successfully");
      } else {
        const errorData = await response.json();
        alert(errorData.error?.message || "Failed to delete address");
      }
    } catch (error) {
      console.error("Failed to delete address:", error);
      alert("Failed to delete address");
    }
  };

  const resetForm = () => {
    setFormData({
      label: "",
      street: "",
      landmark: "",
      city: "",
      state: "",
      pincode: "",
      isDefault: false,
      latitude: null,
      longitude: null,
    });
    setEditingId(null);
    setShowForm(false);
    setShowLocationPicker(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Addresses</h1>
          <p className="text-gray-600 mt-2">
            Manage your delivery addresses
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Address
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {editingId ? "Edit Address" : "Add New Address"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label (e.g., Home, Work)
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) =>
                  setFormData({ ...formData, street: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Landmark
              </label>
              <input
                type="text"
                value={formData.landmark}
                onChange={(e) =>
                  setFormData({ ...formData, landmark: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) =>
                    setFormData({ ...formData, pincode: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) =>
                  setFormData({ ...formData, isDefault: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700">
                Set as default address
              </label>
            </div>

            {/* Location Picker Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">
                    Location Coordinates (Optional)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Add precise location for better delivery service
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLocationPicker(!showLocationPicker)}
                >
                  {showLocationPicker ? 'Hide Map' : 'Add Location'}
                </Button>
              </div>

              {showLocationPicker && (
                <AddressLocationPicker
                  initialLocation={
                    formData.latitude && formData.longitude
                      ? { latitude: formData.latitude, longitude: formData.longitude }
                      : undefined
                  }
                  onLocationChange={handleLocationChange}
                />
              )}
            </div>

            <div className="flex space-x-3">
              <Button type="submit">
                {editingId ? "Update Address" : "Add Address"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Addresses List */}
      {addresses.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No addresses yet
          </h2>
          <p className="text-gray-600 mb-6">
            Add your first delivery address
          </p>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Address
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {address.label}
                  </h3>
                  {address.isDefault && (
                    <span className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      <Star className="w-3 h-3 fill-current" />
                      <span>Default</span>
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(address)}
                    className="text-blue-600 hover:text-blue-700 p-1"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-gray-600 text-sm space-y-1">
                <div>{address.street}</div>
                <div>{address.landmark}</div>
                <div>
                  {address.city}, {address.state}
                </div>
                <div>{address.pincode}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
