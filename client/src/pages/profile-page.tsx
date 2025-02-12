import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InsertUser, User, Product } from "@shared/schema";
import { queryClient } from "../lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FiHome, FiUsers, FiShield, FiSearch, FiLogOut } from "react-icons/fi";
import { LocationPicker } from "@/components/ui/location-picker";
import { useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { AdminRequestForm } from "@/components/ui/admin-request-form";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, X, PencilIcon, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { insertProductSchema } from "@shared/schema";

const roles = ["buyer", "seller"] as const;
type UserRole = (typeof roles)[number];

const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  location: z.string().optional(),
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits")
    .regex(/^[0-9]+$/, "Mobile number must contain only digits"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type UpdateProfileData = z.infer<typeof updateProfileSchema>;

function getGoogleMapsDirectionsUrl(lat: number | null, lng: number | null, city: string, state: string) {
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${city}, ${state}`)}`;
}

const AdminSearchSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude?: number;
    longitude?: number;
    address?: string;
  }>({});
  const [searchRadius, setSearchRadius] = useState(50);
  const mapRef = useRef<google.maps.Map>();

  const { data: nearbyAdmins, isLoading: isLoadingNearbyAdmins } = useQuery({
    queryKey: [
      "/api/admins/nearby",
      selectedLocation.latitude,
      selectedLocation.longitude,
      searchRadius
    ],
    queryFn: async () => {
      if (!selectedLocation.latitude || !selectedLocation.longitude) return [];

      const res = await fetch(
        `/api/admins/nearby?lat=${selectedLocation.latitude}&lng=${selectedLocation.longitude}&radius=${searchRadius}`
      );
      if (!res.ok) throw new Error("Failed to fetch nearby admins");
      return res.json();
    },
    enabled: !!selectedLocation.latitude && !!selectedLocation.longitude,
  });

  const { data: searchedAdmins, isLoading: isLoadingSearch } = useQuery({
    queryKey: ["/api/admins/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];

      const res = await fetch(`/api/admins/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Failed to search admins");
      return res.json();
    },
    enabled: !!searchQuery.trim(),
  });

  const tagAdminMutation = useMutation({
    mutationFn: async ({ adminId, action }: { adminId: number; action: 'tag' | 'untag' }) => {
      const res = await fetch("/api/user/tag-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, action }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update admin tag");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Admin preferences updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTagToggle = async (adminId: number, currentlyTagged: boolean) => {
    tagAdminMutation.mutate({
      adminId,
      action: currentlyTagged ? 'untag' : 'tag'
    });
  };

  const renderAdminCard = (admin: User) => {
    const isTagged = user?.taggedAdmins?.some(
      (taggedAdmin) => taggedAdmin.id === admin.id
    );

    return (
      <Card key={admin.id} className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{admin.username}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {admin.adminType === 'local_admin' ? 'Local Admin' : 'Super Admin'}
              </p>
            </div>
            <Button
              variant={isTagged ? "destructive" : "default"}
              onClick={() => handleTagToggle(admin.id, !!isTagged)}
              disabled={tagAdminMutation.isPending}
            >
              {isTagged ? "Untag Admin" : "Tag Admin"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {admin.location && (
            <p className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              {admin.location}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FiSearch className="h-5 w-5" />
          Find & Tag Admins
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="text-sm font-medium mb-2">Search by Name or Location</div>
            <div className="flex gap-2">
              <Input
                placeholder="Search admins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Search by Area</div>
            <div className="space-y-4">
              <LocationPicker
                defaultLocation={selectedLocation.latitude && selectedLocation.longitude ? {
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                  address: selectedLocation.address,
                } : undefined}
                onLocationSelect={(location) => {
                  setSelectedLocation({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    address: location.address,
                  });
                }}
                onMapLoad={(map) => {
                  mapRef.current = map;
                }}
              />
              {selectedLocation.latitude && selectedLocation.longitude && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Search Radius: {searchRadius}km</div>
                  <Slider
                    value={[searchRadius]}
                    onValueChange={(value) => setSearchRadius(value[0])}
                    max={500}
                    min={1}
                    step={1}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-medium">Search Results</div>
            {(isLoadingNearbyAdmins || isLoadingSearch) ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : searchQuery ? (
              searchedAdmins?.length ? (
                searchedAdmins.map(renderAdminCard)
              ) : (
                <p className="text-center text-muted-foreground">No admins found matching your search</p>
              )
            ) : nearbyAdmins?.length ? (
              nearbyAdmins.map(renderAdminCard)
            ) : (
              <p className="text-center text-muted-foreground">
                No admins found in the selected area
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude?: number;
    longitude?: number;
    address?: string;
  }>({
    latitude: user?.latitude || undefined,
    longitude: user?.longitude || undefined,
    address: user?.location || undefined,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [, setLocation] = useLocation();
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  const { data: adminUsers, isLoading: isLoadingAdmins } = useQuery<User[]>({
    queryKey: ["/api/admin/super-admins"],
    queryFn: async () => {
      const res = await fetch("/api/admin/super-admins");
      if (!res.ok) throw new Error("Failed to fetch super admin users");
      return res.json();
    },
    enabled: !!user && user.adminType === "local_admin" && user.adminStatus !== "approved",
  });

  const { data: adminRequests } = useQuery<User[]>({
    queryKey: ["/api/admin/requests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/requests");
      if (!res.ok) throw new Error("Failed to fetch admin requests");
      return res.json();
    },
    enabled: user?.adminType === "super_admin" || user?.adminType === "master_admin",
  });

  const { data: userProducts, isLoading: isLoadingProducts } = useQuery<(Product & { admins: User[] })[]>({
    queryKey: ["/api/products/seller", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch(`/api/products/seller/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch user products");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: allUsers, isLoading: isLoadingAllUsers } = useQuery<User[]>({
    queryKey: ["/api/users/admins"],
    queryFn: async () => {
      const res = await fetch("/api/users/admins", {
        credentials: 'include'
      });
      if (!res.ok) {
        console.error("Failed to fetch users:", await res.text());
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      return data;
    },
    enabled: !!user && user.username === "masteradmin123" && user.adminType === "master_admin",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to update profile" }));
        throw new Error(errorData.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRolesMutation = useMutation({
    mutationFn: async (roles: string[]) => {
      const res = await fetch("/api/user/roles", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roles }),
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to update roles" }));
        throw new Error(errorData.message || "Failed to update roles");
      }
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Roles updated",
        description: "Your account roles have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const requestAdminMutation = useMutation({
    mutationFn: async (adminRequest: { adminType: string; requestedAdminId?: number }) => {
      const res = await fetch("/api/admin/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(adminRequest),
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to submit admin request" }));
        throw new Error(errorData.message || "Failed to submit admin request");
      }
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Admin request submitted",
        description: "Your admin request has been submitted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/user?userId=${userId}`, {
        method: "DELETE",
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to delete user" }));
        throw new Error(errorData.message || "Failed to delete user");
      }
      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/admins"] });
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<UpdateProfileData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      location: user?.location || "",
      mobileNumber: user?.mobileNumber || "",
      latitude: user?.latitude || undefined,
      longitude: user?.longitude || undefined,
    },
  });

  const onSubmit = (data: UpdateProfileData) => {
    updateProfileMutation.mutate({
      ...data,
      location: selectedLocation.address || data.location,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
    });
  };

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to delete product" }));
        throw new Error(errorData.message || "Failed to delete product");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/products/seller", user?.id]);
      toast({
        title: "Product deleted",
        description: "Your product has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editProductForm = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      quantity: 0,
      quality: "",
      targetPrice: 0,
      city: "",
      state: "",
      condition: "new",
      category: "other",
      availabilityDate: new Date().toISOString(),
      image: "📦",
      localAdminIds: [],
      latitude: undefined,
      longitude: undefined,
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Product> }) => {
      console.log("Updating product with data:", data);
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to update product" }));
        throw new Error(errorData.message || "Failed to update product");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/products/seller", user?.id]);
      setEditingProductId(null);
      editProductForm.reset();
      toast({
        title: "Product updated",
        description: "Your product has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Product update error:", error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (product: Product) => {
    setEditingProductId(product.id);
    editProductForm.reset({
      name: product.name,
      quantity: product.quantity,
      quality: product.quality,
      targetPrice: Number(product.targetPrice),
      city: product.city,
      state: product.state,
      condition: product.condition as "new" | "used" | "perishable",
      category: product.category as "fruits" | "vegetables" | "dairy" | "other",
      availabilityDate: new Date(product.availabilityDate).toISOString(),
      image: product.image || "📦",
      localAdminIds: product.admins?.map(admin => admin.id) || [],
      latitude: product.latitude || undefined,
      longitude: product.longitude || undefined,
    });
  };

  const handleUpdateSubmit = async (data: z.infer<typeof insertProductSchema>) => {
    if (!editingProductId) return;

    updateProductMutation.mutate({
      id: editingProductId,
      data: {
        ...data,
        targetPrice: Number(data.targetPrice),
        availabilityDate: new Date(data.availabilityDate),
      }
    });
  };

  const renderEditDialog = () => {
    const editingProduct = userProducts?.find(p => p.id === editingProductId);
    if (!editingProduct) return null;

    return (
      <Dialog open={!!editingProductId} onOpenChange={(open) => {
        if (!open) {
          setEditingProductId(null);
          editProductForm.reset();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <Form {...editProductForm}>
            <form onSubmit={editProductForm.handleSubmit(handleUpdateSubmit)} className="space-y-4">
              <FormField
                control={editProductForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editProductForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editProductForm.control}
                name="quality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quality</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editProductForm.control}
                name="targetPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Price</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-4">
                <FormField
                  control={editProductForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editProductForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => setEditingProductId(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProductMutation.isPending}>
                  {updateProductMutation.isPending ? "Updating..." : "Update Product"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  };

  const handleDeleteProduct = (id: number) => {
    deleteProductMutation.mutate(id);
  };

  const renderProductCard = (product: Product & { admins: User[] }) => (
    <Card key={product.id} className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{getProductEmoji(product.name, product.category)}</span>
            <span>{product.name}</span>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEditClick(product)}
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this product? This action cannot be undone.
                </AlertDialogDescription>
                <div className="flex justify-end gap-4 mt-4">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteProduct(product.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Quantity</p>
            <p>{product.quantity}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Quality</p>
            <p>{product.quality}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Target Price</p>
            <p>₹{product.targetPrice}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Location</p>
            <button
              onClick={() => window.open(getGoogleMapsDirectionsUrl(product.latitude, product.longitude, product.city, product.state), '_blank')}
              className="flex items-center gap-2 text-primary hover:underline cursor-pointer"
            >
              <MapPin className="w-4 h-4" />
              <span>{product.city}, {product.state}</span>
            </button>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Category</p>
            <p className="capitalize">{product.category}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Condition</p>
            <p className="capitalize">{product.condition}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <Button
          variant="outline"
          onClick={() => logoutMutation.mutate()}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <FiLogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FiUsers className="h-5 w-5" />
              Your Roles
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <Button
                key={role}
                variant={user.roles.includes(role) ? "default" : "outline"}
                onClick={() => {
                  const newRoles = user.roles.includes(role)
                    ? user.roles.filter((r) => r !== role)
                    : [...user.roles, role];

                  if (newRoles.length > 0) {
                    updateRolesMutation.mutate(newRoles);
                  }
                }}
                disabled={updateRolesMutation.isPending}
                className="capitalize"
              >
                {role}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <AdminSearchSection />
      <AdminRequestForm />

      {(user.adminType === "none" || user.adminStatus === "pending") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiShield className="h-5 w-5" />
              Admin Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.adminStatus === "pending" ? (
              <div>
                <p className="text-muted-foreground">
                  Your admin request is currently pending approval.
                  It was submitted on {format(new Date(user.adminRequestDate!), 'PPp')}.
                </p>
              </div>
            ) : (
              <div className="spacey-4">
                <div className="text-muted-foreground">Request administrative privileges:</div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => requestAdminMutation.mutate({ adminType: "local_admin" })}
                    disabled={requestAdminMutation.isPending}
                  >
                    Request Local Admin
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => requestAdminMutation.mutate({ adminType: "super_admin" })}
                    disabled={requestAdminMutation.isPending}
                  >
                    Request Super Admin
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FiHome className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="gap-2"
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <PencilIcon className="h-4 w-4" />
                  Edit
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              id="profile-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your first name"
                          {...field}
                          disabled={!isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your last name"
                          {...field}
                          disabled={!isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your mobile number"
                        {...field}
                        type="tel"
                        pattern="[0-9]*"
                        disabled={!isEditing}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter your mobile number without spaces or special characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormDescription>
                  Use the map to select                  your location or allow automatic location detection
                </FormDescription>
                <LocationPicker
                  defaultLocation={
                    user.latitude && user.longitude
                      ? {
                        latitude: user.latitude,
                        longitude: user.longitude,
                        address: user.location || undefined,
                      }
                      : undefined
                  }
                  onLocationSelect={(location) => {
                    setSelectedLocation(location);
                    form.setValue("location", location.address || "");
                    form.setValue("latitude", location.latitude);
                    form.setValue("longitude", location.longitude);
                  }}
                  disabled={!isEditing}
                />
              </FormItem>

              {isEditing && (
                <div className="flex justify-end">
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {user?.username === "masteradmin123" && user?.adminType === "master_admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiUsers className="h-5 w-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allUsers?.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <div className="font-medium">{u.username}</div>
                    <div className="text-sm text-muted-foreground">
                      {u.firstName} {u.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Roles: {u.roles.join(", ")}
                    </div>
                  </div>
                  {u.username !== "masteradmin123" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {u.username}? This action cannot be undone.
                        </AlertDialogDescription>
                        <div className="flex justify-end gap-4 mt-4">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUserMutation.mutate(u.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}