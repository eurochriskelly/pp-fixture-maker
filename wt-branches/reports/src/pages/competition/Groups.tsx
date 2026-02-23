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
import { Group } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

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
    // Create new groups with fresh IDs
    const newGroups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
      id: uuidv4(),
      name: `Group ${String.fromCharCode(65 + i)}`,
    }));

    // Shuffle teams
    const shuffledTeams = [...competition.teams];
    for (let i = shuffledTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
    }

    // Assign groupId to each team based on shuffled order
    const updatedTeams = shuffledTeams.map((team, index) => ({
      ...team,
      groupId: newGroups[index % numGroups].id,
    }));

    // Update competition with new groups and updated teams
    updateCompetition(competition.id, { 
      groups: newGroups,
      teams: updatedTeams 
    });
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