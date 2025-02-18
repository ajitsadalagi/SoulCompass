import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function AdminRequestForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSuperAdmin, setSelectedSuperAdmin] = useState<number | undefined>(undefined);

  // Query for super admins (for local admin requests)
  const { data: superAdmins, isError: isSuperAdminsError } = useQuery<User[]>({
    queryKey: ["/api/admin/super-admins"],
    enabled: !!user && user.adminType === "local_admin" && user.adminStatus === "registered",
  });

  const adminRequestMutation = useMutation({
    mutationFn: async ({ adminType, requestedAdminId }: { adminType: string; requestedAdminId?: number }) => {
      const res = await apiRequest("POST", "/api/admin/request", {
        adminType,
        requestedAdminId,
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Admin request submitted successfully",
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

  const registerAdminMutation = useMutation({
    mutationFn: async (adminType: string) => {
      const res = await apiRequest("POST", "/api/admin/register", { adminType });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Admin registration successful",
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

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Please log in to access admin features</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show pending status with detailed information
  if (user.adminStatus === "pending") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending {user.adminType === "super_admin" ? "Super Admin" : "Local Admin"} Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                Pending {user.adminType === "super_admin" ? "Super Admin" : "Local Admin"} Approval
              </Badge>
              <span className="text-sm text-muted-foreground">
                Requested: {new Date(user.adminRequestDate!).toLocaleDateString()}
              </span>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Your Request Details:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Username</p>
                  <p className="text-sm text-muted-foreground">{user.username}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Contact Number</p>
                  <p className="text-sm text-muted-foreground">{user.mobileNumber}</p>
                </div>
                {user.location && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{user.location}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-sm font-medium">Current Roles</p>
                  <div className="flex gap-2 mt-1">
                    {user.roles.map((role, index) => (
                      <Badge key={index} variant="outline" className="capitalize">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {user.adminType === "super_admin" 
                ? "Your request is being reviewed by the Master Admin" 
                : "Your request is being reviewed by a Super Admin"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show registration options if user has no admin type or is none
  if (!user.adminType || user.adminType === "none") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Register as Administrator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose an administrator role to register for:
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => registerAdminMutation.mutate("local_admin")}
                disabled={registerAdminMutation.isPending}
                variant="outline"
              >
                Register as Local Admin
              </Button>
              <Button
                onClick={() => registerAdminMutation.mutate("super_admin")}
                disabled={registerAdminMutation.isPending}
                variant="outline"
              >
                Register as Super Admin
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show approval request options for registered admins
  if (user.adminStatus === "registered") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Request Admin Approval</CardTitle>
        </CardHeader>
        <CardContent>
          {user.adminType === "local_admin" ? (
            <div className="space-y-4">
              {isSuperAdminsError ? (
                <p className="text-sm text-destructive">Error loading super admins. Please try again later.</p>
              ) : !superAdmins || superAdmins.length === 0 ? (
                <p className="text-sm text-muted-foreground">No super admins available for approval at this time.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Super Admin for Approval</label>
                    <Select
                      value={selectedSuperAdmin?.toString()}
                      onValueChange={(value) => setSelectedSuperAdmin(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a super admin" />
                      </SelectTrigger>
                      <SelectContent>
                        {superAdmins.map((admin) => (
                          <SelectItem key={admin.id} value={admin.id.toString()}>
                            <div className="flex flex-col">
                              <span>
                                {admin.firstName && admin.lastName 
                                  ? `${admin.firstName} ${admin.lastName}` 
                                  : admin.username}
                              </span>
                              {admin.location && (
                                <span className="text-xs text-muted-foreground">{admin.location}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => adminRequestMutation.mutate({
                      adminType: "local_admin",
                      requestedAdminId: selectedSuperAdmin,
                    })}
                    disabled={!selectedSuperAdmin || adminRequestMutation.isPending}
                    className="w-full"
                  >
                    Request Local Admin Approval
                  </Button>
                </>
              )}
            </div>
          ) : (
            // For super admin requests
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                As a Super Admin candidate, your request will be reviewed by the Master Administrator.
              </p>
              <div className="space-y-2">
                <p className="text-sm">Master Admin Review Process:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Your request will be sent directly to the Master Administrator</li>
                  <li>Review typically takes 1-2 business days</li>
                  <li>You'll be notified once your request is processed</li>
                </ul>
              </div>
              <Button
                onClick={() => adminRequestMutation.mutate({
                  adminType: "super_admin",
                  requestedAdminId: 15 // masteradmin123's ID
                })}
                disabled={adminRequestMutation.isPending}
                className="w-full"
              >
                Send Super Admin Approval Request
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show approved status
  if (user.adminStatus === "approved") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            {user.adminStatus === "approved" && user.adminType === "super_admin" && (
              <Badge variant="default" className="bg-yellow-500">
                Super Administrator
              </Badge>
            )}
            {user.adminStatus === "approved" && user.adminType === "local_admin" && (
              <Badge variant="default" className="bg-green-500">
                Local Administrator
              </Badge>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              Approved on: {new Date(user.adminApprovalDate!).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show rejected status
  if (user.adminStatus === "rejected") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Badge variant="destructive">
              Rejected {user.adminType === "super_admin" ? "Super Admin" : "Local Admin"}
            </Badge>
            {user.adminRejectionReason && (
              <p className="text-sm text-muted-foreground">
                Reason: {user.adminRejectionReason}
              </p>
            )}
            <div className="pt-4">
              <Button
                onClick={() => registerAdminMutation.mutate(user.adminType)}
                disabled={registerAdminMutation.isPending}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}