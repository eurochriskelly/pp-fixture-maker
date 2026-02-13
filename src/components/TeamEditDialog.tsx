
import React, { useState } from 'react';
import { Team } from '@/lib/types';
import { useTournament } from '@/context/TournamentContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Pencil } from 'lucide-react';

interface TeamEditDialogProps {
    competitionId: string;
    team: Team;
    children?: React.ReactNode;
}

const PRESET_COLORS = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#6366f1', // indigo-500
    '#a855f7', // purple-500
    '#ec4899', // pink-500
    '#64748b', // slate-500
    '#000000', // black
    '#ffffff', // white
];

export const TeamEditDialog: React.FC<TeamEditDialogProps> = ({ competitionId, team, children }) => {
    const { updateTeam } = useTournament();
    const [open, setOpen] = useState(false);

    const [name, setName] = useState(team.name);
    const [initials, setInitials] = useState(team.initials || team.name.substring(0, 2).toUpperCase());
    const [primaryColor, setPrimaryColor] = useState(team.primaryColor || '#3b82f6');
    const [secondaryColor, setSecondaryColor] = useState(team.secondaryColor || '#ffffff');

    // Update effect when dialog opens
    React.useEffect(() => {
        if (open) {
            setName(team.name);
            setInitials(team.initials || team.name.substring(0, 2).toUpperCase());
            setPrimaryColor(team.primaryColor || '#3b82f6');
            setSecondaryColor(team.secondaryColor || '#ffffff');
        }
    }, [open, team]);

    const handleSave = () => {
        updateTeam(competitionId, team.id, {
            name,
            initials,
            primaryColor,
            secondaryColor
        });
        setOpen(false);
    };

    return (
        <>
            <div onClick={() => setOpen(true)} className="cursor-pointer">
                {children || <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Team</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex justify-center mb-4">
                            <div
                                className="w-16 h-16 rounded flex items-center justify-center text-xl font-bold border shadow-sm"
                                style={{ backgroundColor: primaryColor, color: secondaryColor }}
                            >
                                {initials}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (!team.initials) { // Auto-update initials if not manually set before
                                        setInitials(e.target.value.substring(0, 2).toUpperCase());
                                    }
                                }}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="initials" className="text-right">
                                Initials
                            </Label>
                            <Input
                                id="initials"
                                value={initials}
                                onChange={(e) => setInitials(e.target.value.toUpperCase().substring(0, 3))}
                                className="col-span-3"
                                maxLength={3}
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Background</Label>
                            <div className="col-span-3 flex gap-2 flex-wrap">
                                {PRESET_COLORS.map(color => (
                                    <div
                                        key={color}
                                        className={cn(
                                            "w-6 h-6 rounded-full cursor-pointer border",
                                            primaryColor === color ? "ring-2 ring-offset-2 ring-black" : ""
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setPrimaryColor(color)}
                                    />
                                ))}
                                <Input
                                    type="color"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="w-8 h-8 p-0 border-none ml-2"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Text Color</Label>
                            <div className="col-span-3 flex gap-2 flex-wrap">
                                {PRESET_COLORS.map(color => (
                                    <div
                                        key={color}
                                        className={cn(
                                            "w-6 h-6 rounded-full cursor-pointer border",
                                            secondaryColor === color ? "ring-2 ring-offset-2 ring-black" : ""
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setSecondaryColor(color)}
                                    />
                                ))}
                                <Input
                                    type="color"
                                    value={secondaryColor}
                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                    className="w-8 h-8 p-0 border-none ml-2"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSave}>Save changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
