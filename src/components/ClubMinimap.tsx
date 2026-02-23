import React, { useMemo, useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import type { Club } from "@/lib/types";
import { getImage, isIndexedDBUrl } from "@/lib/imageStore";
import "leaflet/dist/leaflet.css";

interface ClubMinimapProps {
  clubs: Club[];
}

// Component to auto-fit map bounds to markers
function MapBounds({ clubs }: { clubs: Club[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (clubs.length === 0) return;
    
    const validClubs = clubs.filter(
      (club) => club.coordinates?.lat != null && club.coordinates?.lng != null
    );
    
    if (validClubs.length === 0) return;
    
    if (validClubs.length === 1) {
      const { lat, lng } = validClubs[0].coordinates!;
      map.setView([lat, lng], 10);
    } else {
      const bounds = L.latLngBounds(
        validClubs.map((club) => [club.coordinates!.lat, club.coordinates!.lng])
      );
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [clubs, map]);
  
  return null;
}

// Create a custom icon with the club crest
function createClubIcon(club: Club, crestUrl: string | null): L.DivIcon {
  const size = 32;
  const hasCrest = crestUrl && crestUrl.trim() !== "";
  
  // Use club colors for the border if available
  const borderColor = club.primaryColor || "#3b82f6";
  
  return L.divIcon({
    className: "custom-club-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid ${borderColor};
        background-color: white;
        background-image: ${hasCrest ? `url('${crestUrl}')` : "none"};
        background-size: cover;
        background-position: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: #333;
      ">
        ${!hasCrest ? club.abbreviation.slice(0, 2).toUpperCase() : ""}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function ClubMinimap({ clubs }: ClubMinimapProps) {
  const validClubs = useMemo(
    () =>
      clubs.filter(
        (club) => club.coordinates?.lat != null && club.coordinates?.lng != null
      ),
    [clubs]
  );

  // State to hold resolved crest URLs (object URLs for IndexedDB images)
  const [crestUrls, setCrestUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch crest images for all clubs that have idb:// URLs
  const fetchCrestImages = useCallback(async () => {
    const clubsWithIndexedDBCrests = validClubs.filter(
      club => club.crest && isIndexedDBUrl(club.crest)
    );
    
    if (clubsWithIndexedDBCrests.length === 0) {
      // No IndexedDB crests, use original URLs
      const urls: Record<string, string> = {};
      validClubs.forEach(club => {
        if (club.crest) {
          urls[club.id] = club.crest;
        }
      });
      setCrestUrls(urls);
      return;
    }

    setIsLoading(true);
    const urls: Record<string, string> = {};

    try {
      // Fetch all IndexedDB images in parallel
      const fetchPromises = clubsWithIndexedDBCrests.map(async (club) => {
        const url = await getImage(club.crest!);
        if (url) {
          urls[club.id] = url;
        }
      });

      await Promise.all(fetchPromises);

      // Add non-IndexedDB crests directly
      validClubs.forEach(club => {
        if (club.crest && !isIndexedDBUrl(club.crest)) {
          urls[club.id] = club.crest;
        }
      });

      setCrestUrls(urls);
    } catch (error) {
      console.error("Failed to fetch club crests:", error);
    } finally {
      setIsLoading(false);
    }
  }, [validClubs]);

  useEffect(() => {
    fetchCrestImages();

    // Cleanup object URLs when component unmounts
    return () => {
      Object.values(crestUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCrestImages]);

  // Default center (roughly center of Europe)
  const defaultCenter: [number, number] = [50.0, 10.0];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Club Locations
        </h2>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {validClubs.length === 0 ? (
          <div className="min-h-[200px] h-full flex-1 flex items-center justify-center text-muted-foreground bg-muted/50 rounded-lg">
            <div className="text-center">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                No clubs with coordinates yet.
                <br />
                Add clubs with locations to see them on the map.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="min-h-[200px] h-full flex-1 flex items-center justify-center text-muted-foreground bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading club crests...</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden border min-h-[200px] h-full flex-1">
            <MapContainer
              center={defaultCenter}
              zoom={5}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={false}
              dragging={false}
              doubleClickZoom={false}
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <MapBounds clubs={validClubs} />
              {validClubs.map((club) => (
                <Marker
                  key={club.id}
                  position={[club.coordinates!.lat, club.coordinates!.lng]}
                  icon={createClubIcon(club, crestUrls[club.id] || null)}
                />
              ))}
            </MapContainer>
          </div>
        )}
        {validClubs.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Showing {validClubs.length} club{validClubs.length !== 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
