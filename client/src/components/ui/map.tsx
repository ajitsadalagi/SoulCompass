import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleMap, LoadScript, Libraries } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";

const containerStyle = {
  width: '100%',
  height: '100%'
};

// Define libraries array outside component to prevent unnecessary reloads
const libraries: Libraries = ["drawing"];

interface MapProps {
  defaultCenter?: google.maps.LatLngLiteral;
  enableDrawing?: boolean;
  onCircleComplete?: (center: google.maps.LatLng, radius: number) => void;
  circle?: {
    center: google.maps.LatLngLiteral;
    radius: number;
  } | null;
  onMapLoad?: (map: google.maps.Map) => void;
}

export function Map({ 
  defaultCenter,
  enableDrawing = false,
  onCircleComplete,
  circle,
  onMapLoad
}: MapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [currentLocation, setCurrentLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const mapRef = useRef<google.maps.Map>();
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager>();
  const circleRef = useRef<google.maps.Circle>();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Get user's current location if no default center is provided
  useEffect(() => {
    if (defaultCenter) {
      setCurrentLocation(defaultCenter);
      setIsLoading(false);
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('Unable to get your location. Please enable location services.');
          setIsLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLoading(false);
    }
  }, [defaultCenter]);

  const handleLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setIsLoading(false);

    // Call onMapLoad callback if provided
    if (onMapLoad) {
      onMapLoad(map);
    }

    if (enableDrawing) {
      try {
        // Initialize drawing manager
        const drawingManager = new google.maps.drawing.DrawingManager({
          drawingMode: google.maps.drawing.OverlayType.CIRCLE,
          drawingControl: true,
          drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [google.maps.drawing.OverlayType.CIRCLE],
          },
          circleOptions: {
            fillColor: "#FF0000",
            fillOpacity: 0.2,
            strokeWeight: 2,
            clickable: false,
            editable: true,
            zIndex: 1,
          },
        });

        drawingManager.setMap(map);
        drawingManagerRef.current = drawingManager;

        // Add circle complete listener
        google.maps.event.addListener(drawingManager, 'circlecomplete', (circle: google.maps.Circle) => {
          // Remove any existing circle
          if (circleRef.current) {
            circleRef.current.setMap(null);
          }

          circleRef.current = circle;

          // Call the callback with circle details
          if (onCircleComplete) {
            onCircleComplete(circle.getCenter()!, circle.getRadius());
          }

          // Allow drawing another circle
          drawingManager.setDrawingMode(null);

          // Add radius change listener
          google.maps.event.addListener(circle, 'radius_changed', () => {
            if (onCircleComplete) {
              onCircleComplete(circle.getCenter()!, circle.getRadius());
            }
          });

          // Add center change listener
          google.maps.event.addListener(circle, 'center_changed', () => {
            if (onCircleComplete) {
              onCircleComplete(circle.getCenter()!, circle.getRadius());
            }
          });
        });
      } catch (error) {
        console.error('Error initializing drawing manager:', error);
      }
    }

    // If a circle is provided, display it
    if (circle) {
      try {
        if (circleRef.current) {
          circleRef.current.setMap(null);
        }

        circleRef.current = new google.maps.Circle({
          map,
          center: circle.center,
          radius: circle.radius,
          fillColor: "#FF0000",
          fillOpacity: 0.2,
          strokeWeight: 2,
          clickable: false,
          editable: enableDrawing,
        });

        // Center the map on the circle
        map.setCenter(circle.center);
        const bounds = circleRef.current.getBounds();
        if (bounds) {
          map.fitBounds(bounds);
        }
      } catch (error) {
        console.error('Error creating circle:', error);
      }
    }
  }, [enableDrawing, onCircleComplete, circle, onMapLoad]);

  const handleLoadError = useCallback((error: Error) => {
    console.error("Error loading Google Maps:", error);
    setLoadError(error);
    setIsLoading(false);
  }, []);

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/10 rounded-lg">
        <p className="text-sm text-muted-foreground">Google Maps API key not configured</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/10 rounded-lg z-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {(loadError || locationError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/10 rounded-lg z-10">
          <p className="text-sm text-destructive">
            {loadError ? "Failed to load Google Maps" : locationError}
          </p>
        </div>
      )}

      <LoadScript 
        googleMapsApiKey={apiKey}
        libraries={libraries}
        onError={handleLoadError}
      >
        <div className="w-full h-full">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter || currentLocation || { lat: 0, lng: 0 }}
            zoom={currentLocation || defaultCenter ? 15 : 2}
            onLoad={handleLoad}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            }}
          />
        </div>
      </LoadScript>
    </div>
  );
}