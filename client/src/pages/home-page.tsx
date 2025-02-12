import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Phone as PhoneIcon, MapPin, Clock, MessageCircle, ShoppingCart } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { getCategoryEmoji, getProductEmoji } from "../../../shared/helpers";
import { useCart } from "@/lib/cart-context";
import { Map } from "@/components/ui/map";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Return large distance if any coordinate is missing
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return Number.MAX_SAFE_INTEGER;
  }

  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Returns distance in meters
}

// Add function to get Google Maps directions URL
function getGoogleMapsDirectionsUrl(lat: number | null, lng: number | null, city: string, state: string) {
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${city}, ${state}`)}`;
}

// Update the product name style function to use stronger colors
function getProductNameStyle(listingType: 'buyer' | 'seller'): string {
  return `font-bold ${listingType === 'buyer' ? '!text-red-600' : '!text-green-600'}`;
}

// Add function to get text color based on listing type
function getTextColorClass(listingType: 'buyer' | 'seller'): string {
  return listingType === 'buyer' ? '!text-red-600/80' : '!text-green-600/80';
}

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { addToCart } = useCart();

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: !!user,
  });

  // Contact seller function
  const handleContactSeller = async (productId: number) => {
    try {
      const response = await apiRequest("POST", `/api/products/${productId}/contact`);
      const data = await response.json();
      const phone = data.seller.mobileNumber;
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

      toast({
        title: "Seller Contact Information",
        description: (
          <div className="mt-2 space-y-2">
            <p><strong>Name:</strong> {data.seller.name}</p>
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Contact Options:</p>
              <div className="flex gap-2">
                <a
                  href={`tel:${formattedPhone}`}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <PhoneIcon className="w-4 h-4" />
                  Call
                </a>
                <a
                  href={`https://wa.me/${formattedPhone.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        ),
        duration: 10000,
      });
    } catch (error) {
      console.error('Error contacting seller:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to contact seller",
        variant: "destructive",
      });
    }
  };

  // Add to cart function
  const handleAddToCart = (product: Product) => {
    addToCart(product);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  useEffect(() => {
    const getLocation = async () => {
      if (!("geolocation" in navigator)) {
        setLocationError("Geolocation is not supported by your browser");
        setIsLoadingLocation(false);
        return;
      }

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });

        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError(null);
      } catch (error) {
        console.error("Geolocation error:", error);
        let errorMessage = "Unable to get your location. ";

        if (error instanceof GeolocationPositionError) {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += "Please enable location services in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage += "Location request timed out.";
              break;
            default:
              errorMessage += "An unknown error occurred.";
          }
        } else {
          errorMessage += "An unknown error occurred."
        }

        setLocationError(errorMessage);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    getLocation();
  }, []);

  if (!user) {
    return null;
  }

  if (isLoadingLocation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Loading your location...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (locationError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{locationError}</AlertDescription>
            </Alert>
            <Button
              className="mt-4 w-full"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showingProducts = products?.filter(product => {
    if (!currentLocation || !product.latitude || !product.longitude) {
      return false;
    }

    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      product.latitude,
      product.longitude
    );

    return distance <= 3218.69; // 2 miles in meters
  });

  return (
    <div className="container mx-auto p-8">
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="h-[400px] w-full rounded-lg overflow-hidden">
            {currentLocation && (
              <Map
                defaultCenter={currentLocation}
                onMapLoad={(map) => {
                  console.log('Map loaded successfully');
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            {showingProducts?.length
              ? `Showing ${showingProducts.length} products within 2 miles of your location`
              : "No products found within 2 miles of your location"}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {showingProducts?.map((product) => (
          <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">
                  {getCategoryEmoji(product.category)} → {getProductEmoji(product.name, product.category)}
                </span>
                <h3 className={getProductNameStyle(product.listingType)}>
                  {product.name}
                  {product.listingType === 'buyer' && (
                    <span className="ml-2 text-sm text-red-500">(Buyer Request)</span>
                  )}
                </h3>
              </div>

              <div className="space-y-2 text-sm">
                <p className={getTextColorClass(product.listingType)}>
                  Quantity: {product.quantity}
                </p>
                <p className={getTextColorClass(product.listingType)}>
                  Quality: {product.quality}
                </p>
                <p className={getTextColorClass(product.listingType)}>
                  Price: ₹{product.targetPrice?.toString()}
                </p>
                <button
                  onClick={() => window.open(getGoogleMapsDirectionsUrl(
                    product.latitude,
                    product.longitude,
                    product.city,
                    product.state
                  ), '_blank')}
                  className={`flex items-center gap-2 ${getTextColorClass(product.listingType)} hover:underline cursor-pointer`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>{product.city}, {product.state}</span>
                </button>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Listed {format(new Date(product.createdAt), 'PPp')}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>{product.views} views</span>
                </div>
                <div className="flex items-center gap-2">
                  {product.listingType === 'seller' && (
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(product)}
                      className="flex items-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleContactSeller(product.id)}
                    className="flex items-center gap-2"
                  >
                    <PhoneIcon className="w-4 h-4" />
                    Contact ({product.contactRequests || 0})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}