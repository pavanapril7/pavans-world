'use client';

import { Clock, AlertCircle } from 'lucide-react';

interface MealSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  cutoffTime: string;
  isActive: boolean;
  isAvailable?: boolean;
}

interface MealSlotSelectorProps {
  vendorId: string;
  mealSlots: MealSlot[];
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  loading?: boolean;
}

export default function MealSlotSelector({
  mealSlots,
  selectedSlotId,
  onSelectSlot,
  loading = false,
}: MealSlotSelectorProps) {
  const availableSlots = mealSlots.filter((slot) => slot.isActive && slot.isAvailable);
  const unavailableSlots = mealSlots.filter((slot) => slot.isActive && !slot.isAvailable);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (mealSlots.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No meal slots available for this vendor</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {availableSlots.length === 0 && unavailableSlots.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                All meal slots are currently unavailable
              </p>
              <p className="text-sm text-amber-700 mt-1">
                The cutoff time has passed for today&apos;s slots. Please check back later for
                tomorrow&apos;s availability.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Available Slots */}
      {availableSlots.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Available Meal Slots</h3>
          {availableSlots.map((slot) => (
            <label
              key={slot.id}
              className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedSlotId === slot.id
                  ? 'border-blue-600 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <input
                type="radio"
                name="mealSlot"
                value={slot.id}
                checked={selectedSlotId === slot.id}
                onChange={() => onSelectSlot(slot.id)}
                className="sr-only"
              />
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{slot.name}</div>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Order by {slot.cutoffTime}
                    </div>
                  </div>
                </div>
                {selectedSlotId === slot.id && (
                  <div className="ml-3">
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
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
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Unavailable Slots */}
      {unavailableSlots.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500">Unavailable Slots</h3>
          {unavailableSlots.map((slot) => (
            <div
              key={slot.id}
              className="block p-4 border-2 border-gray-100 rounded-lg bg-gray-50 opacity-60"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-gray-500">{slot.name}</div>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                    <div className="text-xs text-red-500">Cutoff time passed</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
