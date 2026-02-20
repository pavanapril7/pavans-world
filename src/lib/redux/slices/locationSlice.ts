/**
 * Location Redux Slice
 * 
 * Manages location state including selected address and serviceable vendors.
 * Persists selected address to localStorage for cross-session persistence.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SelectedAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  latitude: number;
  longitude: number;
  serviceAreaId: string;
  serviceAreaName: string;
}

export interface ServiceableVendor {
  id: string;
  businessName: string;
  description: string;
  categoryId: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  distanceKm: number;
  isActive: boolean;
  imageUrl: string | null;
  rating: number;
  serviceAreaId: string;
  serviceAreaName: string;
  isWithinServiceRadius: boolean;
}

export interface LocationState {
  selectedAddress: SelectedAddress | null;
  serviceableVendors: ServiceableVendor[];
  isLoadingVendors: boolean;
}

// Load initial state from localStorage if available
const loadInitialState = (): LocationState => {
  const defaultState: LocationState = {
    selectedAddress: null,
    serviceableVendors: [],
    isLoadingVendors: false,
  };

  // Only access localStorage in browser environment
  if (typeof window === 'undefined') {
    return defaultState;
  }

  try {
    const savedAddress = localStorage.getItem('selectedAddress');
    if (savedAddress) {
      const parsedAddress = JSON.parse(savedAddress);
      return {
        ...defaultState,
        selectedAddress: parsedAddress,
      };
    }
  } catch (error) {
    console.error('[LocationSlice] Failed to load from localStorage:', error);
  }

  return defaultState;
};

const initialState: LocationState = loadInitialState();

export const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setSelectedAddress: (state, action: PayloadAction<SelectedAddress | null>) => {
      state.selectedAddress = action.payload;
      
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        try {
          if (action.payload) {
            localStorage.setItem('selectedAddress', JSON.stringify(action.payload));
          } else {
            localStorage.removeItem('selectedAddress');
          }
        } catch (error) {
          console.error('[LocationSlice] Failed to save to localStorage:', error);
        }
      }
    },
    setServiceableVendors: (state, action: PayloadAction<ServiceableVendor[]>) => {
      state.serviceableVendors = action.payload;
    },
    setLoadingVendors: (state, action: PayloadAction<boolean>) => {
      state.isLoadingVendors = action.payload;
    },
    clearLocation: (state) => {
      state.selectedAddress = null;
      state.serviceableVendors = [];
      state.isLoadingVendors = false;
      
      // Clear from localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('selectedAddress');
        } catch (error) {
          console.error('[LocationSlice] Failed to clear localStorage:', error);
        }
      }
    },
  },
});

// Actions
export const {
  setSelectedAddress,
  setServiceableVendors,
  setLoadingVendors,
  clearLocation,
} = locationSlice.actions;

// Selectors (use with RootState from store)
export const selectSelectedAddress = (state: { location: LocationState }) => state.location.selectedAddress;
export const selectServiceableVendors = (state: { location: LocationState }) => state.location.serviceableVendors;
export const selectIsLoadingVendors = (state: { location: LocationState }) => state.location.isLoadingVendors;

// Reducer
export default locationSlice.reducer;
