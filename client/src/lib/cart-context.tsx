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

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const cartKey = user ? `cart_${user.id}` : null;

  const [items, setItems] = useState<CartItem[]>(() => {
    if (!cartKey) return [];

    try {
      const savedCart = localStorage.getItem(cartKey);
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      return [];
    }
  });

  useEffect(() => {
    if (!cartKey) return;

    try {
      localStorage.setItem(cartKey, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [items, cartKey]);

  const addItem = (newItem: CartItem) => {
    if (!cartKey) {
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
    if (!cartKey) return;

    setItems(currentItems => currentItems.filter(item => item.id !== id));
    toast({
      title: "Removed from cart",
      description: "Item has been removed from your cart.",
    });
  };

  const updateQuantity = (id: number, newQuantity: number) => {
    if (!cartKey || newQuantity < 1) return;

    setItems(currentItems =>
      currentItems.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const clearCart = () => {
    if (!cartKey) return;

    setItems([]);
    toast({
      title: "Cart cleared",
      description: "All items have been removed from your cart.",
    });
  };

  const addToCart = (product: Product) => {
    if (!cartKey) {
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

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
      addToCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}