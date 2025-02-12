import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Product } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch cart items from the database
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest('GET', '/api/cart');
      const data = await response.json();
      return data.map((item: any) => ({
        id: item.product.id,
        name: item.product.name,
        price: parseFloat(item.product.targetPrice),
        quantity: item.quantity,
        sellerId: item.product.sellerId,
        quality: item.product.quality,
        category: item.product.category,
        city: item.product.city,
        state: item.product.state,
        latitude: item.product.latitude,
        longitude: item.product.longitude,
        image: item.product.image,
      }));
    },
    enabled: !!user?.id,
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (item: CartItem) => {
      const response = await apiRequest('POST', '/api/cart', {
        productId: item.id,
        quantity: 1,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add item to cart",
        variant: "destructive",
      });
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (productId: number) => {
      await apiRequest('DELETE', `/api/cart/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove item from cart",
        variant: "destructive",
      });
    },
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number; quantity: number }) => {
      const response = await apiRequest('PATCH', `/api/cart/${productId}`, { quantity });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update quantity",
        variant: "destructive",
      });
    },
  });

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', '/api/cart');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
      toast({
        title: "Cart Cleared",
        description: "All items have been removed from your cart",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clear cart",
        variant: "destructive",
      });
    },
  });

  const addItem = (newItem: CartItem) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add items to your cart",
        variant: "destructive",
      });
      return;
    }

    const existingItem = items.find(item => item.id === newItem.id);
    if (existingItem) {
      toast({
        title: "Already in Cart",
        description: "This item is already in your cart",
      });
      return;
    }

    addItemMutation.mutate(newItem);
    toast({
      title: "Added to Cart",
      description: `${newItem.name} has been added to your cart`,
    });
  };

  const removeItem = (id: number) => {
    removeItemMutation.mutate(id);
  };

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity < 1) {
      toast({
        title: "Invalid Quantity",
        description: "Quantity must be at least 1",
        variant: "destructive",
      });
      return;
    }

    updateQuantityMutation.mutate({ productId: id, quantity: newQuantity });
  };

  const clearCart = () => {
    clearCartMutation.mutate();
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
    isLoading,
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