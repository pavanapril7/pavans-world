'use client';

import { AlertCircle, MapPin } from 'lucide-react';

interface LocationValidationMessageProps {
  nearestServiceArea?: {
    id: string;
    name: string;
    distanceKm: number;
  };
}

/**
 * LocationValidationMessage component
 * Displays a message when an address is not serviceable
 * Shows nearest service area information if available
 */
export function LocationValidationMessage({ nearestServiceArea }: LocationValidationMessageProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900 mb-1">
            We don&apos;t serve this location yet
          </h3>
          <p className="text-sm text-amber-800">
            Unfortunately, we don&apos;t currently deliver to this address. We&apos;re working on expanding our service areas.
          </p>
          
          {nearestServiceArea && (
            <div className="mt-3 pt-3 border-t border-amber-200">
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Nearest service area:</p>
                  <p className="mt-1">
                    <span className="font-semibold">{nearestServiceArea.name}</span>
                    {' '}({nearestServiceArea.distanceKm.toFixed(1)} km away)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
