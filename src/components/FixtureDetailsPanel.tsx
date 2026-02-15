import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Fixture, PitchBreakItem } from '@/lib/types';
import { useTournament } from '@/context/TournamentContext';
import { TeamBadge } from './FixtureComponents';
import { Clock, Trophy, X, Save, Trash2, Shield, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FixtureDetailsPanelProps {
  fixtureId: string | null;
  onClose: () => void;
  pitchBreaks: PitchBreakItem[];
}

export const FixtureDetailsPanel: React.FC<FixtureDetailsPanelProps> = ({
  fixtureId,
  onClose,
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
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (data) {
      setDuration(data.fixture.duration?.toString() ?? '');
      setSlack(data.fixture.slack?.toString() ?? '');
      setRest(data.fixture.rest?.toString() ?? '');
      setHasChanges(false);
    }
  }, [data?.fixture.id]); // Reset when fixture changes

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setHasChanges(true);
  };

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
    }, true, pitchBreaks); // true = shouldRecalculate
    setHasChanges(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this fixture?')) {
      deleteFixture(comp.id, fixture.id, true, pitchBreaks);
      onClose();
    }
  };

  const homeName = home?.name || (fixture.homeTeamId === 'TBD' ? 'TBD' : fixture.description?.split(' vs ')[0] || 'Bye');
  const awayName = away?.name || (fixture.awayTeamId === 'TBD' ? 'TBD' : fixture.description?.split(' vs ')[1] || 'Bye');

  return (
    <div className="h-full flex flex-col bg-background border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
             <div className="w-1 h-6 rounded-full" style={{ backgroundColor: comp.color }} />
             <span className="font-bold text-sm tracking-tight">{comp.name.toUpperCase()}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
             <Trophy className="w-3.5 h-3.5" />
             <span>{fixture.stage || 'Group Stage'}</span>
             {group && <span>• {group.name}</span>}
          </div>
          {fixture.matchId && (
             <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground border">
               ID: {fixture.matchId}
             </span>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full hover:bg-muted" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex gap-6 p-4 overflow-hidden">
        
        {/* Left Column: Matchup */}
        <div className="flex-1 flex flex-col justify-center min-w-[300px]">
           <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2 text-center w-32">
                 <div className="scale-150 p-1"><TeamBadge team={home} /></div>
                 <div>
                    <div className="font-bold leading-tight truncate w-full">{homeName}</div>
                    {home?.clubId && <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Shield className="w-3 h-3"/> {home.initials}</div>}
                 </div>
              </div>
              
              <div className="flex flex-col items-center gap-1">
                 <span className="text-xl font-black text-muted-foreground/30">VS</span>
                 {fixture.startTime && (
                    <span className="text-xs font-medium bg-secondary px-2 py-0.5 rounded flex items-center gap-1">
                       <Clock className="w-3 h-3" /> {fixture.startTime}
                    </span>
                 )}
              </div>

              <div className="flex flex-col items-center gap-2 text-center w-32">
                 <div className="scale-150 p-1"><TeamBadge team={away} /></div>
                 <div>
                    <div className="font-bold leading-tight truncate w-full">{awayName}</div>
                    {away?.clubId && <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Shield className="w-3 h-3"/> {away.initials}</div>}
                 </div>
              </div>
           </div>
        </div>

        <Separator orientation="vertical" />

        {/* Middle Column: Timing Configuration */}
        <div className="flex-[1.2] flex flex-col justify-center">
           <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="duration" className="text-xs font-semibold text-muted-foreground">Duration</Label>
                    {duration && duration !== (group?.defaultDuration ?? 20).toString() && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                  </div>
                  <div className="relative">
                    <Input 
                        id="duration" 
                        type="number" 
                        value={duration} 
                        onChange={(e) => handleInputChange(setDuration, e.target.value)} 
                        placeholder={effectiveDuration.toString()}
                        className={cn("h-8 text-sm", duration ? "border-blue-300 bg-blue-50/50 font-medium" : "")}
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-muted-foreground pointer-events-none">min</span>
                  </div>
              </div>

              <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="slack" className="text-xs font-semibold text-muted-foreground">Slack</Label>
                    {slack && slack !== (group?.defaultSlack ?? 5).toString() && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                  </div>
                  <div className="relative">
                    <Input 
                        id="slack" 
                        type="number" 
                        value={slack} 
                        onChange={(e) => handleInputChange(setSlack, e.target.value)} 
                        placeholder={effectiveSlack.toString()}
                        className={cn("h-8 text-sm", slack ? "border-blue-300 bg-blue-50/50 font-medium" : "")}
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-muted-foreground pointer-events-none">min</span>
                  </div>
              </div>

              <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rest" className="text-xs font-semibold text-muted-foreground">Rest</Label>
                    {rest && rest !== (group?.defaultRest ?? 20).toString() && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                  </div>
                  <div className="relative">
                    <Input 
                        id="rest" 
                        type="number" 
                        value={rest} 
                        onChange={(e) => handleInputChange(setRest, e.target.value)} 
                        placeholder={effectiveRest.toString()}
                        className={cn("h-8 text-sm", rest ? "border-blue-300 bg-blue-50/50 font-medium" : "")}
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-muted-foreground pointer-events-none">min</span>
                  </div>
              </div>
           </div>
           <div className="mt-3 flex items-start gap-2 text-[10px] text-muted-foreground bg-slate-50 p-2 rounded border border-slate-100">
              <AlertCircle className="w-3 h-3 mt-0.5 text-blue-500" />
              <p>Overrides apply only to this specific match. Empty values inherit from Group settings ({group?.defaultDuration ?? 20}m / {group?.defaultSlack ?? 5}m / {group?.defaultRest ?? 20}m).</p>
           </div>
        </div>

        <Separator orientation="vertical" />

        {/* Right Column: Actions */}
        <div className="flex flex-col justify-center gap-3 min-w-[140px]">
           <Button 
             onClick={handleSave} 
             disabled={!hasChanges}
             className={cn("w-full gap-2 transition-all", hasChanges ? "bg-primary shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80")}
           >
             <Save className="w-4 h-4" />
             {hasChanges ? "Save Changes" : "No Changes"}
           </Button>
           
           <Button variant="outline" onClick={handleDelete} className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20">
             <Trash2 className="w-4 h-4" />
             Delete
           </Button>
        </div>

      </div>
    </div>
  );
};