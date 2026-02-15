import React, { useState } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Club } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Phone, Mail, User, Plus, Pencil, Trash2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const ClubDialog = ({ 
    club, 
    onSave, 
    trigger 
}: { 
    club?: Club; 
    onSave: (club: Partial<Club>) => void;
    trigger: React.ReactNode;
}) => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(club?.name || '');
    const [address, setAddress] = useState(club?.address || '');
    const [abbreviation, setAbbreviation] = useState(club?.abbreviation || '');
    const [code, setCode] = useState(club?.code || '');
    const [contactName, setContactName] = useState(club?.contactName || '');
    const [contactEmail, setContactEmail] = useState(club?.contactEmail || '');
    const [contactPhone, setContactPhone] = useState(club?.contactPhone || '');
    const [primaryColor, setPrimaryColor] = useState(club?.primaryColor || '#000000');
    const [secondaryColor, setSecondaryColor] = useState(club?.secondaryColor || '#ffffff');
    const [lat, setLat] = useState(club?.coordinates?.lat?.toString() || '');
    const [lng, setLng] = useState(club?.coordinates?.lng?.toString() || '');

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setName(val);
        // Auto-generate fields if adding new club
        if (!club) {
            if (!abbreviation) setAbbreviation(val.substring(0, 5).toUpperCase());
            if (!code) setCode(val.substring(0, 2).toUpperCase());
        }
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
            coordinates
        });
        setOpen(false);
        if (!club) {
            // Reset form if adding
            setName('');
            setAddress('');
            setAbbreviation('');
            setCode('');
            setContactName('');
            setContactEmail('');
            setContactPhone('');
            setLat('');
            setLng('');
        }
    };

    return (
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
                        <div className="w-24 h-24 rounded-lg flex items-center justify-center text-3xl font-bold border-2 shadow-sm shrink-0"
                            style={{ backgroundColor: primaryColor, color: secondaryColor, borderColor: secondaryColor }}
                        >
                            {code || '??'}
                        </div>
                        <div className="flex-1 space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Club Name</Label>
                                    <Input value={name} onChange={handleNameChange} placeholder="e.g. Arsenal FC" />
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
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Shield className="h-8 w-8" /> Clubs
                    </h1>
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
                                                <div className="w-10 h-10 rounded flex items-center justify-center font-bold text-xs border shadow-sm"
                                                    style={{ backgroundColor: club.primaryColor || '#000', color: club.secondaryColor || '#fff' }}
                                                >
                                                    {club.code}
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