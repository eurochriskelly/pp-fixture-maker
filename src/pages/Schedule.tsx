import React from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users, ArrowLeft, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Schedule = () => {
  const { 
    competitions, 
    pitches, 
    addPitch, 
    deletePitch, 
    updateFixture 
  } = useTournament();
  const navigate = useNavigate();

  const [newPitchName, setNewPitchName] = React.useState('');
  const [selectedPitch, setSelectedPitch] = React.useState<string>('');
  const [startTime, setStartTime] = React.useState('10:00');

  const handleAddPitch = () => {
    if (newPitchName.trim()) {
      addPitch(newPitchName);
      setNewPitchName('');
    }
  };

  const handleAssign = (competitionId: string, fixtureId: string, pitchId: string, time: string) => {
    if (!pitchId) return;
    updateFixture(competitionId, fixtureId, { 
      pitchId, 
      startTime: time 
    });
  };

  const handleUnassign = (competitionId: string, fixtureId: string) => {
    updateFixture(competitionId, fixtureId, { 
      pitchId: undefined, 
      startTime: undefined 
    });
  };

  // Get all fixtures from all competitions
  const allFixtures = competitions.flatMap(comp => 
    comp.fixtures.map(f => ({ ...f, competitionName: comp.name }))
  );

  const unassignedFixtures = allFixtures.filter(f => !f.pitchId);
  const assignedFixtures = allFixtures.filter(f => f.pitchId);

  // Group assigned fixtures by pitch
  const fixturesByPitch = pitches.map(pitch => ({
    pitch,
    fixtures: assignedFixtures
      .filter(f => f.pitchId === pitch.id)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  }));

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Global Schedule</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar: Manage Pitches & Unassigned Fixtures */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pitches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input 
                  placeholder="Pitch Name" 
                  value={newPitchName}
                  onChange={(e) => setNewPitchName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPitch()}
                />
                <Button size="icon" onClick={handleAddPitch}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {pitches.map(pitch => (
                  <div key={pitch.id} className="flex justify-between items-center p-2 bg-slate-100 rounded">
                    <span className="font-medium">{pitch.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => deletePitch(pitch.id)}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                {pitches.length === 0 && <p className="text-sm text-muted-foreground">No pitches added.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unassigned Fixtures ({unassignedFixtures.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {unassignedFixtures.map(fixture => {
                  const comp = competitions.find(c => c.id === fixture.competitionId);
                  const home = comp?.teams.find(t => t.id === fixture.homeTeamId);
                  const away = comp?.teams.find(t => t.id === fixture.awayTeamId);

                  return (
                    <div key={fixture.id} className="p-3 border rounded shadow-sm bg-white text-sm">
                      <div className="font-semibold text-xs text-primary mb-1">{fixture.competitionName}</div>
                      <div className="flex justify-between items-center mb-2">
                        <span>{home?.name || 'Bye'}</span>
                        <span className="text-muted-foreground text-xs">vs</span>
                        <span>{away?.name || 'Bye'}</span>
                      </div>
                      <div className="flex gap-2">
                         <Select onValueChange={(val) => handleAssign(fixture.competitionId, fixture.id, val, startTime)}>
                          <SelectTrigger className="h-8 text-xs w-full">
                            <SelectValue placeholder="Assign Pitch" />
                          </SelectTrigger>
                          <SelectContent>
                            {pitches.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input 
                          type="time" 
                          className="h-8 w-24 text-xs" 
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}
                 {unassignedFixtures.length === 0 && <p className="text-sm text-muted-foreground">All fixtures assigned!</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content: Schedule View */}
        <div className="lg:col-span-3">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {fixturesByPitch.map(({ pitch, fixtures }) => (
              <Card key={pitch.id} className="h-fit">
                <CardHeader className="bg-slate-50 border-b pb-3">
                  <CardTitle className="flex justify-between items-center text-lg">
                    {pitch.name}
                    <span className="text-xs font-normal text-muted-foreground">{fixtures.length} matches</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Time</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fixtures.map(fixture => {
                        const comp = competitions.find(c => c.id === fixture.competitionId);
                        const home = comp?.teams.find(t => t.id === fixture.homeTeamId);
                        const away = comp?.teams.find(t => t.id === fixture.awayTeamId);
                        return (
                          <TableRow key={fixture.id}>
                            <TableCell className="font-mono text-xs">{fixture.startTime}</TableCell>
                            <TableCell>
                              <div className="text-xs font-semibold text-primary">{comp?.name}</div>
                              <div className="text-sm">
                                {home?.name || 'Bye'} <span className="text-muted-foreground">vs</span> {away?.name || 'Bye'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => handleUnassign(fixture.competitionId, fixture.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {fixtures.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-sm">
                            No matches scheduled
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
             {pitches.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground border-dashed border-2 rounded-lg bg-slate-50">
                <p>No pitches available.</p>
                <p>Add pitches in the sidebar to start scheduling.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
