
import React from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export const GroupSettingsPanel = () => {
    const { competitions, pitches, updateGroup } = useTournament();

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
                {allGroups.map(group => (
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
                                    value={group.defaultDuration || 20}
                                    onChange={(e) => updateGroup(group.competitionId, group.id, { defaultDuration: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Slack</Label>
                                <Input
                                    type="number"
                                    className="h-7 text-xs"
                                    value={group.defaultSlack || 5}
                                    onChange={(e) => updateGroup(group.competitionId, group.id, { defaultSlack: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Primary Pitch</Label>
                            <Select
                                value={group.primaryPitchId || "none"}
                                onValueChange={(val) => updateGroup(group.competitionId, group.id, { primaryPitchId: val === "none" ? undefined : val })}
                            >
                                <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Select Pitch" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {pitches.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
