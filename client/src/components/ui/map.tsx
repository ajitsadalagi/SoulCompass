import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Libraries, Marker } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";

// Define libraries array outside component to prevent unnecessary reloads
const libraries: Libraries = ["places", "geocoding"];

interface MapProps {
  defaultCenter?: google.maps.LatLngLiteral;
  onMapClick?: (lat: number, lng: number) => void;
  markers?: Array<{
    position: google.maps.LatLngLiteral;
    title: string;
  }>;
}

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultOptions = {
  fullscreenControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  zoomControl: true,
  disableDefaultUI: false,
  gestureHandling: 'cooperative' as const,
  clickableIcons: false
};

export function Map({ 
  defaultCenter = { lat: 20.5937, lng: 78.9629 },
  onMapClick,
  markers = []
}: MapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => ({
    ...defaultOptions,
    zoom: 5,
    center: defaultCenter,
  }), [defaultCenter]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMap(map);
    setGeocoder(new google.maps.Geocoder());
  }, []);

  const onUnmount = useCallback(() => {
    if (mapRef.current) {
      google.maps.event.clearInstanceListeners(mapRef.current);
    }
    mapRef.current = null;
    setMap(null);
    setGeocoder(null);
  }, []);

  const handleClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (onMapClick && e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      if (geocoder) {
        geocoder.geocode({ location: { lat, lng } })
          .then(response => {
            if (response.results[0]) {
              onMapClick(lat, lng);
            } else {
              setError("No address found for this location");
            }
          })
          .catch(error => {
            console.error("Geocoding error:", error);
            // Still allow click if geocoding fails
            onMapClick(lat, lng);
          });
      } else {
        onMapClick(lat, lng);
      }
    }
  }, [onMapClick, geocoder]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        onUnmount();
      }
    };
  }, [onUnmount]);

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
    <div className="w-full h-full relative">
      {error && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-destructive/90 text-white p-2 text-sm text-center">
          {error}
        </div>
      )}
      <GoogleMap
        mapContainerStyle={containerStyle}
        options={options}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleClick}
      >
        {markers.map((marker, index) => (
          <Marker
            key={`${marker.position.lat}-${marker.position.lng}-${index}`}
            position={marker.position}
            title={marker.title}
          />
        ))}
      </GoogleMap>
    </div>
  );
}