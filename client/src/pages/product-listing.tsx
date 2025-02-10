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
import { Apple, Carrot, Milk, Package, MapPin, Clock, UserIcon } from "lucide-react";
import { useState, useEffect } from 'react';
import { Map } from "@/components/ui/map";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from 'date-fns';
import { getProductEmoji, getCategoryEmoji } from "@shared/helpers";
import { FiSearch } from 'react-icons/fi';
import { Loader2 } from 'lucide-react';

// Define proper type for local admin data
interface LocalAdmin {
  id: number;
  username: string;
  name: string | null;
  location: string | null;
  mobileNumber: string | null;
}

type ProductCategory = {
  id: "fruits" | "vegetables" | "dairy" | "other";
  label: string;
  icon: React.ComponentType;
  items: ProductItem[];
};

type ProductItem = {
  id: string;
  name: string;
  image: string;
  admins?: User[];
};

const productCategories: ProductCategory[] = [
  {
    id: "fruits",
    label: "Fruits",
    icon: Apple,
    items: [
      { id: "apple", name: "Apple", image: "🍎" },
      { id: "banana", name: "Banana", image: "🍌" },
      { id: "orange", name: "Orange", image: "🍊" },
      { id: "mango", name: "Mango", image: "🥭" },
      { id: "grapes", name: "Grapes", image: "🍇" },
      { id: "watermelon", name: "Watermelon", image: "🍉" },
      { id: "pear", name: "Pear", image: "🍐" },
      { id: "peach", name: "Peach", image: "🍑" },
      { id: "strawberry", name: "Strawberry", image: "🍓" },
      { id: "pineapple", name: "Pineapple", image: "🍍" },
      { id: "coconut", name: "Coconut", image: "🥥" },
      { id: "kiwi", name: "Kiwi", image: "🥝" },
      { id: "lemon", name: "Lemon", image: "🍋" },
      { id: "cherries", name: "Cherries", image: "🍒" },
      { id: "blueberries", name: "Blueberries", image: "🫐" },
      { id: "pomegranate", name: "Pomegranate", image: "🥭" },
      { id: "guava", name: "Guava", image: "🥭" },
      { id: "plum", name: "Plum", image: "🍑" },
      { id: "fig", name: "Fig", image: "🥭" },
      { id: "apricot", name: "Apricot", image: "🍊" },
      { id: "blackberry", name: "Blackberry", image: "🫐" },
      { id: "raspberry", name: "Raspberry", image: "🍓" },
      { id: "dragonfruit", name: "Dragon Fruit", image: "🥭" },
      { id: "passionfruit", name: "Passion Fruit", image: "🥭" },
      { id: "lychee", name: "Lychee", image: "🥭" }
    ]
  },
  {
    id: "vegetables",
    label: "Vegetables",
    icon: Carrot,
    items: [
      { id: "tomato", name: "Tomato", image: "🍅" },
      { id: "carrot", name: "Carrot", image: "🥕" },
      { id: "potato", name: "Potato", image: "🥔" },
      { id: "broccoli", name: "Broccoli", image: "🥦" },
      { id: "cucumber", name: "Cucumber", image: "🥒" },
      { id: "eggplant", name: "Eggplant", image: "🍆" },
      { id: "corn", name: "Corn", image: "🌽" },
      { id: "lettuce", name: "Lettuce", image: "🥬" },
      { id: "bellpepper", name: "Bell Pepper", image: "🫑" },
      { id: "onion", name: "Onion", image: "🧅" },
      { id: "garlic", name: "Garlic", image: "🧄" },
      { id: "mushroom", name: "Mushroom", image: "🍄" },
      { id: "sweetpotato", name: "Sweet Potato", image: "🥔" },
      { id: "cauliflower", name: "Cauliflower", image: "🥦" },
      { id: "cabbage", name: "Cabbage", image: "🥬" },
      { id: "spinach", name: "Spinach", image: "🌿" },
      { id: "peas", name: "Peas", image: "🫛" },
      { id: "asparagus", name: "Asparagus", image: "🌿" },
      { id: "celery", name: "Celery", image: "🌿" },
      { id: "radish", name: "Radish", image: "🥕" },
      { id: "beetroot", name: "Beetroot", image: "🥕" },
      { id: "zucchini", name: "Zucchini", image: "🥒" },
      { id: "pumpkin", name: "Pumpkin", image: "🎃" },
      { id: "greenbeans", name: "Green Beans", image: "🫘" },
      { id: "artichoke", name: "Artichoke", image: "🌿" }
    ]
  },
  {
    id: "dairy",
    label: "Dairy",
    icon: Milk,
    items: [
      { id: "milk", name: "Milk", image: "🥛" },
      { id: "cheese", name: "Cheese", image: "🧀" },
      { id: "butter", name: "Butter", image: "🧈" },
      { id: "yogurt", name: "Yogurt", image: "🥛" },
      { id: "cream", name: "Cream", image: "🥛" },
      { id: "skimmedmilk", name: "Skimmed Milk", image: "🥛" },
      { id: "wholemilk", name: "Whole Milk", image: "🥛" },
      { id: "cheddarcheese", name: "Cheddar Cheese", image: "🧀" },
      { id: "mozzarella", name: "Mozzarella", image: "🧀" },
      { id: "cottagecheese", name: "Cottage Cheese", image: "🧀" },
      { id: "sourcream", name: "Sour Cream", image: "🥛" },
      { id: "heavycream", name: "Heavy Cream", image: "🥛" },
      { id: "buttermilk", name: "Buttermilk", image: "🥛" },
      { id: "condensedmilk", name: "Condensed Milk", image: "🥛" },
      { id: "evaporatedmilk", name: "Evaporated Milk", image: "🥛" },
      { id: "parmesancheese", name: "Parmesan Cheese", image: "🧀" },
      { id: "ricottacheese", name: "Ricotta Cheese", image: "🧀" },
      { id: "bluecheese", name: "Blue Cheese", image: "🧀" },
      { id: "goudacheese", name: "Gouda Cheese", image: "🧀" },
      { id: "fetacheese", name: "Feta Cheese", image: "🧀" },
      { id: "creamcheese", name: "Cream Cheese", image: "🧀" },
      { id: "mascarpone", name: "Mascarpone", image: "🧀" },
      { id: "provolone", name: "Provolone", image: "🧀" },
      { id: "brie", name: "Brie", image: "🧀" },
      { id: "camembert", name: "Camembert", image: "🧀" }
    ]
  },
  {
    id: "other",
    label: "Other",
    icon: Package,
    items: [
      { id: "rice", name: "Rice", image: "🍚" },
      { id: "wheat", name: "Wheat", image: "🌾" },
      { id: "bread", name: "Bread", image: "🍞" },
      { id: "eggs", name: "Eggs", image: "🥚" },
      { id: "honey", name: "Honey", image: "🍯" },
      { id: "flour", name: "Flour", image: "🌾" },
      { id: "sugar", name: "Sugar", image: "🧂" },
      { id: "salt", name: "Salt", image: "🧂" },
      { id: "pepper", name: "Pepper", image: "🌶️" },
      { id: "pasta", name: "Pasta", image: "🍝" },
      { id: "oats", name: "Oats", image: "🌾" },
      { id: "nuts", name: "Nuts", image: "🥜" },
      { id: "seeds", name: "Seeds", image: "🌱" },
      { id: "coffee", name: "Coffee", image: "☕" },
      { id: "tea", name: "Tea", image: "🫖" },
      { id: "spices", name: "Spices", image: "🌶️" },
      { id: "oil", name: "Oil", image: "🫗" },
      { id: "vinegar", name: "Vinegar", image: "🫗" },
      { id: "soy_sauce", name: "Soy Sauce", image: "🫗" },
      { id: "ketchup", name: "Ketchup", image: "🥫" },
      { id: "mayonnaise", name: "Mayonnaise", image: "🫗" },
      { id: "mustard", name: "Mustard", image: "🫗" },
      { id: "jam", name: "Jam", image: "🍯" },
      { id: "peanut_butter", name: "Peanut Butter", image: "🥜" },
      { id: "chocolate", name: "Chocolate", image: "🍫" }
    ]
  }
];


