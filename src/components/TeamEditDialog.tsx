
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Team, Club } from '@/lib/types';
import { useTournament } from '@/context/TournamentContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { Pencil, Trash2, Shield, Plus, X, Search, Check, Clipboard } from 'lucide-react';
import { saveImage, isBase64Url } from '@/lib/imageStore';
import { CrestImage } from '@/components/CrestImage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    const { updateTeam, deleteTeam, clubs } = useTournament();
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("details");

    // Basic Details
    const [name, setName] = useState(team.name);
    const [initials, setInitials] = useState(team.initials || team.name.substring(0, 2).toUpperCase());
    const [primaryColor, setPrimaryColor] = useState(team.primaryColor || '#3b82f6');
    const [secondaryColor, setSecondaryColor] = useState(team.secondaryColor || '#ffffff');
    const [crest, setCrest] = useState(team.crest);
    const [isPastingCrest, setIsPastingCrest] = useState(false);
    const [crestPasteError, setCrestPasteError] = useState<string | null>(null);

    // Club Links
    const [clubId, setClubId] = useState<string | undefined>(team.clubId);
    const [secondaryClubIds, setSecondaryClubIds] = useState<string[]>(team.secondaryClubIds || []);
    
    // Contributions
    const [contributions, setContributions] = useState<Record<string, number>>(team.clubContributions || {});
    const [overrideLeadClubId, setOverrideLeadClubId] = useState<string | undefined>(team.overrideLeadClubId);

    // Helper to get Club object
    const getClub = (id?: string) => clubs.find(c => c.id === id);

    // Calculate Lead Club
    const calculatedLeadClubId = useMemo(() => {
        const allInvolvedIds = [clubId, ...secondaryClubIds].filter(Boolean) as string[];
        if (allInvolvedIds.length === 0) return undefined;
        if (allInvolvedIds.length === 1) return allInvolvedIds[0];

        // Sort by contributions (desc), then name (asc)
        const sorted = [...allInvolvedIds].sort((a, b) => {
            const countA = contributions[a] || 0;
            const countB = contributions[b] || 0;
            if (countA !== countB) return countB - countA;
            
            const nameA = getClub(a)?.name || '';
            const nameB = getClub(b)?.name || '';
            return nameA.localeCompare(nameB);
        });

        return sorted[0];
    }, [clubId, secondaryClubIds, contributions, clubs]);

    const leadClubId = overrideLeadClubId || calculatedLeadClubId || clubId;

    const applyClipboardBlobAsCrest = useCallback((blob: Blob) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                setCrest(result);
                setCrestPasteError(null);
            } else {
                setCrestPasteError('Unable to read image from clipboard.');
            }
        };
        reader.onerror = () => setCrestPasteError('Unable to read image from clipboard.');
        reader.readAsDataURL(blob);
    }, []);

    const pasteCrestFromClipboard = useCallback(async () => {
        setIsPastingCrest(true);
        setCrestPasteError(null);

        try {
            if (!navigator.clipboard?.read) {
                setCrestPasteError('Clipboard image access is not supported in this browser.');
                return;
            }

            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                const imageType = item.types.find((type) => type.startsWith('image/'));
                if (!imageType) continue;

                const imageBlob = await item.getType(imageType);
                applyClipboardBlobAsCrest(imageBlob);
                return;
            }

            setCrestPasteError('No image found in clipboard.');
        } catch {
            setCrestPasteError('Clipboard access was blocked. Try Cmd/Ctrl+V while this dialog is open.');
        } finally {
            setIsPastingCrest(false);
        }
    }, [applyClipboardBlobAsCrest]);

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setName(team.name);
            setInitials(team.initials || team.name.substring(0, 2).toUpperCase());
            setPrimaryColor(team.primaryColor || '#3b82f6');
            setSecondaryColor(team.secondaryColor || '#ffffff');
            setCrest(team.crest);
            setClubId(team.clubId);
            setSecondaryClubIds(team.secondaryClubIds || []);
            setContributions(team.clubContributions || {});
            setOverrideLeadClubId(team.overrideLeadClubId);
            setCrestPasteError(null);
            setIsPastingCrest(false);
        }
    }, [open, team]);

    useEffect(() => {
        if (!open) return;

        const handlePaste = (event: ClipboardEvent) => {
            const clipboardItems = event.clipboardData?.items;
            if (!clipboardItems) return;

            for (const item of clipboardItems) {
                if (!item.type.startsWith('image/')) continue;
                const imageFile = item.getAsFile();
                if (!imageFile) continue;

                event.preventDefault();
                applyClipboardBlobAsCrest(imageFile);
                return;
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [open, applyClipboardBlobAsCrest]);

    // Update visuals when primary club changes
    useEffect(() => {
        if (open && clubId) {
            const club = getClub(clubId);
            if (club) {
                // Only update if not manually changed? 
                // For now, let's just suggest values or update if defaults are present
                // But specifically for crest, if no custom crest set, we might use club crest in display
            }
        }
    }, [clubId]);

    const handleSave = async () => {
        // Save crest to IndexedDB if it's a base64 URL
        let crestRef = crest;
        if (isBase64Url(crest)) {
            crestRef = await saveImage(`team-${competitionId}-${team.id}`, crest);
        }

        updateTeam(competitionId, team.id, {
            name,
            initials,
            primaryColor,
            secondaryColor,
            crest: crestRef,
            clubId: clubId === "none" ? undefined : clubId,
            secondaryClubIds,
            clubContributions: contributions,
            overrideLeadClubId: overrideLeadClubId === "auto" ? undefined : overrideLeadClubId
        });
        setOpen(false);
    };

    const toggleSecondaryClub = (id: string) => {
        if (secondaryClubIds.includes(id)) {
            setSecondaryClubIds(prev => prev.filter(cid => cid !== id));
            // Also remove contributions
            const newContrib = { ...contributions };
            delete newContrib[id];
            setContributions(newContrib);
        } else {
            setSecondaryClubIds(prev => [...prev, id]);
            // Default contribution
            setContributions(prev => ({ ...prev, [id]: 0 }));
        }
    };

    const updateContribution = (id: string, count: number) => {
        setContributions(prev => ({
            ...prev,
            [id]: count
        }));
    };

    const generateAmalgamationName = () => {
        const allInvolvedIds = [clubId, ...secondaryClubIds].filter(Boolean) as string[];
        if (allInvolvedIds.length === 0) return name; // No change

        // Determine lead
        const lead = leadClubId;
        
        // Sort others: contributions desc, then alpha
        const others = allInvolvedIds.filter(id => id !== lead).sort((a, b) => {
            const countA = contributions[a] || 0;
            const countB = contributions[b] || 0;
            if (countA !== countB) return countB - countA;
            const nameA = getClub(a)?.name || '';
            const nameB = getClub(b)?.name || '';
            return nameA.localeCompare(nameB);
        });

        const sortedIds = lead ? [lead, ...others] : others;
        
        const codes = sortedIds.map(id => getClub(id)?.abbreviation || getClub(id)?.code || '???');
        return codes.join('/');
    };

    const applyGeneratedName = () => {
        const newName = generateAmalgamationName();
        setName(newName);
        // Also set initials
        // Maybe first letter of each code?
        const initials = newName.split('/').map(s => s[0]).join('').substring(0, 3).toUpperCase();
        setInitials(initials);
    };
    
    // Auto-update visuals based on Lead Club if desired
    const applyLeadClubVisuals = () => {
        if (leadClubId) {
            const club = getClub(leadClubId);
            if (club) {
                if (club.primaryColor) setPrimaryColor(club.primaryColor);
                if (club.secondaryColor) setSecondaryColor(club.secondaryColor);
                if (club.crest) setCrest(club.crest);
            }
        }
    }

    const leadClub = getClub(leadClubId);

    return (
        <>
            <div onClick={() => setOpen(true)} className="cursor-pointer">
                {children || <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Team: {name}</DialogTitle>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="details">Details & Colors</TabsTrigger>
                            <TabsTrigger value="clubs">Clubs & Players</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4 py-4">
                            <div className="flex justify-center mb-4">
                                <div
                                    className="group w-24 h-24 rounded-lg flex items-center justify-center text-3xl font-bold border-4 shadow-sm relative overflow-hidden"
                                    style={{ 
                                        backgroundColor: primaryColor, 
                                        color: secondaryColor,
                                        borderColor: secondaryColor 
                                    }}
                                >
                                    {crest ? (
                                        <CrestImage src={crest} alt="Crest" className="w-full h-full object-contain p-1" />
                                    ) : (
                                        initials
                                    )}
                                    <button
                                        type="button"
                                        onClick={pasteCrestFromClipboard}
                                        disabled={isPastingCrest}
                                        className="absolute inset-x-1 bottom-1 inline-flex items-center justify-center gap-1 rounded-md bg-black/65 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-80"
                                        title="Paste team logo from clipboard"
                                    >
                                        <Clipboard className="h-3 w-3" />
                                        {isPastingCrest ? 'Pasting...' : 'Paste from clipboard'}
                                    </button>
                                </div>
                            </div>
                            {crestPasteError && (
                                <p className="text-center text-xs text-destructive -mt-2">{crestPasteError}</p>
                            )}

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Name
                                </Label>
                                <div className="col-span-3 flex gap-2">
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="flex-1"
                                    />
                                </div>
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
                                <div className="col-span-3 flex gap-2 flex-wrap items-center">
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
                                <div className="col-span-3 flex gap-2 flex-wrap items-center">
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
                        </TabsContent>

                        <TabsContent value="clubs" className="space-y-6 py-4">
                            {/* Primary Club Selection */}
                            <div className="space-y-2">
                                <Label>Primary Club</Label>
                                <Select 
                                    value={clubId || "none"} 
                                    onValueChange={(val) => {
                                        const newId = val === "none" ? undefined : val;
                                        setClubId(newId);
                                        // Initialize contribution if needed
                                        if (newId && contributions[newId] === undefined) {
                                            setContributions(prev => ({ ...prev, [newId]: 0 }));
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a club..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Club Linked</SelectItem>
                                        {clubs.map(club => (
                                            <SelectItem key={club.id} value={club.id}>
                                                {club.name} ({club.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Secondary Clubs Selection */}
                            <div className="space-y-2">
                                <Label>Secondary Clubs (Amalgamation)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between">
                                            {secondaryClubIds.length > 0 
                                                ? `${secondaryClubIds.length} secondary clubs selected`
                                                : "Select secondary clubs..."}
                                            <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search clubs..." />
                                            <CommandList>
                                                <CommandEmpty>No club found.</CommandEmpty>
                                                <CommandGroup>
                                                    {clubs.filter(c => c.id !== clubId).map((club) => (
                                                        <CommandItem
                                                            key={club.id}
                                                            value={club.name}
                                                            onSelect={() => toggleSecondaryClub(club.id)}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    secondaryClubIds.includes(club.id) ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {club.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Player Contributions */}
                            {(clubId || secondaryClubIds.length > 0) && (
                                <div className="space-y-3 border rounded-md p-4 bg-muted/20">
                                    <Label className="text-base font-semibold">Player Contributions</Label>
                                    <div className="space-y-2">
                                        {[clubId, ...secondaryClubIds].filter(Boolean).map((cid) => {
                                            const club = getClub(cid as string);
                                            if (!club) return null;
                                            const isPrimary = cid === clubId;
                                            return (
                                                <div key={cid} className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 flex-1">
                                                        {isPrimary && <Shield className="h-4 w-4 text-primary" />}
                                                        <span className={cn("text-sm", isPrimary && "font-medium")}>
                                                            {club.name}
                                                        </span>
                                                    </div>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={contributions[cid as string] || 0}
                                                        onChange={(e) => updateContribution(cid as string, parseInt(e.target.value) || 0)}
                                                        className="w-20 text-right"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Lead Team Override & Name Generation */}
                            {(clubId || secondaryClubIds.length > 0) && (
                                <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                                    <div className="space-y-2">
                                        <Label>Lead Team (Coach/Management)</Label>
                                        <Select 
                                            value={overrideLeadClubId || "auto"} 
                                            onValueChange={(val) => setOverrideLeadClubId(val === "auto" ? undefined : val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="auto">
                                                    Auto: {getClub(calculatedLeadClubId)?.name || 'None'}
                                                </SelectItem>
                                                {[clubId, ...secondaryClubIds].filter(Boolean).map(cid => {
                                                    const c = getClub(cid as string);
                                                    return c ? (
                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                    ) : null;
                                                })}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            The lead team is determined by player contribution count, then alphabetical order. You can override this here.
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-2">
                                        <Label>Amalgamation Options</Label>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                onClick={applyGeneratedName}
                                                className="flex-1"
                                                disabled={!clubId && secondaryClubIds.length === 0}
                                            >
                                                Generate Name from Clubs
                                            </Button>
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                onClick={applyLeadClubVisuals}
                                                className="flex-1"
                                                disabled={!leadClubId}
                                            >
                                                Use Lead Club Colors/Logo
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 mt-4">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Delete Team
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the team
                                        <span className="font-semibold"> {team.name} </span>
                                        and remove it from any groups and fixtures.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => {
                                            deleteTeam(competitionId, team.id);
                                            setOpen(false);
                                        }}
                                    >
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button onClick={handleSave}>Save changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
