'use client';

import { useEffect, useState } from 'react';

interface FulfillmentConfig {
  id: string;
  vendorId: string;
  eatInEnabled: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function VendorFulfillmentSettingsPage() {
  const [config, setConfig] = useState<FulfillmentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    eatInEnabled: false,
    pickupEnabled: false,
    deliveryEnabled: true,
  });

  useEffect(() => {
    fetchVendorAndConfig();
  }, []);

  const fetchVendorAndConfig = async () => {
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
      
      const vendorIdValue = userData.data.vendor.id;
      setVendorId(vendorIdValue);
      
      const configRes = await fetch(`/api/vendors/${vendorIdValue}/fulfillment-config`);
      if (!configRes.ok) {
        throw new Error('Failed to fetch fulfillment configuration');
      }
      const configData = await configRes.json();
      setConfig(configData);
      setFormData({
        eatInEnabled: configData.eatInEnabled,
        pickupEnabled: configData.pickupEnabled,
        deliveryEnabled: configData.deliveryEnabled,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (field: keyof typeof formData) => {
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
    setSuccess(false);
  };

  const handleSave = async () => {
    // Validate at least one method is enabled
    if (!formData.eatInEnabled && !formData.pickupEnabled && !formData.deliveryEnabled) {
      setError('At least one fulfillment method must be enabled');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/vendors/${vendorId}/fulfillment-config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to update fulfillment configuration');
      }

      const updatedConfig = await res.json();
      setConfig(updatedConfig);
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = config && (
    formData.eatInEnabled !== config.eatInEnabled ||
    formData.pickupEnabled !== config.pickupEnabled ||
    formData.deliveryEnabled !== config.deliveryEnabled
  );

  if (loading) {
    return (
      <div className="px-4 py-6">
        <p className="text-gray-500">Loading fulfillment settings...</p>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Fulfillment Options</h1>
        <p className="text-gray-600 mt-1">
          Configure how customers can receive their orders
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">Fulfillment settings updated successfully!</p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          <FulfillmentToggle
            label="Dine-In"
            description="Allow customers to order for eating at your restaurant"
            enabled={formData.eatInEnabled}
            onToggle={() => handleToggle('eatInEnabled')}
            icon="🍽️"
          />

          <FulfillmentToggle
            label="Pickup"
            description="Allow customers to pick up orders from your location"
            enabled={formData.pickupEnabled}
            onToggle={() => handleToggle('pickupEnabled')}
            icon="🛍️"
          />

          <FulfillmentToggle
            label="Delivery"
            description="Allow customers to get orders delivered to their address"
            enabled={formData.deliveryEnabled}
            onToggle={() => handleToggle('deliveryEnabled')}
            icon="🚚"
          />
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {hasChanges ? (
                <span className="text-amber-600">You have unsaved changes</span>
              ) : (
                <span>All changes saved</span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Important Notes</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>At least one fulfillment method must be enabled</li>
          <li>Disabling a method will prevent new orders with that option</li>
          <li>Existing orders with disabled methods will not be affected</li>
          <li>Delivery orders require customers to provide a delivery address</li>
        </ul>
      </div>
    </div>
  );
}

interface FulfillmentToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  icon: string;
}

function FulfillmentToggle({ label, description, enabled, onToggle, icon }: FulfillmentToggleProps) {
  return (
    <div className="flex items-start justify-between py-4">
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">{label}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
