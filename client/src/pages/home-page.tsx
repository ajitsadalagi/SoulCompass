import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Phone, MapPin, Clock, Trash2, Shield, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { getProductEmoji, getCategoryEmoji } from "@shared/helpers";
import { useEffect, useState } from "react";

// Update the product name style function to use stronger colors
function getProductNameStyle(listingType: 'buyer' | 'seller'): string {
  return `font-bold ${listingType === 'buyer' ? '!text-red-600' : '!text-green-600'}`;
}

// Add new function to handle map directions
function getGoogleMapsDirectionsUrl(lat: number | null, lng: number | null, city: string, state: string) {
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  // Fallback to city,state if coordinates are not available
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${city}, ${state}`)}`;
}

// Add function to sort products by admin status
function sortProductsByAdminStatus(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const getAdminPriority = (product: Product) => {
      const admin = product.admins?.[0];
      if (!admin) return 0;
      if (admin.adminType === 'super_admin' && admin.adminStatus === 'approved') return 2;
      if (admin.adminType === 'local_admin' && admin.adminStatus === 'approved') return 1;
      return 0;
    };

    return getAdminPriority(b) - getAdminPriority(a);
  });
}

// Add function to get card style based on admin status
function getCardStyle(product: Product): string {
  const admin = product.admins?.[0];
  if (!admin) return '';

  if (admin.adminType === 'super_admin' && admin.adminStatus === 'approved') {
    return 'border-violet-500 border-2 shadow-violet-100 shadow-lg';
  }
  if (admin.adminType === 'local_admin' && admin.adminStatus === 'approved') {
    return 'border-purple-500 border-2 shadow-purple-100 shadow-lg';
  }
  return '';
}


export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Error",
            description: "Unable to get your current location. Using default location.",
            variant: "destructive",
          });
        }
      );
    }
  }, [toast]);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products", currentLocation?.latitude, currentLocation?.longitude],
    queryFn: async () => {
      const url = new URL("/api/products", window.location.origin);
      if (currentLocation) {
        url.searchParams.append("lat", currentLocation.latitude.toString());
        url.searchParams.append("lng", currentLocation.longitude.toString());
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
    enabled: !!user,
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      await apiRequest("DELETE", `/api/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", currentLocation?.latitude, currentLocation?.longitude] });
      toast({
        title: "Success",
        description: "Product has been delisted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteProduct = async (productId: number) => {
    try {
      await deleteProductMutation.mutateAsync(productId);
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleContactSeller = async (productId: number) => {
    try {
      const response = await apiRequest("POST", `/api/products/${productId}/contact`);
      const data = await response.json();

      toast({
        title: "Seller Contact Information",
        description: (
          <div className="mt-2 space-y-2">
            <p><strong>Name:</strong> {data.seller.name}</p>
            <p><strong>Mobile:</strong> {data.seller.mobileNumber}</p>
          </div>
        ),
        duration: 10000,
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/products", currentLocation?.latitude, currentLocation?.longitude] });
    } catch (error) {
      console.error('Error contacting seller:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to contact seller",
        variant: "destructive",
      });
    }
  };

  const handleContactAdmin = async (adminId: number) => {
    try {
      const response = await apiRequest("GET", `/api/users/admin/${adminId}`);
      const data = await response.json();

      toast({
        title: "Local Admin Contact Information",
        description: (
          <div className="mt-2 space-y-2">
            <p><strong>Name:</strong> {data.username}</p>
            <p><strong>Mobile:</strong> {data.mobileNumber}</p>
            <p><strong>Location:</strong> {data.location || 'Location not set'}</p>
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

  const handleLocationClick = (product: Product) => {
    const url = getGoogleMapsDirectionsUrl(
      product.latitude,
      product.longitude,
      product.city,
      product.state
    );
    window.open(url, '_blank');
  };

  if (!user) {
    return null;
  }

  const isAdminUser = user.adminStatus === "approved" &&
    (user.adminType === "master_admin" || user.adminType === "super_admin");

  // Sort products by admin status
  const sortedProducts = products ? sortProductsByAdminStatus(products) : [];

  return (
    <div className="container mx-auto p-8">
      {isAdminUser && (
        <div className="mb-6">
          <Button
            onClick={() => setLocation("/admin/management")}
            className="flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Admin Management
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedProducts.map((product) => (
          <Card key={product.id} className={`table-glow ${getCardStyle(product)}`}>
            <CardHeader className="flex flex-row items-center gap-4">
              <span className="text-4xl">{getProductEmoji(product.name, product.category)}</span>
              <CardTitle className={getProductNameStyle(product.listingType)}>
                {product.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>Quantity: {product.quantity}</p>
                <p>Quality: {product.quality}</p>
                <p>Condition: {product.condition}</p>
                <p>Category: {product.category}</p>
                <p>Price: ₹{product.targetPrice?.toString()}</p>
                <button
                  onClick={() => handleLocationClick(product)}
                  className="flex items-center gap-2 text-primary hover:underline cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  <span>{product.city}, {product.state}</span>
                </button>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Listed {format(new Date(product.createdAt), 'PPp')}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <p className="font-medium mb-1 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Local Admins:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.admins && product.admins.length > 0 ? (
                      product.admins.map((admin) => (
                        <button
                          key={admin.id}
                          onClick={() => handleContactAdmin(admin.id)}
                          className={`username inline-flex items-center px-2 py-1 rounded-full transition-colors cursor-pointer ${
                            admin.adminType === 'super_admin' && admin.adminStatus === 'approved'
                              ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                              : admin.adminType === 'local_admin' && admin.adminStatus === 'approved'
                              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                              : 'bg-primary/10 hover:bg-primary/20'
                          }`}
                        >
                          {admin.username}
                        </button>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No local admins assigned</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="px-6 pb-6">
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>{product.views} views</span>
                </div>
                <div className="flex items-center gap-2">
                  {user.roles.includes("buyer") && (
                    <Button
                      size="sm"
                      onClick={() => handleContactSeller(product.id)}
                      className="flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      Contact ({product.contactRequests || 0})
                    </Button>
                  )}
                  {user.roles.includes("seller") && user.id === product.sellerId && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteProduct(product.id)}
                      className="flex items-center gap-2"
                      disabled={deleteProductMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleteProductMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}