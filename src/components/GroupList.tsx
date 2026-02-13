
import React, { useState } from 'react';
import { Group, Team } from '@/lib/types';
import { useTournament } from '@/context/TournamentContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, GripVertical, Plus, Pencil } from 'lucide-react';
import { TeamEditDialog } from '@/components/TeamEditDialog';

interface GroupListProps {
    competitionId: string;
    groups: Group[];
    teams: Team[];
}

export const GroupList: React.FC<GroupListProps> = ({ competitionId, groups, teams }) => {
    const { moveTeamToGroup, deleteGroup, createGroup, deleteTeam, updateTeam } = useTournament();
    const [newGroupName, setNewGroupName] = useState('');

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

    const handleCreateGroup = () => {
        if (newGroupName) {
            createGroup(competitionId, newGroupName);
            setNewGroupName('');
        }
    };

    const unassignedTeams = teams.filter(t => !t.groupId);

    return (
        <div className="space-y-6">
            <div className="flex gap-2 items-center">
                <Input
                    placeholder="New Group Name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                    className="max-w-xs"
                />
                <Button onClick={handleCreateGroup} disabled={!newGroupName}>
                    <Plus className="mr-2 h-4 w-4" /> Add Group
                </Button>
            </div>

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
                    return (
                        <Card
                            key={group.id}
                            onDragOver={onDragOver}
                            onDrop={(e) => onDrop(e, group.id)}
                        >
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex justify-between items-center">
                                    <span>{group.name} ({groupTeams.length})</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                        onClick={() => deleteGroup(competitionId, group.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
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
                                                    className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold border shadow-sm"
                                                    style={{
                                                        backgroundColor: team.primaryColor || '#f1f5f9',
                                                        color: team.secondaryColor || '#64748b'
                                                    }}
                                                >
                                                    {team.initials || team.name.substring(0, 2).toUpperCase()}
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
