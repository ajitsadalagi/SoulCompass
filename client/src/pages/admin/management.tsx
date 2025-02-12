import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FiShield, FiUserCheck, FiSearch } from "react-icons/fi";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function AdminManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSuperAdmins, setSelectedSuperAdmins] = useState<number[]>([]);
  const [showSuperAdminDialog, setShowSuperAdminDialog] = useState(false);

  // Redirect if not an approved admin or local admin
  if (!user ||
    (user.adminType !== "master_admin" &&
      (user.adminType !== "super_admin" || user.adminStatus !== "approved") &&
      user.adminType !== "local_admin")) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to access this page
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Query for available super admins
  const { data: superAdmins, isLoading: isLoadingSuperAdmins } = useQuery<User[]>({
    queryKey: ["/api/admin/super-admins"],
    enabled: !!user && (user.adminType === "local_admin" || user.adminType === "master_admin"),
  });

  // Query for all admin users (for master/super admins)
  const { data: adminUsers, isLoading: isLoadingAdmins } = useQuery<User[]>({
    queryKey: ["/api/users/admins"],
    enabled: !!user && (user.adminType === "master_admin" ||
      (user.adminType === "super_admin" && user.adminStatus === "approved")),
  });

  // Query for pending admin requests
  const { data: adminRequests, isLoading: isLoadingRequests } = useQuery<User[]>({
    queryKey: ["/api/admin/requests"],
    enabled: !!user && (user.adminType === "master_admin" ||
      (user.adminType === "super_admin" && user.adminStatus === "approved")),
  });

  const approveAdminMutation = useMutation({
    mutationFn: async ({
      userId,
      action,
      reason,
    }: {
      userId: number;
      action: "approve" | "reject";
      reason?: string;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/requests/${userId}/${action}`,
        { reason }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || `Failed to ${action} admin request`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/admins"] });
      toast({
        title: "Success",
        description: "Admin request processed successfully",
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

  // Filter admin requests based on admin type
  const filteredRequests = adminRequests?.filter(request => {
    if (user.adminType === "master_admin") {
      return request.adminType === "super_admin" && request.adminStatus === "pending";
    }
    return request.adminType === "local_admin" &&
      request.adminStatus === "pending" &&
      request.requestedAdminId === user.id;
  });

  // Filter admin users based on search query and admin type
  const filteredAdmins = adminUsers?.filter(admin => {
    const searchLower = searchQuery.toLowerCase();
    const displayName = admin.firstName && admin.lastName
      ? `${admin.firstName} ${admin.lastName}`
      : admin.username;
    const nameLower = displayName.toLowerCase();
    const locationLower = (admin.location || "").toLowerCase();
    const matchesSearch = nameLower.includes(searchLower) || locationLower.includes(searchLower);

    if (user.adminType === "master_admin") {
      return admin.adminType === "super_admin" &&
        admin.adminStatus === "approved" &&
        matchesSearch;
    }
    return admin.adminType === "local_admin" &&
      admin.adminStatus === "approved" &&
      matchesSearch;
  });

  const getAdminTypeBadge = (type: string, status: string) => {
    if (status !== "approved") return null;

    switch (type) {
      case "master_admin":
        return <Badge className="bg-red-500">Master Admin</Badge>;
      case "super_admin":
        return <Badge className="bg-yellow-500">Super Admin</Badge>;
      case "local_admin":
        return <Badge className="bg-green-500">Local Admin</Badge>;
      default:
        return null;
    }
  };

  if (isLoadingAdmins || isLoadingRequests || isLoadingSuperAdmins) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Management</h1>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          Logged in as: {getAdminTypeBadge(user.adminType, user.adminStatus)}
        </div>
      </div>

      {(user.adminType === "master_admin" || user.adminType === "super_admin") && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiUserCheck className="h-5 w-5" />
                Admin Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRequests && filteredRequests.length > 0 ? (
                <div className="space-y-4">
                  {filteredRequests.map((request) => (
                    <div key={request.id} className="flex flex-col p-4 border rounded-lg bg-card">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-lg">
                              {request.firstName && request.lastName
                                ? `${request.firstName} ${request.lastName}`
                                : request.username}
                            </h3>
                            {getAdminTypeBadge(request.adminType, "pending")}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Contact:</span> {request.mobileNumber}
                            </p>
                            {request.location && (
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Location:</span> {request.location}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Requested on:</span>{" "}
                              {new Date(request.adminRequestDate!).toLocaleDateString()}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <span className="text-sm font-medium">Current Roles:</span>
                              {request.roles.map((role, index) => (
                                <Badge key={index} variant="outline" className="capitalize">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() =>
                              approveAdminMutation.mutate({
                                userId: request.id,
                                action: "approve"
                              })
                            }
                            disabled={approveAdminMutation.isPending}
                            className="bg-green-50 hover:bg-green-100 text-green-700"
                          >
                            {user.adminType === "master_admin" ? "Approve Super Admin" : "Approve Local Admin"}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() =>
                              approveAdminMutation.mutate({
                                userId: request.id,
                                action: "reject",
                                reason: `${request.adminType} request rejected by ${user.adminType}`
                              })
                            }
                            disabled={approveAdminMutation.isPending}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                      <Separator className="my-4" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  No pending {user.adminType === "master_admin" ? "super admin" : "local admin"} requests
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiShield className="h-5 w-5" />
                {user.adminType === "master_admin" ? "Super Administrators" : "Local Administrators"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search admins by name or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {filteredAdmins && filteredAdmins.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAdmins.map((admin) => (
                      <div
                        key={admin.id}
                        className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {admin.firstName && admin.lastName
                              ? `${admin.firstName} ${admin.lastName}`
                              : admin.username}
                          </h3>
                          {getAdminTypeBadge(admin.adminType, admin.adminStatus)}
                        </div>
                        {admin.location && (
                          <p className="text-sm text-muted-foreground mt-1">{admin.location}</p>
                        )}
                        <div className="mt-2 space-y-1">
                          <p className="text-sm">
                            <span className="font-medium">Status:</span> {admin.adminStatus}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Approved:</span>{" "}
                            {new Date(admin.adminApprovalDate!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">
                    No {user.adminType === "master_admin" ? "super" : "local"} administrators found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}