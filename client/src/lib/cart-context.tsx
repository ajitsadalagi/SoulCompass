import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Product } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  sellerId: number;
  quality: string;
  category: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  image?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  addToCart: (product: Product) => void;
}

const CartContext = createContext<CartContextType | null>(null);

// Helper function to validate cart item structure
const isValidCartItem = (item: any): item is CartItem => {
  return (
    typeof item === 'object' &&
    typeof item.id === 'number' &&
    typeof item.name === 'string' &&
    typeof item.quantity === 'number' &&
    typeof item.sellerId === 'number'
  );
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  // Function to get cart key for current user
  const getCartKey = (userId: number) => `cart_${userId}`;

  // Reset and load cart when user changes
  useEffect(() => {
    // Always clear the cart state when user changes
    setItems([]);

    // Only attempt to load cart data if we have a logged-in user
    if (user?.id) {
      const cartKey = getCartKey(user.id);
      try {
        const savedCart = localStorage.getItem(cartKey);
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart) && parsedCart.every(isValidCartItem)) {
            setItems(parsedCart);
          } else {
            console.error('Invalid cart data structure, resetting cart');
            localStorage.removeItem(cartKey);
          }
        }
      } catch (error) {
        console.error('Error loading cart:', error);
        toast({
          title: "Error",
          description: "Failed to load your cart data",
          variant: "destructive",
        });
      }
    }
  }, [user?.id, toast]);

  // Save cart whenever items change
  useEffect(() => {
    if (user?.id) {
      const cartKey = getCartKey(user.id);
      try {
        if (items.length === 0) {
          localStorage.removeItem(cartKey);
        } else {
          localStorage.setItem(cartKey, JSON.stringify(items));
        }
      } catch (error) {
        console.error('Error saving cart:', error);
        toast({
          title: "Error",
          description: "Failed to save cart data",
          variant: "destructive",
        });
      }
    }
  }, [items, user?.id, toast]);

  const addItem = (newItem: CartItem) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add items to your cart",
        variant: "destructive",
      });
      return;
    }

    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === newItem.id);
      if (existingItem) {
        toast({
          title: "Already in Cart",
          description: "This item is already in your cart",
        });
        return currentItems;
      }

      toast({
        title: "Added to Cart",
        description: `${newItem.name} has been added to your cart`,
      });

      return [...currentItems, { ...newItem, quantity: 1 }];
    });
  };

  const removeItem = (id: number) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to manage your cart",
        variant: "destructive",
      });
      return;
    }

    setItems(currentItems => {
      const newItems = currentItems.filter(item => item.id !== id);
      toast({
        title: "Removed from Cart",
        description: "Item has been removed from your cart",
      });
      return newItems;
    });
  };

  const updateQuantity = (id: number, newQuantity: number) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to update your cart",
        variant: "destructive",
      });
      return;
    }

    if (newQuantity < 1) {
      toast({
        title: "Invalid Quantity",
        description: "Quantity must be at least 1",
        variant: "destructive",
      });
      return;
    }

    setItems(currentItems =>
      currentItems.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const clearCart = () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to manage your cart",
        variant: "destructive",
      });
      return;
    }

    setItems([]);
    const cartKey = getCartKey(user.id);
    localStorage.removeItem(cartKey);
    toast({
      title: "Cart Cleared",
      description: "All items have been removed from your cart",
    });
  };

  const addToCart = (product: Product) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add items to your cart",
        variant: "destructive",
      });
      return;
    }

    const cartItem: CartItem = {
      id: product.id,
      name: product.name || '',
      price: typeof product.targetPrice === 'string' ? parseFloat(product.targetPrice) : (product.targetPrice || 0),
      quantity: 1,
      sellerId: product.sellerId,
      quality: product.quality || '',
      category: product.category || '',
      city: product.city || '',
      state: product.state || '',
      latitude: product.latitude,
      longitude: product.longitude,
      image: product.image,
    };

    addItem(cartItem);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    addToCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}