import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Upload, Download, Trophy, Calendar, Users, MapPin, ChevronRight, X, FolderOpen } from "lucide-react";
import { useTournament } from "@/context/TournamentContext";
import { useAuth } from "@/context/AuthContext";
import { AuthDialog } from "./AuthDialog";
import { format } from "date-fns";
import { Tournament } from "@/lib/types";
import { createPppArchive, parsePppArchive } from "@/lib/pppArchive";
import { useToast } from "@/hooks/use-toast";

export function HeroSection() {
  const { tournaments, addTournament, setCurrentTournament, importTournament } = useTournament();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  
  // Create tournament dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [newTournamentDescription, setNewTournamentDescription] = useState("");
  
  // Checkout dialog state
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);

  const requireAuth = (action: () => void) => {
    if (!isAuthenticated) {
      setPendingAction(() => action);
      setAuthDialogOpen(true);
      return;
    }
    action();
  };

  const handleAuthSuccess = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleCreateClick = () => {
    requireAuth(() => setCreateDialogOpen(true));
  };

  const handleCheckoutClick = () => {
    requireAuth(() => setCheckoutDialogOpen(true));
  };

  const handleCreateTournament = () => {
    if (newTournamentName.trim()) {
      const tournament = addTournament(newTournamentName, newTournamentDescription);
      setNewTournamentName("");
      setNewTournamentDescription("");
      setCreateDialogOpen(false);
      setCurrentTournament(tournament);
      toast({
        title: "Tournament created!",
        description: `${tournament.name} has been created and opened.`
      });
    }
  };

  const handleOpenTournament = (tournament: Tournament) => {
    setCurrentTournament(tournament);
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ppp,application/zip';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
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
    input.click();
  };

  const handleExportTournament = async (tournament: Tournament, e: React.MouseEvent) => {
    e.stopPropagation();
    const archiveBlob = await createPppArchive(tournament);
    const url = URL.createObjectURL(archiveBlob);
    const fileName = `${tournament.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'tournament'}.ppp`;

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
      <AuthDialog 
        open={authDialogOpen} 
        onOpenChange={setAuthDialogOpen}
        onSuccess={handleAuthSuccess}
      />
      
      {/* Navigation Bar */}
      <nav className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Tournament Maker</span>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/10"
                onClick={handleImportClick}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Create & Manage
            <span className="block text-yellow-300">Amazing Tournaments</span>
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
            Build tournaments from scratch, manage competitions, schedule fixtures, 
            and keep everything organized in one place.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="lg" 
                  className="bg-white text-purple-700 hover:bg-white/90"
                  onClick={handleCreateClick}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Create Tournament
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
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateTournament()}
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
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTournament} disabled={!newTournamentName.trim()}>
                    Create Tournament
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              size="lg" 
              variant="outline" 
              className="border-white/30 text-white hover:bg-white/10"
              onClick={handleCheckoutClick}
            >
              <FolderOpen className="mr-2 h-5 w-5" />
              Checkout Tournament
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-yellow-400/20 p-3 rounded-lg">
                <Trophy className="h-6 w-6 text-yellow-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{tournaments.length}</p>
                <p className="text-sm text-white/70">Tournaments</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-green-400/20 p-3 rounded-lg">
                <Users className="h-6 w-6 text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {tournaments.reduce((acc, t) => acc + t.competitions.reduce((c, comp) => c + comp.teams.length, 0), 0)}
                </p>
                <p className="text-sm text-white/70">Total Teams</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-blue-400/20 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {tournaments.reduce((acc, t) => acc + t.competitions.reduce((c, comp) => c + comp.fixtures.length, 0), 0)}
                </p>
                <p className="text-sm text-white/70">Fixtures Created</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Existing Tournaments */}
        {tournaments.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">Your Tournaments</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((tournament) => (
                <Card 
                  key={tournament.id} 
                  className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all cursor-pointer group"
                  onClick={() => handleOpenTournament(tournament)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-white text-lg">{tournament.name}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleExportTournament(tournament, e)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {tournament.description && (
                      <p className="text-sm text-white/60 mb-4 line-clamp-2">
                        {tournament.description}
                      </p>
                    )}
                    
                    <div className="grid grid-cols-3 gap-2 text-center text-sm mb-4">
                      <div className="bg-white/5 rounded p-2">
                        <p className="font-semibold text-white">{tournament.competitions.length}</p>
                        <p className="text-xs text-white/50">Competitions</p>
                      </div>
                      <div className="bg-white/5 rounded p-2">
                        <p className="font-semibold text-white">
                          {tournament.competitions.reduce((acc, comp) => acc + comp.teams.length, 0)}
                        </p>
                        <p className="text-xs text-white/50">Teams</p>
                      </div>
                      <div className="bg-white/5 rounded p-2">
                        <p className="font-semibold text-white">{tournament.pitches.length}</p>
                        <p className="text-xs text-white/50">Pitches</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">
                        Created {formatDate(tournament.createdAt)}
                      </span>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-yellow-300 hover:text-yellow-200 hover:bg-yellow-400/10"
                      >
                        Open <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Checkout Tournament</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="bg-muted p-4 rounded-lg mb-4">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Server checkout functionality will be implemented here.
                This would connect to a remote server to fetch tournaments in design phase.
              </p>
            </div>
            <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
