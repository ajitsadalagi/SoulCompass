import { useState, useCallback, useRef } from "react";
import { GoogleMap, LoadScript, Libraries } from "@react-google-maps/api";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./alert";

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
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const mapRef = useRef<google.maps.Map>();
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager>();
  const circleRef = useRef<google.maps.Circle>();

  const handleLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setIsLoading(false);

    if (onMapLoad) {
      onMapLoad(map);
    }

    if (enableDrawing) {
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
    }

    if (circle) {
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
    }
  }, [enableDrawing, onCircleComplete, circle, onMapLoad]);

  const handleLoadError = useCallback((error: Error) => {
    console.error("Error loading Google Maps:", error);
    setLoadError(error);
    setIsLoading(false);
  }, []);

  if (!apiKey) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Google Maps API key is missing. Please check your environment configuration.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {loadError && (
        <Alert variant="destructive" className="absolute inset-x-0 top-0 z-10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {loadError.message}
          </AlertDescription>
        </Alert>
      )}

      <LoadScript 
        googleMapsApiKey={apiKey}
        libraries={libraries}
        onError={handleLoadError}
      >
        <div className="w-full h-full">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter || { lat: 20.5937, lng: 78.9629 }}
            zoom={defaultCenter ? 15 : 5}
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