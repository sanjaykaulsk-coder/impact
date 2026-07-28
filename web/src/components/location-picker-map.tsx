'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

// Leaflet's default marker icon references image files via a bundler-relative path that Next.js's
// build doesn't resolve the same way Leaflet expects — without this fix the pin renders as a
// broken image. Pointing it at the CDN copy of the same icon is the standard, documented
// workaround for this exact issue.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// India's approximate geographic centre — used only when nothing else is known yet, so the map
// opens somewhere sensible rather than on the ocean at (0, 0).
const INDIA_CENTER: [number, number] = [22.9734, 78.6569];
const DEFAULT_ZOOM = 5;
const PIN_ZOOM = 14;

function ClickToPlacePin({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// react-leaflet's MapContainer only reads `center`/`zoom` on its very first render — a later
// state/district/tehsil/location update (or an exact "Suggest lat/long" result) wouldn't otherwise
// move the already-open map. This keeps the view in sync as the form fills in.
function RecenterOnChange({ position, zoom }: { position: [number, number] | null; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, zoom);
  }, [position, zoom, map]);
  return null;
}

/**
 * Founder request: "an option to manually put it on map," plus "as I keep on adding more details
 * the map should get updated" — click anywhere to drop/move the exact pin (fills in Latitude/
 * Longitude), and the map also flies to a progressively narrower view as State → District →
 * Tehsil are filled in (see PjpPage's navigateMapTo), even before an exact pin exists. OpenStreetMap
 * tiles, no API key — the same tile provider this project already settled on for the field app's
 * offline map corridors (docs/architecture/08), used here too rather than introducing a second,
 * paid provider.
 */
export default function LocationPickerMap({
  latitude,
  longitude,
  viewCenter,
  onPick,
}: {
  /** The actual, save-worthy coordinates for this stop, if set — shown as a draggable-feeling
   * pin and takes priority over `viewCenter` for where the map centres. */
  latitude?: number;
  longitude?: number;
  /** A rough "you're looking at roughly here" centre from State/District/Tehsil alone, with no
   * exact pin yet — moves the view without drawing a marker. */
  viewCenter?: { lat: number; lng: number; zoom: number } | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const hasPin = latitude !== undefined && longitude !== undefined;
  const pinPosition: [number, number] | null = hasPin ? [latitude!, longitude!] : null;
  const initialCenter = pinPosition ?? (viewCenter ? [viewCenter.lat, viewCenter.lng] : INDIA_CENTER);
  const initialZoom = pinPosition ? PIN_ZOOM : (viewCenter?.zoom ?? DEFAULT_ZOOM);

  const recenterTo: [number, number] | null = pinPosition ?? (viewCenter ? [viewCenter.lat, viewCenter.lng] : null);
  const recenterZoom = pinPosition ? PIN_ZOOM : (viewCenter?.zoom ?? DEFAULT_ZOOM);

  return (
    <div style={{ height: 360, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <MapContainer center={initialCenter as [number, number]} zoom={initialZoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPlacePin onPick={onPick} />
        <RecenterOnChange position={recenterTo} zoom={recenterZoom} />
        {pinPosition && <Marker position={pinPosition} />}
      </MapContainer>
    </div>
  );
}
