import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { Link } from "wouter";
import { Button } from "./button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useAuth } from "@/hooks/use-auth";

export function CartIcon() {
  const { items, totalItems, totalPrice, pendingShares, sharedCarts, respondToShare, deleteSharedCart } = useCart();
  const { user } = useAuth();

  // If user is not logged in, show a simple cart icon that links to auth page
  if (!user) {
    return (
      <Link href="/auth">
        <Button variant="ghost" className="relative">
          <ShoppingCart className="h-5 w-5" />
        </Button>
      </Link>
    );
  }

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
            {pendingShares.length > 0 && (
              <span className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {pendingShares.length}
              </span>
            )}
          </Button>
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-4">
          {/* Pending Share Requests */}
          {pendingShares.length > 0 && (
            <div className="border-b pb-2">
              <h4 className="text-sm font-semibold mb-2">Cart Share Requests</h4>
              <div className="space-y-2">
                {pendingShares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{share.owner.username} wants to share their cart</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => respondToShare(share.id, 'accept')}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => respondToShare(share.id, 'reject')}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shared Carts */}
          {sharedCarts?.length > 0 && (
            <div className="border-b pb-2">
              <h4 className="text-sm font-semibold mb-2">Shared Carts</h4>
              <div className="space-y-2">
                {sharedCarts.map((sharedCart) => (
                  <div key={sharedCart.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{sharedCart.owner.username}'s cart</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteSharedCart(sharedCart.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Cart Items */}
          {totalItems > 0 && (
            <>
              <h4 className="text-sm font-semibold">Your Cart ({totalItems} items)</h4>
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
                <div className="border-t pt-2">
                  <p className="text-sm font-medium">
                    Total: ₹{totalPrice.toFixed(2)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}