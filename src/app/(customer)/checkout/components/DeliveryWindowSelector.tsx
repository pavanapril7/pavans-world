'use client';

import { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface DeliveryWindow {
  start: string;
  end: string;
}

interface DeliveryWindowSelectorProps {
  vendorId: string;
  mealSlotId: string | null;
  selectedWindow: { start: string; end: string } | null;
  onSelectWindow: (window: { start: string; end: string }) => void;
}

export default function DeliveryWindowSelector({
  vendorId,
  mealSlotId,
  selectedWindow,
  onSelectWindow,
}: DeliveryWindowSelectorProps) {
  const [windows, setWindows] = useState<DeliveryWindow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mealSlotId) {
      fetchDeliveryWindows();
    } else {
      setWindows([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealSlotId]);

  const fetchDeliveryWindows = async () => {
    if (!mealSlotId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/vendors/${vendorId}/meal-slots/${mealSlotId}/windows`
      );

      if (response.ok) {
        const data = await response.json();
        // API returns array directly, not wrapped in object
        const windowsList = Array.isArray(data) ? data : (data.windows || []);
        setWindows(windowsList);
      } else {
        setError('Failed to load delivery windows');
      }
    } catch (err) {
      console.error('Failed to fetch delivery windows:', err);
      setError('Failed to load delivery windows');
    } finally {
      setLoading(false);
    }
  };

  if (!mealSlotId) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              onClick={fetchDeliveryWindows}
              className="text-sm text-red-600 hover:text-red-700 underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (windows.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-gray-600">No delivery windows available</p>
      </div>
    );
  }

  const isWindowSelected = (window: DeliveryWindow) => {
    return (
      selectedWindow?.start === window.start && selectedWindow?.end === window.end
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">
        Select Preferred Delivery Window
      </h3>
      <p className="text-xs text-gray-500">
        Choose a time window when you&apos;d like to receive your order
      </p>

      <div className="grid grid-cols-2 gap-3">
        {windows.map((window, index) => (
          <label
            key={`${window.start}-${window.end}-${index}`}
            className={`block p-3 border-2 rounded-lg cursor-pointer transition-all ${
              isWindowSelected(window)
                ? 'border-blue-600 bg-blue-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <input
              type="radio"
              name="deliveryWindow"
              value={`${window.start}-${window.end}`}
              checked={isWindowSelected(window)}
              onChange={() => onSelectWindow(window)}
              className="sr-only"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  {window.start} - {window.end}
                </span>
              </div>
              {isWindowSelected(window) && (
                <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
