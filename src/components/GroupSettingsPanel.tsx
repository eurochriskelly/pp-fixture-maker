
import React from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { getGroupPitchIds } from '@/lib/groupPitches';
import { Group } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { createGroupColorMap, getGroupColorFromMap } from '@/lib/groupColors';

export const GroupSettingsPanel = () => {
  const { competitions, pitches, updateGroup } = useTournament();

  const toggleGroupPitch = (
    group: Group & { competitionId: string },
    pitchId: string,
    enabled: boolean
  ) => {
    const currentPitchIds = getGroupPitchIds(group);
    const nextPitchIds = enabled
      ? Array.from(new Set([...currentPitchIds, pitchId]))
      : currentPitchIds.filter((id) => id !== pitchId);

    updateGroup(group.competitionId, group.id, {
      pitchIds: nextPitchIds,
      primaryPitchId: nextPitchIds[0],
    });
  };

  const competitionSections = React.useMemo(
    () =>
      competitions
        .map((comp) => {
          const groups = comp.groups || [];
          const groupColorMap = createGroupColorMap(groups);
          const competitionColor = comp.color ?? '#1e293b';

          return {
            competitionId: comp.id,
            competitionName: comp.name,
            competitionColor,
            groups: groups.map((group) => ({
              ...group,
              competitionId: comp.id,
              competitionName: comp.name,
            })),
            groupColorMap,
          };
        })
        .filter((section) => section.groups.length > 0),
    [competitions]
  );

  const [openCompetitionIds, setOpenCompetitionIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    setOpenCompetitionIds((prev) => {
      const next = competitionSections.map((section) => section.competitionId);
      const matches =
        prev.length === next.length && next.every((id) => prev.includes(id));
      if (matches) return prev;
      return next;
    });
  }, [competitionSections]);

  const toggleCompetition = (competitionId: string) => {
    setOpenCompetitionIds((prev) =>
      prev.includes(competitionId) ? prev.filter((id) => id !== competitionId) : [...prev, competitionId]
    );
  };

  if (competitionSections.length === 0) return null;

  return (
    <Card className="shadow-none border-0 bg-transparent">
      <CardContent className="px-0 space-y-4">
        {competitionSections.map((section) => {
          const isOpen = openCompetitionIds.includes(section.competitionId);

          return (
            <div
              key={section.competitionId}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div
                className="absolute inset-y-0 left-0 w-1 rounded-l-2xl"
                style={{ backgroundColor: section.competitionColor }}
              />
              <button
                type="button"
                onClick={() => toggleCompetition(section.competitionId)}
                className="w-full flex items-center justify-between gap-2 pr-4 pl-6 py-3 text-sm font-semibold text-slate-900"
              >
                <span className="text-sm font-semibold tracking-wide uppercase">
                  {section.competitionName.toUpperCase()}
                </span>
                <span className="flex items-center gap-3 text-[11px] text-muted-foreground uppercase">
                  <span>{section.groups.length} GROUPS</span>
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform duration-200', {
                      'rotate-180': isOpen,
                    })}
                  />
                </span>
              </button>

              {isOpen && (
                <div className="space-y-3 px-4 pb-4 pt-2">
                  {section.groups.map((group, groupIndex) => {
                    const selectedPitchIds = getGroupPitchIds(group);
                    const durationId = `group-${group.id}-duration`;
                    const slackId = `group-${group.id}-slack`;
                    const groupColor = getGroupColorFromMap(section.groupColorMap, group.id);

                    return (
                      <div
                        key={group.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-inner space-y-3 text-xs"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-end gap-6">
                            <span
                              className="rounded-[12px] px-3 py-1 text-sm font-semibold uppercase text-white shadow-sm"
                              style={{ backgroundColor: groupColor }}
                            >
                              GP. {groupIndex + 1}
                            </span>
                            <div className="flex flex-wrap gap-4">
                              <div className="flex flex-col space-y-1">
                                <Label htmlFor={durationId} className="text-[10px] text-muted-foreground uppercase">
                                  DURATION
                                </Label>
                                <Input
                                  id={durationId}
                                  type="number"
                                  className="h-7 w-14 text-xs"
                                  value={group.defaultDuration ?? 20}
                                  onChange={(e) => {
                                    const nextDuration = Number.parseInt(e.target.value, 10);
                                    if (Number.isNaN(nextDuration)) return;
                                    updateGroup(group.competitionId, group.id, {
                                      defaultDuration: Math.max(1, nextDuration),
                                    });
                                  }}
                                />
                              </div>
                              <div className="flex flex-col space-y-1">
                                <Label htmlFor={slackId} className="text-[10px] text-muted-foreground uppercase">
                                  SLACK
                                </Label>
                                <Input
                                  id={slackId}
                                  type="number"
                                  className="h-7 w-14 text-xs"
                                  value={group.defaultSlack ?? 5}
                                  onChange={(e) => {
                                    const nextSlack = Number.parseInt(e.target.value, 10);
                                    if (Number.isNaN(nextSlack)) return;
                                    updateGroup(group.competitionId, group.id, {
                                      defaultSlack: Math.max(0, nextSlack),
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground uppercase">
                            <span>PITCHES</span>
                            <span>{selectedPitchIds.length} ASSIGNED</span>
                          </div>
                          {pitches.length === 0 ? (
                            <div className="text-[11px] text-muted-foreground">
                              Create pitches to assign here.
                            </div>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {pitches.map((pitch) => (
                                <label
                                  key={pitch.id}
                                  className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1 text-[12px] transition-colors hover:border-slate-200"
                                >
                                  <Checkbox
                                    checked={selectedPitchIds.includes(pitch.id)}
                                    onCheckedChange={(checked) =>
                                      toggleGroupPitch(group, pitch.id, checked === true)
                                    }
                                  />
                                  <span className="truncate">{pitch.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
