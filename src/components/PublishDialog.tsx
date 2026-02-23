import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Tournament } from "@/lib/types";
import { createPppArchive } from "@/lib/pppArchive";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Upload,
  Trophy,
  Users,
  Swords,
  MapPin,
  Calendar,
} from "lucide-react";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: Tournament;
  onPublish: (updates: Partial<Tournament>) => void;
}

interface ValidationResult {
  hasMatches: boolean;
  matchesScheduled: boolean;
  detailsFilled: boolean;
  errors: string[];
}

export function PublishDialog({
  open,
  onOpenChange,
  tournament,
  onPublish,
}: PublishDialogProps) {
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);

  const validation = useMemo<ValidationResult>(() => {
    const errors: string[] = [];

    // Check for matches
    const totalFixtures = tournament.competitions.reduce(
      (sum, comp) => sum + comp.fixtures.length,
      0
    );
    const hasMatches = totalFixtures > 0;

    if (!hasMatches) {
      errors.push("No matches have been created yet");
    }

    // Check if matches are scheduled
    const scheduledFixtures = tournament.competitions.reduce(
      (sum, comp) =>
        sum + comp.fixtures.filter((f) => f.pitchId && f.startTime).length,
      0
    );
    const matchesScheduled = hasMatches && scheduledFixtures === totalFixtures;

    if (hasMatches && !matchesScheduled) {
      errors.push(
        `Only ${scheduledFixtures} of ${totalFixtures} matches are scheduled`
      );
    }

    // Check tournament details
    const detailsFilled = !!(
      tournament.name?.trim() &&
      tournament.startDate &&
      tournament.location?.trim() &&
      tournament.region
    );

    if (!tournament.name?.trim()) {
      errors.push("Tournament name is required");
    }
    if (!tournament.startDate) {
      errors.push("Start date is required");
    }
    if (!tournament.location?.trim()) {
      errors.push("Location is required");
    }
    if (!tournament.region) {
      errors.push("Region is required");
    }

    return {
      hasMatches,
      matchesScheduled,
      detailsFilled,
      errors,
    };
  }, [tournament]);

  const stats = useMemo(() => {
    const totalFixtures = tournament.competitions.reduce(
      (sum, comp) => sum + comp.fixtures.length,
      0
    );
    const totalTeams = tournament.competitions.reduce(
      (sum, comp) => sum + comp.teams.length,
      0
    );
    const participatingClubs = new Set(
      tournament.competitions.flatMap((comp) =>
        comp.teams.map((team) => team.clubId).filter(Boolean)
      )
    ).size;

    return {
      totalFixtures,
      totalTeams,
      participatingClubs,
      totalCompetitions: tournament.competitions.length,
    };
  }, [tournament]);

  const isValid =
    validation.hasMatches &&
    validation.matchesScheduled &&
    validation.detailsFilled;

  const handlePublish = async () => {
    if (!isValid) return;

    setIsPublishing(true);

    try {
      // Create the zip archive
      const archiveBlob = createPppArchive(tournament);

      // Prepare form data
      const formData = new FormData();
      formData.append("file", archiveBlob, `${tournament.name}.zip`);

      // Get API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

      if (!apiBaseUrl) {
        throw new Error("API base URL not configured");
      }

      // POST to the tournaments endpoint
      const response = await fetch(`${apiBaseUrl}/tournaments`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Publish failed: ${errorText}`);
      }

      const result = await response.json();

      // Extract the returned data
      const remoteId = result.data?.id;
      const eventUuid = result.data?.eventUuid;

      // Calculate new version
      const newVersion = (tournament.published?.version || 0) + 1;

      // Update the tournament with publish info
      onPublish({
        published: {
          at: new Date().toISOString(),
          version: newVersion,
          remoteId,
          eventUuid,
        },
      });

      // Show success toast
      toast({
        title: "Tournament published successfully!",
        description: `Version ${newVersion}${
          remoteId ? ` (ID: ${remoteId})` : ""
        }`,
      });

      // Close the dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Publish error:", error);
      toast({
        title: "Publish failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Publish Tournament
          </DialogTitle>
          <DialogDescription>
            {tournament.published
              ? `Re-publishing will create version ${
                  (tournament.published.version || 0) + 1
                }`
              : "Publish this tournament to make it available online"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Validation Checklist */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Requirements</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {validation.hasMatches ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>Has matches created</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {validation.matchesScheduled ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>All matches scheduled</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {validation.detailsFilled ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span>Tournament details complete</span>
              </div>
            </div>
          </div>

          {/* Error Messages */}
          {!isValid && validation.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <ul className="list-disc list-inside text-sm">
                  {validation.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Stats (only shown when valid) */}
          {isValid && (
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium">Tournament Summary</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Trophy className="w-4 h-4 text-muted-foreground" />
                  <span>{stats.totalCompetitions} competitions</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{stats.totalTeams} teams</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Swords className="w-4 h-4 text-muted-foreground" />
                  <span>{stats.totalFixtures} matches</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{stats.participatingClubs} clubs</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                <Calendar className="w-4 h-4" />
                <span>{tournament.name}</span>
              </div>
            </div>
          )}

          {/* Previous publish info */}
          {tournament.published && (
            <div className="text-xs text-muted-foreground border-t pt-3">
              <p>
                Previously published: v{tournament.published.version} on{" "}
                {new Date(tournament.published.at).toLocaleDateString()}
              </p>
              {tournament.published.remoteId && (
                <p>Remote ID: {tournament.published.remoteId}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPublishing}
          >
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={!isValid || isPublishing}>
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : tournament.published ? (
              `Publish v${(tournament.published.version || 0) + 1}`
            ) : (
              "Publish"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
