import { Apple, Carrot, Milk, Package, Phone, Clock, Search as SearchIcon, X, User, MapPin, ShoppingCart, Eye, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import { useState, useEffect } from 'react';
import { Map } from "@/components/ui/map";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Phone as PhoneIcon } from "lucide-react";
import { useCart } from "@/lib/cart-context";

// Add the helper function for Google Maps directions URL
function getGoogleMapsDirectionsUrl(lat: number | null, lng: number | null, city: string, state: string) {
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${city}, ${state}`)}`;
}

// Update the functions at the top of the file
// Update the product name style function to use stronger colors
function getProductNameStyle(listingType: 'buyer' | 'seller'): string {
  return `font-bold ${listingType === 'buyer' ? '!text-red-600' : '!text-green-600'}`;
}

// Add function to get text color based on listing type
function getTextColorClass(listingType: 'buyer' | 'seller'): string {
  return listingType === 'buyer' ? '!text-red-600/80' : '!text-green-600/80';
}

type ProductCategory = {
  id: "fruits" | "vegetables" | "dairy" | "other";
  label: string;
  icon: React.ComponentType<any>;
  items: ProductItem[];
};

type ProductItem = {
  id: string;
  name: string;
  image: string;
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

// Update the productMap with the new emoji mappings
function getProductEmoji(name: string, category: string): string {
  const productMap: Record<string, string> = {
    'apple': '🍎',
    'banana': '🍌',
    'orange': '🍊',
    'mango': '🥭',
    'grapes': '🍇',
    'watermelon': '🍉',
    'pear': '🍐',
    'peach': '🍑',
    'strawberry': '🍓',
    'pineapple': '🍍',
    'coconut': '🥥',
    'kiwi': '🥝',
    'lemon': '🍋',
    'cherries': '🍒',
    'blueberries': '🫐',
    'pomegranate': '🥭',
    'guava': '🥭',
    'plum': '🍑',
    'fig': '🥭',
    'apricot': '🍊',
    'blackberry': '🫐',
    'raspberry': '🍓',
    'dragonfruit': '🥭',
    'passionfruit': '🥭',
    'lychee': '🥭',
    'tomato': '🍅',
    'carrot': '🥕',
    'potato': '🥔',
    'broccoli': '🥦',
    'cucumber': '🥒',
    'eggplant': '🍆',
    'corn': '🌽',
    'lettuce': '🥬',
    'bellpepper': '🫑',
    'onion': '🧅',
    'garlic': '🧄',
    'mushroom': '🍄',
    'sweetpotato': '🥔',
    'cauliflower': '🥦',
    'cabbage': '🥬',
    'spinach': '🌿',
    'peas': '🫛',
    'asparagus': '🌿',
    'celery': '🌿',
    'radish': '🥕',
    'beetroot': '🥕',
    'zucchini': '🥒',
    'pumpkin': '🎃',
    'greenbeans': '🫘',
    'artichoke': '🌿',
    'milk': '🥛',
    'cheese': '🧀',
    'butter': '🧈',
    'yogurt': '🥛',
    'cream': '🥛',
    'skimmedmilk': '🥛',
    'wholemilk': '🥛',
    'cheddarcheese': '🧀',
    'mozzarella': '🧀',
    'cottagecheese': '🧀',
    'sourcream': '🥛',
    'heavycream': '🥛',
    'buttermilk': '🥛',
    'condensedmilk': '🥛',
    'evaporatedmilk': '🥛',
    'parmesancheese': '🧀',
    'ricottacheese': '🧀',
    'bluecheese': '🧀',
    'goudacheese': '🧀',
    'fetacheese': '🧀',
    'creamcheese': '🧀',
    'mascarpone': '🧀',
    'provolone': '🧀',
    'brie': '🧀',
    'camembert': '🧀',
    'rice': '🍚',
    'wheat': '🌾',
    'bread': '🍞',
    'eggs': '🥚',
    'honey': '🍯',
    'flour': '🌾',
    'sugar': '🧂',
    'salt': '🧂',
    'pepper': '🌶️',
    'pasta': '🍝',
    'oats': '🌾',
    'nuts': '🥜',
    'seeds': '🌱',
    'coffee': '☕',
    'tea': '🫖',
    'spices': '🌶️',
    'oil': '🫗',
    'vinegar': '🫗',
    'soy_sauce': '🫗',
    'ketchup': '🥫',
    'mayonnaise': '🫗',
    'mustard': '🫗',
    'jam': '🍯',
    'peanut_butter': '🥜',
    'chocolate': '🍫'
  };

  return productMap[name.toLowerCase()] || getCategoryEmoji(category);
}

// Helper function to get category emoji
function getCategoryEmoji(category: string): string {
  switch (category.toLowerCase()) {
    case 'fruits':
      return '🍎';
    case 'vegetables':
      return '🥕';
    case 'dairy':
      return '🥛';
    default:
      return '📦';
  }
}

// Update the distance calculation function for better precision
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Return large distance if any coordinate is missing
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return Number.MAX_SAFE_INTEGER;
  }

  const R = 6371000; // Earth's radius in meters (not kilometers)
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

