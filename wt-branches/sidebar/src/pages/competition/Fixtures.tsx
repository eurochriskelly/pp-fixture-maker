import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTournament } from '@/context/TournamentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RefreshCw, Trophy, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { CompetitionHeader } from './CompetitionHeader';
import { FixtureItem } from '@/components/FixtureComponents';
import { KnockoutBuilderDialog } from '@/components/KnockoutBuilderDialog';
import { Fixture } from '@/lib/types';

const CompetitionFixtures = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const showUnassignedOnly = location.pathname.endsWith('unassigned');
  
  const {
    competitions,
    generateFixtures,
    addManualFixture,
    addFixtures,
    deleteFixture,
  } = useTournament();

  const competition = competitions.find(c => c.id === id);

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

  const handleGroupGenerate = (label: string, groupId?: string) => {
    const message = groupId
      ? `This will regenerate fixtures for ${label}. Continue?`
      : `This will regenerate ${label}. Continue?`;

    if (confirm(message)) {
      generateFixtures(competition.id, groupId);
    }
  };

  const fixturesToShow = showUnassignedOnly 
    ? competition.fixtures.filter(f => !f.pitchId)
    : competition.fixtures;

  const roundRobinFixtures = fixturesToShow.filter(fixture => fixture.stage === 'Group');
  const knockoutFixtures = fixturesToShow.filter(fixture => fixture.stage !== 'Group');

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

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <CompetitionHeader competitionId={competition.id} />
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {showUnassignedOnly ? 'Unassigned Fixtures' : 'All Fixtures'}
          </CardTitle>
          {!showUnassignedOnly && (
            <div className="flex gap-2">
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

              <Button 
                variant="outline" 
                onClick={() => setIsKnockoutBuilderOpen(true)}
                className="hidden sm:flex"
              >
                <Trophy className="mr-2 h-4 w-4" /> Knockouts
              </Button>

              <Button onClick={handleGenerate} disabled={competition.teams.length < 2}>
                <RefreshCw className="mr-2 h-4 w-4" /> Round Robin
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!hasFixtures ? (
            <div className="text-center py-8 text-muted-foreground">
              {showUnassignedOnly ? 'No unassigned fixtures found.' : 'No fixtures generated yet.'}
            </div>
          ) : (
            <div className="space-y-8">
              {roundRobinGroupEntries.map((entry) => {
                const hasExpectedInfo = typeof entry.expectedMatches === 'number' && entry.expectedMatches > 0;
                const isGroupIncomplete = !showUnassignedOnly && hasExpectedInfo && entry.fixtures.length < (entry.expectedMatches ?? 0);
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
                      {!showUnassignedOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary hover:bg-primary/10"
                          onClick={() => handleGroupGenerate(entry.label, entry.groupId)}
                          title={`Regenerate ${entry.label}`}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                    <div className="space-y-3">
                      {entry.fixtures.map(f => (
                        <FixtureItem 
                          key={f.id} 
                          fixture={f} 
                          competition={competition} 
                          onDelete={(fid) => deleteFixture(competition.id, fid)}
                          includePitch={!showUnassignedOnly}
                          allowTeamEdit={!showUnassignedOnly}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {knockoutFixtures.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Knockouts</h3>
                    <span className="text-sm text-muted-foreground">{knockoutFixtures.length} matches</span>
                  </div>
                   <div className="space-y-3">
                      {knockoutFixtures.map(f => (
                        <FixtureItem 
                          key={f.id} 
                          fixture={f} 
                          competition={competition} 
                          onDelete={(fid) => deleteFixture(competition.id, fid)}
                          includePitch={!showUnassignedOnly}
                          allowTeamEdit={!showUnassignedOnly}
                        />
                      ))}
                    </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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

export default CompetitionFixtures;
