import React from 'react';
import { useParams } from 'react-router-dom';
import { useTournament } from '@/context/TournamentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RefreshCw, Shuffle } from 'lucide-react';
import { GroupList } from '@/components/GroupList';
import { CompetitionHeader } from './CompetitionHeader';

const CompetitionGroups = () => {
  const { id } = useParams<{ id: string }>();
  const {
    competitions,
    addTeam,
    autoAssignGroups,
    updateCompetition,
  } = useTournament();

  const competition = competitions.find(c => c.id === id);

  const [newTeamName, setNewTeamName] = React.useState('');
  const [numGroups, setNumGroups] = React.useState(1);

  if (!competition) {
    return <div>Competition not found</div>;
  }

  const handleAddTeam = () => {
    addTeam(competition.id, newTeamName || undefined);
    setNewTeamName('');
  };

  const handleRandomizeGroups = () => {
    const teams = [...competition.teams];
    // Fisher-Yates shuffle
    for (let i = teams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teams[i], teams[j]] = [teams[j], teams[i]];
    }

    // Distribute shuffled teams into groups
    const groups = Array.from({ length: numGroups }, (_, i) => ({
      id: `group-${i + 1}`,
      name: `Group ${String.fromCharCode(65 + i)}`,
      teams: [] as typeof teams,
    }));

    teams.forEach((team, index) => {
      const groupIndex = index % numGroups;
      groups[groupIndex].teams.push(team);
    });

    updateCompetition(competition.id, { groups });
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <CompetitionHeader competitionId={competition.id} />
      
      <Card>
        <CardHeader>
          <CardTitle>Manage Teams & Groups</CardTitle>
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
                  {[1, 2, 3, 4, 5, 6, 8].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => autoAssignGroups(competition.id, numGroups)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Auto Group
              </Button>
              <Button variant="outline" onClick={handleRandomizeGroups}>
                <Shuffle className="mr-2 h-4 w-4" /> Randomize
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
    </div>
  );
};

export default CompetitionGroups;