import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  ChevronRight,
  Download,
  FolderOpen,
  Import,
  LogOut,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Target,
  Trophy,
  Upload,
  User,
  Users,
} from 'lucide-react';

import { useTournament } from '@/context/TournamentContext';
import { useAuth } from '@/context/AuthContext';
import { Tournament } from '@/lib/types';
import { createPppArchive, parsePppArchive } from '@/lib/pppArchive';
import { useToast } from '@/hooks/use-toast';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type TournamentSource = 'local' | 'synced';
type TournamentStatus = 'planning' | 'upcoming' | 'started' | 'active' | 'completed';

interface TournamentRecord {
  tournament: Tournament;
  source: TournamentSource;
  status: TournamentStatus;
  teamsCount: number;
  fixturesCount: number;
  canCheckout: boolean;
}

interface SectionFilters {
  statuses: TournamentStatus[];
  region: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

const STATUS_LABELS: Record<TournamentStatus, string> = {
  planning: 'Planning',
  upcoming: 'Upcoming',
  started: 'Started',
  active: 'Active',
  completed: 'Completed',
};

const ACTIVE_DEFAULT_FILTER: TournamentStatus[] = ['started', 'active', 'planning'];
const UPCOMING_DEFAULT_FILTER: TournamentStatus[] = ['upcoming'];

function getStatus(tournament: Tournament): TournamentStatus {
  if (!tournament.startDate) return 'planning';

  const now = new Date();
  const startDate = new Date(`${tournament.startDate}T00:00:00`);
  const endDate = tournament.endDate ? new Date(`${tournament.endDate}T23:59:59`) : undefined;

  if (Number.isNaN(startDate.getTime())) return 'planning';
  if (startDate > now) return 'upcoming';
  if (endDate && endDate < now) return 'completed';
  if (!endDate) return 'started';

  return 'active';
}

function safeFormatDate(dateString?: string) {
  if (!dateString) return 'TBD';
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
}

function isWithinDateRange(record: TournamentRecord, from: string, to: string) {
  if (!from && !to) return true;
  if (!record.tournament.startDate) return false;

  const start = new Date(`${record.tournament.startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return false;

  if (from) {
    const fromDate = new Date(`${from}T00:00:00`);
    if (!Number.isNaN(fromDate.getTime()) && start < fromDate) return false;
  }

  if (to) {
    const toDate = new Date(`${to}T23:59:59`);
    if (!Number.isNaN(toDate.getTime()) && start > toDate) return false;
  }

  return true;
}

function statusBadgeVariant(status: TournamentStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'active' || status === 'started') return 'default';
  if (status === 'upcoming') return 'secondary';
  return 'outline';
}

function TournamentTableSection({
  id,
  title,
  description,
  records,
  defaultStatuses,
  isAuthenticated,
  globalSearch,
  onOpen,
  onPublish,
  onCheckout,
}: {
  id: string;
  title: string;
  description: string;
  records: TournamentRecord[];
  defaultStatuses: TournamentStatus[];
  isAuthenticated: boolean;
  globalSearch: string;
  onOpen: (record: TournamentRecord) => void;
  onPublish: (record: TournamentRecord) => void;
  onCheckout: (record: TournamentRecord) => void;
}) {
  const [filters, setFilters] = useState<SectionFilters>({
    statuses: defaultStatuses,
    region: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
  });
  const [visibleCount, setVisibleCount] = useState(5);

  const availableRegions = useMemo(() => {
    const regions = new Set<string>();
    records.forEach((record) => {
      if (record.tournament.region?.trim()) regions.add(record.tournament.region.trim());
    });
    return [...regions].sort((a, b) => a.localeCompare(b));
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = `${globalSearch} ${filters.search}`.trim().toLowerCase();

    return records.filter((record) => {
      if (filters.statuses.length > 0 && !filters.statuses.includes(record.status)) return false;
      if (filters.region !== 'all' && (record.tournament.region || '').trim() !== filters.region) return false;
      if (!isWithinDateRange(record, filters.dateFrom, filters.dateTo)) return false;

      if (!query) return true;
      const name = record.tournament.name.toLowerCase();
      const location = (record.tournament.location || '').toLowerCase();
      const region = (record.tournament.region || '').toLowerCase();
      return name.includes(query) || location.includes(query) || region.includes(query);
    });
  }, [records, filters, globalSearch]);

  const visibleRecords = filteredRecords.slice(0, visibleCount);

  const toggleStatus = (status: TournamentStatus) => {
    setVisibleCount(5);
    setFilters((prev) => {
      const exists = prev.statuses.includes(status);
      const statuses = exists
        ? prev.statuses.filter((item) => item !== status)
        : [...prev.statuses, status];
      return { ...prev, statuses };
    });
  };

  return (
    <section id={id} className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_LABELS) as TournamentStatus[]).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={filters.statuses.includes(status) ? 'default' : 'outline'}
                    onClick={() => toggleStatus(status)}
                    className={filters.statuses.includes(status) ? 'bg-sky-700 hover:bg-sky-800' : 'text-slate-700'}
                  >
                    {STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Region</p>
              <Select
                value={filters.region}
                onValueChange={(value) => {
                  setVisibleCount(5);
                  setFilters((prev) => ({ ...prev, region: value }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {availableRegions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Date range</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => {
                    setVisibleCount(5);
                    setFilters((prev) => ({ ...prev, dateFrom: event.target.value }));
                  }}
                />
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => {
                    setVisibleCount(5);
                    setFilters((prev) => ({ ...prev, dateTo: event.target.value }));
                  }}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Search</p>
              <Input
                value={filters.search}
                placeholder="Search title, region, location"
                onChange={(event) => {
                  setVisibleCount(5);
                  setFilters((prev) => ({ ...prev, search: event.target.value }));
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-slate-50">
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Start date</TableHead>
                  <TableHead>End date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Teams</TableHead>
                  <TableHead>Fixtures</TableHead>
                  <TableHead className="min-w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-slate-500">
                      No tournaments match these filters.
                    </TableCell>
                  </TableRow>
                )}

                {visibleRecords.map((record) => (
                  <TableRow key={`${record.source}-${record.tournament.id}`}>
                    <TableCell className="font-medium text-slate-900">{record.tournament.name}</TableCell>
                    <TableCell>{record.tournament.region || 'TBD'}</TableCell>
                    <TableCell>{record.tournament.location || 'TBD'}</TableCell>
                    <TableCell>{safeFormatDate(record.tournament.startDate)}</TableCell>
                    <TableCell>{safeFormatDate(record.tournament.endDate)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={statusBadgeVariant(record.status)}
                        className={
                          statusBadgeVariant(record.status) === 'default'
                            ? 'bg-sky-700 text-white hover:bg-sky-700'
                            : undefined
                        }
                      >
                        {STATUS_LABELS[record.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.teamsCount}</TableCell>
                    <TableCell>{record.fixturesCount}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {isAuthenticated ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => onOpen(record)}>
                              Open
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link to="/tournaments">Manage</Link>
                            </Button>
                            {record.status === 'upcoming' && record.canCheckout && (
                              <Button size="sm" variant="outline" onClick={() => onCheckout(record)}>
                                Checkout
                              </Button>
                            )}
                            <Button size="sm" onClick={() => onPublish(record)} className="bg-sky-700 hover:bg-sky-800">
                              Publish
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" asChild>
                              <Link to="/login">View</Link>
                            </Button>
                            {record.source === 'local' && (
                              <Button size="sm" variant="outline" onClick={() => onOpen(record)}>
                                Open local
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredRecords.length > visibleCount && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setVisibleCount((prev) => prev + 5)}>
                Show more
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export function HeroSection() {
  const { tournaments, addTournament, importTournament, setCurrentTournament } = useTournament();
  const { isAuthenticated, user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentDescription, setNewTournamentDescription] = useState('');
  const [dashboardSearch, setDashboardSearch] = useState('');

  const safeFileName = (name: string) =>
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tournament';

  const localRecords: TournamentRecord[] = useMemo(
    () =>
      tournaments.map((tournament) => ({
        tournament,
        source:
          tournament.published?.remoteId || tournament.published?.eventUuid ? 'synced' : 'local',
        status: getStatus(tournament),
        teamsCount: tournament.competitions.reduce((sum, comp) => sum + comp.teams.length, 0),
        fixturesCount: tournament.competitions.reduce((sum, comp) => sum + comp.fixtures.length, 0),
        canCheckout: isAuthenticated,
      })),
    [tournaments, isAuthenticated]
  );

  // TODO: Replace with server tournament wiring when endpoint/auth scopes are available.
  const serverRecords: TournamentRecord[] = useMemo(() => [], []);

  const mergedRecords = useMemo(
    () =>
      isAuthenticated
        ? [...localRecords, ...serverRecords]
        : localRecords.filter((record) => record.source === 'local'),
    [isAuthenticated, localRecords, serverRecords]
  );

  const recordsById = useMemo(() => {
    return new Map(mergedRecords.map((record) => [record.tournament.id, record]));
  }, [mergedRecords]);

  const stats = useMemo(() => {
    const totalTournaments = mergedRecords.length;
    const totalTeams = mergedRecords.reduce((sum, record) => sum + record.teamsCount, 0);
    const totalFixtures = mergedRecords.reduce((sum, record) => sum + record.fixturesCount, 0);
    const totalPoints = mergedRecords.reduce(
      (sum, record) =>
        sum +
        (record.tournament.winPoints ?? 2) +
        (record.tournament.drawPoints ?? 1) +
        (record.tournament.losePoints ?? 0),
      0
    );
    const totalGoals = 0;

    return {
      totalTournaments,
      totalTeams,
      totalFixtures,
      totalPoints,
      totalGoals,
    };
  }, [mergedRecords]);

  const yourTournaments = useMemo(() => {
    if (!isAuthenticated) return localRecords;
    return mergedRecords;
  }, [isAuthenticated, localRecords, mergedRecords]);

  const activeRecords = useMemo(
    () => mergedRecords.filter((record) => ACTIVE_DEFAULT_FILTER.includes(record.status)),
    [mergedRecords]
  );

  const upcomingRecords = useMemo(
    () => mergedRecords.filter((record) => UPCOMING_DEFAULT_FILTER.includes(record.status)),
    [mergedRecords]
  );

  const openTournament = (record: TournamentRecord) => {
    const localRecord = recordsById.get(record.tournament.id);
    if (localRecord?.source === 'local' || record.source === 'local') {
      setCurrentTournament(record.tournament);
      navigate('/overview');
      return;
    }

    toast({
      title: 'Checkout required',
      description: 'This tournament is not stored locally yet. Checkout will be available when server sync is wired.',
    });
  };

  const handleCreateTournament = () => {
    if (!newTournamentName.trim()) return;

    const tournament = addTournament(newTournamentName, newTournamentDescription);
    setCurrentTournament(tournament);
    setCreateDialogOpen(false);
    setNewTournamentName('');
    setNewTournamentDescription('');
    navigate('/overview');

    toast({
      title: 'Tournament created',
      description: `${tournament.name} is ready.`,
    });
  };

  const handleImportTournament = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ppp,application/zip';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
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
          variant: 'destructive',
        });
      }
    };
    input.click();
  };

  const handleExportTournament = async (record: TournamentRecord) => {
    if (record.source !== 'local') return;

    const archiveBlob = await createPppArchive(record.tournament);
    const url = URL.createObjectURL(archiveBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFileName(record.tournament.name)}.ppp`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePublish = (record: TournamentRecord) => {
    openTournament(record);
  };

  const handleCheckout = (record: TournamentRecord) => {
    toast({
      title: 'Checkout pending',
      description: `Checkout for ${record.tournament.name} will be connected to server permissions soon.`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
              <Trophy className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Tournament Maker</span>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-sky-700 hover:bg-sky-800">
                    <Plus className="mr-2 h-4 w-4" />
                    Create
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create tournament</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Name</p>
                      <Input
                        placeholder="e.g. Summer Cup 2026"
                        value={newTournamentName}
                        onChange={(event) => setNewTournamentName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleCreateTournament();
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Description (optional)</p>
                      <Textarea
                        placeholder="Brief tournament summary"
                        rows={3}
                        value={newTournamentDescription}
                        onChange={(event) => setNewTournamentDescription(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTournament} disabled={!newTournamentName.trim()} className="bg-sky-700 hover:bg-sky-800">
                      Create tournament
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={handleImportTournament}>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <User className="h-4 w-4" />
                    {user?.name || 'Account'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/tournaments')}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    All tournaments
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild className="bg-sky-700 hover:bg-sky-800">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/login?mode=register">Create account</Link>
              </Button>
            </div>
          )}
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          {isAuthenticated ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-sky-700">Dashboard</p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Welcome back</h1>
                <p className="mt-3 max-w-2xl text-slate-600">
                  Continue building tournaments, import existing archives, and keep publishing schedules without leaving your dashboard.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={() => setCreateDialogOpen(true)} className="bg-sky-700 hover:bg-sky-800">
                    <Plus className="mr-2 h-4 w-4" />
                    Create tournament
                  </Button>
                  <Button variant="outline" onClick={handleImportTournament}>
                    <Import className="mr-2 h-4 w-4" />
                    Import tournament
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Search tournaments</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-9"
                    value={dashboardSearch}
                    onChange={(event) => setDashboardSearch(event.target.value)}
                    placeholder="Search by title, region or location"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-sky-700">Tournament design platform</p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">Start designing now!</h1>
                <p className="mt-4 max-w-2xl text-slate-600">
                  Build tournaments, generate fixtures, and organize your event from first draft to publish-ready schedule.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-sky-700 hover:bg-sky-800">
                  <Link to="/login">Start designing now!</Link>
                </Button>
                <Button variant="outline" asChild>
                  <a href="#upcoming-tournaments">See upcoming tournaments</a>
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Global progress</h2>
            <p className="mt-1 text-sm text-slate-600">Aggregate metrics across all available tournaments.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-sky-100 p-2 text-sky-700">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">{stats.totalTournaments}</p>
                  <p className="text-xs text-slate-500">Total Tournaments</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-sky-100 p-2 text-sky-700">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">{stats.totalTeams}</p>
                  <p className="text-xs text-slate-500">Total Teams</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-sky-100 p-2 text-sky-700">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">{stats.totalFixtures}</p>
                  <p className="text-xs text-slate-500">Total Fixtures</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-sky-100 p-2 text-sky-700">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">{stats.totalPoints}</p>
                  <p className="text-xs text-slate-500">Total Points</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-sky-100 p-2 text-sky-700">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">{stats.totalGoals}</p>
                  <p className="text-xs text-slate-500">Total Goals</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {(localRecords.length > 0 || isAuthenticated) && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Your tournaments</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {isAuthenticated
                    ? 'Your local and synced tournaments in one place.'
                    : 'Local tournaments saved on this device.'}
                </p>
              </div>
              <Button variant="ghost" asChild>
                <Link to="/tournaments">View all</Link>
              </Button>
            </div>

            {yourTournaments.length === 0 ? (
              <Card className="border-dashed border-slate-300 bg-white">
                <CardContent className="py-10 text-center">
                  <h3 className="text-lg font-semibold text-slate-900">No tournaments yet</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Create a new tournament or import an archive to get started.
                  </p>
                  {isAuthenticated && (
                    <div className="mt-4 flex justify-center gap-2">
                      <Button onClick={() => setCreateDialogOpen(true)} className="bg-sky-700 hover:bg-sky-800">
                        <Plus className="mr-2 h-4 w-4" />
                        Create
                      </Button>
                      <Button variant="outline" onClick={handleImportTournament}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {yourTournaments.slice(0, 3).map((record) => (
                  <Card key={`${record.source}-${record.tournament.id}`} className="border-slate-200 shadow-sm">
                    <CardHeader className="space-y-2 pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="line-clamp-1 text-lg">{record.tournament.name}</CardTitle>
                        <Badge variant={record.source === 'local' ? 'outline' : 'secondary'}>
                          {record.source === 'local' ? 'Local' : 'Synced'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {record.tournament.region || 'No region'}
                        </span>{' '}
                        {record.tournament.location ? `- ${record.tournament.location}` : ''}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                        <p>Start: {safeFormatDate(record.tournament.startDate)}</p>
                        <p>End: {safeFormatDate(record.tournament.endDate)}</p>
                        <p>Teams: {record.teamsCount}</p>
                        <p>Fixtures: {record.fixturesCount}</p>
                      </div>
                      <p className="text-xs text-slate-500">
                        Last updated {safeFormatDate(record.tournament.updatedAt)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openTournament(record)}>
                          <FolderOpen className="mr-2 h-4 w-4" />
                          Open
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleExportTournament(record)}>
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>

                        {isAuthenticated ? (
                          <Button size="sm" onClick={() => handlePublish(record)} className="bg-sky-700 hover:bg-sky-800">
                            Publish/Sync
                          </Button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button size="sm" disabled>
                                  Publish/Sync
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Sign in to publish</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        <TournamentTableSection
          id="active-tournaments"
          title="Active tournaments"
          description="Planning, started, and currently active tournaments."
          records={activeRecords}
          defaultStatuses={ACTIVE_DEFAULT_FILTER}
          isAuthenticated={isAuthenticated}
          globalSearch={dashboardSearch}
          onOpen={openTournament}
          onPublish={handlePublish}
          onCheckout={handleCheckout}
        />

        <TournamentTableSection
          id="upcoming-tournaments"
          title="Upcoming tournaments"
          description="Future tournaments with checkout and planning visibility."
          records={upcomingRecords}
          defaultStatuses={UPCOMING_DEFAULT_FILTER}
          isAuthenticated={isAuthenticated}
          globalSearch={dashboardSearch}
          onOpen={openTournament}
          onPublish={handlePublish}
          onCheckout={handleCheckout}
        />

        {!isAuthenticated && localRecords.length === 0 && (
          <Card className="border-dashed border-slate-300 bg-white">
            <CardContent className="py-10 text-center">
              <h3 className="text-lg font-semibold text-slate-900">Ready to design your first tournament?</h3>
              <p className="mt-2 text-sm text-slate-600">
                Sign in or create an account to unlock create, import, and publish workflows.
              </p>
              <Button asChild className="mt-4 bg-sky-700 hover:bg-sky-800">
                <Link to="/login">
                  Start designing now!
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
