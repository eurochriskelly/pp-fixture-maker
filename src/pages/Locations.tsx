import React from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Location } from '@/lib/types';
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
import { AlertTriangle, MapPin, Plus, Save, Trash2 } from 'lucide-react';

const SAMPLE_LOCATIONS: Omit<Location, 'id'>[] = [
  {
    name: 'WRC Te Werve',
    address: 'Beresteinlaan 52, 2542 KC The Hague',
    website: 'http://wrctewerve.nl/',
    transportNotes: 'Tram 9 - Bus 25, Beresteinlaan stop, direction Vrederust.',
    dressingRoomNotes: 'Dressing rooms under clubhouse. Host club.',
    notes: '',
  },
  {
    name: 'VCS',
    address: 'Dedemsvaartweg 405, 2545 DG The Hague',
    website: 'https://www.vcs-dh.nl/',
    transportNotes:
      'Tram 9 direction Vrederust and Tram 16 direction Wateringen. Leggelostraat stop, then 10 min walk to Dedemsvaartweg.',
    dressingRoomNotes: 'Dressing Room 6 only.',
    notes: '',
  },
  {
    name: 'SVH',
    address: 'Noordweg 74, 2548 AC The Hague (Wateringseveld)',
    website: 'http://www.svh-voetbal.nl',
    transportNotes:
      'Tram 16, Hoge Veld stop, direction Wateringen. About 7 min walk after crossing near VCS.',
    dressingRoomNotes: 'Only 2 dressing rooms.',
    notes: '',
  },
];

type LocationDraft = Omit<Location, 'id'>;

const emptyDraft = (): LocationDraft => ({
  name: '',
  address: '',
  website: '',
  transportNotes: '',
  dressingRoomNotes: '',
  notes: '',
});

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
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingDraft, setEditingDraft] = React.useState<LocationDraft>(emptyDraft());

  const locationById = React.useMemo(() => {
    return new Map(locations.map((location) => [location.id, location]));
  }, [locations]);

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
    addLocation({
      ...newLocation,
      name: newLocation.name.trim(),
      address: newLocation.address.trim(),
      website: newLocation.website.trim(),
      transportNotes: newLocation.transportNotes.trim(),
      dressingRoomNotes: newLocation.dressingRoomNotes.trim(),
      notes: newLocation.notes.trim(),
    });
    setNewLocation(emptyDraft());
  };

  const handleSaveLocation = (id: string) => {
    if (!editingDraft.name.trim()) return;
    updateLocation(id, {
      ...editingDraft,
      name: editingDraft.name.trim(),
      address: editingDraft.address.trim(),
      website: editingDraft.website.trim(),
      transportNotes: editingDraft.transportNotes.trim(),
      dressingRoomNotes: editingDraft.dressingRoomNotes.trim(),
      notes: editingDraft.notes.trim(),
    });
    setEditingId(null);
    setEditingDraft(emptyDraft());
  };

  const startEditing = (location: Location) => {
    setEditingId(location.id);
    setEditingDraft({
      name: location.name || '',
      address: location.address || '',
      website: location.website || '',
      transportNotes: location.transportNotes || '',
      dressingRoomNotes: location.dressingRoomNotes || '',
      notes: location.notes || '',
    });
  };

  const loadSamples = () => {
    SAMPLE_LOCATIONS.forEach((sample) => addLocation(sample));
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Locations
          </CardTitle>
          <CardDescription>
            Manage venues and link each pitch to exactly one location.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
          <div className="flex gap-2">
            <Button onClick={handleAddLocation} disabled={!newLocation.name.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
            {locations.length === 0 && (
              <Button variant="outline" onClick={loadSamples}>
                Load Hague Examples
              </Button>
            )}
          </div>
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
              <div key={pitch.id} className="grid gap-2 rounded border p-3 md:grid-cols-[1fr_220px_auto] md:items-center">
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
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {locations.map((location) => {
          const linkedPitches = pitches.filter((pitch) => pitch.locationId === location.id);
          const isEditing = editingId === location.id;

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
                      <Button onClick={() => handleSaveLocation(location.id)} disabled={!editingDraft.name.trim()}>
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
    </div>
  );
};

export default Locations;
