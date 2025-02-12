import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Map } from "@/components/ui/map";
import { Badge } from "@/components/ui/badge";
import { FiSearch, FiMapPin, FiUser } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter] = useState({ lat: 20.5937, lng: 78.9629 });
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Query for nearby admins
  const { data: nearbyAdmins, isLoading: isLoadingNearby } = useQuery<Admin[]>({
    queryKey: ["/api/admins/nearby", selectedLocation?.lat, selectedLocation?.lng],
    enabled: !!selectedLocation,
    queryFn: async () => {
      if (!selectedLocation) return [];
      const params = new URLSearchParams({
        lat: selectedLocation.lat.toString(),
        lng: selectedLocation.lng.toString(),
        radius: "50" // 50km radius
      });
      const response = await fetch(`/api/admins/nearby?${params}`);
      if (!response.ok) throw new Error('Failed to fetch nearby admins');
      return response.json();
    }
  });

  // Query for admin search by name
  const { data: searchResults, isLoading: isLoadingSearch } = useQuery<Admin[]>({
    queryKey: ["/api/admins/search", searchQuery],
    enabled: searchQuery.length > 2,
    queryFn: async () => {
      const params = new URLSearchParams({ query: searchQuery });
      const response = await fetch(`/api/admins/search?${params}`);
      if (!response.ok) throw new Error('Failed to search admins');
      return response.json();
    }
  });

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      setSearchQuery(value);
    }, 500),
    []
  );

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
  }, []);

  const handleContactAdmin = async (admin: Admin) => {
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
  };

  const renderAdminList = (admins: Admin[] | undefined, isLoading: boolean) => {
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
  };

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
            <div className="h-[300px] rounded-lg overflow-hidden border">
              <Map
                defaultCenter={mapCenter}
                defaultZoom={5}
                onMapClick={handleLocationSelect}
                markers={nearbyAdmins?.map((admin) => ({
                  position: {
                    lat: admin.latitude!,
                    lng: admin.longitude!
                  },
                  title: admin.name || admin.username
                })) ?? []}
              />
            </div>
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