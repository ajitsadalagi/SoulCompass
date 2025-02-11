import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Trash2, UserCog } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

export default function UserManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch all users
  const { data: allUsers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/all"],
    queryFn: async () => {
      const res = await fetch("/api/users/all");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: !!user && user.username === "masteradmin123" && user.adminType === "master_admin",
  });

  // Delete user mutation
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/all"] });
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

  // Redirect if not masteradmin123
  if (!user || user.username !== "masteradmin123" || user.adminType !== "master_admin") {
    setLocation("/");
    return null;
  }

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              User Management Dashboard
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading users...</div>
          ) : !allUsers?.length ? (
            <div className="text-center text-muted-foreground py-4">No users found</div>
          ) : (
            <div className="space-y-4">
              {allUsers.map((userData) => (
                <div key={userData.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{userData.username}</span>
                      {userData.adminType !== 'none' && (
                        <Badge variant={userData.adminType === 'super_admin' ? 'default' : 'secondary'} className="capitalize">
                          {userData.adminType.replace('_', ' ')}
                        </Badge>
                      )}
                      {userData.adminStatus === 'approved' && (
                        <Badge variant="outline" className="bg-green-50">
                          Approved
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Name: {userData.firstName} {userData.lastName}</p>
                      <p>Mobile: {userData.mobileNumber}</p>
                      {userData.location && <p>Location: {userData.location}</p>}
                      <div className="flex gap-2">
                        {userData.roles.map((role, index) => (
                          <Badge key={index} variant="outline" className="capitalize">
                            {role}
                          </Badge>
                        ))}
                      </div>
                      {userData.adminRequestDate && (
                        <p>Admin Request Date: {format(new Date(userData.adminRequestDate), 'PPp')}</p>
                      )}
                      {userData.adminApprovalDate && (
                        <p>Admin Approval Date: {format(new Date(userData.adminApprovalDate), 'PPp')}</p>
                      )}
                    </div>
                  </div>
                  {userData.username !== "masteradmin123" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {userData.username}? This action cannot be undone.
                          {userData.adminType !== 'none' && (
                            <p className="mt-2 text-red-500">
                              Warning: This user has {userData.adminType.replace('_', ' ')} privileges.
                            </p>
                          )}
                        </AlertDialogDescription>
                        <div className="flex justify-end gap-4 mt-4">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUserMutation.mutate(userData.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete User
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
