import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Map } from "@/components/ui/map";
import { Badge } from "@/components/ui/badge";
import { FiSearch, FiMapPin, FiUser, FiTarget } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import debounce from "lodash/debounce";

interface Admin {
  id: number;
  username: string;
  name: string | null;
  location: string | null;
  mobileNumber: string | null;
  adminType: string;
  adminStatus: string;
  latitude: number | null;
  longitude: number | null;
}

export function AdminSearchSection() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Query for nearby admins
  const { data: nearbyAdmins, isLoading: isLoadingNearby } = useQuery({
    queryKey: ["/api/admins/nearby", selectedLocation?.lat, selectedLocation?.lng] as const,
    enabled: !!selectedLocation && !!user,
    queryFn: async () => {
      if (!selectedLocation) return [];
      try {
        const params = new URLSearchParams({
          lat: selectedLocation.lat.toString(),
          lng: selectedLocation.lng.toString(),
          radius: "50" // 50km radius
        });
        const response = await fetch(`/api/admins/nearby?${params}`, {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('Failed to fetch nearby admins');
        }
        return response.json() as Promise<Admin[]>;
      } catch (error) {
        console.error("Error fetching nearby admins:", error);
        setError("Failed to fetch nearby admins. Please try again.");
        return [];
      }
    }
  });

  // Query for admin search by name
  const { data: searchResults, isLoading: isLoadingSearch } = useQuery({
    queryKey: ["/api/admins/search", searchQuery] as const,
    enabled: searchQuery.length > 2 && !!user,
    queryFn: async () => {
      try {
        const params = new URLSearchParams({ query: searchQuery });
        const response = await fetch(`/api/admins/search?${params}`, {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('Failed to search admins');
        }
        return response.json() as Promise<Admin[]>;
      } catch (error) {
        console.error("Error searching admins:", error);
        setError("Failed to search admins. Please try again.");
        return [];
      }
    }
  });

  // Debounced search handler with memoization
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      setSearchQuery(value);
      setError(null);
    }, 500),
    []
  );

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setError(null);
  }, []);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleLocationSelect(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setError("Failed to get your current location. Please try selecting manually.");
      }
    );
  }, [handleLocationSelect]);

  const handleContactAdmin = useCallback((admin: Admin) => {
    toast({
      title: "Contact Information",
      description: (
        <div className="mt-2 space-y-2">
          <p><strong>Name:</strong> {admin.name || admin.username}</p>
          {admin.mobileNumber && <p><strong>Mobile:</strong> {admin.mobileNumber}</p>}
          {admin.location && <p><strong>Location:</strong> {admin.location}</p>}
        </div>
      ),
      duration: 5000,
    });
  }, [toast]);

  if (!user) {
    return (
      <div className="text-center py-8">
        <p>Please log in to search for admins.</p>
      </div>
    );
  }

  const renderAdminList = useCallback((admins: Admin[] | undefined, isLoading: boolean) => {
    if (isLoading) {
      return <div className="text-center py-4">Loading...</div>;
    }

    if (!admins?.length) {
      return <div className="text-center py-4 text-muted-foreground">No admins found</div>;
    }

    return (
      <div className="space-y-4">
        {admins.map((admin) => (
          <div
            key={admin.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{admin.name || admin.username}</span>
                <Badge>
                  {admin.adminType === "super_admin" ? "Super Admin" : "Local Admin"}
                </Badge>
              </div>
              {admin.location && (
                <p className="text-sm text-muted-foreground mt-1">
                  <FiMapPin className="inline-block mr-1" />
                  {admin.location}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => handleContactAdmin(admin)}>
              Contact
            </Button>
          </div>
        ))}
      </div>
    );
  }, [handleContactAdmin]);

  const validMarkers = useMemo(() => {
    if (!nearbyAdmins) return [];
    return nearbyAdmins
      .filter(admin => admin.latitude != null && admin.longitude != null)
      .map(admin => ({
        position: {
          lat: admin.latitude!,
          lng: admin.longitude!
        },
        title: admin.name || admin.username
      }));
  }, [nearbyAdmins]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiSearch className="h-5 w-5" />
            Search by Name
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Search admins by name..."
              onChange={(e) => debouncedSearch(e.target.value)}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {renderAdminList(searchResults, isLoadingSearch)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiMapPin className="h-5 w-5" />
            Search by Area
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={getCurrentLocation}
            >
              <FiTarget className="h-4 w-4" />
              Use Current Location
            </Button>
            <div className="h-[300px] rounded-lg overflow-hidden border">
              <Map
                defaultCenter={{ lat: 20.5937, lng: 78.9629 }}
                onMapClick={handleLocationSelect}
                markers={validMarkers}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {selectedLocation && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FiUser className="h-4 w-4" />
                  Nearby Admins
                </h4>
                {renderAdminList(nearbyAdmins, isLoadingNearby)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}