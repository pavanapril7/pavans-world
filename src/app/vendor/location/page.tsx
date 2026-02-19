'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';

// Dynamically import VendorLocationPicker to avoid SSR issues with Leaflet
const VendorLocationPicker = dynamic(
  () => import('@/components/VendorLocationPicker').then((mod) => mod.VendorLocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[500px] bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading map...</p>
        </div>
      </div>
    ),
  }
);

interface VendorLocation {
  id: string;
  businessName: string;
  latitude: number | null;
  longitude: number | null;
  serviceRadiusKm: number;
}

export default function VendorLocationPage() {
  const [vendor, setVendor] = useState<VendorLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVendorData();
  }, []);

  const fetchVendorData = async () => {
    try {
      // Get current user session
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) {
        throw new Error('Not authenticated');
      }
      const sessionData = await sessionRes.json();

      // Fetch user data with vendor profile
      const userRes = await fetch(`/api/users/${sessionData.user.id}`);
      if (!userRes.ok) {
        throw new Error('Failed to fetch vendor profile');
      }
      const userData = await userRes.json();

      if (!userData.data?.vendor) {
        throw new Error('No vendor profile found');
      }

      const vendorData = userData.data.vendor;
      setVendor({
        id: vendorData.id,
        businessName: vendorData.businessName,
        latitude: vendorData.latitude,
        longitude: vendorData.longitude,
        serviceRadiusKm: vendorData.serviceRadiusKm || 10,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSuccess = () => {
    // Refresh vendor data after successful save
    fetchVendorData();
  };

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading location settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">
                {error || 'Vendor profile not found'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Business Location</h1>
        </div>
        <p className="text-gray-600">
          Set your business location and service radius to help customers find you
        </p>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-800 mb-1">
              About Location Settings
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Click or drag the marker on the map to set your exact location</li>
              <li>• You can also enter coordinates manually in the fields below</li>
              <li>• The service radius defines how far you can deliver from your location</li>
              <li>• Customers within your service radius will be able to find and order from you</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Current Location Info */}
      {vendor.latitude && vendor.longitude && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-2">Current Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Latitude:</span>{' '}
              <span className="font-medium text-gray-900">{vendor.latitude.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-gray-500">Longitude:</span>{' '}
              <span className="font-medium text-gray-900">{vendor.longitude.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-gray-500">Service Radius:</span>{' '}
              <span className="font-medium text-gray-900">{vendor.serviceRadiusKm} km</span>
            </div>
          </div>
        </div>
      )}

      {/* Location Picker */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <VendorLocationPicker
          vendorId={vendor.id}
          initialLocation={
            vendor.latitude && vendor.longitude
              ? {
                  latitude: vendor.latitude,
                  longitude: vendor.longitude,
                  serviceRadiusKm: vendor.serviceRadiusKm,
                }
              : undefined
          }
          onSave={handleSaveSuccess}
        />
      </div>

      {/* Help Text */}
      <div className="mt-6 text-sm text-gray-500">
        <p>
          Need help? Contact support if you&apos;re having trouble setting your location.
        </p>
      </div>
    </div>
  );
}
