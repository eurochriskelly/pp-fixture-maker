import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournament } from '@/context/TournamentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, RefreshCw, ArrowLeft, Trophy } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { GroupList } from '@/components/GroupList';
import { CompetitionBadge } from '@/components/CompetitionBadge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Edit2 } from 'lucide-react';

const Competition = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    competitions,
    addTeam,
    updateTeam,
    deleteTeam,
    generateFixtures,
    addManualFixture,
    deleteCompetition,
    deleteFixture,
    autoAssignGroups,
    updateCompetition
  } = useTournament();

  const competition = competitions.find(c => c.id === id);

  if (!competition) {
    return <div>Competition not found</div>;
  }

  const [newTeamName, setNewTeamName] = React.useState('');
  const [numGroups, setNumGroups] = React.useState(2);

  // Manual Fixture State
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [manualStage, setManualStage] = React.useState('Final');
  const [manualHome, setManualHome] = React.useState('');
  const [manualAway, setManualAway] = React.useState('');
  const [customHome, setCustomHome] = React.useState('');
  const [customAway, setCustomAway] = React.useState('');

  const handleAddTeam = () => {
    addTeam(competition.id, newTeamName || undefined);
    setNewTeamName('');
  };

  const handleGenerate = () => {
    if (confirm('This will generate new fixtures and append them to the existing list. Continue?')) {
      generateFixtures(competition.id);
    }
  };

  const handleAddManualFixture = () => {
    const homeId = manualHome === 'custom' ? customHome : manualHome;
    const awayId = manualAway === 'custom' ? customAway : manualAway;

    if (homeId && awayId && manualStage) {
      addManualFixture(competition.id, {
        homeTeamId: homeId,
        awayTeamId: awayId,
        stage: manualStage,
        duration: 30
      });
      setIsDialogOpen(false);
      // Reset
      setManualStage('Final');
      setManualHome('');
      setManualAway('');
      setCustomHome('');
      setCustomAway('');
    }
  };

  const getTeamName = (id: string) => {
    const team = competition.teams.find(t => t.id === id);
    return team ? team.name : id;
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative group rounded-full">
                <CompetitionBadge
                  code={competition.code || competition.name.substring(0, 2).toUpperCase()}
                  index={competitions.indexOf(competition)}
                  size="lg"
                  className="w-16 h-16 text-xl shadow-md"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit2 className="w-5 h-5 text-white" />
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Edit Code</h4>
                <p className="text-sm text-muted-foreground">
                  Update the badge code.
                </p>
                <div className="flex gap-2">
                  <Input
                    defaultValue={competition.code}
                    maxLength={3}
                    onChange={(e) => updateCompetition(competition.id, { code: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <h1 className="text-3xl font-bold">{competition.name}</h1>
        </div>
        <Button variant="destructive" size="sm" onClick={() => {
          if (confirm('Delete this competition?')) {
            deleteCompetition(competition.id);
            navigate('/');
          }
        }}>
          Delete Competition
        </Button>
      </div>

      <Tabs defaultValue="teams">
        <TabsList className="mb-4">
          <TabsTrigger value="teams">Teams ({competition.teams.length})</TabsTrigger>
          <TabsTrigger value="fixtures">Fixtures ({competition.fixtures.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle>Manage Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-start md:items-center">
                <div className="flex gap-2 w-full md:w-auto">
                  <Input
                    placeholder="New Team Name"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()}
                    className="max-w-xs"
                  />
                  <Button onClick={handleAddTeam}>
                    <Plus className="mr-2 h-4 w-4" /> Add Team
                  </Button>
                </div>

                <div className="flex gap-2 items-center w-full md:w-auto">
                  <div className="text-sm text-muted-foreground whitespace-nowrap">Auto-group:</div>
                  <Select value={String(numGroups)} onValueChange={(v) => setNumGroups(parseInt(v))}>
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 8].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => autoAssignGroups(competition.id, numGroups)}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Auto Group
                  </Button>
                </div>
              </div>

              <GroupList
                competitionId={competition.id}
                groups={competition.groups || []}
                teams={competition.teams}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fixtures">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fixtures</CardTitle>
              <div className="flex gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" /> Add Playoff/Final
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Manual Fixture</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Stage Name</Label>
                        <Input value={manualStage} onChange={(e) => setManualStage(e.target.value)} placeholder="e.g. Final" />
                      </div>

                      <div className="grid gap-2">
                        <Label>Home Team</Label>
                        <Select value={manualHome} onValueChange={setManualHome}>
                          <SelectTrigger><SelectValue placeholder="Select Team" /></SelectTrigger>
                          <SelectContent>
                            {competition.teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            <SelectItem value="custom">Custom / TBD</SelectItem>
                          </SelectContent>
                        </Select>
                        {manualHome === 'custom' && (
                          <Input placeholder="Enter team name (e.g. Winner SF1)" value={customHome} onChange={e => setCustomHome(e.target.value)} />
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Label>Away Team</Label>
                        <Select value={manualAway} onValueChange={setManualAway}>
                          <SelectTrigger><SelectValue placeholder="Select Team" /></SelectTrigger>
                          <SelectContent>
                            {competition.teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            <SelectItem value="custom">Custom / TBD</SelectItem>
                          </SelectContent>
                        </Select>
                        {manualAway === 'custom' && (
                          <Input placeholder="Enter team name (e.g. Winner SF2)" value={customAway} onChange={e => setCustomAway(e.target.value)} />
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddManualFixture}>Add Fixture</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button onClick={handleGenerate} disabled={competition.teams.length < 2}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Generate Round Robin
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage</TableHead>
                    <TableHead>Home</TableHead>
                    <TableHead>Away</TableHead>
                    <TableHead>Pitch</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competition.fixtures.map((fixture) => (
                    <TableRow key={fixture.id}>
                      <TableCell>
                        <span className="font-semibold text-primary">{fixture.stage}</span>
                        {fixture.description && <span className="text-muted-foreground ml-2 text-xs">({fixture.description})</span>}
                      </TableCell>
                      <TableCell className="font-medium">{getTeamName(fixture.homeTeamId)}</TableCell>
                      <TableCell className="font-medium">{getTeamName(fixture.awayTeamId)}</TableCell>
                      <TableCell>
                        {fixture.pitchId ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Assigned</span>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteFixture(competition.id, fixture.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {competition.fixtures.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No fixtures generated yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Competition;
