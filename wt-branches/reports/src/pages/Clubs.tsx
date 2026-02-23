import React, { useCallback, useEffect, useState } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Club } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Phone, Mail, User, Plus, Pencil, Trash2, Shield, Wand2, Loader2, Key, Clipboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchClubInfo, processLogo } from '@/lib/clubSearch';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_COLORS = [
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

const ApiKeyDialog = ({ 
    open, 
    onOpenChange, 
    onSave,
    initialKey
}: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void;
    onSave: (key: string) => void;
    initialKey?: string;
}) => {
    const [key, setKey] = useState(initialKey || '');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enter API Key</DialogTitle>
                    <DialogDescription>
                        To use Magic Search, you need an API key from OpenRouter or OpenAI.
                        This key will be stored securely in your browser's local storage.
                        (e.g., sk-or-v1... for OpenRouter or sk-proj... for OpenAI)
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input 
                            type="password" 
                            value={key} 
                            onChange={e => setKey(e.target.value)} 
                            placeholder="sk-..." 
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => onSave(key)} disabled={!key}>Save Key</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ClubDialog = ({ 
    club, 
    onSave, 
    trigger 
}: { 
    club?: Club; 
    onSave: (club: Partial<Club>) => void;
    trigger: React.ReactNode;
}) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const [name, setName] = useState(club?.name || '');
    const [address, setAddress] = useState(club?.address || '');
    const [abbreviation, setAbbreviation] = useState(club?.abbreviation || '');
    const [code, setCode] = useState(club?.code || '');
    const [crest, setCrest] = useState(club?.crest || '');
    const [contactName, setContactName] = useState(club?.contactName || '');
    const [contactEmail, setContactEmail] = useState(club?.contactEmail || '');
    const [contactPhone, setContactPhone] = useState(club?.contactPhone || '');
    const [primaryColor, setPrimaryColor] = useState(club?.primaryColor || '#000000');
    const [secondaryColor, setSecondaryColor] = useState(club?.secondaryColor || '#ffffff');
    const [lat, setLat] = useState(club?.coordinates?.lat?.toString() || '');
    const [lng, setLng] = useState(club?.coordinates?.lng?.toString() || '');
    const [isPastingCrest, setIsPastingCrest] = useState(false);
    const [crestPasteError, setCrestPasteError] = useState<string | null>(null);

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

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setName(val);
        // Auto-generate fields if adding new club
        if (!club) {
            if (!abbreviation) setAbbreviation(val.substring(0, 5).toUpperCase());
            if (!code) setCode(val.substring(0, 2).toUpperCase());
        }
    };

    const handleMagicSearch = async () => {
        const storedKey = localStorage.getItem('club_search_api_key');
        if (!storedKey) {
            setApiKeyDialogOpen(true);
            return;
        }

        if (!name) {
            toast({ title: "Please enter a club name first", variant: "destructive" });
            return;
        }

        setIsSearching(true);
        try {
            const result = await searchClubInfo(name, storedKey);
            
            if (result.name) setName(result.name);
            if (result.address) setAddress(result.address);
            if (result.abbreviation) setAbbreviation(result.abbreviation);
            if (result.code) setCode(result.code);
            if (result.email) setContactEmail(result.email);
            if (result.phone) setContactPhone(result.phone);
            if (result.coordinates) {
                setLat(result.coordinates.lat.toString());
                setLng(result.coordinates.lng.toString());
            }
            if (result.primaryColor) setPrimaryColor(result.primaryColor);
            if (result.secondaryColor) setSecondaryColor(result.secondaryColor);

            if (result.logoUrl) {
                try {
                    const processedCrest = await processLogo(result.logoUrl);
                    setCrest(processedCrest);
                    setCrestPasteError(null);
                } catch (e) {
                    console.error("Logo processing failed, using raw URL", e);
                    setCrest(result.logoUrl);
                    setCrestPasteError(null);
                }
            }

            toast({ title: "Club details found!", description: "Review and save changes." });
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            if (message.includes('401')) {
                localStorage.removeItem('club_search_api_key');
                toast({ title: "Invalid API Key", description: "Please enter a valid key.", variant: "destructive" });
                setApiKeyDialogOpen(true);
            } else {
                toast({ title: "Search failed", description: message, variant: "destructive" });
            }
        } finally {
            setIsSearching(false);
        }
    };

    const handleApiKeySave = (key: string) => {
        localStorage.setItem('club_search_api_key', key);
        setApiKeyDialogOpen(false);
        handleMagicSearch();
    };

    const handleSave = () => {
        const coordinates = (lat && lng) ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined;
        
        onSave({
            name,
            address,
            abbreviation: abbreviation.substring(0, 5).toUpperCase(),
            code: code.substring(0, 2).toUpperCase(),
            contactName,
            contactEmail,
            contactPhone,
            primaryColor,
            secondaryColor,
            coordinates,
            crest
        });
        setOpen(false);
        setCrestPasteError(null);
        setIsPastingCrest(false);
        if (!club) {
            // Reset form if adding
            setName('');
            setAddress('');
            setAbbreviation('');
            setCode('');
            setCrest('');
            setContactName('');
            setContactEmail('');
            setContactPhone('');
            setLat('');
            setLng('');
        }
    };

    return (
        <>
            <ApiKeyDialog 
                open={apiKeyDialogOpen} 
                onOpenChange={setApiKeyDialogOpen} 
                onSave={handleApiKeySave} 
                initialKey={localStorage.getItem('club_search_api_key') || ''} 
            />
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{club ? 'Edit Club' : 'Add New Club'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="flex gap-4 items-start">
                            {crest ? (
                                <div className="w-24 h-24 rounded-lg flex items-center justify-center border-2 shadow-sm shrink-0 overflow-hidden bg-white relative group">
                                    <img 
                                        src={crest} 
                                        alt="Crest" 
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            // Fallback to placeholder if image fails to load
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement?.classList.remove('bg-white');
                                            e.currentTarget.parentElement?.classList.add('bg-muted');
                                        }} 
                                    />
                                    <div 
                                        className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-opacity"
                                        onClick={() => setCrest('')}
                                        title="Remove Crest"
                                    >
                                        <Trash2 className="text-white h-6 w-6" />
                                    </div>
                                </div>
                            ) : (
                                <div className="w-24 h-24 rounded-lg flex items-center justify-center text-3xl font-bold border-2 shadow-sm shrink-0"
                                    style={{ backgroundColor: primaryColor, color: secondaryColor, borderColor: secondaryColor }}
                                >
                                    {code || '??'}
                                </div>
                            )}
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={pasteCrestFromClipboard}
                                        disabled={isPastingCrest}
                                        title="Paste club logo from clipboard"
                                    >
                                        <Clipboard className="h-4 w-4 mr-2" />
                                        {isPastingCrest ? 'Pasting...' : 'Paste from clipboard'}
                                    </Button>
                                    {crest && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setCrest('');
                                                setCrestPasteError(null);
                                            }}
                                        >
                                            Remove crest
                                        </Button>
                                    )}
                                </div>
                                {crestPasteError && (
                                    <p className="text-xs text-destructive">{crestPasteError}</p>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Club Name</Label>
                                        <div className="flex gap-2">
                                            <Input value={name} onChange={handleNameChange} placeholder="e.g. Arsenal FC" />
                                            <Button 
                                                size="icon" 
                                                variant="outline" 
                                                onClick={handleMagicSearch}
                                                disabled={isSearching || !name}
                                                title="Magic Search: Auto-fill details"
                                            >
                                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => setApiKeyDialogOpen(true)}
                                                title="Update API Key"
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                <Key className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <Label>Abbrev (5)</Label>
                                        <Input value={abbreviation} maxLength={5} onChange={e => setAbbreviation(e.target.value.toUpperCase())} placeholder="ARSNL" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Code (2)</Label>
                                        <Input value={code} maxLength={2} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="AR" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Colors</Label>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <Label className="text-xs text-muted-foreground">Primary</Label>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {DEFAULT_COLORS.map(c => (
                                                <div 
                                                    key={c} 
                                                    className={cn("w-5 h-5 rounded-full cursor-pointer border", primaryColor === c && "ring-2 ring-offset-1 ring-black")}
                                                    style={{ backgroundColor: c }}
                                                    onClick={() => setPrimaryColor(c)}
                                                />
                                            ))}
                                            <Input type="color" className="w-6 h-6 p-0 border-0" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-xs text-muted-foreground">Secondary</Label>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {DEFAULT_COLORS.map(c => (
                                                <div 
                                                    key={c} 
                                                    className={cn("w-5 h-5 rounded-full cursor-pointer border", secondaryColor === c && "ring-2 ring-offset-1 ring-black")}
                                                    style={{ backgroundColor: c }}
                                                    onClick={() => setSecondaryColor(c)}
                                                />
                                            ))}
                                            <Input type="color" className="w-6 h-6 p-0 border-0" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Address</Label>
                        <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Clubhouse Address" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Latitude (Optional)</Label>
                            <Input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} placeholder="53.3498" />
                        </div>
                        <div className="space-y-2">
                            <Label>Longitude (Optional)</Label>
                            <Input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} placeholder="-6.2603" />
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <Label className="mb-2 block">Contact Details (Optional)</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="relative">
                                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Contact Name" 
                                    value={contactName} 
                                    onChange={e => setContactName(e.target.value)} 
                                    className="pl-9"
                                />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Email" 
                                    type="email"
                                    value={contactEmail} 
                                    onChange={e => setContactEmail(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <div className="relative">
                                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Phone" 
                                    type="tel"
                                    value={contactPhone} 
                                    onChange={e => setContactPhone(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Club</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
};

const Clubs = () => {
    const { clubs, addClub, updateClub, deleteClub } = useTournament();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredClubs = clubs.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto p-4 max-w-6xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <p className="text-muted-foreground">Manage participating clubs and their details.</p>
                </div>
                <ClubDialog 
                    onSave={addClub} 
                    trigger={
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Club
                        </Button>
                    } 
                />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Registered Clubs ({clubs.length})</CardTitle>
                        <Input 
                            placeholder="Search clubs..." 
                            className="max-w-xs" 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredClubs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {searchTerm ? 'No clubs match your search.' : 'No clubs added yet. Add your first club to get started.'}
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Crest</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredClubs.map(club => (
                                        <TableRow key={club.id}>
                                            <TableCell>
                                                <div className="w-10 h-10 rounded flex items-center justify-center font-bold text-xs border shadow-sm overflow-hidden"
                                                    style={{ backgroundColor: club.crest ? 'white' : (club.primaryColor || '#000'), color: club.secondaryColor || '#fff' }}
                                                >
                                                    {club.crest ? (
                                                        <img 
                                                            src={club.crest} 
                                                            alt={club.code} 
                                                            className="w-full h-full object-contain" 
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                                // Show code instead by manipulating DOM or state? 
                                                                // Simpler: just hide image and let parent background show.
                                                                // Ideally we would revert to showing text, but for now just hiding broken image is better than showing broken icon.
                                                                if (e.currentTarget.parentElement) {
                                                                    e.currentTarget.parentElement.style.backgroundColor = club.primaryColor || '#000';
                                                                    e.currentTarget.parentElement.innerText = club.code;
                                                                    e.currentTarget.parentElement.style.color = club.secondaryColor || '#fff';
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        club.code
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div>{club.name}</div>
                                                <div className="text-xs text-muted-foreground">{club.abbreviation}</div>
                                            </TableCell>
                                            <TableCell>{club.code}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {club.contactName && <div className="flex items-center gap-1"><User className="h-3 w-3" /> {club.contactName}</div>}
                                                    {club.contactEmail && <div className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" /> {club.contactEmail}</div>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                                {club.address}
                                                {club.coordinates && <MapPin className="h-3 w-3 inline ml-1" />}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <ClubDialog 
                                                        club={club} 
                                                        onSave={(updates) => updateClub(club.id, updates)} 
                                                        trigger={
                                                            <Button variant="ghost" size="icon">
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        } 
                                                    />
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"
                                                        onClick={() => {
                                                            if (confirm(`Are you sure you want to delete ${club.name}?`)) {
                                                                deleteClub(club.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Clubs;
