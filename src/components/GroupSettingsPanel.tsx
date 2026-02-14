
import React from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

    // Flatten groups from all competitions
    const allGroups = competitions.flatMap(comp =>
        (comp.groups || []).map(group => ({
            ...group,
            competitionName: comp.name,
            competitionId: comp.id
        }))
    );

    if (allGroups.length === 0) return null;

    return (
        <Card className="shadow-none border-0 bg-transparent">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg">Group Settings</CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
                {allGroups.map(group => {
                    const selectedPitchIds = getGroupPitchIds(group);

                    return (
                        <div key={group.id} className="p-3 bg-slate-50 rounded border text-sm space-y-3">
                            <div className="font-semibold flex justify-between">
                                <span>{group.name}</span>
                                <span className="text-xs text-muted-foreground font-normal">{group.competitionName}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs">Duration</Label>
                                    <Input
                                        type="number"
                                        className="h-7 text-xs"
                                        value={group.defaultDuration ?? 20}
                                        onChange={(e) => {
                                            const nextDuration = Number.parseInt(e.target.value, 10);
                                            if (Number.isNaN(nextDuration)) return;
                                            updateGroup(group.competitionId, group.id, { defaultDuration: Math.max(1, nextDuration) });
                                        }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Slack</Label>
                                    <Input
                                        type="number"
                                        className="h-7 text-xs"
                                        value={group.defaultSlack ?? 5}
                                        onChange={(e) => {
                                            const nextSlack = Number.parseInt(e.target.value, 10);
                                            if (Number.isNaN(nextSlack)) return;
                                            updateGroup(group.competitionId, group.id, { defaultSlack: Math.max(0, nextSlack) });
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs">Pitches</Label>
                                <div className="space-y-1.5">
                                    {pitches.length === 0 && (
                                        <div className="text-[11px] text-muted-foreground">No pitches created yet.</div>
                                    )}
                                    {pitches.map((pitch) => {
                                        return (
                                            <label key={pitch.id} className="flex items-center gap-2 text-xs">
                                                <Checkbox
                                                    checked={selectedPitchIds.includes(pitch.id)}
                                                    onCheckedChange={(checked) =>
                                                        toggleGroupPitch(group, pitch.id, checked === true)
                                                    }
                                                />
                                                <span>{pitch.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
