import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleCheckout = () => {
    toast({
      title: "Checkout",
      description: "This is a demo. In a real app, this would redirect to payment.",
    });
  };

  if (items.length === 0) {
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
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          <Button variant="destructive" onClick={clearCart}>
            Clear Cart
          </Button>
        </div>

        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{item.image}</div>
                <div className="flex-1">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Quality: {item.quality} • Category: {item.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                    className="w-16 text-center"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="w-24 text-right">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-lg font-medium">Total: ₹{totalPrice.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">
              Total Items: {items.length}
            </p>
          </div>
          <Button onClick={handleCheckout}>Proceed to Checkout</Button>
        </div>
      </div>
    </div>
  );
}
