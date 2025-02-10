import { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { Card } from "./card";
import { FiNavigation } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Libraries } from "@react-google-maps/api";

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
  const { toast } = useToast();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const libraries: Libraries = ["places"];

  const initializeMap = async () => {
    if (!mapRef.current || !window.google?.maps) {
      console.error("Map ref or Google Maps not available");
      return;
    }

    try {
      // Default to a central location if no default is provided
      const initialLocation = defaultLocation || {
        latitude: 20.5937,  // Center of India
        longitude: 78.9629
      };

      const mapInstance = new google.maps.Map(mapRef.current, {
        center: {
          lat: initialLocation.latitude,
          lng: initialLocation.longitude,
        },
        zoom: 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      });

      const markerInstance = new google.maps.Marker({
        map: mapInstance,
        draggable: true,
        position: {
          lat: initialLocation.latitude,
          lng: initialLocation.longitude,
        },
        animation: google.maps.Animation.DROP,
      });

      // Add click listener to map
      mapInstance.addListener("click", async (event: google.maps.MapMouseEvent) => {
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

      // Add marker drag end listener
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

      setMap(mapInstance);
      setMarker(markerInstance);
      setIsLoading(false);

      if (onMapLoad) {
        onMapLoad(mapInstance);
      }

      // Get initial address if we have coordinates
      if (initialLocation) {
        try {
          const geocoder = new google.maps.Geocoder();
          const result = await geocoder.geocode({
            location: { 
              lat: initialLocation.latitude, 
              lng: initialLocation.longitude 
            }
          });
          if (result.results[0]) {
            onLocationSelect({
              latitude: initialLocation.latitude,
              longitude: initialLocation.longitude,
              address: result.results[0].formatted_address,
            });
          }
        } catch (error) {
          console.error('Initial geocoding error:', error);
        }
      }
    } catch (error) {
      console.error("Error initializing map:", error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to initialize map. Please try again.",
        variant: "destructive",
      });
    }
  };

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

  useEffect(() => {
    if (!mapRef.current) return;

    const loadGoogleMaps = () => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        initializeMap();
      };

      script.onerror = () => {
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Failed to load Google Maps. Please check your internet connection and try again.",
          variant: "destructive",
        });
      };

      document.head.appendChild(script);
    };

    // Check if the script is already loaded
    if (window.google?.maps) {
      initializeMap();
    } else {
      loadGoogleMaps();
    }

    return () => {
      if (map) {
        const mapElement = mapRef.current;
        if (mapElement && mapElement.firstChild) {
          mapElement.removeChild(mapElement.firstChild);
        }
      }
    };
  }, [defaultLocation]);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="h-[300px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-2">
          Click on the map to select a location or use the button below
        </div>
        <div ref={mapRef} style={{ height: "300px" }} />
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