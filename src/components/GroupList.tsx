
import React from 'react';
import { Group, Team } from '@/lib/types';
import { useTournament } from '@/context/TournamentContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical, Pencil } from 'lucide-react';
import { TeamEditDialog } from '@/components/TeamEditDialog';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getGroupPitchIds } from '@/lib/groupPitches';

interface GroupListProps {
    competitionId: string;
    groups: Group[];
    teams: Team[];
}

export const GroupList: React.FC<GroupListProps> = ({ competitionId, groups, teams }) => {
    const { moveTeamToGroup, deleteGroup, updateGroup, pitches } = useTournament();

    const onDragStart = (e: React.DragEvent, teamId: string) => {
        e.dataTransfer.setData('teamId', teamId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const onDrop = (e: React.DragEvent, groupId: string | undefined) => {
        e.preventDefault();
        const teamId = e.dataTransfer.getData('teamId');
        if (teamId) {
            moveTeamToGroup(competitionId, teamId, groupId);
        }
    };

    const unassignedTeams = teams.filter(t => !t.groupId);

    const toggleGroupPitch = (group: Group, pitchId: string, enabled: boolean) => {
        const currentPitchIds = getGroupPitchIds(group);
        const nextPitchIds = enabled
            ? Array.from(new Set([...currentPitchIds, pitchId]))
            : currentPitchIds.filter((id) => id !== pitchId);

        updateGroup(competitionId, group.id, {
            pitchIds: nextPitchIds,
            primaryPitchId: nextPitchIds[0],
        });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Unassigned Teams */}
                <Card
                    className="border-dashed border-2 bg-slate-50/50"
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, undefined)}
                >
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex justify-between items-center">
                            Unassigned Teams ({unassignedTeams.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 min-h-[100px]">
                        {unassignedTeams.map((team, index) => (
                            <div
                                key={team.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, team.id)}
                                className="flex items-center gap-2 p-2 bg-white border rounded cursor-move hover:shadow-sm transition-all"
                            >
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1 flex justify-between items-center group/team">
                                    <span className="text-sm font-medium">{team.name}</span>
                                    <div className="opacity-0 group-hover/team:opacity-100 transition-opacity">
                                        <TeamEditDialog competitionId={competitionId} team={team}>
                                            <Button variant="ghost" size="icon" className="h-4 w-4">
                                                <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                                            </Button>
                                        </TeamEditDialog>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {unassignedTeams.length === 0 && (
                            <div className="text-center text-xs text-muted-foreground py-4">No unassigned teams</div>
                        )}
                    </CardContent>
                </Card>

                {/* Groups */}
                {groups.map(group => {
                    const groupTeams = teams.filter(t => t.groupId === group.id);
                    const selectedPitchIds = getGroupPitchIds(group);
                    return (
                        <Card
                            key={group.id}
                            onDragOver={onDragOver}
                            onDrop={(e) => onDrop(e, group.id)}
                        >
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex justify-between items-center">
                                    <span>{group.name} ({groupTeams.length})</span>
                                    <div className="flex items-center gap-1">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] font-normal">
                                                    {selectedPitchIds.length > 0
                                                        ? `${selectedPitchIds.length} pitch${selectedPitchIds.length === 1 ? '' : 'es'}`
                                                        : 'Pitches'}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44">
                                                {pitches.length === 0 ? (
                                                    <DropdownMenuItem disabled>No pitches yet</DropdownMenuItem>
                                                ) : (
                                                    pitches.map((pitch) => (
                                                        <DropdownMenuCheckboxItem
                                                            key={pitch.id}
                                                            checked={selectedPitchIds.includes(pitch.id)}
                                                            onCheckedChange={(checked) =>
                                                                toggleGroupPitch(group, pitch.id, checked === true)
                                                            }
                                                            onSelect={(event) => event.preventDefault()}
                                                        >
                                                            {pitch.name}
                                                        </DropdownMenuCheckboxItem>
                                                    ))
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={() => deleteGroup(competitionId, group.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 min-h-[100px]">
                                {groupTeams.map((team) => (
                                    <div
                                        key={team.id}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, team.id)}
                                        className="flex items-center gap-2 p-2 bg-secondary/20 border rounded cursor-move hover:bg-secondary/30 transition-all"
                                    >
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex-1 flex items-center justify-between group/team gap-2">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold border shadow-sm overflow-hidden relative"
                                                    style={{
                                                        backgroundColor: team.primaryColor || '#f1f5f9',
                                                        color: team.secondaryColor || '#64748b'
                                                    }}
                                                >
                                                    {team.crest ? (
                                                        <img src={team.crest} alt={team.name} className="w-full h-full object-contain p-0.5" />
                                                    ) : (
                                                        team.initials || team.name.substring(0, 2).toUpperCase()
                                                    )}
                                                </div>
                                                <span className="text-sm font-medium">{team.name}</span>
                                            </div>
                                            <div className="opacity-0 group-hover/team:opacity-100 transition-opacity">
                                                <TeamEditDialog competitionId={competitionId} team={team}>
                                                    <Button variant="ghost" size="icon" className="h-4 w-4">
                                                        <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                                                    </Button>
                                                </TeamEditDialog>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {groupTeams.length === 0 && (
                                    <div className="text-center text-xs text-muted-foreground py-4">Drop teams here</div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
