import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Group, Team, Fixture } from '@/lib/types';
import { Trophy, Plus, Trash2, ArrowRight } from 'lucide-react';

interface KnockoutBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitionId: string;
  groups: Group[];
  teams: Team[];
  existingFixtures?: Fixture[]; // Pass existing fixtures to pre-fill
  onGenerate: (fixtures: any[]) => void;
}

type StageType = 'Round of 16' | 'Quarter-Final' | 'Semi-Final' | 'Final' | '3rd Place Playoff';

interface MatchConfig {
  id: string; // Internal stable ID like "QF1", "Final"
  name: string; // User-editable display name
  homeSource: string;
  awaySource: string;
}

interface StageConfig {
  type: StageType;
  enabled: boolean;
  matches: MatchConfig[];
}

const DEFAULT_STAGES: StageConfig[] = [
  {
    type: 'Round of 16',
    enabled: false,
    matches: Array.from({ length: 8 }).map((_, i) => ({
      id: `R16-${i + 1}`,
      name: `R16 Match ${i + 1}`,
      homeSource: '',
      awaySource: ''
    }))
  },
  {
    type: 'Quarter-Final',
    enabled: false,
    matches: Array.from({ length: 4 }).map((_, i) => ({
      id: `QF${i + 1}`,
      name: `QF ${i + 1}`,
      homeSource: '',
      awaySource: ''
    }))
  },
  {
    type: 'Semi-Final',
    enabled: true,
    matches: Array.from({ length: 2 }).map((_, i) => ({
      id: `SF${i + 1}`,
      name: `SF ${i + 1}`,
      homeSource: '',
      awaySource: ''
    }))
  },
  {
    type: '3rd Place Playoff',
    enabled: false,
    matches: [{
      id: '3rdPlace',
      name: '3rd Place',
      homeSource: 'Loser SF 1',
      awaySource: 'Loser SF 2'
    }]
  },
  {
    type: 'Final',
    enabled: true,
    matches: [{
      id: 'Final',
      name: 'Final',
      homeSource: 'Winner SF 1',
      awaySource: 'Winner SF 2'
    }]
  }
];

