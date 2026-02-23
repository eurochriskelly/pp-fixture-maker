import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTournament } from '@/context/TournamentContext';
import { Location, Pitch } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, MapPin, Printer } from 'lucide-react';
import { MapContainer, Marker, Polygon, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const createLocationIcon = (label: string) => {
  return L.divIcon({
    className: 'location-report-marker',
    html: `<div style="
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid #0f766e;
      background: #14b8a6;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
    ">${label.slice(0, 1).toUpperCase()}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

const createPitchIcon = (label: string) => {
  return L.divIcon({
    className: 'pitch-report-marker',
    html: `<div style="
      width: 22px;
      height: 22px;
      border-radius: 4px;
      border: 2px solid #1d4ed8;
      background: #3b82f6;
      color: #ffffff;
      font-size: 9px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
    ">${label.slice(0, 1).toUpperCase()}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

const hasValidCoordinates = (
  location: Location
): location is Location & { coordinates: { lat: number; lng: number } } => {
  return location.coordinates?.lat != null && location.coordinates?.lng != null;
};

function FitBounds({
  points,
  singleLocationZoom,
}: {
  points: Array<[number, number]>;
  singleLocationZoom?: number;
}) {
  const map = useMap();

  React.useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], singleLocationZoom ?? 13);
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [points, map, singleLocationZoom]);

  return null;
}

const LocationReportMap = ({
  locations,
  pitches,
  locationById,
  height = 340,
  singleLocationZoom,
  showBoundaries = true,
}: {
  locations: Array<Location & { coordinates: { lat: number; lng: number } }>;
  pitches?: Pitch[];
  locationById?: Map<string, Location>;
  height?: number;
  singleLocationZoom?: number;
  showBoundaries?: boolean;
}) => {
  const defaultCenter: [number, number] = [52.05, 4.28];
  const safeLocationById = React.useMemo(
    () => locationById || new Map<string, Location>(),
    [locationById]
  );

  const pitchBoundaries = React.useMemo(() => {
    if (!showBoundaries) return [];
    return (pitches || []).filter(
      (pitch) => Array.isArray(pitch.boundary) && pitch.boundary.length >= 3
    );
  }, [pitches, showBoundaries]);

  const pitchMarkers = React.useMemo(() => {
    return (pitches || [])
      .filter((pitch) => !Array.isArray(pitch.boundary) || pitch.boundary.length < 3)
      .map((pitch) => {
        if (pitch.coordinates?.lat != null && pitch.coordinates?.lng != null) {
          return { pitch, position: [pitch.coordinates.lat, pitch.coordinates.lng] as [number, number] };
        }

        if (pitch.locationId) {
          const parentLocation = safeLocationById.get(pitch.locationId);
          if (parentLocation?.coordinates) {
            return {
              pitch,
              position: [parentLocation.coordinates.lat, parentLocation.coordinates.lng] as [number, number],
            };
          }
        }

        return null;
      })
      .filter((item): item is { pitch: Pitch; position: [number, number] } => item !== null);
  }, [pitches, safeLocationById]);

  const boundsPoints = React.useMemo(() => {
    const locationPoints = locations.map(
      (location) => [location.coordinates.lat, location.coordinates.lng] as [number, number]
    );
    const markerPoints = pitchMarkers.map((item) => item.position);
    const boundaryPoints = pitchBoundaries.flatMap((pitch) =>
      (pitch.boundary || []).map((point) => [point.lat, point.lng] as [number, number])
    );
    return [...locationPoints, ...markerPoints, ...boundaryPoints];
  }, [locations, pitchMarkers, pitchBoundaries]);

  if (boundsPoints.length === 0) {
    return (
      <div className="min-h-[180px] rounded-md border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
        No location coordinates available.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden" style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds points={boundsPoints} singleLocationZoom={singleLocationZoom} />
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={[location.coordinates.lat, location.coordinates.lng]}
            icon={createLocationIcon(location.name)}
          />
        ))}
        {pitchMarkers.map(({ pitch, position }) => (
          <Marker key={`pitch-marker-${pitch.id}`} position={position} icon={createPitchIcon(pitch.name)} />
        ))}
        {pitchBoundaries.map((pitch) => (
          <Polygon
            key={`pitch-boundary-${pitch.id}`}
            positions={(pitch.boundary || []).map((point) => [point.lat, point.lng])}
            pathOptions={{ color: '#1d4ed8', weight: 2, fillColor: '#60a5fa', fillOpacity: 0.2 }}
          />
        ))}
      </MapContainer>
    </div>
  );
};

