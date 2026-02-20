'use client';

import { useState, useEffect, useRef } from 'react';
import { Power, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeliveryPartnerStatusToggleProps {
  initialStatus?: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
}

export function DeliveryPartnerStatusToggle({ 
  initialStatus = 'OFFLINE' 
}: DeliveryPartnerStatusToggleProps) {
  const [status, setStatus] = useState<'AVAILABLE' | 'BUSY' | 'OFFLINE'>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);
  const [fetchingStatus, setFetchingStatus] = useState(true);
  
  // Use refs to track state without causing re-renders
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const isMountedRef = useRef(false);

  // Fetch current delivery partner status
  const fetchCurrentStatus = async () => {
    try {
      const response = await fetch('/api/delivery-partners/me');
      
      if (response.ok) {
        const data = await response.json();
        const currentStatus = data.data?.status || 'OFFLINE';
        setStatus(currentStatus);
        
        // If already available, start location tracking
        if (currentStatus === 'AVAILABLE') {
          setTimeout(() => {
            startLocationTracking();
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error fetching delivery partner status:', error);
    } finally {
      setFetchingStatus(false);
    }
  };

  // Update location with debouncing (minimum 15 seconds between updates)
  const updateLocation = async (latitude: number, longitude: number) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    // Debounce: only update if 15 seconds have passed
    if (timeSinceLastUpdate < 15000) {
      console.log(`Skipping location update (${Math.round(timeSinceLastUpdate / 1000)}s since last update)`);
      return;
    }

    try {
      lastUpdateTimeRef.current = now;
      
      const response = await fetch('/api/delivery-partners/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });

      if (response.ok) {
        setLastLocationUpdate(new Date());
        console.log('Location updated successfully');
      } else {
        console.error('Failed to update location:', response.status);
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  // Start location tracking
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    console.log('Starting location tracking...');
    
    const id = navigator.geolocation.watchPosition(
      (position) => {
        console.log('Position update received');
        updateLocation(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Error getting location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Cache for 60 seconds
      }
    );

    watchIdRef.current = id;
    setLocationTracking(true);
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (watchIdRef.current !== null) {
      console.log('Stopping location tracking...');
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setLocationTracking(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: 'AVAILABLE' | 'OFFLINE') => {
    try {
      setLoading(true);

      // If going AVAILABLE, get location first
      if (newStatus === 'AVAILABLE') {
        if (!navigator.geolocation) {
          alert('Geolocation is not supported by your browser');
          return;
        }

        console.log('Getting current location...');
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        });

        // Update location
        await updateLocation(position.coords.latitude, position.coords.longitude);
      }

      // Update status
      console.log('Updating status to:', newStatus);
      const response = await fetch('/api/delivery-partners/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update status');
      }

      setStatus(newStatus);

      // Start/stop location tracking
      if (newStatus === 'AVAILABLE') {
        // Wait 2 seconds before starting watch to avoid overlap
        setTimeout(() => {
          startLocationTracking();
        }, 2000);
      } else {
        stopLocationTracking();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  // Fetch status on mount and cleanup on unmount
  useEffect(() => {
    // Mark as mounted
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      console.log('Component mounted');
      
      // Fetch current status
      fetchCurrentStatus();
    }

    // Cleanup function
    return () => {
      console.log('Component unmounting, cleaning up...');
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const isAvailable = status === 'AVAILABLE';
  const isBusy = status === 'BUSY';

  // Show loading state while fetching
  if (fetchingStatus) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Availability Status</h3>
          <p className="text-sm text-gray-600">
            {isBusy
              ? 'You have an active delivery'
              : isAvailable
              ? 'You are available for deliveries'
              : 'You are offline'}
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            isBusy
              ? 'bg-yellow-100 text-yellow-800'
              : isAvailable
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {status}
        </div>
      </div>

      {!isBusy && (
        <Button
          onClick={() => handleStatusChange(isAvailable ? 'OFFLINE' : 'AVAILABLE')}
          disabled={loading}
          className={`w-full ${
            isAvailable
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Power className="w-4 h-4 mr-2" />
              {isAvailable ? 'Go Offline' : 'Go Online'}
            </>
          )}
        </Button>
      )}

      {locationTracking && (
        <div className="mt-4 flex items-center space-x-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-green-600" />
          <span>Location tracking active</span>
          {lastLocationUpdate && (
            <span className="text-xs text-gray-500">
              (Updated {lastLocationUpdate.toLocaleTimeString()})
            </span>
          )}
        </div>
      )}

      {isBusy && (
        <p className="mt-4 text-sm text-gray-600">
          Complete your active delivery to change your status
        </p>
      )}
    </div>
  );
}
