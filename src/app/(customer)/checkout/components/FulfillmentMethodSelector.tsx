'use client';

import { Store, ShoppingBag, Truck } from 'lucide-react';

type FulfillmentMethod = 'EAT_IN' | 'PICKUP' | 'DELIVERY';

interface FulfillmentConfig {
  eatInEnabled: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
}

interface FulfillmentMethodSelectorProps {
  config: FulfillmentConfig | null;
  selectedMethod: FulfillmentMethod;
  onSelectMethod: (method: FulfillmentMethod) => void;
  loading?: boolean;
}

const methodDetails: Record<
  FulfillmentMethod,
  { icon: React.ComponentType<{ className?: string }>; label: string; description: string }
> = {
  EAT_IN: {
    icon: Store,
    label: 'Dine In',
    description: 'Enjoy your meal at the restaurant',
  },
  PICKUP: {
    icon: ShoppingBag,
    label: 'Pickup',
    description: 'Pick up your order from the restaurant',
  },
  DELIVERY: {
    icon: Truck,
    label: 'Delivery',
    description: 'Get your order delivered to your address',
  },
};

export default function FulfillmentMethodSelector({
  config,
  selectedMethod,
  onSelectMethod,
  loading = false,
}: FulfillmentMethodSelectorProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Unable to load fulfillment options</p>
      </div>
    );
  }

  const enabledMethods: FulfillmentMethod[] = [];
  if (config.eatInEnabled) enabledMethods.push('EAT_IN');
  if (config.pickupEnabled) enabledMethods.push('PICKUP');
  if (config.deliveryEnabled) enabledMethods.push('DELIVERY');

  if (enabledMethods.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No fulfillment methods available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {enabledMethods.map((method) => {
        const details = methodDetails[method];
        const Icon = details.icon;
        const isSelected = selectedMethod === method;

        return (
          <label
            key={method}
            className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
              isSelected
                ? 'border-blue-600 bg-blue-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <input
              type="radio"
              name="fulfillmentMethod"
              value={method}
              checked={isSelected}
              onChange={() => onSelectMethod(method)}
              className="sr-only"
            />
            <div className="flex items-start space-x-4">
              <div
                className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                  isSelected ? 'bg-blue-100' : 'bg-gray-100'
                }`}
              >
                <Icon
                  className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">{details.label}</div>
                  {isSelected && (
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
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{details.description}</p>
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