interface LocationsReportProps {
  embedded?: boolean;
}

const LocationsReport: React.FC<LocationsReportProps> = ({ embedded = false }) => {
  const { currentTournament, locations, pitches } = useTournament();
  const location = useLocation();

  const locationById = React.useMemo(() => {
    return new Map(locations.map((location) => [location.id, location]));
  }, [locations]);

  const locationsWithCoordinates = React.useMemo(
    () => locations.filter(hasValidCoordinates),
    [locations]
  );

  const orphanPitches = React.useMemo(
    () => pitches.filter((pitch) => !pitch.locationId || !locationById.has(pitch.locationId)),
    [pitches, locationById]
  );

  const isPrintMode =
    location.pathname === '/reports/print' || new URLSearchParams(location.search).get('print') === '1';

  return (
    <div className={embedded ? 'space-y-6' : 'container mx-auto p-4 space-y-6'}>
      {!embedded && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Locations Report
                </CardTitle>
                <CardDescription>
                  Shareable location and pitch information for {currentTournament?.name || 'the active tournament'}.
                </CardDescription>
              </div>
              {!isPrintMode && (
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link to="/reports/locations?print=1">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Share View
                    </Link>
                  </Button>
                  <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print / Save PDF
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Locations Map</CardTitle>
          <CardDescription>Combined map for locations and linked pitches.</CardDescription>
        </CardHeader>
        <CardContent>
          <LocationReportMap
            locations={locationsWithCoordinates}
            pitches={pitches}
            locationById={locationById}
            height={360}
            showBoundaries={false}
          />
        </CardContent>
      </Card>

      {orphanPitches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unassigned Pitches</CardTitle>
            <CardDescription>These pitches are not linked to a location.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {orphanPitches.map((pitch) => (
              <div key={pitch.id} className="rounded border px-3 py-2 text-sm">
                {pitch.name}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {locations.map((location) => {
          const linkedPitches = pitches.filter((pitch) => pitch.locationId === location.id);
          const locationForMiniMap = hasValidCoordinates(location) ? [location] : [];

          return (
            <Card key={location.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">{location.name}</CardTitle>
                  <Badge variant="secondary">{linkedPitches.length} pitches</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Location map</div>
                  <LocationReportMap
                    locations={locationForMiniMap}
                    pitches={linkedPitches}
                    locationById={locationById}
                    height={220}
                    singleLocationZoom={15}
                  />
                </div>

                {location.address && <div className="text-sm">{location.address}</div>}

                {hasValidCoordinates(location) ? (
                  <div className="text-xs text-muted-foreground">
                    GPS: {location.coordinates.lat.toFixed(6)}, {location.coordinates.lng.toFixed(6)}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No GPS coordinates set.</div>
                )}

                {location.website && (
                  <a
                    href={location.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 underline"
                  >
                    {location.website}
                  </a>
                )}

                {location.transportNotes && (
                  <div className="text-sm text-muted-foreground">{location.transportNotes}</div>
                )}

                {location.dressingRoomNotes && (
                  <div className="text-sm text-muted-foreground">{location.dressingRoomNotes}</div>
                )}

                {location.notes && <div className="text-sm text-muted-foreground">{location.notes}</div>}

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Pitch details</div>
                  {linkedPitches.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No pitches linked.</div>
                  ) : (
                    linkedPitches.map((pitch) => (
                      <div key={pitch.id} className="rounded border p-2">
                        <div className="text-sm font-medium">{pitch.name}</div>
                        {pitch.startTime && pitch.endTime && (
                          <div className="text-xs text-muted-foreground">
                            Default window: {pitch.startTime} - {pitch.endTime}
                          </div>
                        )}
                        {!!pitch.reservations?.length && (
                          <div className="mt-2 space-y-1">
                            {pitch.reservations
                              .slice()
                              .sort((a, b) => {
                                if (a.date !== b.date) return a.date.localeCompare(b.date);
                                return a.startTime.localeCompare(b.startTime);
                              })
                              .map((reservation) => (
                                <div key={reservation.id} className="text-xs text-muted-foreground">
                                  {reservation.date}: {reservation.startTime} - {reservation.endTime}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default LocationsReport;
