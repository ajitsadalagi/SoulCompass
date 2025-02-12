import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleMap, LoadScript, Libraries } from "@react-google-maps/api";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./alert";

// Declare the ImportMeta interface augmentation
declare interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv
}

const containerStyle = {
  width: '100%',
  height: '100%'
};

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
  const [mapsLoadError, setMapsLoadError] = useState<string | null>(null);

  const mapRef = useRef<google.maps.Map>();
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager>();
  const circleRef = useRef<google.maps.Circle>();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Validate API key before proceeding
  useEffect(() => {
    if (!apiKey) {
      setMapsLoadError("Google Maps API key is missing. Please check your environment configuration.");
      setIsLoading(false);
    }
  }, [apiKey]);

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
          setLocationError('Unable to get your location. Please enable location services in your browser settings.');
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

    if (onMapLoad) {
      onMapLoad(map);
    }

    if (enableDrawing) {
      try {
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

        google.maps.event.addListener(drawingManager, 'circlecomplete', (circle: google.maps.Circle) => {
          if (circleRef.current) {
            circleRef.current.setMap(null);
          }

          circleRef.current = circle;

          if (onCircleComplete) {
            onCircleComplete(circle.getCenter()!, circle.getRadius());
          }

          drawingManager.setDrawingMode(null);

          google.maps.event.addListener(circle, 'radius_changed', () => {
            if (onCircleComplete) {
              onCircleComplete(circle.getCenter()!, circle.getRadius());
            }
          });

          google.maps.event.addListener(circle, 'center_changed', () => {
            if (onCircleComplete) {
              onCircleComplete(circle.getCenter()!, circle.getRadius());
            }
          });
        });
      } catch (error) {
        console.error('Error initializing drawing manager:', error);
        setLoadError(error instanceof Error ? error : new Error('Failed to initialize drawing manager'));
      }
    }

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

        map.setCenter(circle.center);
        const bounds = circleRef.current.getBounds();
        if (bounds) {
          map.fitBounds(bounds);
        }
      } catch (error) {
        console.error('Error creating circle:', error);
        setLoadError(error instanceof Error ? error : new Error('Failed to create circle'));
      }
    }
  }, [enableDrawing, onCircleComplete, circle, onMapLoad]);

  const handleLoadError = useCallback((error: Error) => {
    console.error("Error loading Google Maps:", error);
    setLoadError(error);
    setIsLoading(false);
  }, []);

  if (mapsLoadError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{mapsLoadError}</AlertDescription>
      </Alert>
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
        <Alert variant="destructive" className="absolute inset-x-0 top-0 z-10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {loadError ? loadError.message : locationError}
          </AlertDescription>
        </Alert>
      )}

      {!mapsLoadError && (
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
      )}
    </div>
  );
}