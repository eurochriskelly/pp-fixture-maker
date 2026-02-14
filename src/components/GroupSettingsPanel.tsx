
import React from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { getGroupPitchIds } from '@/lib/groupPitches';
import { Group } from '@/lib/types';

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

  const allGroups = competitions.flatMap((comp) =>
    (comp.groups || []).map((group) => ({
      ...group,
      competitionName: comp.name,
      competitionId: comp.id,
    }))
  );

  if (allGroups.length === 0) return null;

  return (
    <Card className="shadow-none border-0 bg-transparent">
      <CardContent className="px-0 space-y-4">
        {allGroups.map((group) => {
          const selectedPitchIds = getGroupPitchIds(group);

          return (
            <div
              key={group.id}
              className="p-3 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{group.name}</div>
                  <p className="text-[11px] text-muted-foreground">Settings for this group</p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                  {group.competitionName}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px]">Duration</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={group.defaultDuration ?? 20}
                    onChange={(e) => {
                      const nextDuration = Number.parseInt(e.target.value, 10);
                      if (Number.isNaN(nextDuration)) return;
                      updateGroup(group.competitionId, group.id, { defaultDuration: Math.max(1, nextDuration) });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Slack</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={group.defaultSlack ?? 5}
                    onChange={(e) => {
                      const nextSlack = Number.parseInt(e.target.value, 10);
                      if (Number.isNaN(nextSlack)) return;
                      updateGroup(group.competitionId, group.id, { defaultSlack: Math.max(0, nextSlack) });
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Pitches</span>
                  <span>{selectedPitchIds.length} assigned</span>
                </div>
                {pitches.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground">Create pitches to assign here.</div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {pitches.map((pitch) => (
                      <label
                        key={pitch.id}
                        className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1 text-[12px] transition-colors hover:border-slate-200"
                      >
                        <Checkbox
                          checked={selectedPitchIds.includes(pitch.id)}
                          onCheckedChange={(checked) => toggleGroupPitch(group, pitch.id, checked === true)}
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
      </CardContent>
    </Card>
  );
};
