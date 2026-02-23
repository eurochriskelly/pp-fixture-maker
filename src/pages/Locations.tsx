import React from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Location, Pitch, PitchCoordinatePoint, PitchReservation } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, MapPin, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { v4 as uuidv4 } from 'uuid';
import 'leaflet/dist/leaflet.css';

const SAMPLE_LOCATIONS: Omit<Location, 'id'>[] = [
  {
    name: 'WRC Te Werve',
    address: 'Beresteinlaan 52, 2542 KC The Hague',
    coordinates: { lat: 52.0362, lng: 4.2915 },
    website: 'http://wrctewerve.nl/',
    transportNotes: 'Tram 9 - Bus 25, Beresteinlaan stop, direction Vrederust.',
    dressingRoomNotes: 'Dressing rooms under clubhouse. Host club.',
    notes: '',
  },
  {
    name: 'VCS',
    address: 'Dedemsvaartweg 405, 2545 DG The Hague',
    coordinates: { lat: 52.0437, lng: 4.2622 },
    website: 'https://www.vcs-dh.nl/',
    transportNotes:
      'Tram 9 direction Vrederust and Tram 16 direction Wateringen. Leggelostraat stop, then 10 min walk to Dedemsvaartweg.',
    dressingRoomNotes: 'Dressing Room 6 only.',
    notes: '',
  },
  {
    name: 'SVH',
    address: 'Noordweg 74, 2548 AC The Hague (Wateringseveld)',
    coordinates: { lat: 52.0406, lng: 4.2419 },
    website: 'http://www.svh-voetbal.nl',
    transportNotes:
      'Tram 16, Hoge Veld stop, direction Wateringen. About 7 min walk after crossing near VCS.',
    dressingRoomNotes: 'Only 2 dressing rooms.',
    notes: '',
  },
];

type LocationDraft = {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  website: string;
  transportNotes: string;
  dressingRoomNotes: string;
  notes: string;
};

type PitchReservationDraft = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
};

type PitchEditorDraft = {
  pitchId: string;
  name: string;
  latitude: string;
  longitude: string;
  reservations: PitchReservationDraft[];
  boundary: PitchCoordinatePoint[];
};

const emptyDraft = (): LocationDraft => ({
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  website: '',
  transportNotes: '',
  dressingRoomNotes: '',
  notes: '',
});

const todayIso = () => new Date().toISOString().slice(0, 10);

