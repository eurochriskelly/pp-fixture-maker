import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTournament } from "@/context/TournamentContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ClubMinimap from "@/components/ClubMinimap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Trophy,
  MapPin,
  Calendar,
  Users,
  Swords,
  Target,
  Copy,
  Check,
  Shield,
  UserCog,
  Scale,
  AlertCircle,
  MapPinned,
  Clock,
  RefreshCw,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

// Generate random 4-character code (uppercase letters and numbers)
const generateRandomCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Inline editable field component
interface EditableFieldProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date" | "number";
  className?: string;
  suffix?: string;
  error?: boolean;
}

function EditableField({
  value,
  onSave,
  placeholder,
  type = "text",
  className = "",
  suffix,
  error,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onSave(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`h-8 ${error ? "border-red-500" : ""} ${className}`}
          placeholder={placeholder}
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={`text-left hover:bg-muted/50 rounded px-2 py-1 -mx-2 transition-colors cursor-text ${
        !value ? "text-muted-foreground italic" : ""
      } ${error ? "text-red-600 border-red-300" : ""} ${className}`}
    >
      {value || placeholder || "Click to edit"}
    </button>
  );
}

// Copyable code badge
function CodeBadge({
  label,
  code,
  onChange,
  icon: Icon,
}: {
  label: string;
  code: string;
  onChange: (code: string) => void;
  icon: React.ElementType;
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(code);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const sanitized = editValue.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (sanitized !== code) {
      onChange(sanitized);
    }
    setEditValue(sanitized);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setEditValue(code);
      setIsEditing(false);
    }
  };

  const handleRegenerate = () => {
    const newCode = generateRandomCode();
    onChange(newCode);
    setEditValue(newCode);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.toUpperCase())}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-24 h-8 font-mono text-center"
          maxLength={4}
        />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="w-4 h-4" />
              <span className="text-sm">{label}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="font-mono text-lg font-bold bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded transition-colors cursor-text"
              >
                {code || "XXXX"}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleRegenerate}
                title="Generate new code"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click code to edit, refresh to regenerate, or copy to clipboard</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Stats card
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Overview() {
  const { currentTournament, updateTournament } = useTournament();

  // Initialize missing fields with defaults
  useEffect(() => {
    if (currentTournament) {
      const updates: Partial<typeof currentTournament> = {};
      if (!currentTournament.winPoints && currentTournament.winPoints !== 0) updates.winPoints = 2;
      if (!currentTournament.drawPoints && currentTournament.drawPoints !== 0) updates.drawPoints = 1;
      if (!currentTournament.losePoints && currentTournament.losePoints !== 0) updates.losePoints = 0;
      if (!currentTournament.organizerCode) updates.organizerCode = generateRandomCode();
      if (!currentTournament.coordinatorCode) updates.coordinatorCode = generateRandomCode();
      if (!currentTournament.refereeCode) updates.refereeCode = generateRandomCode();
      
      if (Object.keys(updates).length > 0) {
        updateTournament(currentTournament.id, updates);
      }
    }
  }, [currentTournament, updateTournament]);

  const handleUpdate = (field: string, value: string | number) => {
    if (currentTournament) {
      updateTournament(currentTournament.id, { [field]: value });
    }
  };

  const handleCodeUpdate = (field: string, code: string) => {
    if (currentTournament) {
      updateTournament(currentTournament.id, { [field]: code });
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!currentTournament) return null;

    const totalTeams = currentTournament.competitions.reduce(
      (sum, comp) => sum + comp.teams.length,
      0
    );
    const totalFixtures = currentTournament.competitions.reduce(
      (sum, comp) => sum + comp.fixtures.length,
      0
    );
    const scheduledFixtures = currentTournament.competitions.reduce(
      (sum, comp) => sum + comp.fixtures.filter((f) => f.pitchId && f.startTime).length,
      0
    );
    const participatingClubs = new Set(
      currentTournament.competitions.flatMap((comp) =>
        comp.teams.map((team) => team.clubId).filter(Boolean)
      )
    ).size;

    return {
      totalTeams,
      totalFixtures,
      scheduledFixtures,
      participatingClubs,
      totalPitches: currentTournament.pitches.length,
      completionRate: totalFixtures > 0 ? Math.round((scheduledFixtures / totalFixtures) * 100) : 0,
    };
  }, [currentTournament]);

  // Calculate validation errors
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!currentTournament) return errors;

    if (!currentTournament.name || currentTournament.name.trim() === "") {
      errors.push("Tournament name is required");
    }
    if (!currentTournament.startDate) {
      errors.push("Start date is required");
    }
    if (!currentTournament.location || currentTournament.location.trim() === "") {
      errors.push("Location is required");
    }
    if (!currentTournament.region) {
      errors.push("Region is required");
    }

    return errors;
  }, [currentTournament]);

  // Calculate duration
  const duration = useMemo(() => {
    if (!currentTournament?.startDate) return null;
    if (!currentTournament?.endDate) return "1 day";
    
    const days = differenceInDays(
      parseISO(currentTournament.endDate),
      parseISO(currentTournament.startDate)
    ) + 1;
    return `${days} day${days !== 1 ? "s" : ""}`;
  }, [currentTournament?.startDate, currentTournament?.endDate]);

  if (!currentTournament) {
    return (
      <div className="container mx-auto p-4 max-w-6xl">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">No tournament selected. Please select a tournament first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      {/* Validation Alerts */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="border-amber-500 bg-amber-50 text-amber-900">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium">Please complete the following required fields:</p>
            <ul className="list-disc list-inside mt-1 text-sm">
              {validationErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            Tournament Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentTournament.competitions.length} competitions · {stats?.participatingClubs || 0} clubs participating
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {currentTournament.region || "No region set"}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Teams"
          value={stats?.totalTeams || 0}
          icon={Users}
          color="bg-blue-500"
          subtitle={`${stats?.participatingClubs || 0} clubs`}
        />
        <StatCard
          label="Fixtures"
          value={stats?.totalFixtures || 0}
          icon={Swords}
          color="bg-orange-500"
          subtitle={`${stats?.scheduledFixtures || 0} scheduled`}
        />
        <StatCard
          label="Pitches"
          value={stats?.totalPitches || 0}
          icon={MapPinned}
          color="bg-green-500"
          subtitle="required"
        />
        <StatCard
          label="Completion"
          value={stats?.completionRate || 0}
          icon={Target}
          color="bg-purple-500"
          subtitle="% scheduled"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Tournament Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Tournament Details
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Name {(!currentTournament.name || currentTournament.name.trim() === "") && (
                  <span className="text-red-500">*</span>
                )}
              </p>
              <EditableField
                value={currentTournament.name}
                onSave={(value) => handleUpdate("name", value)}
                placeholder="Tournament name"
                className="text-lg font-medium"
                error={!currentTournament.name || currentTournament.name.trim() === ""}
              />
            </div>

            {/* Region */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Region {!currentTournament.region && <span className="text-red-500">*</span>}
              </p>
              <Select
                value={currentTournament.region || ""}
                onValueChange={(value) => handleUpdate("region", value)}
              >
                <SelectTrigger className={`w-full ${!currentTournament.region ? "border-red-300" : ""}`}>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pan-Euro">Pan-Euro</SelectItem>
                  <SelectItem value="UK & Ireland">UK & Ireland</SelectItem>
                  <SelectItem value="North America">North America</SelectItem>
                  <SelectItem value="Asia Pacific">Asia Pacific</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Date Range {!currentTournament.startDate && <span className="text-red-500">*</span>}
              </p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-2 flex-1">
                  <EditableField
                    value={currentTournament.startDate || ""}
                    onSave={(value) => handleUpdate("startDate", value)}
                    type="date"
                    placeholder="Start date"
                    error={!currentTournament.startDate}
                  />
                  <span className="text-muted-foreground">to</span>
                  <EditableField
                    value={currentTournament.endDate || ""}
                    onSave={(value) => handleUpdate("endDate", value)}
                    type="date"
                    placeholder="End date"
                  />
                </div>
              </div>
              {currentTournament.startDate && (
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  Duration: {duration}
                </p>
              )}
            </div>

            {/* Location */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Location {(!currentTournament.location || currentTournament.location.trim() === "") && (
                  <span className="text-red-500">*</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <EditableField
                  value={currentTournament.location || ""}
                  onSave={(value) => handleUpdate("location", value)}
                  placeholder="City or venue"
                  error={!currentTournament.location || currentTournament.location.trim() === ""}
                />
              </div>
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Latitude</p>
                <EditableField
                  value={currentTournament.latitude || ""}
                  onSave={(value) => handleUpdate("latitude", value)}
                  placeholder="—"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Longitude</p>
                <EditableField
                  value={currentTournament.longitude || ""}
                  onSave={(value) => handleUpdate("longitude", value)}
                  placeholder="—"
                />
              </div>
            </div>

            {/* Points Configuration - Compact */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Points System</p>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-green-600 font-semibold">
                    <EditableField
                      value={String(currentTournament.winPoints ?? 2)}
                      onSave={(value) => handleUpdate("winPoints", parseInt(value) || 0)}
                      type="number"
                      className="w-10 text-center"
                    />
                  </span>
                  <span className="text-muted-foreground">W</span>
                </div>
                <span className="text-muted-foreground">/</span>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-600 font-semibold">
                    <EditableField
                      value={String(currentTournament.drawPoints ?? 1)}
                      onSave={(value) => handleUpdate("drawPoints", parseInt(value) || 0)}
                      type="number"
                      className="w-10 text-center"
                    />
                  </span>
                  <span className="text-muted-foreground">D</span>
                </div>
                <span className="text-muted-foreground">/</span>
                <div className="flex items-center gap-1">
                  <span className="text-red-600 font-semibold">
                    <EditableField
                      value={String(currentTournament.losePoints ?? 0)}
                      onSave={(value) => handleUpdate("losePoints", parseInt(value) || 0)}
                      type="number"
                      className="w-10 text-center"
                    />
                  </span>
                  <span className="text-muted-foreground">L</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Club Locations Map */}
        <ClubMinimap clubs={currentTournament.clubs} />
      </div>

      {/* Access Codes Card */}
      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Access Codes
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <CodeBadge
              label="Organizer"
              code={currentTournament.organizerCode || generateRandomCode()}
              onChange={(code) => handleCodeUpdate("organizerCode", code)}
              icon={Shield}
            />
            <CodeBadge
              label="Coordinator"
              code={currentTournament.coordinatorCode || generateRandomCode()}
              onChange={(code) => handleCodeUpdate("coordinatorCode", code)}
              icon={UserCog}
            />
            <CodeBadge
              label="Referee"
              code={currentTournament.refereeCode || generateRandomCode()}
              onChange={(code) => handleCodeUpdate("refereeCode", code)}
              icon={Scale}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/clubs/participants"}>
              <Users className="w-4 h-4 mr-2" />
              Manage Clubs
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/scheduler/timeline"}>
              <Clock className="w-4 h-4 mr-2" />
              View Schedule
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/"}>
              <Swords className="w-4 h-4 mr-2" />
              Competitions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
