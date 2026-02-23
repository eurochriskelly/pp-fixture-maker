import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Fixture, PitchBreakItem } from '@/lib/types';
import { useTournament } from '@/context/TournamentContext';
import { TeamBadge } from './FixtureComponents';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Trophy, X, Save, Trash2, Shield, AlertCircle, RotateCcw } from 'lucide-react';
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
  const { competitions, pitches, updateFixture, deleteFixture } = useTournament();
  
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
  const [umpireType, setUmpireType] = useState<'by-id' | 'by-match'>('by-id');
  const [umpireTeamId, setUmpireTeamId] = useState<string>('');
  const [umpireResultType, setUmpireResultType] = useState<'Winner' | 'Loser'>('Loser');
  const [umpireMatchId, setUmpireMatchId] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const pitchNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    pitches.forEach((pitch) => map.set(pitch.id, pitch.name));
    return map;
  }, [pitches]);

  useEffect(() => {
    if (data) {
      setDuration(data.fixture.duration?.toString() ?? '');
      setSlack(data.fixture.slack?.toString() ?? '');
      setRest(data.fixture.rest?.toString() ?? '');
      if (!data.fixture.umpireTeam) {
        setUmpireType('by-id');
        setUmpireTeamId('');
        setUmpireResultType('Loser');
        setUmpireMatchId('');
      } else if (data.fixture.umpireTeam.type === 'by-id') {
        setUmpireType('by-id');
        setUmpireTeamId(data.fixture.umpireTeam.value);
        setUmpireResultType('Loser');
        setUmpireMatchId('');
      } else {
        const parsed = data.fixture.umpireTeam.value.match(/^(Winner|Loser)\s+(.+)$/i);
        setUmpireType('by-match');
        setUmpireTeamId('');
        setUmpireResultType(parsed?.[1]?.toLowerCase() === 'winner' ? 'Winner' : 'Loser');
        setUmpireMatchId(parsed?.[2] ?? '');
      }
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

  // Group defaults for placeholders
  const defaultDuration = group?.defaultDuration ?? 20;
  const defaultSlack = group?.defaultSlack ?? 5;
  const defaultRest = group?.defaultRest ?? 20;

  const handleSave = () => {
    const nextUmpireTeam: Fixture['umpireTeam'] =
      umpireType === 'by-id'
        ? (umpireTeamId ? { type: 'by-id', value: umpireTeamId } : undefined)
        : (umpireMatchId ? { type: 'by-match', value: `${umpireResultType} ${umpireMatchId}` } : undefined);

    updateFixture(comp.id, fixture.id, {
      duration: duration ? parseInt(duration) : undefined,
      slack: slack ? parseInt(slack) : undefined,
      rest: rest ? parseInt(rest) : undefined,
      umpireTeam: nextUmpireTeam,
    }, true, pitchBreaks); // true = shouldRecalculate
    setHasChanges(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this fixture?')) {
      deleteFixture(comp.id, fixture.id, true, pitchBreaks);
      onClose();
    }
  };

  const renderTimingInput = (
    id: string,
    label: string,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    defaultValue: number
  ) => {
    const isOverride = value !== '';
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between h-5">
          <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground">{label}</Label>
          {isOverride && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 px-1.5 text-[10px] text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              onClick={() => handleInputChange(setter, '')}
              title="Reset to group default"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
        <div className="relative group">
          <Input 
            id={id} 
            type="number" 
            value={value} 
            onChange={(e) => handleInputChange(setter, e.target.value)} 
            placeholder={defaultValue.toString()}
            className={cn(
              "h-8 text-sm pr-8 transition-colors", 
              isOverride 
                ? "border-amber-300 bg-amber-50/30 text-amber-900 font-medium focus-visible:ring-amber-400" 
                : "text-muted-foreground"
            )}
          />
          <span className={cn(
            "absolute right-2.5 top-2 text-[10px] pointer-events-none transition-colors",
            isOverride ? "text-amber-700/60" : "text-muted-foreground/50"
          )}>min</span>
        </div>
      </div>
    );
  };

  const homeName = home?.name || (fixture.homeTeamId === 'TBD' ? 'TBD' : fixture.description?.split(' vs ')[0] || 'Bye');
  const awayName = away?.name || (fixture.awayTeamId === 'TBD' ? 'TBD' : fixture.description?.split(' vs ')[1] || 'Bye');

  const hasOverrides = duration !== '' || slack !== '' || rest !== '';
  const matchCandidates = comp.fixtures
    .filter((candidate) => candidate.id !== fixture.id && candidate.matchId)
    .sort((a, b) => {
      const aSamePitch = a.pitchId === fixture.pitchId ? 0 : 1;
      const bSamePitch = b.pitchId === fixture.pitchId ? 0 : 1;
      if (aSamePitch !== bSamePitch) return aSamePitch - bSamePitch;
      const aTime = a.startTime || '99:99';
      const bTime = b.startTime || '99:99';
      if (aTime !== bTime) return aTime.localeCompare(bTime);
      return (a.matchId || '').localeCompare(b.matchId || '');
    });
  const samePitchMatches = matchCandidates.filter((candidate) => candidate.pitchId === fixture.pitchId);
  const otherPitchMatches = matchCandidates.filter((candidate) => candidate.pitchId !== fixture.pitchId);

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
                       <Clock className="w-3 h-3" /> 
                       <span className={cn(hasOverrides && "text-amber-700 font-bold")}>
                         {fixture.startTime}
                       </span>
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
              {renderTimingInput('duration', 'Duration', duration, setDuration, defaultDuration)}
              {renderTimingInput('slack', 'Slack', slack, setSlack, defaultSlack)}
              {renderTimingInput('rest', 'Rest', rest, setRest, defaultRest)}
           </div>
           
           <div className="mt-4 flex items-start gap-2 text-[10px] text-muted-foreground bg-slate-50 p-2.5 rounded border border-slate-100">
              <AlertCircle className={cn("w-3.5 h-3.5 mt-0.5", hasOverrides ? "text-amber-500" : "text-slate-400")} />
              <div>
                <p>Timing configuration for this specific match.</p>
                {hasOverrides ? (
                  <p className="text-amber-700 font-medium mt-0.5">Custom overrides are active. Default settings are ignored.</p>
                ) : (
                  <p className="opacity-80 mt-0.5">Currently using defaults from {group ? group.name : 'Competition'}. Enter values above to override.</p>
                )}
              </div>
           </div>

           <div className="mt-4 space-y-2 rounded border border-slate-200 bg-white p-2.5">
             <div className="text-xs font-semibold text-muted-foreground">Umpire Configuration</div>
             <div className="grid grid-cols-2 gap-2">
               <Select
                 value={umpireType}
                 onValueChange={(value: 'by-id' | 'by-match') => {
                   setUmpireType(value);
                   setHasChanges(true);
                 }}
               >
                 <SelectTrigger className="h-8 text-xs">
                   <SelectValue placeholder="Type" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="by-id">By Team</SelectItem>
                   <SelectItem value="by-match">By Match Result</SelectItem>
                 </SelectContent>
               </Select>

               {umpireType === 'by-id' ? (
                 <Select
                   value={umpireTeamId}
                   onValueChange={(value) => {
                     setUmpireTeamId(value);
                     setHasChanges(true);
                   }}
                 >
                   <SelectTrigger className="h-8 text-xs">
                     <SelectValue placeholder="Select team" />
                   </SelectTrigger>
                   <SelectContent>
                     {comp.teams.map((team) => (
                       <SelectItem key={team.id} value={team.id}>
                         {team.name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               ) : (
                 <div className="grid grid-cols-2 gap-2">
                   <Select
                     value={umpireResultType}
                     onValueChange={(value: 'Winner' | 'Loser') => {
                       setUmpireResultType(value);
                       setHasChanges(true);
                     }}
                   >
                     <SelectTrigger className="h-8 text-xs">
                       <SelectValue placeholder="Result" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="Winner">Winner</SelectItem>
                       <SelectItem value="Loser">Loser</SelectItem>
                     </SelectContent>
                   </Select>
                   <Select
                     value={umpireMatchId}
                     onValueChange={(value) => {
                       setUmpireMatchId(value);
                       setHasChanges(true);
                     }}
                   >
                     <SelectTrigger className="h-8 text-xs">
                       <SelectValue placeholder="Select match" />
                     </SelectTrigger>
                     <SelectContent>
                       {samePitchMatches.length > 0 && (
                         <SelectGroup>
                           <SelectLabel>Same Pitch</SelectLabel>
                           {samePitchMatches.map((candidate) => (
                             <SelectItem key={candidate.id} value={candidate.matchId!}>
                               {candidate.matchId} {candidate.startTime ? ` ${candidate.startTime}` : ''}
                             </SelectItem>
                           ))}
                         </SelectGroup>
                       )}
                       {samePitchMatches.length > 0 && otherPitchMatches.length > 0 && <SelectSeparator />}
                       {otherPitchMatches.length > 0 && (
                         <SelectGroup>
                           <SelectLabel>Other Pitches</SelectLabel>
                           {otherPitchMatches.map((candidate) => (
                             <SelectItem key={candidate.id} value={candidate.matchId!}>
                               {candidate.pitchId ? `${pitchNameById.get(candidate.pitchId) || candidate.pitchId} - ` : ''}{candidate.matchId}
                               {candidate.startTime ? ` ${candidate.startTime}` : ''}
                             </SelectItem>
                           ))}
                         </SelectGroup>
                       )}
                     </SelectContent>
                   </Select>
                 </div>
               )}
             </div>
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
