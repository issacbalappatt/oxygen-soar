/// <reference types="google.maps" />
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google: typeof google;
  }
}

interface MarkerData {
  lat: number;
  lng: number;
  label?: string;
  title?: string;
  color?: 'red' | 'green' | 'blue' | 'orange' | 'purple';
}

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MarkerData[];
  polylineEncoded?: string;
  className?: string;
  onMarkerClick?: (index: number) => void;
}

const MARKER_COLORS: Record<string, string> = {
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  orange: '#f97316',
  purple: '#a855f7',
};

let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;
  if (window.google?.maps) return Promise.resolve();

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export default function GoogleMap({
  center = { lat: 10.8505, lng: 76.2711 }, // Kerala center
  zoom = 8,
  markers = [],
  polylineEncoded,
  className = '',
  onMarkerClick,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

  useEffect(() => {
    if (!apiKey) {
      setError('Google Maps API key not configured');
      return;
    }

    loadGoogleMaps(apiKey)
      .then(() => setLoaded(true))
      .catch(() => setError('Failed to load Google Maps'));
  }, [apiKey]);

  // Initialize map
  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1a1f2e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#8b95a5' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c3347' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      ],
    });
  }, [loaded]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    markers.forEach((m, idx) => {
      const marker = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: mapInstanceRef.current!,
        label: m.label
          ? { text: m.label, color: '#fff', fontSize: '11px', fontWeight: 'bold' }
          : undefined,
        title: m.title,
        icon: m.color
          ? {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: MARKER_COLORS[m.color] || MARKER_COLORS.blue,
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
              scale: m.label ? 14 : 10,
            }
          : undefined,
      });

      if (onMarkerClick) {
        marker.addListener('click', () => onMarkerClick(idx));
      }

      markersRef.current.push(marker);
      bounds.extend(new google.maps.LatLng(m.lat, m.lng));
    });

    if (markers.length > 1) {
      mapInstanceRef.current.fitBounds(bounds, 60);
    } else if (markers.length === 1) {
      mapInstanceRef.current.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
      mapInstanceRef.current.setZoom(12);
    }
  }, [markers, loaded]);

  // Update polyline
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (polylineEncoded && window.google?.maps?.geometry) {
      const path = google.maps.geometry.encoding.decodePath(polylineEncoded);
      polylineRef.current = new google.maps.Polyline({
        path,
        strokeColor: '#38bdf8',
        strokeOpacity: 0.85,
        strokeWeight: 4,
        map: mapInstanceRef.current,
      });
    }
  }, [polylineEncoded, loaded]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-card border border-border rounded-xl text-muted-foreground text-sm ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border border-border ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-card text-muted-foreground text-sm z-10">
          Loading map…
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
