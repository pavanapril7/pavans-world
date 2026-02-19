# Leaflet Setup Instructions

## Installation Required

The TrackingMap and VendorLocationPicker components require Leaflet to be installed.

### Install Dependencies

```bash
npm install leaflet react-leaflet @types/leaflet
```

### Environment Variables

Add to your `.env.local` file:

```env
NEXT_PUBLIC_LEAFLET_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

### Components Created

1. **TrackingMap** (`src/components/TrackingMap.tsx`)
   - Real-time delivery tracking with WebSocket
   - Shows delivery partner and destination markers
   - Displays ETA and delivery completion status

2. **VendorLocationPicker** (`src/components/VendorLocationPicker.tsx`)
   - Interactive map for vendors to set business location
   - Draggable marker
   - Manual coordinate input
   - Service radius circle overlay
   - Saves to API endpoint

### Next Steps

1. Run the installation command above
2. Add environment variables
3. Restart your development server
4. The components will be ready to use

### Usage Example

```tsx
// In a vendor page
import { VendorLocationPicker } from '@/components/VendorLocationPicker';

<VendorLocationPicker
  vendorId={vendorId}
  initialLocation={{
    latitude: 28.6139,
    longitude: 77.209,
    serviceRadiusKm: 10,
  }}
  onSave={(location) => {
    console.log('Location saved:', location);
  }}
/>
```

```tsx
// In a customer tracking page
import { TrackingMap } from '@/components/TrackingMap';

<TrackingMap
  deliveryId={deliveryId}
  destination={{
    latitude: 28.6139,
    longitude: 77.209,
    address: "123 Main St, New Delhi",
  }}
  jwtToken={token}
/>
```
