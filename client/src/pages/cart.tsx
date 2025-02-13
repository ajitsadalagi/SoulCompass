import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, MapPin, Phone, MessageCircle, Share2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { getCategoryEmoji, getProductEmoji } from "../../../shared/helpers";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

// Helper functions with proper error handling
function getGoogleMapsDirectionsUrl(lat: number | null, lng: number | null) {
  try {
    // Only use lat/lng for directions, ignore city/state
    if (lat && lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    return '#';
  } catch (error) {
    console.error('Error generating maps URL:', error);
    return '#';
  }
}

function formatPhoneNumber(phone: string): string {
  try {
    if (!phone) return '';
    const cleaned = phone.replace(/[^\d+]/g, '');
    return cleaned.startsWith('+') ? cleaned : `+91${cleaned}`;
  } catch (error) {
    console.error('Error formatting phone number:', error);
    return '';
  }
}

function getWhatsAppLink(phone: string): string {
  try {
    if (!phone) return '#';
    const formattedPhone = formatPhoneNumber(phone);
    const cleanedPhone = formattedPhone.replace(/[^\d]/g, '');
    return `https://wa.me/${cleanedPhone}`;
  } catch (error) {
    console.error('Error generating WhatsApp link:', error);
    return '#';
  }
}

function getPhoneLink(phone: string): string {
  try {
    if (!phone) return '#';
    const formattedPhone = formatPhoneNumber(phone);
    return `tel:${formattedPhone}`;
  } catch (error) {
    console.error('Error generating phone link:', error);
    return '#';
  }
}

function formatPrice(price: number | string): string {
  try {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numericPrice) ? '0.00' : numericPrice.toFixed(2);
  } catch (error) {
    console.error('Error formatting price:', error);
    return '0.00';
  }
}

interface CartItemProps {
  items: {
    id: number;
    name: string;
    price: number | string;
    quantity: number;
    sellerId: number;
    quality?: string;
    category?: string;
    city?: string;
    state?: string;
    latitude: number | null;
    longitude: number | null;
    image?: string;
  }[];
  isSharedCart?: boolean;
  onUpdateQuantity?: (id: number, quantity: number) => void;
  onRemoveItem?: (id: number) => void;
  onContactSeller?: (id: number) => void;
}

const CartItems: React.FC<CartItemProps> = ({
  items,
  isSharedCart = false,
  onUpdateQuantity,
  onRemoveItem,
  onContactSeller,
}) => {
  if (!items || items.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-center text-muted-foreground">No items in cart</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <Card key={item.id} className="p-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl">
              {getCategoryEmoji(item.category || '')} → {getProductEmoji(item.name, item.category || '')}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{item.name}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mt-2">
                <p>Quality: {item.quality || 'N/A'}</p>
                <p>Category: {item.category || 'N/A'}</p>
                <p>Price per unit: ₹{formatPrice(item.price)}</p>
                <p>Subtotal: ₹{formatPrice(Number(item.price) * item.quantity)}</p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onContactSeller?.(item.id)}
                  className="flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Contact Seller
                </Button>
                {(item.latitude || item.longitude) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = getGoogleMapsDirectionsUrl(item.latitude, item.longitude);
                      if (url !== '#') {
                        window.open(url, '_blank');
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Get Directions
                  </Button>
                )}
              </div>
            </div>
            {!isSharedCart && onUpdateQuantity && onRemoveItem && (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                    className="w-16 text-center"
                    min="1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="w-24 text-right">
                  ₹{formatPrice(Number(item.price) * item.quantity)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default function CartPage() {
  const { items, sharedCarts, pendingShares, removeItem, updateQuantity, clearCart, totalPrice, shareCart, respondToShare, deleteSharedCart } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [shareUsername, setShareUsername] = useState("");

  // Redirect to auth page if not logged in
  if (!user) {
    return (
      <div className="container mx-auto p-8">
        <Card className="p-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Please Log In</h1>
          <p className="text-muted-foreground mb-4">
            You need to be logged in to view your cart.
          </p>
          <Button onClick={() => setLocation("/auth")}>Log In</Button>
        </Card>
      </div>
    );
  }

  const handleCheckout = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to proceed with checkout.",
        variant: "destructive",
      });
      setLocation("/auth");
      return;
    }
    toast({
      title: "Checkout",
      description: "This is a demo. In a real app, this would redirect to payment.",
    });
  };

  const handleShareCart = () => {
    if (!shareUsername.trim()) {
      toast({
        title: "Invalid Username",
        description: "Please enter a valid username",
        variant: "destructive",
      });
      return;
    }
    shareCart(shareUsername.trim());
    setShareUsername("");
  };

  const handleContactSeller = async (productId: number) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to contact sellers.",
        variant: "destructive",
      });
      setLocation("/auth");
      return;
    }

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
                  <Phone className="w-4 h-4" />
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
      console.error('Error fetching seller details:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch seller details",
        variant: "destructive",
      });
    }
  };

  // Show empty state if no items
  if (!items || (items.length === 0 && sharedCarts.length === 0)) {
    return (
      <div className="container mx-auto p-8">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-4">
            Add some products to your cart to see them here.
          </p>
          <Button onClick={() => setLocation("/")}>Continue Shopping</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <Tabs defaultValue="my-cart" className="space-y-8">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="my-cart">My Cart</TabsTrigger>
            {sharedCarts.map((cart, index) => (
              <TabsTrigger key={cart.owner.id} value={`shared-${index}`}>
                {cart.owner.username}'s Cart
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share Cart
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Your Cart</DialogTitle>
                  <DialogDescription>
                    Enter the username of the person you want to share your cart with.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Username"
                    value={shareUsername}
                    onChange={(e) => setShareUsername(e.target.value)}
                  />
                  <Button onClick={handleShareCart}>Share</Button>
                </div>
              </DialogContent>
            </Dialog>
            {pendingShares.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    Pending Shares
                    <Badge variant="secondary" className="ml-2">
                      {pendingShares.length}
                    </Badge>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Pending Share Requests</DialogTitle>
                    <DialogDescription>
                      Accept or reject cart share requests.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {pendingShares.map((share) => (
                      <Card key={share.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <p>{share.owner.username} wants to share their cart with you</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => respondToShare(share.id, 'accept')}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => respondToShare(share.id, 'reject')}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <TabsContent value="my-cart" className="space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Shopping Cart</h1>
            <Button variant="destructive" onClick={clearCart}>
              Clear Cart
            </Button>
          </div>
          <CartItems
            items={items}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onContactSeller={handleContactSeller}
          />
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-medium">Total: ₹{formatPrice(totalPrice)}</p>
              <p className="text-sm text-muted-foreground">
                Total Items: {items.length}
              </p>
            </div>
            <Button onClick={handleCheckout}>Proceed to Checkout</Button>
          </div>
        </TabsContent>

        {sharedCarts.map((cart, index) => (
          <TabsContent key={cart.owner.id} value={`shared-${index}`} className="space-y-8">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">{cart.owner.username}'s Cart</h1>
              <Button
                variant="destructive"
                onClick={() => {
                  console.log('Deleting cart with ID:', cart.id); // Add logging
                  deleteSharedCart(cart.id);
                }}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remove Shared Cart
              </Button>
            </div>
            <CartItems
              items={cart.items}
              isSharedCart
              onContactSeller={handleContactSeller}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}