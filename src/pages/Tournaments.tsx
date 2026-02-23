import React from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Trophy, ChevronRight, FolderOpen, Download, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { createPppArchive, parsePppArchive } from '@/lib/pppArchive';
import { Tournament } from '@/lib/types';

const Tournaments = () => {
  const { tournaments, addTournament, importTournament, deleteTournament, setCurrentTournament, currentTournament } = useTournament();
  const [newTournamentName, setNewTournamentName] = React.useState('');
  const [newTournamentDescription, setNewTournamentDescription] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const importInputRef = React.useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreate = () => {
    if (newTournamentName.trim()) {
      const tournament = addTournament(newTournamentName, newTournamentDescription);
      setNewTournamentName('');
      setNewTournamentDescription('');
      setIsDialogOpen(false);
      // Auto-select the new tournament and navigate to it
      setCurrentTournament(tournament);
      navigate('/');
    }
  };

  const handleOpenTournament = (tournament: typeof tournaments[0]) => {
    setCurrentTournament(tournament);
    navigate('/overview');
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const safeFileName = (name: string) =>
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tournament';

  const handleExportTournament = (tournament: Tournament) => {
    const archiveBlob = createPppArchive(tournament);
    const url = URL.createObjectURL(archiveBlob);
    const fileName = `${safeFileName(tournament.name)}.ppp`;

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const payload = await parsePppArchive(file);
      const imported = importTournament(payload.tournament);
      toast({
        title: 'Tournament imported',
        description: `${imported.name} was added from ${file.name}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid PPP archive.';
      toast({
        title: 'Import failed',
        description: message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-8">
      <input
        ref={importInputRef}
        type="file"
        accept=".ppp,application/zip"
        className="hidden"
        onChange={handleImportFileChange}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
          <p className="text-muted-foreground mt-1">
            Manage your tournaments and competitions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Tournament
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tournament</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="e.g. Summer Cup 2024"
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCreate()}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (optional)</label>
                <Textarea
                  placeholder="Brief description of the tournament..."
                  value={newTournamentDescription}
                  onChange={(e) => setNewTournamentDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newTournamentName.trim()}>
                Create Tournament
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tournaments.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="bg-primary/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Tournaments Yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Create your first tournament to start organizing competitions, teams, and fixtures.
            </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Tournament
              </Button>
              <Button variant="outline" onClick={handleImportClick}>
                <Upload className="mr-2 h-4 w-4" />
                Import Tournament
              </Button>
            </CardContent>
          </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="group hover:shadow-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold truncate pr-4">{tournament.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete tournament? This will remove all associated competitions.')) {
                      deleteTournament(tournament.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {tournament.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {tournament.description}
                  </p>
                )}
                <div className="text-sm text-muted-foreground mb-4">
                  <div className="flex justify-between py-1 border-b">
                    <span>Competitions</span>
                    <span className="font-medium text-foreground">{tournament.competitions.length}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span>Teams</span>
                    <span className="font-medium text-foreground">
                      {tournament.competitions.reduce((acc, comp) => acc + comp.teams.length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span>Pitches</span>
                    <span className="font-medium text-foreground">{tournament.pitches.length}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Created</span>
                    <span className="font-medium text-foreground">{formatDate(tournament.createdAt)}</span>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  variant={currentTournament?.id === tournament.id ? "default" : "secondary"}
                  onClick={() => handleOpenTournament(tournament)}
                >
                  {currentTournament?.id === tournament.id ? (
                    <>
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Currently Open
                    </>
                  ) : (
                    <>
                      Open Tournament <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => handleExportTournament(tournament)}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button variant="outline" onClick={handleImportClick}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tournaments;