const createLocationIcon = (label: string) => {
  return L.divIcon({
    className: 'custom-location-marker',
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
    className: 'custom-pitch-marker',
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

const parseCoordinate = (value: string): number | null => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const draftToLocationPayload = (draft: LocationDraft): Omit<Location, 'id'> | null => {
  const lat = parseCoordinate(draft.latitude);
  const lng = parseCoordinate(draft.longitude);
  if (lat === null || lng === null) return null;

  return {
    name: draft.name.trim(),
    address: draft.address.trim(),
    coordinates: { lat, lng },
    website: draft.website.trim(),
    transportNotes: draft.transportNotes.trim(),
    dressingRoomNotes: draft.dressingRoomNotes.trim(),
    notes: draft.notes.trim(),
  };
};

const hasValidCoordinates = (location: Location): location is Location & { coordinates: { lat: number; lng: number } } => {
  return location.coordinates?.lat != null && location.coordinates?.lng != null;
};

const reservationsFromPitch = (pitch: Pitch): PitchReservationDraft[] => {
  return (pitch.reservations || []).map((reservation) => ({
    id: reservation.id,
    date: reservation.date,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
  }));
};

function FitLocationsBounds({
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

function BoundaryEditLayer({
  enabled,
  boundary,
  onAddPoint,
}: {
  enabled: boolean;
  boundary: PitchCoordinatePoint[];
  onAddPoint: (point: PitchCoordinatePoint) => void;
}) {
  useMapEvents({
    click(event) {
      if (!enabled) return;
      onAddPoint({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  if (boundary.length < 2) return null;

  return (
    <Polygon
      positions={boundary.map((point) => [point.lat, point.lng])}
      pathOptions={{ color: '#0f766e', weight: 2, fillColor: '#14b8a6', fillOpacity: 0.2 }}
    />
  );
}

const LocationMap = ({
  locations,
  pitches,
  locationById,
  height = 340,
  singleLocationZoom,
}: {
  locations: Array<Location & { coordinates: { lat: number; lng: number } }>;
  pitches?: Pitch[];
  locationById?: Map<string, Location>;
  height?: number;
  singleLocationZoom?: number;
}) => {
  const defaultCenter: [number, number] = [52.05, 4.28];
  const safeLocationById = locationById || new Map<string, Location>();

  const pitchBoundaries = React.useMemo(() => {
    return (pitches || []).filter(
      (pitch) => Array.isArray(pitch.boundary) && pitch.boundary.length >= 3
    );
  }, [pitches]);

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
        Add GPS coordinates to show locations on the map.
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
        <FitLocationsBounds points={boundsPoints} singleLocationZoom={singleLocationZoom} />
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

const Locations = () => {
  const {
    locations,
    pitches,
    competitions,
    addLocation,
    updateLocation,
    deleteLocation,
    updatePitch,
  } = useTournament();
  const [newLocation, setNewLocation] = React.useState<LocationDraft>(emptyDraft());
  const [isAddLocationOpen, setIsAddLocationOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingDraft, setEditingDraft] = React.useState<LocationDraft>(emptyDraft());
  const [pitchEditorDraft, setPitchEditorDraft] = React.useState<PitchEditorDraft | null>(null);

  const locationById = React.useMemo(() => {
    return new Map(locations.map((location) => [location.id, location]));
  }, [locations]);

  const locationsWithCoordinates = React.useMemo(
    () => locations.filter(hasValidCoordinates),
    [locations]
  );

  const fixturesByPitchId = React.useMemo(() => {
    const counts = new Map<string, number>();
    competitions.forEach((competition) => {
      competition.fixtures.forEach((fixture) => {
        if (!fixture.pitchId) return;
        counts.set(fixture.pitchId, (counts.get(fixture.pitchId) || 0) + 1);
      });
    });
    return counts;
  }, [competitions]);

  const homelessPitches = React.useMemo(
    () => pitches.filter((pitch) => !pitch.locationId || !locationById.has(pitch.locationId)),
    [pitches, locationById]
  );

  const handleAddLocation = () => {
    if (!newLocation.name.trim()) return;
    const payload = draftToLocationPayload(newLocation);
    if (!payload) return;

    addLocation(payload);
    setNewLocation(emptyDraft());
  };

  const handleSaveLocation = (id: string) => {
    if (!editingDraft.name.trim()) return;
    const payload = draftToLocationPayload(editingDraft);
    if (!payload) return;

    updateLocation(id, payload);
    setEditingId(null);
    setEditingDraft(emptyDraft());
  };

  const startEditing = (location: Location) => {
    setEditingId(location.id);
    setEditingDraft({
      name: location.name || '',
      address: location.address || '',
      latitude: location.coordinates?.lat?.toString() || '',
      longitude: location.coordinates?.lng?.toString() || '',
      website: location.website || '',
      transportNotes: location.transportNotes || '',
      dressingRoomNotes: location.dressingRoomNotes || '',
      notes: location.notes || '',
    });
  };

  const loadSamples = () => {
    SAMPLE_LOCATIONS.forEach((sample) => addLocation(sample));
  };

  const openPitchEditor = (pitch: Pitch) => {
    setPitchEditorDraft({
      pitchId: pitch.id,
      name: pitch.name,
      latitude: pitch.coordinates?.lat?.toString() || '',
      longitude: pitch.coordinates?.lng?.toString() || '',
      reservations: reservationsFromPitch(pitch),
      boundary: pitch.boundary || [],
    });
  };

  const addReservationDraft = () => {
    if (!pitchEditorDraft) return;
    setPitchEditorDraft({
      ...pitchEditorDraft,
      reservations: [
        ...pitchEditorDraft.reservations,
        {
          id: uuidv4(),
          date: todayIso(),
          startTime: '09:00',
          endTime: '18:00',
        },
      ],
    });
  };

  const updateReservationDraft = (
    reservationId: string,
    field: keyof Omit<PitchReservation, 'id'>,
    value: string
  ) => {
    if (!pitchEditorDraft) return;

    setPitchEditorDraft({
      ...pitchEditorDraft,
      reservations: pitchEditorDraft.reservations.map((reservation) =>
        reservation.id === reservationId ? { ...reservation, [field]: value } : reservation
      ),
    });
  };

  const removeReservationDraft = (reservationId: string) => {
    if (!pitchEditorDraft) return;
    setPitchEditorDraft({
      ...pitchEditorDraft,
      reservations: pitchEditorDraft.reservations.filter((reservation) => reservation.id !== reservationId),
    });
  };

  const addBoundaryPoint = (point: PitchCoordinatePoint) => {
    if (!pitchEditorDraft) return;
    setPitchEditorDraft({
      ...pitchEditorDraft,
      boundary: [...pitchEditorDraft.boundary, point],
    });
  };

  const clearBoundary = () => {
    if (!pitchEditorDraft) return;
    setPitchEditorDraft({ ...pitchEditorDraft, boundary: [] });
  };

  const removeLastBoundaryPoint = () => {
    if (!pitchEditorDraft) return;
    setPitchEditorDraft({
      ...pitchEditorDraft,
      boundary: pitchEditorDraft.boundary.slice(0, -1),
    });
  };

  const savePitchEditor = () => {
    if (!pitchEditorDraft) return;

    const pitch = pitches.find((candidate) => candidate.id === pitchEditorDraft.pitchId);
    if (!pitch) return;

    const parentLocation = pitch.locationId ? locationById.get(pitch.locationId) : undefined;
    const parentHasCoordinates = !!parentLocation?.coordinates;

    const parsedLat = parseCoordinate(pitchEditorDraft.latitude);
    const parsedLng = parseCoordinate(pitchEditorDraft.longitude);
    const nextCoordinates = parsedLat != null && parsedLng != null
      ? { lat: parsedLat, lng: parsedLng }
      : undefined;

    const nextReservations = [...pitchEditorDraft.reservations]
      .filter((reservation) => reservation.date && reservation.startTime && reservation.endTime)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });

    updatePitch(pitchEditorDraft.pitchId, {
      name: pitchEditorDraft.name.trim() || pitch.name,
      coordinates: nextCoordinates,
      reservations: nextReservations,
      startTime: nextReservations[0]?.startTime || pitch.startTime,
      endTime: nextReservations[0]?.endTime || pitch.endTime,
      boundary: parentHasCoordinates ? pitchEditorDraft.boundary : pitch.boundary,
    });

    setPitchEditorDraft(null);
  };

  const newLatValid = parseCoordinate(newLocation.latitude) !== null;
  const newLngValid = parseCoordinate(newLocation.longitude) !== null;

  const selectedPitch = pitchEditorDraft
    ? pitches.find((pitch) => pitch.id === pitchEditorDraft.pitchId) || null
    : null;
  const selectedParentLocation = selectedPitch?.locationId
    ? locationById.get(selectedPitch.locationId)
    : undefined;
  const parentLocationHasCoordinates = !!selectedParentLocation?.coordinates;

  const pitchCenter: [number, number] | null = pitchEditorDraft
    ? (() => {
        const pitchLat = parseCoordinate(pitchEditorDraft.latitude);
        const pitchLng = parseCoordinate(pitchEditorDraft.longitude);
        if (pitchLat != null && pitchLng != null) return [pitchLat, pitchLng];
        if (selectedParentLocation?.coordinates) {
          return [selectedParentLocation.coordinates.lat, selectedParentLocation.coordinates.lng];
        }
        return null;
      })()
    : null;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Locations
              </CardTitle>
              <CardDescription>
                Manage venues, store GPS coordinates, and link each pitch to one location.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {locations.length === 0 && (
                <Button variant="outline" onClick={loadSamples}>
                  Load Hague Examples
                </Button>
              )}
              <Button onClick={() => setIsAddLocationOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Dialog
        open={isAddLocationOpen}
        onOpenChange={(open) => {
          setIsAddLocationOpen(open);
          if (!open) {
            setNewLocation(emptyDraft());
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
            <DialogDescription>
              Add a new location with GPS coordinates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Location name"
                value={newLocation.name}
                onChange={(event) => setNewLocation((current) => ({ ...current, name: event.target.value }))}
              />
              <Input
                placeholder="Address"
                value={newLocation.address}
                onChange={(event) => setNewLocation((current) => ({ ...current, address: event.target.value }))}
              />
              <Input
                placeholder="Latitude (e.g. 52.0362)"
                value={newLocation.latitude}
                onChange={(event) => setNewLocation((current) => ({ ...current, latitude: event.target.value }))}
                className={newLocation.latitude && !newLatValid ? 'border-red-400' : undefined}
              />
              <Input
                placeholder="Longitude (e.g. 4.2915)"
                value={newLocation.longitude}
                onChange={(event) => setNewLocation((current) => ({ ...current, longitude: event.target.value }))}
                className={newLocation.longitude && !newLngValid ? 'border-red-400' : undefined}
              />
              <Input
                placeholder="Website"
                value={newLocation.website}
                onChange={(event) => setNewLocation((current) => ({ ...current, website: event.target.value }))}
              />
              <Input
                placeholder="Transport notes"
                value={newLocation.transportNotes}
                onChange={(event) => setNewLocation((current) => ({ ...current, transportNotes: event.target.value }))}
              />
            </div>
            <Textarea
              placeholder="Dressing room notes"
              value={newLocation.dressingRoomNotes}
              onChange={(event) =>
                setNewLocation((current) => ({ ...current, dressingRoomNotes: event.target.value }))
              }
              rows={2}
            />
            <Textarea
              placeholder="Additional notes"
              value={newLocation.notes}
              onChange={(event) => setNewLocation((current) => ({ ...current, notes: event.target.value }))}
              rows={2}
            />
            {(!newLatValid || !newLngValid) && (newLocation.latitude || newLocation.longitude) && (
              <div className="text-xs text-red-600">Enter valid latitude and longitude to save this location.</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddLocationOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleAddLocation();
                setIsAddLocationOpen(false);
              }}
              disabled={!newLocation.name.trim() || !newLatValid || !newLngValid}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Locations Map</CardTitle>
          <CardDescription>
            Combined view of all saved locations with valid coordinates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LocationMap locations={locationsWithCoordinates} height={360} />
        </CardContent>
      </Card>

      {homelessPitches.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              Homeless Pitches
            </CardTitle>
            <CardDescription>
              These pitches are used without a location. Link them to avoid reservation issues.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {homelessPitches.map((pitch) => (
              <div
                key={pitch.id}
                className="flex items-center justify-between rounded border border-amber-300/70 bg-white px-3 py-2"
              >
                <div>
                  <div className="font-medium text-amber-950">{pitch.name}</div>
                  <div className="text-xs text-amber-800">
                    {fixturesByPitchId.get(pitch.id) || 0} reservations on this pitch
                  </div>
                </div>
                <Badge variant="outline" className="border-amber-400 text-amber-900">
                  Missing location
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pitch to Location Map</CardTitle>
          <CardDescription>
            All pitch reservations should run on pitches linked to a location.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {pitches.length === 0 ? (
            <div className="text-sm text-muted-foreground">No pitches yet.</div>
          ) : (
            pitches.map((pitch) => (
              <div key={pitch.id} className="grid gap-2 rounded border p-3 md:grid-cols-[1fr_220px_auto_auto] md:items-center">
                <div>
                  <div className="font-medium">{pitch.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {fixturesByPitchId.get(pitch.id) || 0} reservations
                  </div>
                </div>
                <Select
                  value={pitch.locationId || 'unassigned'}
                  onValueChange={(value) => {
                    updatePitch(pitch.id, { locationId: value === 'unassigned' ? undefined : value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!pitch.locationId || !locationById.has(pitch.locationId) ? (
                  <Badge variant="destructive">Warning</Badge>
                ) : (
                  <Badge variant="secondary">Linked</Badge>
                )}
                <Button variant="outline" onClick={() => openPitchEditor(pitch)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Pitch
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {locations.map((location) => {
          const linkedPitches = pitches.filter((pitch) => pitch.locationId === location.id);
          const isEditing = editingId === location.id;
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
                {isEditing ? (
                  <>
                    <div className="grid gap-2 md:grid-cols-2">
                      <Input
                        value={editingDraft.name}
                        onChange={(event) =>
                          setEditingDraft((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Location name"
                      />
                      <Input
                        value={editingDraft.address}
                        onChange={(event) =>
                          setEditingDraft((current) => ({ ...current, address: event.target.value }))
                        }
                        placeholder="Address"
                      />
                      <Input
                        value={editingDraft.latitude}
                        onChange={(event) =>
                          setEditingDraft((current) => ({ ...current, latitude: event.target.value }))
                        }
                        placeholder="Latitude"
                      />
                      <Input
                        value={editingDraft.longitude}
                        onChange={(event) =>
                          setEditingDraft((current) => ({ ...current, longitude: event.target.value }))
                        }
                        placeholder="Longitude"
                      />
                      <Input
                        value={editingDraft.website}
                        onChange={(event) =>
                          setEditingDraft((current) => ({ ...current, website: event.target.value }))
                        }
                        placeholder="Website"
                      />
                      <Input
                        value={editingDraft.transportNotes}
                        onChange={(event) =>
                          setEditingDraft((current) => ({ ...current, transportNotes: event.target.value }))
                        }
                        placeholder="Transport notes"
                      />
                    </div>
                    <Textarea
                      value={editingDraft.dressingRoomNotes}
                      onChange={(event) =>
                        setEditingDraft((current) => ({ ...current, dressingRoomNotes: event.target.value }))
                      }
                      placeholder="Dressing room notes"
                      rows={2}
                    />
                    <Textarea
                      value={editingDraft.notes}
                      onChange={(event) =>
                        setEditingDraft((current) => ({ ...current, notes: event.target.value }))
                      }
                      placeholder="Additional notes"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSaveLocation(location.id)}
                        disabled={
                          !editingDraft.name.trim() ||
                          parseCoordinate(editingDraft.latitude) === null ||
                          parseCoordinate(editingDraft.longitude) === null
                        }
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setEditingDraft(emptyDraft());
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {location.address && <div className="text-sm">{location.address}</div>}
                    {hasValidCoordinates(location) ? (
                      <div className="text-xs text-muted-foreground">
                        GPS: {location.coordinates.lat.toFixed(6)}, {location.coordinates.lng.toFixed(6)}
                      </div>
                    ) : (
                      <div className="text-xs text-red-600">No GPS coordinates set.</div>
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
                      <div className="text-xs font-semibold text-muted-foreground">Zoom on this location</div>
                      <LocationMap
                        locations={locationForMiniMap}
                        pitches={linkedPitches}
                        locationById={locationById}
                        height={220}
                        singleLocationZoom={15}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => startEditing(location)}>
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (window.confirm(`Delete ${location.name}? Linked pitches will become unassigned.`)) {
                            deleteLocation(location.id);
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!pitchEditorDraft} onOpenChange={(open) => !open && setPitchEditorDraft(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Pitch</DialogTitle>
            <DialogDescription>
              Configure reservation days, open/close time per day, and pitch boundary.
            </DialogDescription>
          </DialogHeader>

          {!pitchEditorDraft ? null : (
            <div className="space-y-4">
              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  value={pitchEditorDraft.name}
                  onChange={(event) =>
                    setPitchEditorDraft((current) =>
                      current ? { ...current, name: event.target.value } : current
                    )
                  }
                  placeholder="Pitch name"
                />
                <Input
                  value={pitchEditorDraft.latitude}
                  onChange={(event) =>
                    setPitchEditorDraft((current) =>
                      current ? { ...current, latitude: event.target.value } : current
                    )
                  }
                  placeholder="Pitch latitude"
                />
                <Input
                  value={pitchEditorDraft.longitude}
                  onChange={(event) =>
                    setPitchEditorDraft((current) =>
                      current ? { ...current, longitude: event.target.value } : current
                    )
                  }
                  placeholder="Pitch longitude"
                />
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Reservations (by day)</div>
                  <Button size="sm" variant="outline" onClick={addReservationDraft}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Day
                  </Button>
                </div>

                {pitchEditorDraft.reservations.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No reservation days yet.</div>
                ) : (
                  <div className="space-y-2">
                    {pitchEditorDraft.reservations.map((reservation) => (
                      <div key={reservation.id} className="grid gap-2 md:grid-cols-[1fr_120px_120px_auto]">
                        <Input
                          type="date"
                          value={reservation.date}
                          onChange={(event) => updateReservationDraft(reservation.id, 'date', event.target.value)}
                        />
                        <Input
                          type="time"
                          value={reservation.startTime}
                          onChange={(event) =>
                            updateReservationDraft(reservation.id, 'startTime', event.target.value)
                          }
                        />
                        <Input
                          type="time"
                          value={reservation.endTime}
                          onChange={(event) =>
                            updateReservationDraft(reservation.id, 'endTime', event.target.value)
                          }
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => removeReservationDraft(reservation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Pitch Boundary</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={removeLastBoundaryPoint}
                      disabled={pitchEditorDraft.boundary.length === 0 || !parentLocationHasCoordinates}
                    >
                      Undo Last Point
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearBoundary}
                      disabled={pitchEditorDraft.boundary.length === 0 || !parentLocationHasCoordinates}
                    >
                      Clear Boundary
                    </Button>
                  </div>
                </div>

                {!parentLocationHasCoordinates ? (
                  <div className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                    Boundary editing is disabled. Add GPS coordinates to the parent location first.
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Click on the map to add boundary points. The map is zoomed to the pitch location.
                  </div>
                )}

                {pitchCenter ? (
                  <div className="h-72 overflow-hidden rounded-md border">
                    <MapContainer center={pitchCenter} zoom={18} style={{ height: '100%', width: '100%' }}>
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      <Marker
                        position={pitchCenter}
                        icon={createLocationIcon(pitchEditorDraft.name || 'Pitch')}
                      />
                      <BoundaryEditLayer
                        enabled={parentLocationHasCoordinates}
                        boundary={pitchEditorDraft.boundary}
                        onAddPoint={addBoundaryPoint}
                      />
                    </MapContainer>
                  </div>
                ) : (
                  <div className="rounded border bg-muted/30 p-2 text-xs text-muted-foreground">
                    Add pitch coordinates (or parent location coordinates) to open the boundary editor map.
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPitchEditorDraft(null)}>
              Cancel
            </Button>
            <Button onClick={savePitchEditor}>
              <Save className="mr-2 h-4 w-4" />
              Save Pitch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Locations;
