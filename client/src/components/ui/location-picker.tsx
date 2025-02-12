import { useState, useCallback, useRef, useEffect } from "react";
import { LoadScript, Libraries } from "@react-google-maps/api";
import { Button } from "./button";
import { Card } from "./card";
import { FiNavigation } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./alert";

const containerStyle = {
  width: '100%',
  height: '300px'
};

const libraries: Libraries = ["places"];

interface LocationPickerProps {
  defaultLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  onMapLoad?: (map: google.maps.Map) => void;
}

export function LocationPicker({
  defaultLocation,
  onLocationSelect,
  onMapLoad,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const { toast } = useToast();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const handleLoad = useCallback((map: google.maps.Map) => {
    if (!mapRef.current) return;

    setMap(map);
    const initialLocation = defaultLocation || {
      latitude: 20.5937,
      longitude: 78.9629
    };

    const markerInstance = new google.maps.Marker({
      map: map,
      draggable: true,
      position: {
        lat: initialLocation.latitude,
        lng: initialLocation.longitude,
      },
      animation: google.maps.Animation.DROP,
    });

    map.addListener("click", async (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;

      const clickedLocation = event.latLng;
      markerInstance.setPosition(clickedLocation);

      try {
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({ location: clickedLocation });

        if (result.results[0]) {
          onLocationSelect({
            latitude: clickedLocation.lat(),
            longitude: clickedLocation.lng(),
            address: result.results[0].formatted_address,
          });
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        toast({
          title: "Error",
          description: "Failed to get address for selected location",
          variant: "destructive",
        });
      }
    });

    markerInstance.addListener("dragend", async () => {
      const position = markerInstance.getPosition();
      if (!position) return;

      try {
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({ location: position });

        if (result.results[0]) {
          onLocationSelect({
            latitude: position.lat(),
            longitude: position.lng(),
            address: result.results[0].formatted_address,
          });
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        toast({
          title: "Error",
          description: "Failed to get address for selected location",
          variant: "destructive",
        });
      }
    });

    setMarker(markerInstance);
    setIsLoading(false);

    if (onMapLoad) {
      onMapLoad(map);
    }
  }, [defaultLocation, onLocationSelect, onMapLoad, toast]);

  const handleLoadError = useCallback((error: Error) => {
    console.error("Error loading Google Maps:", error);
    setLoadError(error);
    setIsLoading(false);
  }, []);

  const handleGetCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      const location = { lat: latitude, lng: longitude };

      if (map && marker) {
        map.setCenter(location);
        map.setZoom(15);
        marker.setPosition(location);

        try {
          const geocoder = new google.maps.Geocoder();
          const result = await geocoder.geocode({ location });

          if (result.results[0]) {
            onLocationSelect({
              latitude,
              longitude,
              address: result.results[0].formatted_address,
            });
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          toast({
            title: "Error",
            description: "Failed to get address for current location",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Location error:', error);
      toast({
        title: "Location Error",
        description: "Couldn't get current location. Please ensure location services are enabled and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLocation(false);
    }
  };

  if (!apiKey) {
    return (
      <Card className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Google Maps API key is missing. Please check your environment configuration.</AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-2">
          Click on the map to select a location or use the button below
        </div>
        <LoadScript
          googleMapsApiKey={apiKey}
          libraries={libraries}
          onError={handleLoadError}
          onLoad={handleLoad}
        >
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
            <div ref={mapRef} style={containerStyle} />
          </div>
        </LoadScript>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGetCurrentLocation}
          disabled={isLoadingLocation}
        >
          {isLoadingLocation ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FiNavigation className="mr-2 h-4 w-4" />
          )}
          {isLoadingLocation ? "Getting Location..." : "Use Current Location"}
        </Button>
      </div>
    </Card>
  );
}