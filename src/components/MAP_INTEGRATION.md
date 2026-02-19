# Map Integration Guide

## Current Implementation

The `TrackingMap` component currently uses a simplified placeholder visualization. To integrate a real map library, follow the steps below.

## Option 1: Leaflet (Recommended - Open Source)

### Installation

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

### Environment Variables

Add to `.env.local`:
```
NEXT_PUBLIC_LEAFLET_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

### Implementation

Replace the map container section in `TrackingMap.tsx` with:

```tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom marker icons
const destinationIcon = new L.Icon({
  iconUrl: '/markers/destination.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const deliveryPartnerIcon = new L.Icon({
  iconUrl: '/markers/delivery-partner.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// In the component:
<MapContainer
  center={[destination.latitude, destination.longitude]}
  zoom={13}
  style={{ height: '100%', width: '100%' }}
>
  <TileLayer
    url={process.env.NEXT_PUBLIC_LEAFLET_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  />
  
  {/* Destination Marker */}
  <Marker position={[destination.latitude, destination.longitude]} icon={destinationIcon}>
    <Popup>{destination.address}</Popup>
  </Marker>
  
  {/* Delivery Partner Marker */}
  {currentLocation && !isDeliveryCompleted && (
    <Marker 
      position={[currentLocation.latitude, currentLocation.longitude]} 
      icon={deliveryPartnerIcon}
    >
      <Popup>Delivery Partner - ETA: {formatETA(currentLocation.eta)}</Popup>
    </Marker>
  )}
</MapContainer>
```

## Option 2: Mapbox GL JS (Requires API Key)

### Installation

```bash
npm install mapbox-gl react-map-gl
npm install -D @types/mapbox-gl
```

### Environment Variables

Add to `.env.local`:
```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

### Implementation

Replace the map container section in `TrackingMap.tsx` with:

```tsx
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// In the component:
<Map
  mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
  initialViewState={{
    longitude: destination.longitude,
    latitude: destination.latitude,
    zoom: 13,
  }}
  style={{ width: '100%', height: '100%' }}
  mapStyle="mapbox://styles/mapbox/streets-v12"
>
  {/* Destination Marker */}
  <Marker
    longitude={destination.longitude}
    latitude={destination.latitude}
    color="red"
  />
  
  {/* Delivery Partner Marker */}
  {currentLocation && !isDeliveryCompleted && (
    <Marker
      longitude={currentLocation.longitude}
      latitude={currentLocation.latitude}
      color="blue"
    />
  )}
</Map>
```

## Next Steps

1. Choose a map library (Leaflet recommended for no API key requirement)
2. Install dependencies
3. Add environment variables
4. Replace the placeholder map visualization
5. Add marker icons to `/public/markers/` directory
6. Test real-time location updates

## Features to Add

- Route line between delivery partner and destination
- Auto-zoom to fit both markers
- Smooth marker animation on location updates
- Custom marker icons
- Map controls (zoom, pan)
