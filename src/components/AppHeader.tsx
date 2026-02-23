import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Trophy, 
  Plus, 
  ChevronDown, 
  X, 
  FolderOpen, 
  Upload,
  User,
  LogOut,
  Download
} from "lucide-react";
import { useTournament } from "@/context/TournamentContext";
import { useAuth } from "@/context/AuthContext";
import { AuthDialog } from "./AuthDialog";
import { Tournament } from "@/lib/types";
import { createPppArchive, parsePppArchive } from "@/lib/pppArchive";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function AppHeader() {
  const { 
    currentTournament, 
    closeTournament, 
    tournaments, 
    setCurrentTournament,
    addTournament,
    importTournament
  } = useTournament();
  const { isAuthenticated, user, logout } = useAuth();
  const { toast } = useToast();
  
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  
  // Create tournament state
  const [newTournamentName, setNewTournamentName] = useState("");
  const [newTournamentDescription, setNewTournamentDescription] = useState("");

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

  const handleSwitchTournament = (tournament: Tournament) => {
    setCurrentTournament(tournament);
    setSwitchDialogOpen(false);
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
        // Auto-open the imported tournament
        setCurrentTournament(imported);
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

  const handleExportCurrent = async () => {
    if (!currentTournament) return;
    
    const archiveBlob = await createPppArchive(currentTournament);
    const url = URL.createObjectURL(archiveBlob);
    const fileName = `${currentTournament.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'tournament'}.ppp`;

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

  const otherTournaments = tournaments.filter(t => t.id !== currentTournament?.id);

  return (
    <>
      <AuthDialog 
        open={authDialogOpen} 
        onOpenChange={setAuthDialogOpen}
        onSuccess={handleAuthSuccess}
      />

      <header className="relative z-20 h-16 border-b border-slate-200 bg-white/95 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="bg-sky-100 p-1.5 rounded-lg">
              <Trophy className="h-5 w-5 text-sky-700" />
            </div>
            <span className="font-bold text-slate-900 hidden sm:inline">Tournament Maker</span>
          </div>

          {/* Tournament Selector */}
          {currentTournament && (
            <div className="flex items-center gap-2 ml-4">
              <div className="h-6 w-px bg-slate-200" />
              <DropdownMenu open={switchDialogOpen} onOpenChange={setSwitchDialogOpen}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                  >
                    <span className="font-medium truncate max-w-[200px]">
                      {currentTournament.name}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80">
                  <DropdownMenuLabel>Current Tournament</DropdownMenuLabel>
                  <div className="px-2 py-2">
                    <div className="bg-muted p-3 rounded-md">
                      <p className="font-medium">{currentTournament.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {currentTournament.competitions.length} competitions · {currentTournament.pitches.length} pitches
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleExportCurrent}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Tournament
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={closeTournament} className="text-amber-600">
                    <X className="mr-2 h-4 w-4" />
                    Close Tournament
                  </DropdownMenuItem>
                  
                  {otherTournaments.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Switch to</DropdownMenuLabel>
                      {otherTournaments.map(tournament => (
                        <DropdownMenuItem 
                          key={tournament.id}
                          onClick={() => handleSwitchTournament(tournament)}
                        >
                          <FolderOpen className="mr-2 h-4 w-4" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{tournament.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(tournament.createdAt)}
                            </p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCreateClick}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Tournament
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleImportClick}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Tournament
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Quick actions when tournament is open */}
          {currentTournament && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-700 hover:bg-slate-100 hidden md:flex"
                onClick={handleCreateClick}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-700 hover:bg-slate-100 hidden md:flex"
                onClick={() => setSwitchDialogOpen(true)}
              >
                <FolderOpen className="h-4 w-4 mr-1" />
                Open
              </Button>
              <div className="h-6 w-px bg-slate-200 hidden md:block" />
            </>
          )}

          {/* Auth/User Menu */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                >
                  <div className="bg-slate-100 p-1.5 rounded-full">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="hidden sm:inline">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="ghost" 
              className="text-slate-700 hover:bg-slate-100"
              onClick={() => setAuthDialogOpen(true)}
            >
              <User className="h-4 w-4 mr-2" />
              Login
            </Button>
          )}

          {/* Close button (only when tournament is open) */}
          {currentTournament && (
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-700 hover:bg-slate-100"
              onClick={closeTournament}
              title="Close Tournament"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Create Tournament Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
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
            <Button className="bg-sky-700 hover:bg-sky-800" onClick={handleCreateTournament} disabled={!newTournamentName.trim()}>
              Create Tournament
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
