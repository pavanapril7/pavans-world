'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MapPin, ChevronDown, Loader2 } from 'lucide-react';
import { setSelectedAddress, selectSelectedAddress } from '@/lib/redux/slices/locationSlice';
import { LocationValidationMessage } from './LocationValidationMessage';

interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  serviceAreaId: string | null;
  isDefault: boolean;
}

interface ValidationResponse {
  isServiceable: boolean;
  serviceAreaId?: string;
  serviceAreaName?: string;
  reason?: string;
  nearestServiceArea?: {
    id: string;
    name: string;
    distanceKm: number;
  };
}

/**
 * AddressSelector component
 * Allows customers to select their delivery address from the header
 * Validates address serviceability and updates Redux state
 */
export function AddressSelector() {
  const dispatch = useDispatch();
  const selectedAddress = useSelector(selectSelectedAddress);
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<{
    message: string;
    nearestServiceArea?: {
      id: string;
      name: string;
      distanceKm: number;
    };
  } | null>(null);
  
  // Fetch user addresses on mount
  useEffect(() => {
    fetchAddresses();
  }, []);
  
  const fetchAddresses = async () => {
    setIsLoading(true);
    try {
      // Get current user session to fetch their addresses
      const sessionResponse = await fetch('/api/auth/session');
      if (!sessionResponse.ok) {
        return;
      }
      
      const sessionData = await sessionResponse.json();
      const userId = sessionData.user?.id;
      
      if (!userId) {
        return;
      }
      
      const response = await fetch(`/api/users/${userId}/addresses`);
      if (response.ok) {
        const data = await response.json();
        setAddresses(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const validateAndSelectAddress = async (address: Address) => {
    // Check if address has coordinates
    if (!address.latitude || !address.longitude) {
      setValidationError({
        message: 'This address does not have location coordinates',
      });
      return;
    }
    
    setIsValidating(true);
    setValidationError(null);
    
    try {
      const response = await fetch('/api/addresses/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: address.latitude,
          longitude: address.longitude,
          addressId: address.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to validate address');
      }
      
      const validation: ValidationResponse = await response.json();
      
      if (validation.isServiceable && validation.serviceAreaId && validation.serviceAreaName) {
        // Address is serviceable - update Redux state
        dispatch(setSelectedAddress({
          id: address.id,
          label: address.label,
          street: address.street,
          city: address.city,
          latitude: address.latitude,
          longitude: address.longitude,
          serviceAreaId: validation.serviceAreaId,
          serviceAreaName: validation.serviceAreaName,
        }));
        
        setIsOpen(false);
        setValidationError(null);
      } else {
        // Address is not serviceable
        setValidationError({
          message: validation.reason || "We don't serve this location yet",
          nearestServiceArea: validation.nearestServiceArea,
        });
      }
    } catch (error) {
      console.error('Failed to validate address:', error);
      setValidationError({
        message: 'Failed to validate address. Please try again.',
      });
    } finally {
      setIsValidating(false);
    }
  };
  
  const handleAddressSelect = (address: Address) => {
    validateAndSelectAddress(address);
  };
  
  return (
    <div className="relative">
      {/* Address Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="Select delivery address"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <MapPin className="w-4 h-4 text-gray-600" />
        <div className="text-left min-w-[120px] max-w-[200px]">
          {selectedAddress ? (
            <>
              <div className="text-xs text-gray-500 truncate">Deliver to</div>
              <div className="text-sm font-medium text-gray-900 truncate">
                {selectedAddress.label}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-600">Select address</div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Select Delivery Address
            </h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-sm text-gray-600 py-4 text-center">
                No addresses found. Please add an address in your profile.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto" role="listbox">
                {addresses.map((address) => (
                  <button
                    key={address.id}
                    onClick={() => handleAddressSelect(address)}
                    disabled={isValidating}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    role="option"
                    aria-selected={selectedAddress?.id === address.id}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {address.label}
                          {address.isDefault && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {address.street}, {address.city}
                        </div>
                      </div>
                      {selectedAddress?.id === address.id && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {isValidating && (
              <div className="mt-3 flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validating address...</span>
              </div>
            )}
            
            {validationError && (
              <div className="mt-3">
                <LocationValidationMessage
                  nearestServiceArea={validationError.nearestServiceArea}
                />
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
