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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart data when user logs in or changes
  useEffect(() => {
    if (!user?.id) {
      setItems([]); // Clear cart when no user or user logs out
      return;
    }

    // Load cart data for the specific user
    const cartKey = `cart_${user.id}`;
    try {
      const savedCart = localStorage.getItem(cartKey);
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        setItems(Array.isArray(parsedCart) ? parsedCart : []);
      } else {
        setItems([]); // Initialize empty cart for new users
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      setItems([]);
    }
  }, [user?.id]); // Only re-run if user ID changes

  // Save cart data whenever it changes
  useEffect(() => {
    if (!user?.id) {
      return; // Don't save cart data if no user is logged in
    }

    const cartKey = `cart_${user.id}`;
    try {
      if (items.length === 0) {
        localStorage.removeItem(cartKey); // Remove empty carts
      } else {
        localStorage.setItem(cartKey, JSON.stringify(items));
      }
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [items, user?.id]);

  const addItem = (newItem: CartItem) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to add items to cart",
        variant: "destructive",
      });
      return;
    }

    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === newItem.id);

      if (existingItem) {
        toast({
          title: "Already in cart",
          description: "This item is already in your cart. You can adjust the quantity in the cart.",
        });
        return currentItems;
      }

      toast({
        title: "Added to cart",
        description: `${newItem.name} has been added to your cart`,
      });

      return [...currentItems, newItem];
    });
  };

  const removeItem = (id: number) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to manage your cart",
        variant: "destructive",
      });
      return;
    }

    setItems(currentItems => {
      const newItems = currentItems.filter(item => item.id !== id);
      toast({
        title: "Removed from cart",
        description: "Item has been removed from your cart",
      });
      return newItems;
    });
  };

  const updateQuantity = (id: number, newQuantity: number) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to update your cart",
        variant: "destructive",
      });
      return;
    }

    if (newQuantity < 1) {
      toast({
        title: "Invalid quantity",
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
        title: "Error",
        description: "Please log in to manage your cart",
        variant: "destructive",
      });
      return;
    }

    setItems([]);
    localStorage.removeItem(`cart_${user.id}`);
    toast({
      title: "Cart cleared",
      description: "All items have been removed from your cart",
    });
  };

  const addToCart = (product: Product) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to add items to cart",
        variant: "destructive",
      });
      return;
    }

    if (!product || typeof product !== 'object') {
      console.error('Invalid product data:', product);
      return;
    }

    const price = typeof product.targetPrice === 'string' 
      ? parseFloat(product.targetPrice) 
      : (product.targetPrice || 0);

    if (isNaN(price)) {
      console.error('Invalid price:', product.targetPrice);
      return;
    }

    const cartItem: CartItem = {
      id: product.id,
      name: product.name || '',
      price: price,
      quantity: 1,
      sellerId: product.sellerId,
      quality: product.quality || '',
      category: product.category || '',
      city: product.city || '',
      state: product.state || '',
      latitude: product.latitude,
      longitude: product.longitude,
    };

    addItem(cartItem);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const itemPrice = typeof item.price === 'number' ? item.price : 0;
    return sum + (itemPrice * item.quantity);
  }, 0);

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