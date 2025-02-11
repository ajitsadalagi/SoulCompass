import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type InsertProduct, type User } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Redirect } from "wouter";
import { Package, MapPin, Clock, UserIcon } from "lucide-react";
import { useState, useEffect } from 'react';
import { Map } from "@/components/ui/map";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from 'date-fns';
import { getProductEmoji, getCategoryEmoji } from "@shared/helpers";
import { FiSearch } from 'react-icons/fi';

interface LocalAdmin {
  id: number;
  username: string;
  name: string | null;
  location: string | null;
  mobileNumber: string | null;
}

const buyerRequestSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  targetPrice: z.number().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  category: z.enum(["fruits", "vegetables", "dairy", "other"]),
  description: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  localAdminIds: z.array(z.number()),
});

export default function BuyerListing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAdmins, setSelectedAdmins] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number }>({
    lat: 20.5937,
    lng: 78.9629
  });

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(newLocation);

          // Update form values with the new coordinates
          form.setValue("latitude", newLocation.lat, { shouldValidate: true });
          form.setValue("longitude", newLocation.lng, { shouldValidate: true });
        },
        (error) => {
          console.error('Geolocation error:', error);
          // More user-friendly error messages based on error type
          const errorMessages = {
            1: "Location access was denied. You can still select your location manually on the map.",
            2: "Location information is unavailable. Please select your location on the map.",
            3: "Location request timed out. Please select your location manually."
          };

          toast({
            title: "Location Notice",
            description: errorMessages[error.code] || "Could not get your current location. Please select manually.",
            variant: "default",
          });

          // Keep the default India location
          form.setValue("latitude", currentLocation.lat, { shouldValidate: true });
          form.setValue("longitude", currentLocation.lng, { shouldValidate: true });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      toast({
        title: "Location Notice",
        description: "Geolocation is not supported in your browser. Please select your location manually on the map.",
        variant: "default",
      });
    }
  }, []);

  const { data: localAdmins } = useQuery<LocalAdmin[]>({
    queryKey: ["/api/users/local-admins"],
    retry: 2,
    staleTime: 300000,
  });

  const form = useForm({
    resolver: zodResolver(buyerRequestSchema),
    defaultValues: {
      name: "",
      quantity: 1,
      targetPrice: undefined,
      city: "",
      state: "",
      category: "other" as const,
      description: "",
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
      localAdminIds: [],
    }
  });

  const createBuyerRequestMutation = useMutation({
    mutationFn: async (data: z.infer<typeof buyerRequestSchema>) => {
      console.log('Submitting buyer request:', data);
      const res = await apiRequest("POST", "/api/buyer-requests", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create buyer request');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyer-requests"] });
      toast({
        title: "Success",
        description: "Buy request posted successfully"
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = async (formData: z.infer<typeof buyerRequestSchema>) => {
    try {
      if (!formData.city || !formData.state) {
        toast({
          title: "Error",
          description: "Please select a location from the map",
          variant: "destructive"
        });
        return;
      }

      const requestData = {
        ...formData,
        localAdminIds: selectedAdmins,
      };

      await createBuyerRequestMutation.mutateAsync(requestData);
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create buy request",
        variant: "destructive"
      });
    }
  };

  const handleLocationSelect = ({
    city,
    state,
    lat,
    lng
  }: {
    city: string;
    state: string;
    lat?: number;
    lng?: number;
  }) => {
    form.setValue("city", city, { shouldValidate: true });
    form.setValue("state", state, { shouldValidate: true });
    if (lat !== undefined && lng !== undefined) {
      form.setValue("latitude", lat, { shouldValidate: true });
      form.setValue("longitude", lng, { shouldValidate: true });
    }
  };

  const handleAdminToggle = (adminId: number) => {
    setSelectedAdmins(prev => {
      const newAdmins = prev.includes(adminId)
        ? prev.filter(id => id !== adminId)
        : [...prev, adminId];

      form.setValue("localAdminIds", newAdmins, { shouldValidate: true });
      return newAdmins;
    });
  };

  const handleContactAdmin = async (adminId: number) => {
    try {
      const response = await apiRequest("GET", `/api/users/admin/${adminId}`);
      const data = await response.json();

      toast({
        title: "Local Admin Contact Information",
        description: (
          <div className="mt-2 space-y-2">
            <p><strong>Name:</strong> {data.name || data.username}</p>
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

  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (!user.roles.includes("buyer")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>Only buyers can post buy requests</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Card className="max-w-4xl mx-auto table-glow">
        <CardHeader>
          <CardTitle>Post a Buy Request</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What do you want to buy?</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter product name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {["fruits", "vegetables", "dairy", "other"].map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(category);
                              field.onChange(category);
                            }}
                            className={`p-6 rounded-lg border-2 transition-colors ${
                              field.value === category
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-4xl">{getCategoryEmoji(category)}</span>
                              <p className="text-center font-medium">{category.charAt(0).toUpperCase() + category.slice(1)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Price (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Details (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Any specific requirements or details?" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={() => (
                  <FormItem>
                    <FormLabel>Select Location</FormLabel>
                    <FormControl>
                      <div className="w-full h-[400px] relative rounded-lg border overflow-hidden">
                        <Map
                          defaultCenter={currentLocation}
                          circle={null}
                          enableDrawing={false}
                          onMapLoad={(map) => {
                            if (currentLocation.lat !== 20.5937 || currentLocation.lng !== 78.9629) {
                              const geocoder = new google.maps.Geocoder();
                              geocoder.geocode({
                                location: currentLocation
                              }).then((result) => {
                                if (result.results[0]) {
                                  let city = '';
                                  let state = '';
                                  for (const component of result.results[0].address_components) {
                                    if (component.types.includes('locality')) {
                                      city = component.long_name;
                                    }
                                    if (component.types.includes('administrative_area_level_1')) {
                                      state = component.long_name;
                                    }
                                  }
                                  handleLocationSelect({
                                    city,
                                    state,
                                    lat: currentLocation.lat,
                                    lng: currentLocation.lng
                                  });
                                }
                              }).catch((error) => {
                                console.error('Geocoding error:', error);
                                toast({
                                  title: "Location Error",
                                  description: "Could not determine your city and state. Please select manually.",
                                  variant: "destructive",
                                });
                              });
                            }

                            map.addListener('click', async (e: google.maps.MapMouseEvent) => {
                              const position = e.latLng;
                              if (!position) return;

                              const geocoder = new google.maps.Geocoder();
                              try {
                                const result = await geocoder.geocode({
                                  location: { lat: position.lat(), lng: position.lng() }
                                });

                                if (result.results[0]) {
                                  let city = '';
                                  let state = '';
                                  for (const component of result.results[0].address_components) {
                                    if (component.types.includes('locality')) {
                                      city = component.long_name;
                                    }
                                    if (component.types.includes('administrative_area_level_1')) {
                                      state = component.long_name;
                                    }
                                  }

                                  handleLocationSelect({
                                    city,
                                    state,
                                    lat: position.lat(),
                                    lng: position.lng()
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
                          }}
                        />
                      </div>
                    </FormControl>
                    <p className="text-sm text-muted-foreground mt-2">
                      Click on the map to select your location
                    </p>
                    {form.watch("city") && form.watch("state") && (
                      <p className="text-sm font-medium mt-2">
                        Selected location: {form.watch("city")}, {form.watch("state")}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="localAdminIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Select Local Admins (Optional)</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Search local admins by name or location..."
                            className="max-w-md"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSearchQuery(prev => prev + '');
                            }}
                          >
                            <FiSearch className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {localAdmins?.filter(admin => {
                            const searchLower = searchQuery.toLowerCase();
                            const nameMatch = (admin.name || admin.username).toLowerCase().includes(searchLower);
                            const locationMatch = admin.location?.toLowerCase().includes(searchLower) ?? false;
                            return nameMatch || locationMatch;
                          }).map((admin) => (
                            <div
                              key={admin.id}
                              className="flex items-center space-x-2 p-4 rounded-lg border"
                            >
                              <Checkbox
                                checked={selectedAdmins.includes(admin.id)}
                                onCheckedChange={() => handleAdminToggle(admin.id)}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{admin.name || admin.username}</span>
                                <span className="text-sm text-muted-foreground">
                                  {admin.location || 'No location set'}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleContactAdmin(admin.id)}
                                className="ml-auto text-primary hover:text-primary/80"
                              >
                                Contact
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <p className="text-sm text-muted-foreground mt-2">
                      Optionally select local admins to oversee your request
                    </p>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={createBuyerRequestMutation.isPending}
              >
                {createBuyerRequestMutation.isPending ? "Posting..." : "Post Buy Request"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}