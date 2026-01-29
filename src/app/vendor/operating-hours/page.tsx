'use client';

import { useEffect, useState } from 'react';

interface OperatingHours {
  id: string;
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export default function OperatingHoursPage() {
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [hours, setHours] = useState<Record<string, OperatingHours>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchOperatingHours();
  }, []);

  const fetchOperatingHours = async () => {
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
      
      setVendorId(userData.data.vendor.id);

      // Fetch operating hours
      const hoursMap: Record<string, OperatingHours> = {};
      const hoursRes = await fetch(`/api/vendors/${userData.data.vendor.id}/operating-hours`);
      if (hoursRes.ok) {
        const hoursData = await hoursRes.json();
        hoursData.forEach((h: OperatingHours) => {
          hoursMap[h.dayOfWeek] = h;
        });
      }

      // Initialize missing days with default values
      const initialHours: Record<string, OperatingHours> = {};
      DAYS_OF_WEEK.forEach((day) => {
        if (!hoursMap[day]) {
          initialHours[day] = {
            id: '',
            dayOfWeek: day,
            openTime: '09:00',
            closeTime: '21:00',
            isClosed: false,
          };
        } else {
          initialHours[day] = hoursMap[day];
        }
      });
      setHours(initialHours);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    day: string,
    field: 'openTime' | 'closeTime' | 'isClosed',
    value: string | boolean
  ) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (!vendorId) {
        throw new Error('Vendor ID not found');
      }

      const hoursArray = Object.values(hours).map((h) => ({
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
      }));

      const res = await fetch(`/api/vendors/${vendorId}/operating-hours`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hours: hoursArray }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Failed to update operating hours');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6">
        <p className="text-gray-500">Loading operating hours...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Operating Hours</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">Operating hours updated successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="border-b border-gray-200 pb-6 last:border-b-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {day.charAt(0) + day.slice(1).toLowerCase()}
                </h3>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={hours[day]?.isClosed || false}
                    onChange={(e) => handleChange(day, 'isClosed', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Closed</span>
                </label>
              </div>

              {!hours[day]?.isClosed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Opening Time
                    </label>
                    <input
                      type="time"
                      value={hours[day]?.openTime || '09:00'}
                      onChange={(e) => handleChange(day, 'openTime', e.target.value)}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Closing Time
                    </label>
                    <input
                      type="time"
                      value={hours[day]?.closeTime || '21:00'}
                      onChange={(e) => handleChange(day, 'closeTime', e.target.value)}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Operating Hours'}
          </button>
        </div>
      </form>
    </div>
  );
}
