import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Phone as PhoneIcon, MapPin, Clock, Trash2, Shield, User, MessageCircle, ShoppingCart } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { getCategoryEmoji, getProductEmoji } from "../../../shared/helpers";
import { useCart } from "@/lib/cart-context";

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

// Add the category emoji function after the getGoogleMapsDirectionsUrl function
//function getCategoryEmoji(category: string): string { ... }  //This is already defined above

// Update the product name style function to use stronger colors
function getProductNameStyle(listingType: 'buyer' | 'seller'): string {
  return `font-bold ${listingType === 'buyer' ? '!text-red-600' : '!text-green-600'}`;
}

// Add function to get text color based on listing type
function getTextColorClass(listingType: 'buyer' | 'seller'): string {
  return listingType === 'buyer' ? '!text-red-600/80' : '!text-green-600/80';
}

// Update the card style function
function getCardStyle(product: Product): string {
  const admins = product.admins || [];
  const superAdmin = admins.find(admin => admin.adminType === 'super_admin' && admin.adminStatus === 'approved');
  const localAdmin = admins.find(admin => admin.adminType === 'local_admin' && admin.adminStatus === 'approved');

  if (superAdmin && product.sellerId === superAdmin.id) {
    return 'border-violet-500 border-2 shadow-violet-100 shadow-lg animate-border-glow-violet transition-all duration-1000';
  }
  if (localAdmin && product.sellerId === localAdmin.id) {
    return 'border-purple-500 border-2 shadow-purple-100 shadow-lg animate-border-glow-purple transition-all duration-1000';
  }

  // Regular user listing
  return product.listingType === 'buyer'
    ? 'border-red-500 border-2 shadow-red-100 shadow-lg'
    : 'border-green-500 border-2 shadow-green-100 shadow-lg';
}

// Add helper functions after existing helper functions
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Only add country code if not already present
  return cleaned.startsWith('+') ? cleaned : `+91${cleaned}`;
}

function getWhatsAppLink(phone: string): string {
  const formattedPhone = formatPhoneNumber(phone);
  // Remove any remaining non-digit characters for WhatsApp
  const cleanedPhone = formattedPhone.replace(/[^\d]/g, '');
  return `https://wa.me/${cleanedPhone}`;
}

function getPhoneLink(phone: string): string {
  const formattedPhone = formatPhoneNumber(phone);
  return `tel:${formattedPhone}`;
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

  useEffect(() => {
    const getLocation = async () => {
      if (!("geolocation" in navigator)) {
        setLocationError("Your browser doesn't support geolocation");
        setIsLoadingLocation(false);
        return;
      }

      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });

        if (permission.state === 'denied') {
          throw new Error('Location permission denied. Please enable location services in your browser settings.');
        }

        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            }
          );
        });

        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError(null);
      } catch (error) {
        console.error("Error getting location:", error);
        setLocationError(
          error instanceof Error
            ? error.message
            : "Unable to get your location. Please check your browser settings."
        );
      } finally {
        setIsLoadingLocation(false);
      }
    };

    getLocation();
  }, []);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: !!user && !isLoadingLocation && !locationError,
  });

  // Update the handleContactSeller function
  const handleContactSeller = async (productId: number) => {
    try {
      const response = await apiRequest("POST", `/api/products/${productId}/contact`);
      const data = await response.json();
      const formattedPhone = formatPhoneNumber(data.seller.mobileNumber);

      toast({
        title: "Seller Contact Information",
        description: (
          <div className="mt-2 space-y-2">
            <p><strong>Name:</strong> {data.seller.name}</p>
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Contact Options:</p>
              <div className="flex gap-2">
                <a
                  href={getPhoneLink(formattedPhone)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <PhoneIcon className="w-4 h-4" />
                  Call
                </a>
                <a
                  href={getWhatsAppLink(formattedPhone)}
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

  // Update the handleAdminClick function
  const handleAdminClick = async (adminId: number) => {
    try {
      const response = await apiRequest("GET", `/api/users/admin/${adminId}`);
      const data = await response.json();
      const formattedPhone = formatPhoneNumber(data.mobileNumber);

      toast({
        title: "Local Admin Contact Information",
        description: (
          <div className="mt-2 space-y-2">
            <p><strong>Name:</strong> {data.name || data.username}</p>
            <p><strong>Location:</strong> {data.location || 'Location not set'}</p>
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Contact Options:</p>
              <div className="flex gap-2">
                <a
                  href={getPhoneLink(formattedPhone)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <PhoneIcon className="w-4 h-4" />
                  Call
                </a>
                <a
                  href={getWhatsAppLink(formattedPhone)}
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
      console.error('Error fetching admin details:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch admin details",
        variant: "destructive",
      });
    }
  };

  // Add function to handle adding to cart
  const handleAddToCart = (product: Product) => {
    addToCart(product);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  if (!user) {
    return null;
  }

  if (isLoadingLocation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>Loading your location...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (locationError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">{locationError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter products within 2 miles radius (3218.69 meters)
  const nearbyProducts = products?.filter(product => {
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
          <p>Showing products within 2 miles of your location</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nearbyProducts?.map((product) => (
          <Card key={product.id} className={`table-glow ${getCardStyle(product)}`}>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-4xl flex items-center">
                  {getCategoryEmoji(product.category)} → {getProductEmoji(product.name, product.category)}
                </span>
                <h3 className={`font-medium product-name ${getProductNameStyle(product.listingType)}`}>
                  {product.name}
                  {product.listingType === 'buyer' && (
                    <span className="ml-2 text-sm text-red-500">(Buyer Request)</span>
                  )}
                </h3>
              </div>
            </CardHeader>
            <CardContent>
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

                <div className="border-t pt-2 mt-2">
                  <p className={`font-medium mb-1 flex items-center gap-2 ${getTextColorClass(product.listingType)}`}>
                    <User className="w-4 h-4" />
                    Local Admins:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.admins && product.admins.length > 0 ? (
                      product.admins.map((admin) => (
                        <button
                          key={admin.id}
                          onClick={() => handleAdminClick(admin.id)}
                          className={`username inline-flex items-center px-2 py-1 rounded-full cursor-pointer transition-colors ${
                            admin.adminType === 'super_admin' && admin.adminStatus === 'approved'
                              ? `bg-violet-100 ${getTextColorClass(product.listingType)} hover:bg-violet-200`
                              : admin.adminType === 'local_admin' && admin.adminStatus === 'approved'
                              ? `bg-purple-100 ${getTextColorClass(product.listingType)} hover:bg-purple-200`
                              : 'bg-primary/10 hover:bg-primary/20'
                          }`}
                        >
                          {admin.username}
                        </button>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No local admins assigned
                      </span>
                    )}
                  </div>
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