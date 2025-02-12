import { useState, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Libraries, Marker } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";

const containerStyle = {
  width: '100%',
  height: '100%'
};

// Define libraries array outside component to prevent unnecessary reloads
const libraries: Libraries = ["places"];

interface MapProps {
  defaultCenter?: google.maps.LatLngLiteral;
  onMapClick?: (lat: number, lng: number) => void;
  markers?: Array<{
    position: google.maps.LatLngLiteral;
    title: string;
  }>;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export function Map({ 
  defaultCenter = { lat: 20.5937, lng: 78.9629 },
  onMapClick,
  markers = []
}: MapProps) {
  const mapRef = useRef<google.maps.Map>();
  const [loadError, setLoadError] = useState<Error | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries
  });

  const handleLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (onMapClick && e.latLng) {
      onMapClick(e.latLng.lat(), e.latLng.lng());
    }
  }, [onMapClick]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/10 rounded-lg">
        <p className="text-sm text-muted-foreground">Google Maps API key not configured</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/10 rounded-lg">
        <p className="text-sm text-destructive">Failed to load Google Maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/10 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={5}
        onLoad={handleLoad}
        onClick={handleClick}
        options={{
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          zoomControl: true,
        }}
      >
        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={marker.position}
            title={marker.title}
          />
        ))}
      </GoogleMap>
    </div>
  );
}