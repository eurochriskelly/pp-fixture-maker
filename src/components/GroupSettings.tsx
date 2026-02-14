
import React, { useState } from 'react';
import { Group } from '@/lib/types';
import { useTournament } from '@/context/TournamentContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { getGroupPitchIds } from '@/lib/groupPitches';

interface GroupSettingsProps {
    competitionId: string;
    group: Group;
}

export const GroupSettings: React.FC<GroupSettingsProps> = ({ competitionId, group }) => {
    const { updateGroup, pitches } = useTournament();
    const [open, setOpen] = useState(false);
    const [duration, setDuration] = useState(group.defaultDuration || 20);
    const [slack, setSlack] = useState(group.defaultSlack || 5);
    const [pitchId, setPitchId] = useState(getGroupPitchIds(group)[0] || 'none');

    const handleSave = () => {
        const nextPitchIds = pitchId === 'none' ? [] : [pitchId];
        updateGroup(competitionId, group.id, {
            defaultDuration: duration,
            defaultSlack: slack,
            pitchIds: nextPitchIds,
            primaryPitchId: nextPitchIds[0]
        });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Settings className="h-3 w-3 text-muted-foreground" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Group Settings - {group.name}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Default Match Duration (mins)</Label>
                        <Input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value))}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Default Slack (mins)</Label>
                        <Input
                            type="number"
                            value={slack}
                            onChange={(e) => setSlack(parseInt(e.target.value))}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Primary Pitch</Label>
                        <Select value={pitchId} onValueChange={setPitchId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a pitch" />
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
                <DialogFooter>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