export const KnockoutBuilderDialog: React.FC<KnockoutBuilderDialogProps> = ({
  open,
  onOpenChange,
  competitionId,
  groups,
  teams,
  existingFixtures = [],
  onGenerate
}) => {
  const [stages, setStages] = useState<StageConfig[]>(JSON.parse(JSON.stringify(DEFAULT_STAGES)));

  // Reset or preset defaults when opening
  useEffect(() => {
    if (open) {
      // Start with default structure
      const newStages = JSON.parse(JSON.stringify(DEFAULT_STAGES));
      let hasExistingConfig = false;

      // Try to hydrate from existing fixtures if they have matchId
      if (existingFixtures.length > 0) {
        newStages.forEach((stage: StageConfig) => {
           let stageActive = false;
           stage.matches.forEach(match => {
              const existing = existingFixtures.find(f => f.matchId === match.id);
              if (existing) {
                 stageActive = true;
                 hasExistingConfig = true;
                 match.name = existing.description || match.name;
                 match.homeSource = existing.homeTeamId;
                 match.awaySource = existing.awayTeamId;
              }
           });
           // If we found any match for this stage, enable it.
           // Exception: If we only found *some* matches, we still enable the stage.
           if (stageActive) {
             stage.enabled = true;
           }
        });
      }

      // If no existing config found, apply smart defaults
      if (!hasExistingConfig) {
        if (groups.length === 4) {
          const qf = newStages.find((s: StageConfig) => s.type === 'Quarter-Final');
          if (qf) {
            qf.enabled = true;
            qf.matches[0].homeSource = '1st Group A'; qf.matches[0].awaySource = '2nd Group B';
            qf.matches[1].homeSource = '1st Group C'; qf.matches[1].awaySource = '2nd Group D';
            qf.matches[2].homeSource = '1st Group B'; qf.matches[2].awaySource = '2nd Group A';
            qf.matches[3].homeSource = '1st Group D'; qf.matches[3].awaySource = '2nd Group C';
          }
          
          const sf = newStages.find((s: StageConfig) => s.type === 'Semi-Final');
          if (sf) {
            sf.matches[0].homeSource = 'Winner QF 1'; sf.matches[0].awaySource = 'Winner QF 2';
            sf.matches[1].homeSource = 'Winner QF 3'; sf.matches[1].awaySource = 'Winner QF 4';
          }
        } 
        else if (groups.length === 2) {
           const sf = newStages.find((s: StageConfig) => s.type === 'Semi-Final');
           if (sf) {
             sf.enabled = true;
             const g1Name = groups[0]?.name || 'Group A';
             const g2Name = groups[1]?.name || 'Group B';
             
             sf.matches[0].homeSource = `1st ${g1Name}`;
             sf.matches[0].awaySource = `2nd ${g2Name}`;
             sf.matches[1].homeSource = `1st ${g2Name}`;
             sf.matches[1].awaySource = `2nd ${g1Name}`;
           }
        }
      }

      setStages(newStages);
    }
  }, [open, groups.length, existingFixtures]);

  const getSourceOptions = (currentStageIndex: number) => {
    const groupOptions: { value: string; label: string }[] = [];
    const prevStageOptions: { value: string; label: string }[] = [];
    const teamOptions: { value: string; label: string }[] = [];

    // 1. Group Positions
    if (groups.length > 0) {
      groups.forEach((g, i) => {
        const groupLabel = g.name; 
        groupOptions.push({ value: `1st ${groupLabel}`, label: `1st ${groupLabel}` });
        groupOptions.push({ value: `2nd ${groupLabel}`, label: `2nd ${groupLabel}` });
        groupOptions.push({ value: `3rd ${groupLabel}`, label: `3rd ${groupLabel}` });
        groupOptions.push({ value: `4th ${groupLabel}`, label: `4th ${groupLabel}` });
      });
    } else {
        groupOptions.push({ value: '1st Place', label: '1st Place' });
        groupOptions.push({ value: '2nd Place', label: '2nd Place' });
        groupOptions.push({ value: '3rd Place', label: '3rd Place' });
        groupOptions.push({ value: '4th Place', label: '4th Place' });
    }

    // 2. Previous Stages Winners/Losers
    for (let i = 0; i < currentStageIndex; i++) {
      const stage = stages[i];
      if (stage.enabled) {
        stage.matches.forEach(m => {
          if (m.name) {
             prevStageOptions.push({ value: `Winner ${m.name}`, label: `Winner ${m.name}` });
             prevStageOptions.push({ value: `Loser ${m.name}`, label: `Loser ${m.name}` });
          }
        });
      }
    }

    // 3. Specific Teams
    teams.forEach(t => {
      teamOptions.push({ value: t.id, label: t.name });
    });

    return { groupOptions, prevStageOptions, teamOptions };
  };

  const updateMatch = (stageIndex: number, matchIndex: number, field: 'homeSource' | 'awaySource', value: string) => {
    const newStages = [...stages];
    newStages[stageIndex].matches[matchIndex][field] = value;
    setStages(newStages);
  };

  const updateMatchName = (stageIndex: number, matchIndex: number, value: string) => {
    const newStages = [...stages];
    newStages[stageIndex].matches[matchIndex].name = value;
    setStages(newStages);
  }

  const toggleStage = (index: number, enabled: boolean) => {
    const newStages = [...stages];
    newStages[index].enabled = enabled;
    setStages(newStages);
  };

  const clearMatch = (stageIndex: number, matchIndex: number) => {
    const newStages = [...stages];
    newStages[stageIndex].matches[matchIndex].homeSource = '';
    newStages[stageIndex].matches[matchIndex].awaySource = '';
    setStages(newStages);
  };

  const handleGenerate = () => {
    const fixtures: any[] = [];
    
    stages.forEach(stage => {
      if (!stage.enabled) return;

      stage.matches.forEach(match => {
        // We now generate fixtures even if sources are empty, marking them as TBD
        // This allows users to enable a stage and see the matches immediately, then fill them in later
        const homeIsTeam = teams.some(t => t.id === match.homeSource);
        const awayIsTeam = teams.some(t => t.id === match.awaySource);

        fixtures.push({
          matchId: match.id, // Stable ID for upsert
          homeTeamId: homeIsTeam ? match.homeSource : (match.homeSource || 'TBD'),
          awayTeamId: awayIsTeam ? match.awaySource : (match.awaySource || 'TBD'),
          stage: stage.type,
          description: match.name,
          duration: 30,
        });
      });
    });

    onGenerate(fixtures);
    onOpenChange(false);
  };

  // We want to render stages in reverse order (Finals first)
  // But we need the original index for state updates
  const reversedIndices = stages.map((_, i) => i).reverse();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <div className="p-6 pb-2">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Knockout Stage Builder
            </DialogTitle>
            <DialogDescription>
                Configure your playoff structure. Enable stages and define matchups.
            </DialogDescription>
            </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-6 py-4">
            {reversedIndices.map((stageIndex) => {
              const stage = stages[stageIndex];
              return (
              <div key={stage.type} className={`space-y-4 border rounded-xl p-4 transition-colors ${stage.enabled ? 'bg-card border-primary/20 shadow-sm' : 'bg-muted/10 opacity-70'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch 
                      checked={stage.enabled} 
                      onCheckedChange={(checked) => toggleStage(stageIndex, checked)} 
                    />
                    <div>
                        <Label className="text-lg font-semibold cursor-pointer" onClick={() => toggleStage(stageIndex, !stage.enabled)}>{stage.type}</Label>
                        {!stage.enabled && <p className="text-xs text-muted-foreground">Disabled</p>}
                    </div>
                  </div>
                  {stage.enabled && (
                    <div className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                        {stage.matches.length} Match{stage.matches.length !== 1 ? 'es' : ''}
                    </div>
                  )}
                </div>

                {stage.enabled && (
                  <div className="grid gap-3 pt-2">
                    {stage.matches.map((match, matchIndex) => {
                      const { groupOptions, prevStageOptions, teamOptions } = getSourceOptions(stageIndex);
                      
                      return (
                        <div key={match.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-muted/30 p-3 rounded-lg border border-border/50">
                          <div className="md:col-span-2">
                            <Input
                              value={match.name}
                              onChange={(e) => updateMatchName(stageIndex, matchIndex, e.target.value)}
                              className="h-9 bg-background font-medium"
                              placeholder="Match Name"
                            />
                          </div>
                          
                          <div className="md:col-span-4">
                            <Select
                              value={match.homeSource}
                              onValueChange={(val) => updateMatch(stageIndex, matchIndex, 'homeSource', val)}
                            >
                              <SelectTrigger className="h-9 bg-background">
                                <SelectValue placeholder="Home Team" />
                              </SelectTrigger>
                              <SelectContent>
                                {groupOptions.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>Group Positions</SelectLabel>
                                        {groupOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectGroup>
                                )}
                                {prevStageOptions.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>From Previous Round</SelectLabel>
                                        {prevStageOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectGroup>
                                )}
                                {teamOptions.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>Specific Teams</SelectLabel>
                                        {teamOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectGroup>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="md:col-span-1 flex justify-center">
                            <div className="bg-muted text-muted-foreground text-xs font-bold px-2 py-1 rounded-full">VS</div>
                          </div>

                          <div className="md:col-span-4">
                            <Select
                              value={match.awaySource}
                              onValueChange={(val) => updateMatch(stageIndex, matchIndex, 'awaySource', val)}
                            >
                              <SelectTrigger className="h-9 bg-background">
                                <SelectValue placeholder="Away Team" />
                              </SelectTrigger>
                              <SelectContent>
                                {groupOptions.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>Group Positions</SelectLabel>
                                        {groupOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectGroup>
                                )}
                                {prevStageOptions.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>From Previous Round</SelectLabel>
                                        {prevStageOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectGroup>
                                )}
                                {teamOptions.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>Specific Teams</SelectLabel>
                                        {teamOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectGroup>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="md:col-span-1 flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => clearMatch(stageIndex, matchIndex)}
                              title="Clear match"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 pt-2 border-t mt-auto">
            <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleGenerate} className="gap-2">
                <Trophy className="w-4 h-4" />
                {existingFixtures.length > 0 ? 'Update Fixtures' : 'Generate Fixtures'}
            </Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
