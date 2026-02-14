import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Fixture } from '@/lib/types';
import { useTournament } from '@/context/TournamentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, RefreshCw, ArrowLeft, Trophy, Edit2, AlertTriangle, Pencil } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { GroupList } from '@/components/GroupList';
import { CompetitionBadge } from '@/components/CompetitionBadge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { KnockoutBuilderDialog } from '@/components/KnockoutBuilderDialog';
import { TeamEditDialog } from '@/components/TeamEditDialog';

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
    addFixtures,
    deleteCompetition,
    deleteFixture,
    autoAssignGroups,
    updateCompetition
  } = useTournament();

  const competition = competitions.find(c => c.id === id);

  const [newTeamName, setNewTeamName] = React.useState('');
  const [numGroups, setNumGroups] = React.useState(2);

  // Manual Fixture State
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [manualStage, setManualStage] = React.useState('Final');
  const [manualHome, setManualHome] = React.useState('');
  const [manualAway, setManualAway] = React.useState('');
  const [customHome, setCustomHome] = React.useState('');
  const [customAway, setCustomAway] = React.useState('');

  // Knockout Builder State
  const [isKnockoutBuilderOpen, setIsKnockoutBuilderOpen] = React.useState(false);

  if (!competition) {
    return <div>Competition not found</div>;
  }

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

  const handleKnockoutGenerate = (fixtures: any[]) => {
    addFixtures(competition.id, fixtures);
  };

  const getTeamName = (id: string) => {
    const team = competition.teams.find(t => t.id === id);
    return team ? team.name : id;
  };

  const handleGroupGenerate = (label: string, groupId?: string) => {
    const message = groupId
      ? `This will regenerate fixtures for ${label}. Continue?`
      : `This will regenerate ${label}. Continue?`;

    if (confirm(message)) {
      generateFixtures(competition.id, groupId);
    }
  };

  const roundRobinFixtures = competition.fixtures.filter(fixture => fixture.stage === 'Group');
  const knockoutFixtures = competition.fixtures.filter(fixture => fixture.stage !== 'Group');

  type RoundRobinGroupEntry = {
    id: string;
    label: string;
    fixtures: Fixture[];
    expectedMatches?: number;
    groupId?: string;
  };

  const roundRobinGroupEntries: RoundRobinGroupEntry[] = [];

  (competition.groups || []).forEach((group) => {
    const fixturesForGroup = roundRobinFixtures.filter(fixture => fixture.groupId === group.id);
    if (fixturesForGroup.length > 0) {
      const groupTeams = competition.teams.filter(team => team.groupId === group.id);
      const expectedMatches = groupTeams.length > 1 ? (groupTeams.length * (groupTeams.length - 1)) / 2 : 0;
      roundRobinGroupEntries.push({
        id: group.id,
        label: group.name,
        fixtures: fixturesForGroup,
        expectedMatches,
        groupId: group.id
      });
    }
  });

  const ungroupedRoundRobinFixtures = roundRobinFixtures.filter(fixture => !fixture.groupId);
  if (ungroupedRoundRobinFixtures.length > 0) {
    roundRobinGroupEntries.push({
      id: '__round-robin',
      label: 'Round Robin',
      fixtures: ungroupedRoundRobinFixtures
    });
  }

  const hasFixtures = roundRobinGroupEntries.length > 0 || knockoutFixtures.length > 0;

  type RenderFixtureTableOptions = {
    includePitch?: boolean;
    allowTeamEdit?: boolean;
  };

  const TeamNameCell: React.FC<{ teamId: string; allowEdit?: boolean }> = ({ teamId, allowEdit }) => {
    const team = competition.teams.find(t => t.id === teamId);
    if (!team) return <span className="font-medium">{teamId}</span>;
    if (!allowEdit) {
      return <span className="font-medium">{team.name}</span>;
    }

    return (
      <TeamEditDialog competitionId={competition.id} team={team}>
        <div className="group flex items-center gap-1 font-medium text-foreground">
          <span>{team.name}</span>
          <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
        </div>
      </TeamEditDialog>
    );
  };

  const renderFixtureTable = (fixtures: Fixture[], options?: RenderFixtureTableOptions) => {
    const { includePitch = true, allowTeamEdit = false } = options || {};

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stage</TableHead>
            <TableHead>Home</TableHead>
            <TableHead>Away</TableHead>
            {includePitch && <TableHead>Pitch</TableHead>}
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fixtures.map((fixture) => (
            <TableRow key={fixture.id}>
              <TableCell>
                <span className="font-semibold text-primary">{fixture.stage}</span>
                {fixture.description && <span className="text-muted-foreground ml-2 text-xs">({fixture.description})</span>}
              </TableCell>
              <TableCell>
                <TeamNameCell teamId={fixture.homeTeamId} allowEdit={allowTeamEdit} />
              </TableCell>
              <TableCell>
                <TeamNameCell teamId={fixture.awayTeamId} allowEdit={allowTeamEdit} />
              </TableCell>
              {includePitch && (
                <TableCell>
                  {fixture.pitchId ? (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Assigned</span>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">Unassigned</span>
                  )}
                </TableCell>
              )}
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => deleteFixture(competition.id, fixture.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
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
                  color={competition.color}
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
                {/* Manual Fixture Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Manual
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

                {/* Knockout Builder Button */}
                <Button 
                  variant="outline" 
                  onClick={() => setIsKnockoutBuilderOpen(true)}
                  className="hidden sm:flex"
                >
                  <Trophy className="mr-2 h-4 w-4" /> Knockouts
                </Button>

                {/* Generate Round Robin Button */}
                <Button onClick={handleGenerate} disabled={competition.teams.length < 2}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Round Robin
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!hasFixtures ? (
                <div className="text-center py-8 text-muted-foreground">
                  No fixtures generated yet.
                </div>
              ) : (
                <div className="space-y-8">
                  {roundRobinGroupEntries.map((entry) => {
                    const hasExpectedInfo = typeof entry.expectedMatches === 'number' && entry.expectedMatches > 0;
                    const isGroupIncomplete = hasExpectedInfo && entry.fixtures.length < (entry.expectedMatches ?? 0);
                    const wrapperClasses = [
                      'space-y-3',
                      'rounded-xl',
                      'border',
                      'p-4',
                      'transition-colors',
                      isGroupIncomplete ? 'border-amber-500/70 bg-amber-50/70 shadow-sm' : 'border-border/30 bg-background'
                    ].join(' ');

                    return (
                    <div key={entry.id} className={wrapperClasses}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{entry.label} Fixtures</h3>
                          {isGroupIncomplete && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 uppercase tracking-wide">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Missing matches
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{entry.fixtures.length} matches</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:bg-primary/10"
                            onClick={() => handleGroupGenerate(entry.label, entry.groupId)}
                            title={`Regenerate ${entry.label}`}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                        {renderFixtureTable(entry.fixtures, { includePitch: false, allowTeamEdit: true })}
                      </div>
                    );
                  })}
                  {knockoutFixtures.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Knockouts</h3>
                        <span className="text-sm text-muted-foreground">{knockoutFixtures.length} matches</span>
                      </div>
                      {renderFixtureTable(knockoutFixtures)}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <KnockoutBuilderDialog
        open={isKnockoutBuilderOpen}
        onOpenChange={setIsKnockoutBuilderOpen}
        competitionId={competition.id}
        groups={competition.groups || []}
        teams={competition.teams}
        existingFixtures={competition.fixtures}
        onGenerate={handleKnockoutGenerate}
      />
    </div>
  );
};

export default Competition;