export default function ProductListing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<ProductItem | null>(null);
  const [selectedAdmins, setSelectedAdmins] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number }>({
    lat: 20.5937, // Default to India's coordinates
    lng: 78.9629
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    const getLocation = async () => {
      setIsLoadingLocation(true);
      try {
        if ("geolocation" in navigator) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            });
          });

          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          setLocationError(null);
        }
      } catch (error) {
        console.error('Location error:', error);
        if (user?.latitude && user?.longitude) {
          setCurrentLocation({
            lat: user.latitude,
            lng: user.longitude
          });
          setLocationError("Using location from your profile");
        }
      } finally {
        setIsLoadingLocation(false);
      }
    };

    getLocation();
  }, [user]);

  const { data: localAdmins, isError, error } = useQuery<LocalAdmin[]>({
    queryKey: ["/api/users/local-admins"],
    retry: 2,
    staleTime: 300000, // 5 minutes
    onError: (error: Error) => {
      console.error('Error fetching local admins:', error);
      toast({
        title: "Error",
        description: "Failed to load local admins. Please try again.",
        variant: "destructive",
      });
    },
  });

  console.log('Local admins data:', localAdmins);

  const form = useForm<z.infer<typeof insertProductSchema>>({
    resolver: zodResolver(insertProductSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      image: "",
      quantity: 1,
      quality: "Good",
      targetPrice: 0,
      city: "",
      state: "",
      condition: "new",
      category: "fruits",
      availabilityDate: new Date(),
      latitude: 0,
      longitude: 0,
      localAdminIds: [],
    }
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: InsertProduct & { localAdminIds: number[] }) => {
      console.log('Submitting product data:', data);
      const res = await apiRequest("POST", "/api/products", data);
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Server returned error:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to create product');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product listed successfully"
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      console.error('Product creation error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = async (formData: z.infer<typeof insertProductSchema>) => {
    try {
      console.log('Form submission started with data:', formData);

      if (Object.keys(form.formState.errors).length > 0) {
        console.error('Form validation errors:', form.formState.errors);
        toast({
          title: "Validation Error",
          description: "Please check all required fields",
          variant: "destructive",
        });
        return;
      }

      if (!selectedCategory || !selectedItem) {
        toast({
          title: "Error",
          description: "Please select a product category and item",
          variant: "destructive"
        });
        return;
      }

      if (!formData.city || !formData.state) {
        toast({
          title: "Error",
          description: "Please select a location from the map",
          variant: "destructive"
        });
        return;
      }


      const productData = {
        name: selectedItem.name,
        image: selectedItem.image,
        category: selectedCategory.id,
        quantity: Number(formData.quantity),
        quality: formData.quality,
        condition: formData.condition,
        targetPrice: Number(formData.targetPrice),
        city: formData.city,
        state: formData.state,
        latitude: formData.latitude,
        longitude: formData.longitude,
        availabilityDate: new Date(),
        localAdminIds: selectedAdmins,
      };

      console.log('Submitting product data:', productData);
      await createProductMutation.mutateAsync(productData);
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create product",
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
    console.log("Location selected:", { city, state, lat, lng });

    form.setValue("city", city, { shouldValidate: true });
    form.setValue("state", state, { shouldValidate: true });
    if (lat !== undefined && lng !== undefined) {
      form.setValue("latitude", lat, { shouldValidate: true });
      form.setValue("longitude", lng, { shouldValidate: true });
    }
  };

  const handleProductSelect = (item: ProductItem) => {
    setSelectedItem(item);
    if (selectedCategory) {
      form.setValue("name", item.name, { shouldValidate: true });
      form.setValue("image", item.image, { shouldValidate: true });
      form.setValue("category", selectedCategory.id, { shouldValidate: true });
    }
  };

  const handleCategorySelect = (category: ProductCategory) => {
    setSelectedCategory(category);
    setSelectedItem(null);
    form.setValue("category", category.id, { shouldValidate: true });
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

  const handleLocationClick = (product: any) => {
    console.log("Location clicked:", product);
  };

  const renderSelectedAdmins = () => (
    <div className="border-t pt-2 mt-2">
      <p className="font-medium mb-1 flex items-center gap-2">
        <UserIcon className="w-4 h-4" />
        Selected Local Admins:
      </p>
      <div className="flex flex-wrap gap-2">
        {localAdmins?.filter(admin => selectedAdmins.includes(admin.id)).map((admin) => (
          <button
            key={admin.id}
            onClick={() => handleContactAdmin(admin.id)}
            className="username inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors cursor-pointer"
          >
            {admin.name || admin.username}
          </button>
        ))}
      </div>
    </div>
  );


  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (!user.roles.includes("seller")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>Only sellers can list products</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Card className="max-w-4xl mx-auto table-glow">
        <CardHeader>
          <CardTitle>List a New Product</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {productCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategorySelect(category)}
                    className={`p-6 rounded-lg border-2 transition-colors ${
                      selectedCategory?.id === category.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">{getCategoryEmoji(category.id)}</span>
                      <p className="text-center font-medium">{category.label}</p>
                    </div>
                  </button>
                ))}
              </div>

              {selectedCategory && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {selectedCategory.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleProductSelect(item)}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        selectedItem?.id === item.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">{getProductEmoji(item.name, selectedCategory.id)}</span>
                        <p className="text-center font-medium product-name">{item.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedItem && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-4xl">
                      {getProductEmoji(selectedItem.name, selectedCategory?.id || '')}
                    </span>
                    <span className="text-xl font-medium product-name">{selectedItem.name}</span>
                  </div>

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
                    name="quality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quality</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-3 gap-4">
                            {["Good", "Average", "Poor"].map((quality) => (
                              <button
                                key={quality}
                                type="button"
                                onClick={() => field.onChange(quality)}
                                className={`p-4 rounded-lg border-2 transition-colors ${
                                  field.value === quality
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                <p className="text-center font-medium">{quality}</p>
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
                    name="targetPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
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
                    name="city"
                    render={() => (
                      <FormItem>
                        <FormLabel>Select Location</FormLabel>
                        <FormControl>
                          <div className="w-full h-[400px] relative rounded-lg border overflow-hidden">
                            {isLoadingLocation ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                                <Loader2 className="h-8 w-8 animate-spin" />
                              </div>
                            ) : (
                              <Map
                                defaultCenter={currentLocation}
                                circle={null}
                                enableDrawing={false}
                                onMapLoad={(map) => {
                                  map.addListener('click', async (e: google.maps.MapMouseEvent) => {
                                    const position = e.latLng;
                                    if (!position) return;

                                    try {
                                      const geocoder = new google.maps.Geocoder();
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
                            )}
                          </div>
                        </FormControl>
                        {locationError && (
                          <p className="text-sm text-destructive mt-2">
                            {locationError}
                          </p>
                        )}
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
                                onChange={(e) => {
                                  const searchQuery = e.target.value.toLowerCase();
                                  setSearchQuery(searchQuery);
                                }}
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
                                const nameMatch = (admin.name || admin.username).toLowerCase().includes(searchQuery);
                                const locationMatch = admin.location?.toLowerCase().includes(searchQuery) ?? false;
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
                          Optionally select local admins to oversee your product
                        </p>
                      </FormItem>
                    )}
                  />

                  {selectedItem && (
                    <div className="border-t pt-2 mt-2">
                      <p className="font-medium mb-1 flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        Local Admins:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.admins && selectedItem.admins.length > 0 ? (
                          selectedItem.admins.map((admin) => (
                            <button
                              key={admin.id}
                              onClick={() => handleContactAdmin(admin.id)}
                              className="username inline-flex items-center px-2 py-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer"
                            >
                              {admin.name || admin.username}
                            </button>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No local admins assigned</span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedItem && renderSelectedAdmins()}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createProductMutation.isPending}
                  >
                    {createProductMutation.isPending ? "Creating..." : "List Product"}
                  </Button>
                </>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}