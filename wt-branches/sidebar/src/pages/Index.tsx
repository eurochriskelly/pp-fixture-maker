import React, { useEffect } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Settings, ChevronRight, Trophy, FolderOpen } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CompetitionBadge } from '@/components/CompetitionBadge';

const Index = () => {
  const { competitions, addCompetition, deleteCompetition, currentTournament, tournaments } = useTournament();
  const [newCompName, setNewCompName] = React.useState('');
  const navigate = useNavigate();

  // Redirect to tournaments page if no tournament is selected
  useEffect(() => {
    if (!currentTournament) {
      navigate('/tournaments');
    }
  }, [currentTournament, navigate]);

  // If no current tournament, show a message to select one
  if (!currentTournament) {
    return (
      <div className="container mx-auto p-4 max-w-5xl">
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="bg-primary/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Tournament Selected</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Please select or create a tournament to start managing competitions.
            </p>
            <Button onClick={() => navigate('/tournaments')}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Go to Tournaments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreate = () => {
    if (newCompName.trim()) {
      addCompetition(newCompName);
      setNewCompName('');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{currentTournament.name}</h1>
          {currentTournament.description && (
            <p className="text-muted-foreground mt-1">{currentTournament.description}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-dashed border-2 flex flex-col justify-center items-center p-6 h-full min-h-[200px] hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => document.getElementById('new-comp-input')?.focus()}>
          <div className="text-center space-y-4 w-full">
            <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Create New Competition</h3>
            <div className="flex gap-2 max-w-xs mx-auto">
              <Input
                id="new-comp-input"
                placeholder="e.g. Men's U18"
                value={newCompName}
                onChange={(e) => setNewCompName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button size="icon" onClick={handleCreate} disabled={!newCompName.trim()}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {competitions.map((comp) => (
          <Card key={comp.id} className="group hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-bold truncate pr-4">{comp.name}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete competition?')) deleteCompetition(comp.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-6">
                <CompetitionBadge
                  code={comp.code || comp.name.substring(0, 2).toUpperCase()}
                  color={comp.color}
                  size="lg"
                />
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                <div className="flex justify-between py-1 border-b">
                  <span>Teams</span>
                  <span className="font-medium text-foreground">{comp.teams.length}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span>Fixtures</span>
                  <span className="font-medium text-foreground">{comp.fixtures.length}</span>
                </div>
              </div>
              <Link to={`/competition/${comp.id}/groups`}>
                <Button className="w-full" variant="secondary">
                  Manage Details <Settings className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div >
  );
};

export default Index;