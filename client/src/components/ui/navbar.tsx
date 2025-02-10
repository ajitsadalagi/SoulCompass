import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { FiHome, FiSearch, FiPackage, FiShield, FiUser, FiLogOut } from "react-icons/fi";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const { user, logoutMutation } = useAuth();

  // Show admin panel for master_admin (regardless of status) and approved super_admin users
  const showAdminPanel = user && (
    user.adminType === "master_admin" || 
    (user.adminType === "super_admin" && user.adminStatus === "approved")
  );

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getAdminBadge = () => {
    if (!user) return null;

    let variant = "default";
    let content = "";

    switch (user.adminType) {
      case "master_admin":
        variant = "destructive";
        content = "Master Admin";
        break;
      case "super_admin":
        variant = user.adminStatus === "approved" ? "warning" : "secondary";
        content = `Super Admin${user.adminStatus === "pending" ? " (Pending)" : ""}`;
        break;
      case "local_admin":
        variant = user.adminStatus === "approved" ? "success" : "secondary";
        content = `Local Admin${user.adminStatus === "pending" ? " (Pending)" : ""}`;
        break;
      default:
        return null;
    }

    return (
      <Badge variant={variant as any} className="ml-2">
        {content}
      </Badge>
    );
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/">
            <span className="text-xl font-bold text-primary cursor-pointer">cSanthi</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <FiHome className="h-4 w-4" />
                Home
              </Button>
            </Link>
            {user?.roles?.includes("buyer") && (
              <Link href="/search">
                <Button variant="ghost" className="gap-2">
                  <FiSearch className="h-4 w-4" />
                  Search
                </Button>
              </Link>
            )}
            {user?.roles?.includes("seller") && (
              <Link href="/list-product">
                <Button variant="ghost" className="gap-2">
                  <FiPackage className="h-4 w-4" />
                  List Product
                </Button>
              </Link>
            )}
            {showAdminPanel && (
              <Link href="/admin/management">
                <Button variant="outline" className="gap-2">
                  <FiShield className="h-4 w-4" />
                  Admin Panel
                </Button>
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/profile">
                <Button variant="ghost" className="gap-2">
                  <FiUser className="h-4 w-4" />
                  {user.username}
                  {getAdminBadge()}
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="gap-2 text-destructive hover:text-destructive"
                disabled={logoutMutation.isPending}
              >
                <FiLogOut className="h-4 w-4" />
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <Button variant="default" className="gap-2">
                <FiUser className="h-4 w-4" />
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}