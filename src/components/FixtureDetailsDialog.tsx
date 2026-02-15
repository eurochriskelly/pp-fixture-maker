import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Fixture, Competition, PitchBreakItem } from '@/lib/types';
import { useTournament } from '@/context/TournamentContext';
import { TeamBadge } from './FixtureComponents';
import { Clock, Calendar, Users, Trophy } from 'lucide-react';

interface FixtureDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixtureId: string | null;
  pitchBreaks: PitchBreakItem[];
}

export const FixtureDetailsDialog: React.FC<FixtureDetailsDialogProps> = ({
  open,
  onOpenChange,
  fixtureId,
  pitchBreaks
}) => {
  const { competitions, updateFixture, deleteFixture } = useTournament();
  
  // Find fixture and related data
  const data = React.useMemo(() => {
    if (!fixtureId) return null;
    for (const comp of competitions) {
      const fixture = comp.fixtures.find(f => f.id === fixtureId);
      if (fixture) {
        const home = comp.teams.find(t => t.id === fixture.homeTeamId);
        const away = comp.teams.find(t => t.id === fixture.awayTeamId);
        const group = fixture.groupId ? comp.groups?.find(g => g.id === fixture.groupId) : undefined;
        return { comp, fixture, home, away, group };
      }
    }
    return null;
  }, [competitions, fixtureId]);

  const [duration, setDuration] = useState<string>('');
  const [slack, setSlack] = useState<string>('');
  const [rest, setRest] = useState<string>('');

  useEffect(() => {
    if (data && open) {
      // Set initial values from fixture overrides or group defaults (for display)
      // BUT for input fields, we only want to show the override value if present.
      // If no override, we might show placeholder with the effective default.
      
      setDuration(data.fixture.duration?.toString() ?? '');
      setSlack(data.fixture.slack?.toString() ?? '');
      setRest(data.fixture.rest?.toString() ?? '');
    }
  }, [data, open]);

  if (!data) return null;

  const { comp, fixture, home, away, group } = data;

  const effectiveDuration = fixture.duration ?? group?.defaultDuration ?? 20;
  const effectiveSlack = fixture.slack ?? group?.defaultSlack ?? 5;
  const effectiveRest = fixture.rest ?? group?.defaultRest ?? 20;

  const handleSave = () => {
    updateFixture(comp.id, fixture.id, {
      duration: duration ? parseInt(duration) : undefined,
      slack: slack ? parseInt(slack) : undefined,
      rest: rest ? parseInt(rest) : undefined
    }, true, pitchBreaks);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this fixture?')) {
      deleteFixture(comp.id, fixture.id, true, pitchBreaks);
      onOpenChange(false);
    }
  };

  const homeName = home?.name || (fixture.homeTeamId === 'TBD' ? 'TBD' : fixture.description?.split(' vs ')[0] || 'Bye');
  const awayName = away?.name || (fixture.awayTeamId === 'TBD' ? 'TBD' : fixture.description?.split(' vs ')[1] || 'Bye');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
             <Trophy className="w-3 h-3" />
             <span>{comp.name}</span>
             {group && (
                <>
                    <span>•</span>
                    <span>{group.name}</span>
                </>
             )}
          </div>
          <DialogTitle className="flex flex-col gap-4 items-center pt-2">
            <div className="flex items-center justify-between w-full gap-4">
                <div className="flex flex-col items-center flex-1 text-center gap-2">
                    <div className="scale-125"><TeamBadge team={home} /></div>
                    <span className="font-bold leading-tight">{homeName}</span>
                </div>
                <div className="text-muted-foreground font-semibold text-sm">VS</div>
                <div className="flex flex-col items-center flex-1 text-center gap-2">
                    <div className="scale-125"><TeamBadge team={away} /></div>
                    <span className="font-bold leading-tight">{awayName}</span>
                </div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {fixture.startTime ? (
                <span className="inline-flex items-center gap-1 bg-secondary px-2 py-1 rounded text-secondary-foreground font-medium">
                    <Clock className="w-3 h-3" /> {fixture.startTime}
                </span>
            ) : (
                <span className="italic">Unscheduled</span>
            )}
            {fixture.matchId && <div className="mt-1 font-mono text-xs text-muted-foreground">Match ID: {fixture.matchId}</div>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" /> Timing Overrides
            </h4>
            
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="duration" className="text-xs">Duration</Label>
                    <Input 
                        id="duration" 
                        type="number" 
                        value={duration} 
                        onChange={(e) => setDuration(e.target.value)} 
                        placeholder={effectiveDuration.toString()}
                    />
                    <p className="text-[10px] text-muted-foreground">Match length</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="slack" className="text-xs">Slack</Label>
                    <Input 
                        id="slack" 
                        type="number" 
                        value={slack} 
                        onChange={(e) => setSlack(e.target.value)} 
                        placeholder={effectiveSlack.toString()}
                    />
                    <p className="text-[10px] text-muted-foreground">Post-match gap</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="rest" className="text-xs">Team Rest</Label>
                    <Input 
                        id="rest" 
                        type="number" 
                        value={rest} 
                        onChange={(e) => setRest(e.target.value)} 
                        placeholder={effectiveRest.toString()}
                    />
                    <p className="text-[10px] text-muted-foreground">Min rest after</p>
                </div>
            </div>
            <div className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded">
                Values left empty will use the group default. Placeholder shows current effective value.
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
          <Button variant="destructive" size="sm" onClick={handleDelete}>Delete Fixture</Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};