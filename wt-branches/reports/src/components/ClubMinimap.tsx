import React, { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import type { Club } from "@/lib/types";
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
function createClubIcon(club: Club): L.DivIcon {
  const size = 32;
  const hasCrest = club.crest && club.crest.trim() !== "";
  
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
        background-image: ${hasCrest ? `url('${club.crest}')` : "none"};
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
                  icon={createClubIcon(club)}
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