function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // Remove any existing country code (both +91 and 91)
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  }

  // Ensure the number is bare without any country code
  // Standard Indian mobile numbers are 10 digits
  cleaned = cleaned.slice(-10);

  return cleaned;
}

function getWhatsAppLink(phone: string): string {
  const formattedPhone = formatPhoneNumber(phone);
  // Add 91 without + for WhatsApp links
  return `https://wa.me/91${formattedPhone}`;
}

function getPhoneLink(phone: string): string {
  const formattedPhone = formatPhoneNumber(phone);
  // Add +91 for regular phone calls
  return `tel:+91${formattedPhone}`;
}


const filterSchema = z.object({
  listingType: z.enum(['seller', 'buyer'])
});

type FilterValues = z.infer<typeof filterSchema>;

// Update the card style function to properly handle admin listings
function getCardStyle(product: Product): string {
  const isBuyerListing = product.listingType === 'buyer';
  // Find approved admins
  const approvedSuperAdmin = product.admins?.find(
    admin => admin.adminType === 'super_admin' && 
    admin.adminStatus === 'approved' &&
    admin.id === product.sellerId
  );

  const approvedLocalAdmin = product.admins?.find(
    admin => admin.adminType === 'local_admin' && 
    admin.adminStatus === 'approved' &&
    admin.id === product.sellerId
  );

  // Super admin gets the strongest glow
  if (approvedSuperAdmin) {
    return `border-2 ${
      isBuyerListing ? 'border-red-500 animate-border-glow-red' : 'border-green-500 animate-border-glow-green'
    } shadow-lg transform scale-102 transition-all duration-500`;
  }

  // Local admin gets a moderate glow
  if (approvedLocalAdmin) {
    return `border-2 ${
      isBuyerListing ? 'border-red-400 animate-border-glow-red-light' : 'border-green-400 animate-border-glow-green-light'
    } shadow-md transform scale-101 transition-all duration-500`;
  }

  // Regular listing
  return isBuyerListing
    ? 'border-red-500 border-2 shadow-red-100 shadow-lg'
    : 'border-green-500 border-2 shadow-green-100 shadow-lg';
}

