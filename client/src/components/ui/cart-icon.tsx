import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { Link } from "wouter";
import { Button } from "./button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export function CartIcon() {
  const { items, totalItems, totalPrice } = useCart();

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Link href="/cart">
          <Button variant="ghost" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Button>
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Shopping Cart</h4>
          {items.length > 0 ? (
            <>
              <div className="text-sm text-muted-foreground">
                {items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 py-1">
                    <span className="text-lg">{item.image}</span>
                    <span>{item.name}</span>
                    <span className="ml-auto">×{item.quantity}</span>
                  </div>
                ))}
                {items.length > 3 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    And {items.length - 3} more items...
                  </p>
                )}
              </div>
              <div className="border-t pt-2">
                <p className="text-sm font-medium">
                  Total: ₹{totalPrice.toFixed(2)}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Your cart is empty</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