const ProductSearch = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<ProductItem | null>(null);
  const [searchCircle, setSearchCircle] = useState<{
    center: { lat: number; lng: number };
    radius: number;
  } | null>(null);
  const [isLocationSearchActive, setIsLocationSearchActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const form = useForm<FilterValues>({
    defaultValues: {
      listingType: 'seller'
    }
  });

  useEffect(() => {
    const getLocation = async () => {
      if (!("geolocation" in navigator)) {
        setLocationError("Your browser doesn't support geolocation");
        setIsLoadingLocation(false);
        return;
      }

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            (error) => {
              console.log("Geolocation error:", error);
              // Don't reject, just use default location
              const defaultLocation = { coords: { latitude: 37.7749, longitude: -122.4194 } };
              resolve(defaultLocation as GeolocationPosition);
            },
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            }
          );
        });

        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setCurrentLocation(location);
        setSearchCircle({
          center: location,
          radius: 3218.69,
        });
        setIsLocationSearchActive(true);
        setLocationError(null);
        setIsLoadingLocation(false);
      } catch (error) {
        console.error("Error getting location:", error);
        // Use default location (San Francisco) as fallback
        const defaultLocation = { lat: 37.7749, lng: -122.4194 };
        setCurrentLocation(defaultLocation);
        setSearchCircle({
          center: defaultLocation,
          radius: 3218.69,
        });
        setIsLocationSearchActive(true);
        setLocationError("Unable to get your location. Using default location (San Francisco).");
        setIsLoadingLocation(false);
      }
    };

    getLocation();
  }, []);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const handleCircleComplete = (center: google.maps.LatLng, radius: number) => {
    console.log('Search circle updated:', {
      center: { lat: center.lat(), lng: center.lng() },
      radius: radius,
    });

    setSearchCircle({
      center: { lat: center.lat(), lng: center.lng() },
      radius: radius,
    });
    setIsLocationSearchActive(true);
    toast({
      title: "Search Area Set",
      description: `Searching within ${(radius / 1609.34).toFixed(1)} miles radius`,
    });
  };

  const handleClearLocationSearch = () => {
    setSearchCircle(null);
    setIsLocationSearchActive(false);
  };

  const handleContactSeller = async (productId: number) => {
    try {
      const response = await apiRequest("POST", `/api/products/${productId}/contact`);
      const data = await response.json();
      const product = products?.find(p => p.id === productId);
      const isBuyerListing = product?.listingType === 'buyer';
      const formattedPhone = formatPhoneNumber(data.seller.mobileNumber);

      toast({
        title: isBuyerListing ? "Buyer Contact Information" : "Seller Contact Information",
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

      await queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    } catch (error) {
      console.error('Error contacting seller:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to contact seller",
        variant: "destructive",
      });
    }
  };

  const filteredProducts = products?.filter(product => {
    if (selectedCategory && product.category.toLowerCase() !== selectedCategory.id) {
      return false;
    }

    if (selectedItem && product.name.toLowerCase() !== selectedItem.name.toLowerCase()) {
      return false;
    }

    if (isLocationSearchActive && searchCircle) {
      if (!product.latitude || !product.longitude) {
        console.log('Product missing coordinates:', product.name);
        return false;
      }

      const distance = calculateDistance(
        searchCircle.center.lat,
        searchCircle.center.lng,
        product.latitude,
        product.longitude
      );

      console.log('Distance calculation:', {
        product: product.name,
        distance: distance,
        radius: searchCircle.radius,
        withinRadius: distance <= searchCircle.radius,
        coordinates: {
          circle: searchCircle.center,
          product: {
            lat: product.latitude,
            lng: product.longitude
          }
        }
      });

      return distance <= searchCircle.radius;
    }

    return true;
  });

  const handleModeChange = (value: 'seller' | 'buyer') => {
    form.setValue('listingType', value);
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>You must be logged in to search products</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Card className="max-w-4xl mx-auto table-glow">
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <CardTitle>Search Products</CardTitle>
            <Form {...form}>
              <form className="space-y-4">
                <FormField
                  control={form.control}
                  name="listingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={(value) => handleModeChange(value as 'seller' | 'buyer')}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem
                                value="seller"
                                className="border-2 border-green-500 text-green-500"
                              />
                            </FormControl>
                            <FormLabel className="text-green-700 font-medium">
                              Seller Listings
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem
                                value="buyer"
                                className="border-2 border-red-500 text-red-500"
                              />
                            </FormControl>
                            <FormLabel className="text-red-700 font-medium">
                              Buyer Requests
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            {locationError && (
              <div className="text-sm text-destructive mt-2">
                {locationError}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {productCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category);
                    setSelectedItem(null);
                  }}
                  className={`p-6 rounded-lg border-2 transition-colors ${
                    selectedCategory?.id === category.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">{getCategoryEmoji(category.id)}</span>
                    <p className="text-center font-medium product-name">{category.label}</p>
                  </div>
                </button>
              ))}
            </div>

            {selectedCategory && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {selectedCategory.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedItem?.id === item.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">
                        {getProductEmoji(item.name, selectedCategory.id)}
                      </span>
                      <p className="text-center font-medium product-name">{item.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div>
              <div className="w-full h-[400px] relative rounded-lg border overflow-hidden">
                <Map
                  defaultCenter={currentLocation || undefined}
                  enableDrawing={true}
                  onCircleComplete={handleCircleComplete}
                  circle={searchCircle}
                />
              </div>
              <div className="mt-4 flex items-center gap-4">
                {searchCircle && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleClearLocationSearch}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Clear location search
                    </Button>
                    {isLocationSearchActive && (
                      <p className="text-sm text-muted-foreground">
                        Showing results within {(searchCircle.radius / 1609.34).toFixed(1)} miles radius
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {filteredProducts && filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts
                  .filter(product => product.listingType === form.watch('listingType'))
                  .map((product) => (
                    <Card key={product.id} className={`table-glow ${getCardStyle(product)}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4 mb-2">
                          <span className="text-4xl">
                            {getProductEmoji(product.name, product.category)}
                          </span>
                          <h3 className={`font-medium product-name ${getProductNameStyle(product.listingType)}`}>
                            {product.name}
                            {product.listingType === 'buyer' && (
                              <span className="ml-2 text-sm text-red-500">(Buyer Request)</span>
                            )}
                          </h3>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className={getTextColorClass(product.listingType)}>Quality: {product.quality}</p>
                          <p className={getTextColorClass(product.listingType)}>Price: ₹{product.targetPrice?.toString()}</p>
                          <p className={getTextColorClass(product.listingType)}>Quantity: {product.quantity}</p>
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
                          <div className="flex items-center gap-2 text-muted-foreground mt-2">
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
                                    onClick={async () => {
                                      try {
                                        const response = await apiRequest("GET", `/api/users/admin/${admin.id}`);
                                        const data = await response.json();
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
                                                    href={getPhoneLink(data.mobileNumber)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                                  >
                                                    <PhoneIcon className="w-4 h-4" />
                                                    Call
                                                  </a>
                                                  <a
                                                    href={getWhatsAppLink(data.mobileNumber)}
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
                                    }}
                                    className={`username inline-flex items-center px-2 py-1 rounded-full ${
                                      admin.adminType === 'super_admin' && admin.adminStatus === 'approved'
                                        ? `bg-violet-100 ${getTextColorClass(product.listingType)} hover:bg-violet-200`
                                        : admin.adminType === 'local_admin' && admin.adminStatus === 'approved'
                                        ? `bg-purple-100 ${getTextColorClass(product.listingType)} hover:bg-purple-200`
                                        : 'bg-primary/10 hover:bg-primary/20'
                                    } transition-colorscursor-pointer`}
                                  >
                                    {admin.username}
                                  </button>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">No local admins assigned</span>
                              )}
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
                        </div>
                      </CardContent>
                    </Card>
                  ))
                }
              </div>
            ) : (
              selectedCategory && (
                <p className="text-center text-muted-foreground">
                  {isLocationSearchActive
                    ? `No ${selectedItem ? selectedItem.name : selectedCategory.label} ${form.watch('listingType') === 'buyer' ? 'requests' : 'listings'} found within the selected area`
                    : `No ${selectedItem ? selectedItem.name : selectedCategory.label} ${form.watch('listingType') === 'buyer' ? 'requests' : 'listings'} found`}
                </p>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductSearch;