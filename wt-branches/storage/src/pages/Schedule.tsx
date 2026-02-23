import React from 'react';
import { createPortal } from 'react-dom';
import { useTournament } from '@/context/TournamentContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Clock, Plus, X, ChevronRight, RotateCcw, AlertTriangle } from 'lucide-react';
import { getFixtureSlack, minutesFromMidnight, timeFromMinutes } from '@/utils/scheduleUtils';
import { Fixture, Group, Pitch, PitchBreakItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getGroupPitchIds } from '@/lib/groupPitches';
import { createGroupColorMap, getGroupColorFromMap } from '@/lib/groupColors';
import { CompetitionBadge } from '@/components/CompetitionBadge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { FixtureDetailsPanel } from '@/components/FixtureDetailsPanel';
import { v4 as uuidv4 } from 'uuid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const BASE_PIXELS_PER_MINUTE = 2;
const MIN_VERTICAL_SCALE = 1;
const MAX_VERTICAL_SCALE = 5;
const DEFAULT_VERTICAL_SCALE = 3;
const VIEW_START_HOUR = 8;
const VIEW_END_HOUR = 20;
const DEFAULT_PITCH_START = '09:00';
const DEFAULT_PITCH_END = '18:00';
const DEFAULT_ASSIGN_TIME = '10:00';
const DEFAULT_GROUP_DURATION = 20;
const DEFAULT_GROUP_SLACK = 5;
const DEFAULT_GROUP_REST = 20;
const MIN_PITCH_WINDOW_MINUTES = 10;
const DRAG_SNAP_MINUTES = 5;
const DEFAULT_BREAK_DURATION = 20;
const MIN_BREAK_DURATION = 5;
const BREAK_DURATION_STEP_MINUTES = 1;
const SCHEDULE_VERTICAL_SCALE_STORAGE_KEY = 'tournament_schedule_vertical_scale_v1';
const BREAK_PATTERN_GRAY = 'repeating-linear-gradient(45deg, #6b7280, #6b7280 4px, #4b5563 4px, #4b5563 8px)';
const DRAWER_HEIGHT_PX = 280; // Fixed height for the details drawer

type PitchFixtureItem = {
  competitionId: string;
  groups: Group[];
  fixture: Fixture;
};

type PitchTimelineItem =
  | { kind: 'fixture'; item: PitchFixtureItem }
  | { kind: 'break'; item: PitchBreakItem };

type FixtureBatchUpdate = {
  competitionId: string;
  fixtureId: string;
  updates: Partial<Fixture>;
};

type BreakBatchUpdate = {
  breakId: string;
  updates: Partial<PitchBreakItem>;
};

type PitchDraft = {
  name: string;
  startTime: string;
  endTime: string;
};

type PitchBoundaryDragState = {
  pitchId: string;
  boundary: 'startTime' | 'endTime';
};

type BreakResizeDragState = {
  breakId: string;
  pitchId: string;
  startClientY: number;
  initialDuration: number;
};

type DragItemRef = {
  kind: 'fixture' | 'break';
  id: string;
};

const Schedule = () => {
  const {
    competitions,
    pitches,
    locations,
    pitchBreaks,
    addPitch,
    updatePitch,
    deletePitch,
    updateFixture,
    autoScheduleMatches,
    autoAssignUmpires,
    resetAllSchedules,
    batchUpdateFixtures,
    updateGroup,
    addPitchBreak,
    updatePitchBreak,
    deletePitchBreak,
  } = useTournament();

  const [pitchDrafts, setPitchDrafts] = React.useState<Record<string, PitchDraft>>({});
  const pitchDraftsRef = React.useRef<Record<string, PitchDraft>>({});
  const [verticalScale, setVerticalScale] = React.useState(() => {
    const saved = Number(localStorage.getItem(SCHEDULE_VERTICAL_SCALE_STORAGE_KEY));
    if (Number.isFinite(saved)) {
      return Math.max(MIN_VERTICAL_SCALE, Math.min(MAX_VERTICAL_SCALE, saved));
    }
    return DEFAULT_VERTICAL_SCALE;
  });
  const pixelsPerMinute = BASE_PIXELS_PER_MINUTE * verticalScale;
  const textScale = 1 + (verticalScale - 1) * 0.25;
  const gridScrollRef = React.useRef<HTMLDivElement | null>(null);
  const [draggingPitchBoundary, setDraggingPitchBoundary] = React.useState<PitchBoundaryDragState | null>(null);
  const [draggingBreakResize, setDraggingBreakResize] = React.useState<BreakResizeDragState | null>(null);

  // Drag state
  const [draggingItem, setDraggingItem] = React.useState<DragItemRef | null>(null);
  const [dropTargetFixtureId, setDropTargetFixtureId] = React.useState<string | null>(null);
  const [insertTarget, setInsertTarget] = React.useState<{ pitchId: string; index: number } | null>(null);
  const [pendingAutoScheduleReflow, setPendingAutoScheduleReflow] = React.useState(false);
  const [pendingPitchStartReflowIds, setPendingPitchStartReflowIds] = React.useState<string[]>([]);
  const hasCapturedGroupTimingRef = React.useRef(false);
  const previousGroupTimingRef = React.useRef<Map<string, { duration: number; slack: number }>>(new Map());
  const [recentlyChangedIds, setRecentlyChangedIds] = React.useState<string[]>([]);
  const [recentlyPrimaryChangedId, setRecentlyPrimaryChangedId] = React.useState<string | null>(null);
  const [recentlySwappedIds, setRecentlySwappedIds] = React.useState<string[]>([]);
  const changeFeedbackTimeoutRef = React.useRef<number | null>(null);
  const swapFeedbackTimeoutRef = React.useRef<number | null>(null);
  const [openCompetitionIds, setOpenCompetitionIds] = React.useState<string[]>([]);
  const [newPitchLocationId, setNewPitchLocationId] = React.useState<string>('unassigned');
  
  // Selection state
  const [selectedFixtureId, setSelectedFixtureId] = React.useState<string | null>(null);
  const [selectedBreakId, setSelectedBreakId] = React.useState<string | null>(null);

  const clearDragState = React.useCallback(() => {
    setDraggingItem(null);
    setDropTargetFixtureId(null);
    setInsertTarget(null);
  }, []);

  React.useEffect(() => {
    return () => {
      if (changeFeedbackTimeoutRef.current) {
        window.clearTimeout(changeFeedbackTimeoutRef.current);
      }
      if (swapFeedbackTimeoutRef.current) {
        window.clearTimeout(swapFeedbackTimeoutRef.current);
      }
    };
  }, []);



  React.useEffect(() => {
    localStorage.setItem(SCHEDULE_VERTICAL_SCALE_STORAGE_KEY, String(verticalScale));
  }, [verticalScale]);

  React.useEffect(() => {
    const resetDragUi = () => {
      clearDragState();
    };

    window.addEventListener('dragend', resetDragUi);
    window.addEventListener('drop', resetDragUi);

    return () => {
      window.removeEventListener('dragend', resetDragUi);
      window.removeEventListener('drop', resetDragUi);
    };
  }, [clearDragState]);



  React.useEffect(() => {
    setPitchDrafts((current) => {
      const next: Record<string, PitchDraft> = {};

      pitches.forEach((pitch) => {
        const draft = current[pitch.id];
        next[pitch.id] = {
          name: draft?.name ?? pitch.name,
          startTime: draft?.startTime ?? pitch.startTime ?? DEFAULT_PITCH_START,
          endTime: draft?.endTime ?? pitch.endTime ?? DEFAULT_PITCH_END,
        };
      });

      return next;
    });
  }, [pitches]);

  React.useEffect(() => {
    pitchDraftsRef.current = pitchDrafts;
  }, [pitchDrafts]);

  React.useEffect(() => {
    setOpenCompetitionIds((prev) => {
      const next = competitions.map((comp) => comp.id);
      const matches =
        prev.length === next.length && next.every((id) => prev.includes(id));
      if (matches) return prev;
      return next;
    });
  }, [competitions]);

  React.useEffect(() => {
    if (locations.length === 0) {
      setNewPitchLocationId('unassigned');
      return;
    }
    setNewPitchLocationId((current) => {
      if (current !== 'unassigned' && locations.some((location) => location.id === current)) {
        return current;
      }
      return locations[0].id;
    });
  }, [locations]);

  const effectivePitches = React.useMemo(
    () =>
      pitches.map((pitch) => {
        const draft = pitchDrafts[pitch.id];

        return {
          ...pitch,
          name: draft?.name ?? pitch.name,
          startTime: draft?.startTime ?? pitch.startTime ?? DEFAULT_PITCH_START,
          endTime: draft?.endTime ?? pitch.endTime ?? DEFAULT_PITCH_END,
        };
      }),
    [pitches, pitchDrafts]
  );

  const effectivePitchById = React.useMemo(
    () => new Map(effectivePitches.map((pitch) => [pitch.id, pitch])),
    [effectivePitches]
  );

  const locationById = React.useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations]
  );

  const homelessPitchIds = React.useMemo(() => {
    return new Set(
      effectivePitches
        .filter((pitch) => !pitch.locationId || !locationById.has(pitch.locationId))
        .map((pitch) => pitch.id)
    );
  }, [effectivePitches, locationById]);

  const homelessScheduledFixtures = React.useMemo(() => {
    let count = 0;
    competitions.forEach((competition) => {
      competition.fixtures.forEach((fixture) => {
        if (fixture.pitchId && homelessPitchIds.has(fixture.pitchId)) {
          count += 1;
        }
      });
    });
    return count;
  }, [competitions, homelessPitchIds]);

  // Detect team time conflicts and insufficient rest periods
  const { teamConflictFixtureIds, restWarningsByFixtureId } = React.useMemo(() => {
    const conflictIds = new Set<string>();
    // Map from fixture ID → set of team IDs that need more rest (only on the upcoming fixture)
    const restWarnings = new Map<string, Set<string>>();

    // Build group rest lookup: groupId → rest minutes
    const groupRestByGroupId = new Map<string, number>();
    competitions.forEach((comp) => {
      (comp.groups || []).forEach((group) => {
        groupRestByGroupId.set(group.id, group.defaultRest ?? DEFAULT_GROUP_REST);
      });
    });

    // Collect all scheduled fixtures with their time intervals
    type ScheduledFixture = {
      fixtureId: string;
      teamIds: string[];
      groupId?: string;
      startMin: number;
      endMin: number;
      restOverride?: number;
    };
    const scheduled: ScheduledFixture[] = [];

    competitions.forEach((comp) => {
      comp.fixtures.forEach((fixture) => {
        if (!fixture.pitchId || !fixture.startTime) return;
        const teams: string[] = [];
        if (fixture.homeTeamId && fixture.homeTeamId !== 'TBD') teams.push(fixture.homeTeamId);
        if (fixture.awayTeamId && fixture.awayTeamId !== 'TBD') teams.push(fixture.awayTeamId);
        if (teams.length === 0) return;

        scheduled.push({
          fixtureId: fixture.id,
          teamIds: teams,
          groupId: fixture.groupId,
          restOverride: fixture.rest,
          startMin: minutesFromMidnight(fixture.startTime),
          endMin: minutesFromMidnight(fixture.startTime) + (fixture.duration || 20),
        });
      });
    });

    // Build team → fixtures index
    const fixturesByTeam = new Map<string, ScheduledFixture[]>();
    scheduled.forEach((sf) => {
      sf.teamIds.forEach((teamId) => {
        if (!fixturesByTeam.has(teamId)) fixturesByTeam.set(teamId, []);
        fixturesByTeam.get(teamId)!.push(sf);
      });
    });

    // Check for overlaps and rest violations within each team's fixtures
    fixturesByTeam.forEach((fixtures, teamId) => {
      if (fixtures.length < 2) return;
      const sorted = [...fixtures].sort((a, b) => a.startMin - b.startMin);
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const a = sorted[i];
          const b = sorted[j];
          if (a.startMin < b.endMin && a.endMin > b.startMin) {
            conflictIds.add(a.fixtureId);
            conflictIds.add(b.fixtureId);
          }
        }
        // Rest violation: only flag the NEXT fixture (the one the team is about to play)
        if (i < sorted.length - 1) {
          const current = sorted[i];
          const next = sorted[i + 1];
          const gap = next.startMin - current.endMin;
          const restA = current.restOverride ?? (current.groupId ? (groupRestByGroupId.get(current.groupId) ?? DEFAULT_GROUP_REST) : DEFAULT_GROUP_REST);
          const restB = next.restOverride ?? (next.groupId ? (groupRestByGroupId.get(next.groupId) ?? DEFAULT_GROUP_REST) : DEFAULT_GROUP_REST);
          const requiredRest = Math.max(restA, restB);
          if (gap >= 0 && gap < requiredRest) {
            if (!restWarnings.has(next.fixtureId)) restWarnings.set(next.fixtureId, new Set());
            restWarnings.get(next.fixtureId)!.add(teamId);
          }
        }
      }
    });

    return { teamConflictFixtureIds: conflictIds, restWarningsByFixtureId: restWarnings };
  }, [competitions]);

  const commitPitchDraft = React.useCallback(
    (pitchId: string, fields: Array<'name' | 'startTime' | 'endTime'>) => {
      const original = pitches.find((pitch) => pitch.id === pitchId);
      const draft = pitchDraftsRef.current[pitchId];

      if (!original || !draft) return;

      const updates: Partial<Pitch> = {};

      if (fields.includes('name')) {
        const nextName = draft.name.trim() || original.name;
        if (nextName !== original.name) {
          updates.name = nextName;
        }

        if (nextName !== draft.name) {
          setPitchDrafts((current) => ({
            ...current,
            [pitchId]: {
              ...current[pitchId],
              name: nextName,
            },
          }));
        }
      }

      if (fields.includes('startTime') || fields.includes('endTime')) {
        const nextStart = draft.startTime || DEFAULT_PITCH_START;
        const nextEnd = draft.endTime || DEFAULT_PITCH_END;

        if (nextStart !== (original.startTime ?? DEFAULT_PITCH_START)) {
          updates.startTime = nextStart;
          setPendingPitchStartReflowIds((current) =>
            current.includes(pitchId) ? current : [...current, pitchId]
          );
        }
        if (nextEnd !== (original.endTime ?? DEFAULT_PITCH_END)) {
          updates.endTime = nextEnd;
        }
      }

      if (Object.keys(updates).length > 0) {
        updatePitch(pitchId, updates);
      }
    },
    [pitches, updatePitch]
  );

  const handleAddPitch = () => {
    let counter = effectivePitches.length + 1;
    let name = `Pitch ${counter}`;
    const lowerNames = new Set(effectivePitches.map((pitch) => pitch.name.trim().toLowerCase()));

    while (lowerNames.has(name.toLowerCase())) {
      counter += 1;
      name = `Pitch ${counter}`;
    }

    const chosenLocationId =
      newPitchLocationId !== 'unassigned' && locations.some((location) => location.id === newPitchLocationId)
        ? newPitchLocationId
        : undefined;

    addPitch(name, DEFAULT_PITCH_START, DEFAULT_PITCH_END, chosenLocationId);
  };

  const handleDeletePitch = (pitchId: string) => {
    const pitch = effectivePitchById.get(pitchId);
    if (!pitch) return;

    const confirmed = window.confirm(`Remove ${pitch.name}? Fixtures on this pitch will be unassigned.`);
    if (!confirmed) return;

    deletePitch(pitchId);
    setPitchDrafts((current) => {
      const next = { ...current };
      delete next[pitchId];
      return next;
    });
  };

  const updatePitchDraftField = (pitchId: string, field: keyof PitchDraft, value: string) => {
    setPitchDrafts((current) => {
      const base = current[pitchId] ?? {
        name: effectivePitchById.get(pitchId)?.name ?? 'Pitch',
        startTime: effectivePitchById.get(pitchId)?.startTime ?? DEFAULT_PITCH_START,
        endTime: effectivePitchById.get(pitchId)?.endTime ?? DEFAULT_PITCH_END,
      };

      return {
        ...current,
        [pitchId]: {
          ...base,
          [field]: value,
        },
      };
    });
  };

  React.useEffect(() => {
    if (!draggingPitchBoundary) return;

    const onMouseMove = (event: MouseEvent) => {
      const container = gridScrollRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const yInGrid = event.clientY - rect.top + container.scrollTop;
      const rawMinutes = VIEW_START_HOUR * 60 + Math.round(yInGrid / pixelsPerMinute);
      const snappedMinutes = Math.round(rawMinutes / DRAG_SNAP_MINUTES) * DRAG_SNAP_MINUTES;
      const minMinutes = VIEW_START_HOUR * 60;
      const maxMinutes = VIEW_END_HOUR * 60;
      const clampedMinutes = Math.max(minMinutes, Math.min(maxMinutes, snappedMinutes));

      setPitchDrafts((current) => {
        const pitchId = draggingPitchBoundary.pitchId;
        const sourcePitch = pitches.find((pitch) => pitch.id === pitchId);
        const base = current[pitchId] ?? {
          name: sourcePitch?.name ?? 'Pitch',
          startTime: sourcePitch?.startTime ?? DEFAULT_PITCH_START,
          endTime: sourcePitch?.endTime ?? DEFAULT_PITCH_END,
        };

        let startMinutes = minutesFromMidnight(base.startTime);
        let endMinutes = minutesFromMidnight(base.endTime);

        if (draggingPitchBoundary.boundary === 'startTime') {
          startMinutes = Math.max(
            minMinutes,
            Math.min(clampedMinutes, endMinutes - MIN_PITCH_WINDOW_MINUTES)
          );
        } else {
          endMinutes = Math.min(
            maxMinutes,
            Math.max(clampedMinutes, startMinutes + MIN_PITCH_WINDOW_MINUTES)
          );
        }

        const nextStart = timeFromMinutes(startMinutes);
        const nextEnd = timeFromMinutes(endMinutes);

        if (nextStart === base.startTime && nextEnd === base.endTime) {
          return current;
        }

        return {
          ...current,
          [pitchId]: {
            ...base,
            startTime: nextStart,
            endTime: nextEnd,
          },
        };
      });
    };

    const onMouseUp = () => {
      const pitchId = draggingPitchBoundary.pitchId;
      commitPitchDraft(pitchId, ['startTime', 'endTime']);
      setDraggingPitchBoundary(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [draggingPitchBoundary, commitPitchDraft, pitches, pixelsPerMinute]);

  const onPitchBoundaryMouseDown = (
    event: React.MouseEvent,
    pitchId: string,
    boundary: 'startTime' | 'endTime'
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setDraggingPitchBoundary({ pitchId, boundary });
  };

  const handleAutoSchedule = () => {
    competitions.forEach(c => autoScheduleMatches(c.id, pitchBreaks));
    window.setTimeout(() => {
      setPendingAutoScheduleReflow(true);
    }, 0);
  };

  const handleAutoAssignUmpires = () => {
    autoAssignUmpires();
  };

  const handleResetSchedule = () => {
    const confirmed = window.confirm('Remove all fixtures from the schedule? They will become unassigned.');
    if (!confirmed) return;
    resetAllSchedules();
  };

  const hasUnassignedUmpires = React.useMemo(() => {
    return competitions.some((competition) =>
      competition.fixtures.some(
        (fixture) => fixture.pitchId && fixture.startTime && !fixture.umpireTeam
      )
    );
  }, [competitions]);

  const handleUnassign = (fixtureId: string) => {
    const comp = competitions.find(c => c.fixtures.some(f => f.id === fixtureId));
    if (comp) {
      updateFixture(comp.id, fixtureId, {
        pitchId: undefined,
        startTime: undefined
      }, true, pitchBreaks);
    }
  };

  const handleFixtureClick = (fixtureId: string) => {
    setSelectedFixtureId(selectedFixtureId === fixtureId ? null : fixtureId);
    setSelectedBreakId(null);
  };

  const setCompetitionOpen = (competitionId: string, open: boolean) => {
    setOpenCompetitionIds((prev) => {
      const has = prev.includes(competitionId);
      if (open && !has) return [...prev, competitionId];
      if (!open && has) return prev.filter((id) => id !== competitionId);
      return prev;
    });
  };

  const toggleGroupPitch = (competitionId: string, group: Group, pitchId: string, enabled: boolean) => {
    const currentPitchIds = getGroupPitchIds(group);
    const nextPitchIds = enabled
      ? Array.from(new Set([...currentPitchIds, pitchId]))
      : currentPitchIds.filter((id) => id !== pitchId);

    updateGroup(competitionId, group.id, {
      pitchIds: nextPitchIds,
      primaryPitchId: nextPitchIds[0],
    });
  };

  const getDragItemFromDataTransfer = (dataTransfer: DataTransfer): DragItemRef | null => {
    const kind = dataTransfer.getData('dragKind');
    const id = dataTransfer.getData('dragId');

    if ((kind === 'fixture' || kind === 'break') && id) {
      return { kind, id };
    }

    const legacyFixtureId = dataTransfer.getData('fixtureId');
    if (legacyFixtureId) {
      return { kind: 'fixture', id: legacyFixtureId };
    }

    return null;
  };

  // Drag and Drop Handlers
  const onDragStart = (e: React.DragEvent, dragItem: DragItemRef) => {
    e.dataTransfer.setData('dragKind', dragItem.kind);
    e.dataTransfer.setData('dragId', dragItem.id);
    if (dragItem.kind === 'fixture') {
      e.dataTransfer.setData('fixtureId', dragItem.id);
    }
    e.dataTransfer.effectAllowed = 'move';
    setDraggingItem(dragItem);
    setDropTargetFixtureId(null);
    setInsertTarget(null);
  };

  const onDragEnd = () => {
    clearDragState();
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDragOverFixture = (e: React.DragEvent, fixtureId: string) => {
    e.stopPropagation();
    onDragOver(e);

    if (!draggingItem || draggingItem.kind !== 'fixture' || draggingItem.id === fixtureId) {
      setDropTargetFixtureId(null);
      return;
    }

    setInsertTarget(null);
    setDropTargetFixtureId(fixtureId);
  };

  const onDragOverInsert = (e: React.DragEvent, pitchId: string, index: number) => {
    e.stopPropagation();
    onDragOver(e);
    setDropTargetFixtureId(null);
    setInsertTarget({ pitchId, index });
  };

  const fixtureById = new Map<string, Fixture>();
  competitions.forEach(comp => {
    comp.fixtures.forEach(fixture => {
      fixtureById.set(fixture.id, fixture);
    });
  });

  const groupTimingSnapshot = React.useMemo(() => {
    const snapshot = new Map<string, { duration: number; slack: number }>();

    competitions.forEach((competition) => {
      (competition.groups || []).forEach((group) => {
        snapshot.set(`${competition.id}:${group.id}`, {
          duration: group.defaultDuration ?? DEFAULT_GROUP_DURATION,
          slack: group.defaultSlack ?? DEFAULT_GROUP_SLACK,
        });
      });
    });

    return snapshot;
  }, [competitions]);

  const showSwapFeedback = (fixtureIds: string[]) => {
    setRecentlySwappedIds(fixtureIds);
    if (swapFeedbackTimeoutRef.current) {
      window.clearTimeout(swapFeedbackTimeoutRef.current);
    }
    swapFeedbackTimeoutRef.current = window.setTimeout(() => {
      setRecentlySwappedIds([]);
    }, 1200);
  };

  const getActuallyChangedFixtureIds = (updates: FixtureBatchUpdate[]) => {
    const changedIds: string[] = [];

    updates.forEach(update => {
      const current = fixtureById.get(update.fixtureId);
      if (!current) {
        changedIds.push(update.fixtureId);
        return;
      }

      const hasPitchUpdate = Object.prototype.hasOwnProperty.call(update.updates, 'pitchId');
      const hasStartUpdate = Object.prototype.hasOwnProperty.call(update.updates, 'startTime');

      const pitchChanged = hasPitchUpdate && current.pitchId !== update.updates.pitchId;
      const startChanged = hasStartUpdate && current.startTime !== update.updates.startTime;

      if (pitchChanged || startChanged) {
        changedIds.push(update.fixtureId);
      }
    });

    return Array.from(new Set(changedIds));
  };

  const showChangeFeedback = (fixtureIds: string[], primaryFixtureId?: string) => {
    const uniqueFixtureIds = Array.from(new Set(fixtureIds));
    if (uniqueFixtureIds.length === 0) return;

    setRecentlyChangedIds(uniqueFixtureIds);
    setRecentlyPrimaryChangedId(
      primaryFixtureId && uniqueFixtureIds.includes(primaryFixtureId) ? primaryFixtureId : null
    );
    if (changeFeedbackTimeoutRef.current) {
      window.clearTimeout(changeFeedbackTimeoutRef.current);
    }
    changeFeedbackTimeoutRef.current = window.setTimeout(() => {
      setRecentlyChangedIds([]);
      setRecentlyPrimaryChangedId(null);
    }, 2500);
  };

  React.useEffect(() => {
    if (!hasCapturedGroupTimingRef.current) {
      hasCapturedGroupTimingRef.current = true;
      previousGroupTimingRef.current = groupTimingSnapshot;
      return;
    }

    const previousSnapshot = previousGroupTimingRef.current;
    const changedGroups: Array<{
      competitionId: string;
      groupId: string;
      duration: number;
      durationChanged: boolean;
    }> = [];

    groupTimingSnapshot.forEach((nextTiming, key) => {
      const previousTiming = previousSnapshot.get(key);
      if (!previousTiming) return;

      const durationChanged = previousTiming.duration !== nextTiming.duration;
      const slackChanged = previousTiming.slack !== nextTiming.slack;

      if (!durationChanged && !slackChanged) return;

      const [competitionId, groupId] = key.split(':');
      changedGroups.push({
        competitionId,
        groupId,
        duration: nextTiming.duration,
        durationChanged,
      });
    });

    previousGroupTimingRef.current = groupTimingSnapshot;

    if (changedGroups.length === 0) return;

    const changedGroupByKey = new Map(
      changedGroups.map((item) => [`${item.competitionId}:${item.groupId}`, item] as const)
    );
    const durationUpdatesByFixtureId = new Map<string, FixtureBatchUpdate>();
    const affectedPitchIds = new Set<string>();

    competitions.forEach((competition) => {
      competition.fixtures.forEach((fixture) => {
        if (!fixture.groupId) return;

        const changedGroup = changedGroupByKey.get(`${competition.id}:${fixture.groupId}`);
        if (!changedGroup) return;

        if (changedGroup.durationChanged && fixture.duration !== changedGroup.duration) {
          durationUpdatesByFixtureId.set(fixture.id, {
            competitionId: competition.id,
            fixtureId: fixture.id,
            updates: { duration: changedGroup.duration },
          });
        }

        if (fixture.pitchId) {
          affectedPitchIds.add(fixture.pitchId);
        }
      });
    });

    const fixtureDurationUpdateMap = new Map<string, Partial<Fixture>>(
      Array.from(durationUpdatesByFixtureId.entries()).map(([fixtureId, update]) => [fixtureId, update.updates])
    );

    const mergedFixtureUpdatesByFixtureId = new Map<string, FixtureBatchUpdate>(durationUpdatesByFixtureId);
    const mergedBreakUpdatesByBreakId = new Map<string, BreakBatchUpdate>();

    affectedPitchIds.forEach((pitchId) => {
      const pitchTimeline = listPitchTimeline(pitchId, fixtureDurationUpdateMap);
      const reflowUpdates = buildPitchTimelineUpdates(pitchId, pitchTimeline);

      reflowUpdates.fixtureUpdates.forEach((update) => {
        const existing = mergedFixtureUpdatesByFixtureId.get(update.fixtureId);
        mergedFixtureUpdatesByFixtureId.set(update.fixtureId, {
          competitionId: update.competitionId,
          fixtureId: update.fixtureId,
          updates: {
            ...(existing?.updates || {}),
            ...update.updates,
          },
        });
      });

      reflowUpdates.breakUpdates.forEach((update) => {
        const existing = mergedBreakUpdatesByBreakId.get(update.breakId);
        mergedBreakUpdatesByBreakId.set(update.breakId, {
          breakId: update.breakId,
          updates: {
            ...(existing?.updates || {}),
            ...update.updates,
          },
        });
      });
    });

    const currentFixtureById = new Map<string, Fixture>();
    competitions.forEach((competition) => {
      competition.fixtures.forEach((fixture) => {
        currentFixtureById.set(fixture.id, fixture);
      });
    });

    const fixtureUpdates = Array.from(mergedFixtureUpdatesByFixtureId.values()).filter((update) => {
      const current = currentFixtureById.get(update.fixtureId);
      if (!current) return true;

      const hasStartUpdate = Object.prototype.hasOwnProperty.call(update.updates, 'startTime');
      const hasDurationUpdate = Object.prototype.hasOwnProperty.call(update.updates, 'duration');
      const startChanged = hasStartUpdate && current.startTime !== update.updates.startTime;
      const durationChanged = hasDurationUpdate && current.duration !== update.updates.duration;

      return startChanged || durationChanged;
    });

    const currentBreakById = new Map(pitchBreaks.map((pitchBreak) => [pitchBreak.id, pitchBreak]));
    const breakUpdates = Array.from(mergedBreakUpdatesByBreakId.values()).filter((update) => {
      const current = currentBreakById.get(update.breakId);
      if (!current) return false;

      const hasPitchUpdate = Object.prototype.hasOwnProperty.call(update.updates, 'pitchId');
      const hasStartUpdate = Object.prototype.hasOwnProperty.call(update.updates, 'startTime');
      const pitchChanged = hasPitchUpdate && current.pitchId !== update.updates.pitchId;
      const startChanged = hasStartUpdate && current.startTime !== update.updates.startTime;

      return pitchChanged || startChanged;
    });

    if (fixtureUpdates.length === 0 && breakUpdates.length === 0) return;

    if (fixtureUpdates.length > 0) {
      batchUpdateFixtures(fixtureUpdates);
    }

    if (breakUpdates.length > 0) {
      breakUpdates.forEach((update) => {
        updatePitchBreak(update.breakId, update.updates);
      });
    }
  }, [batchUpdateFixtures, competitions, groupTimingSnapshot, pitchBreaks, updatePitchBreak]);

  const listPitchFixtures = (pitchId: string, updateMap?: Map<string, Partial<Fixture>>): PitchFixtureItem[] => {
    return competitions
      .flatMap((comp) =>
        comp.fixtures.map((fixture) => {
          const effectiveFixture = updateMap?.has(fixture.id)
            ? { ...fixture, ...updateMap.get(fixture.id) }
            : fixture;

          return {
            competitionId: comp.id,
            groups: comp.groups || [],
            fixture: effectiveFixture,
          };
        })
      )
      .filter((item) => item.fixture.pitchId === pitchId)
      .sort((a, b) => {
        const aStart =
          minutesFromMidnight(a.fixture.startTime || DEFAULT_ASSIGN_TIME) - (a.fixture.slackBefore || 0);
        const bStart =
          minutesFromMidnight(b.fixture.startTime || DEFAULT_ASSIGN_TIME) - (b.fixture.slackBefore || 0);
        if (aStart !== bStart) return aStart - bStart;
        return a.fixture.id.localeCompare(b.fixture.id);
      });
  };

  const listPitchBreaks = (
    pitchId: string,
    updateMap?: Map<string, Partial<PitchBreakItem>>
  ): PitchBreakItem[] => {
    return pitchBreaks
      .filter((pitchBreak) => pitchBreak.pitchId === pitchId)
      .map((pitchBreak) =>
        updateMap?.has(pitchBreak.id) ? { ...pitchBreak, ...updateMap.get(pitchBreak.id) } : pitchBreak
      )
      .sort((a, b) => {
        const aStart = minutesFromMidnight(a.startTime || DEFAULT_ASSIGN_TIME);
        const bStart = minutesFromMidnight(b.startTime || DEFAULT_ASSIGN_TIME);
        if (aStart !== bStart) return aStart - bStart;
        return a.id.localeCompare(b.id);
      });
  };

  const listPitchTimeline = (
    pitchId: string,
    fixtureUpdateMap?: Map<string, Partial<Fixture>>,
    breakUpdateMap?: Map<string, Partial<PitchBreakItem>>
  ): PitchTimelineItem[] => {
    const fixtureItems: PitchTimelineItem[] = listPitchFixtures(pitchId, fixtureUpdateMap).map((item) => ({
      kind: 'fixture',
      item,
    }));
    const breakItems: PitchTimelineItem[] = listPitchBreaks(pitchId, breakUpdateMap).map((item) => ({
      kind: 'break',
      item,
    }));

    return [...fixtureItems, ...breakItems].sort((a, b) => {
      const aStart = getTimelineStartMinutes(a);
      const bStart = getTimelineStartMinutes(b);

      if (aStart !== bStart) return aStart - bStart;
      if (a.kind !== b.kind) return a.kind === 'fixture' ? -1 : 1;

      const aId = a.kind === 'fixture' ? a.item.fixture.id : a.item.id;
      const bId = b.kind === 'fixture' ? b.item.fixture.id : b.item.id;
      return aId.localeCompare(bId);
    });
  };

  const findFixtureContext = (fixtureId: string) => {
    for (const comp of competitions) {
      const fixture = comp.fixtures.find((f) => f.id === fixtureId);
      if (fixture) {
        return {
          competitionId: comp.id,
          groups: comp.groups || [],
          fixture,
        };
      }
    }
    return null;
  };

  const findBreakContext = (breakId: string) => {
    const pitchBreak = pitchBreaks.find((item) => item.id === breakId);
    if (!pitchBreak) return null;
    return {
      pitchBreak,
    };
  };

  const findTimelineContext = (dragItem: DragItemRef): { item: PitchTimelineItem; sourcePitchId?: string } | null => {
    if (dragItem.kind === 'fixture') {
      const fixtureContext = findFixtureContext(dragItem.id);
      if (!fixtureContext) return null;
      return {
        item: { kind: 'fixture', item: fixtureContext },
        sourcePitchId: fixtureContext.fixture.pitchId,
      };
    }

    const breakContext = findBreakContext(dragItem.id);
    if (!breakContext) return null;
    return {
      item: { kind: 'break', item: breakContext.pitchBreak },
      sourcePitchId: breakContext.pitchBreak.pitchId,
    };
  };

  const getFixtureBlockMinutes = (fixture: Fixture, groups: Group[]) => {
    const duration = fixture.duration || DEFAULT_GROUP_DURATION;
    const slack = getFixtureSlack(fixture, groups);
    const slackBefore = fixture.slackBefore || 0;
    return slackBefore + duration + slack;
  };

  const getTimelineBlockMinutes = (timelineItem: PitchTimelineItem) => {
    if (timelineItem.kind === 'break') {
      return Math.max(MIN_BREAK_DURATION, timelineItem.item.duration || DEFAULT_BREAK_DURATION);
    }

    return getFixtureBlockMinutes(timelineItem.item.fixture, timelineItem.item.groups);
  };

  const getTimelineStartMinutes = (timelineItem: PitchTimelineItem) => {
    if (timelineItem.kind === 'break') {
      return minutesFromMidnight(timelineItem.item.startTime || DEFAULT_ASSIGN_TIME);
    }

    const fixtureStart = minutesFromMidnight(timelineItem.item.fixture.startTime || DEFAULT_ASSIGN_TIME);
    const slackBefore = timelineItem.item.fixture.slackBefore || 0;
    return fixtureStart - slackBefore;
  };

  const buildPitchTimelineUpdates = (
    pitchId: string,
    ordered: PitchTimelineItem[]
  ): { fixtureUpdates: FixtureBatchUpdate[]; breakUpdates: BreakBatchUpdate[] } => {
    const pitchStart = effectivePitchById.get(pitchId)?.startTime || DEFAULT_ASSIGN_TIME;
    let cursor = minutesFromMidnight(pitchStart);
    const fixtureUpdates: FixtureBatchUpdate[] = [];
    const breakUpdates: BreakBatchUpdate[] = [];

    ordered.forEach((timelineItem) => {
      if (timelineItem.kind === 'fixture') {
        const slackBefore = timelineItem.item.fixture.slackBefore || 0;
        const startTime = timeFromMinutes(cursor + slackBefore);
        cursor += getTimelineBlockMinutes(timelineItem);
        fixtureUpdates.push({
          competitionId: timelineItem.item.competitionId,
          fixtureId: timelineItem.item.fixture.id,
          updates: { pitchId, startTime },
        });
      } else {
        const startTime = timeFromMinutes(cursor);
        cursor += getTimelineBlockMinutes(timelineItem);
        breakUpdates.push({
          breakId: timelineItem.item.id,
          updates: { pitchId, startTime },
        });
      }
    });

    return {
      fixtureUpdates,
      breakUpdates,
    };
  };

  const applyPitchTimelineUpdates = (
    updates: { fixtureUpdates: FixtureBatchUpdate[]; breakUpdates: BreakBatchUpdate[] },
    options?: { baseBreaks?: PitchBreakItem[] }
  ) => {
    // Apply break updates against an explicit base list when callers already added/removed breaks.
    const baseBreaks = options?.baseBreaks ?? pitchBreaks;
    let nextBreaks = baseBreaks;

    if (updates.breakUpdates.length > 0) {
      const breakUpdateMap = new Map(updates.breakUpdates.map((update) => [update.breakId, update.updates]));
      nextBreaks = baseBreaks.map((pitchBreak) =>
        breakUpdateMap.has(pitchBreak.id) ? { ...pitchBreak, ...breakUpdateMap.get(pitchBreak.id) } : pitchBreak
      );
    }

    // Apply break updates individually
    if (updates.breakUpdates.length > 0) {
      updates.breakUpdates.forEach((update) => {
        updatePitchBreak(update.breakId, update.updates);
      });
    }

    if (updates.fixtureUpdates.length > 0) {
      batchUpdateFixtures(updates.fixtureUpdates, true, pitchBreaks);
    }
  };

  const computeInsertUpdates = (
    sourceDragItem: DragItemRef,
    targetPitchId: string,
    targetIndex: number
  ): { fixtureUpdates: FixtureBatchUpdate[]; breakUpdates: BreakBatchUpdate[] } => {
    const sourceContext = findTimelineContext(sourceDragItem);
    if (!sourceContext) return { fixtureUpdates: [], breakUpdates: [] };

    const sourcePitchId = sourceContext.sourcePitchId;
    const sourceTimelineItem = sourceContext.item;
    const clampedTargetIndex = Math.max(0, targetIndex);

    if (sourcePitchId && sourcePitchId === targetPitchId) {
      const samePitchList = listPitchTimeline(sourcePitchId);
      const sourceIndex = samePitchList.findIndex((timelineItem) => {
        if (sourceDragItem.kind === 'fixture') {
          return timelineItem.kind === 'fixture' && timelineItem.item.fixture.id === sourceDragItem.id;
        }
        return timelineItem.kind === 'break' && timelineItem.item.id === sourceDragItem.id;
      });
      if (sourceIndex < 0) return { fixtureUpdates: [], breakUpdates: [] };

      samePitchList.splice(sourceIndex, 1);

      let insertIndex = clampedTargetIndex;
      if (sourceIndex < clampedTargetIndex) {
        insertIndex = clampedTargetIndex - 1;
      }
      insertIndex = Math.max(0, Math.min(insertIndex, samePitchList.length));

      if (insertIndex === sourceIndex) return { fixtureUpdates: [], breakUpdates: [] };

      samePitchList.splice(insertIndex, 0, sourceTimelineItem);
      return buildPitchTimelineUpdates(targetPitchId, samePitchList);
    }

    const targetList = listPitchTimeline(targetPitchId);
    const insertIndex = Math.max(0, Math.min(clampedTargetIndex, targetList.length));
    targetList.splice(insertIndex, 0, sourceTimelineItem);

    if (sourcePitchId) {
      const sourceList = listPitchTimeline(sourcePitchId).filter(
        (timelineItem) => {
          if (sourceDragItem.kind === 'fixture') {
            return !(timelineItem.kind === 'fixture' && timelineItem.item.fixture.id === sourceDragItem.id);
          }
          return !(timelineItem.kind === 'break' && timelineItem.item.id === sourceDragItem.id);
        }
      );
      const sourceUpdates = buildPitchTimelineUpdates(sourcePitchId, sourceList);
      const targetUpdates = buildPitchTimelineUpdates(targetPitchId, targetList);

      return {
        fixtureUpdates: [...sourceUpdates.fixtureUpdates, ...targetUpdates.fixtureUpdates],
        breakUpdates: [...sourceUpdates.breakUpdates, ...targetUpdates.breakUpdates],
      };
    }

    return buildPitchTimelineUpdates(targetPitchId, targetList);
  };

  const insertPreviewUpdates =
    draggingItem && insertTarget
      ? computeInsertUpdates(draggingItem, insertTarget.pitchId, insertTarget.index)
      : { fixtureUpdates: [], breakUpdates: [] };

  const insertPreviewMap = new Map<string, Partial<Fixture>>(
    insertPreviewUpdates.fixtureUpdates
      .filter((update) => !(draggingItem?.kind === 'fixture' && update.fixtureId === draggingItem.id))
      .map((update) => [update.fixtureId, update.updates])
  );

  const insertPreviewBreakMap = new Map<string, Partial<PitchBreakItem>>(
    insertPreviewUpdates.breakUpdates
      .filter((update) => !(draggingItem?.kind === 'break' && update.breakId === draggingItem.id))
      .map((update) => [update.breakId, update.updates])
  );

  const getEffectiveFixture = (fixture: Fixture) => {
    if (!insertPreviewMap.has(fixture.id)) return fixture;
    return { ...fixture, ...insertPreviewMap.get(fixture.id) };
  };

  const draggingBlockHeight = (() => {
    if (!draggingItem) return 0;
    if (draggingItem.kind === 'fixture') {
      const fixtureContext = findFixtureContext(draggingItem.id);
      return fixtureContext
        ? getFixtureBlockMinutes(fixtureContext.fixture, fixtureContext.groups) * pixelsPerMinute
        : 0;
    }

    const breakContext = findBreakContext(draggingItem.id);
    return breakContext
      ? Math.max(MIN_BREAK_DURATION, breakContext.pitchBreak.duration || DEFAULT_BREAK_DURATION) * pixelsPerMinute
      : 0;
  })();

  const swapFixtures = (sourceFixtureId: string, targetFixtureId: string) => {
    if (sourceFixtureId === targetFixtureId) return;

    const source = findFixtureContext(sourceFixtureId);
    const target = findFixtureContext(targetFixtureId);
    if (!source || !target) return;

    const sourcePitchId = source.fixture.pitchId;
    const targetPitchId = target.fixture.pitchId;

    if (!targetPitchId) return;

    const sourceTimelineItem: PitchTimelineItem = { kind: 'fixture', item: source };
    const targetTimelineItem: PitchTimelineItem = { kind: 'fixture', item: target };

    // Both fixtures are on the same pitch: swap order and reflow that pitch timeline.
    if (sourcePitchId && sourcePitchId === targetPitchId) {
      const timeline = listPitchTimeline(sourcePitchId);
      const sourceIndex = timeline.findIndex(
        (timelineItem) => timelineItem.kind === 'fixture' && timelineItem.item.fixture.id === sourceFixtureId
      );
      const targetIndex = timeline.findIndex(
        (timelineItem) => timelineItem.kind === 'fixture' && timelineItem.item.fixture.id === targetFixtureId
      );
      if (sourceIndex < 0 || targetIndex < 0) return;

      [timeline[sourceIndex], timeline[targetIndex]] = [timeline[targetIndex], timeline[sourceIndex]];
      const updates = buildPitchTimelineUpdates(sourcePitchId, timeline);
      applyPitchTimelineUpdates(updates);
      showChangeFeedback(getActuallyChangedFixtureIds(updates.fixtureUpdates), sourceFixtureId);
      showSwapFeedback([sourceFixtureId, targetFixtureId]);
      return;
    }

    // Fixtures are on different pitches: swap slot positions and reflow both affected pitch timelines.
    if (sourcePitchId) {
      const sourceList = listPitchTimeline(sourcePitchId);
      const targetList = listPitchTimeline(targetPitchId);

      const sourceIndex = sourceList.findIndex(
        (timelineItem) => timelineItem.kind === 'fixture' && timelineItem.item.fixture.id === sourceFixtureId
      );
      const targetIndex = targetList.findIndex(
        (timelineItem) => timelineItem.kind === 'fixture' && timelineItem.item.fixture.id === targetFixtureId
      );
      if (sourceIndex < 0 || targetIndex < 0) return;

      sourceList.splice(sourceIndex, 1);
      targetList.splice(targetIndex, 1);

      sourceList.splice(sourceIndex, 0, targetTimelineItem);
      targetList.splice(targetIndex, 0, sourceTimelineItem);

      const sourceUpdates = buildPitchTimelineUpdates(sourcePitchId, sourceList);
      const targetUpdates = buildPitchTimelineUpdates(targetPitchId, targetList);
      const updates = {
        fixtureUpdates: [...sourceUpdates.fixtureUpdates, ...targetUpdates.fixtureUpdates],
        breakUpdates: [...sourceUpdates.breakUpdates, ...targetUpdates.breakUpdates],
      };
      applyPitchTimelineUpdates(updates);
      showChangeFeedback(getActuallyChangedFixtureIds(updates.fixtureUpdates), sourceFixtureId);
      showSwapFeedback([sourceFixtureId, targetFixtureId]);
      return;
    }

    // Source is unassigned: replace target slot with source and unassign the target fixture.
    const targetList = listPitchTimeline(targetPitchId);
    const targetIndex = targetList.findIndex(
      (timelineItem) => timelineItem.kind === 'fixture' && timelineItem.item.fixture.id === targetFixtureId
    );
    if (targetIndex < 0) return;

    targetList.splice(targetIndex, 1, sourceTimelineItem);
    const reflowUpdates = buildPitchTimelineUpdates(targetPitchId, targetList);
    const updates = {
      fixtureUpdates: [
        ...reflowUpdates.fixtureUpdates,
        {
          competitionId: target.competitionId,
          fixtureId: target.fixture.id,
          updates: { pitchId: undefined, startTime: undefined },
        },
      ],
      breakUpdates: reflowUpdates.breakUpdates,
    };

    applyPitchTimelineUpdates(updates);
    showChangeFeedback(getActuallyChangedFixtureIds(updates.fixtureUpdates), sourceFixtureId);
  };

  const onDropFixture = (e: React.DragEvent, targetFixtureId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceDragItem = getDragItemFromDataTransfer(e.dataTransfer);
    if (!sourceDragItem || sourceDragItem.kind !== 'fixture' || sourceDragItem.id === targetFixtureId) return;

    swapFixtures(sourceDragItem.id, targetFixtureId);
    clearDragState();
  };

  const onDropInsert = (e: React.DragEvent, pitchId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceDragItem = getDragItemFromDataTransfer(e.dataTransfer);
    if (!sourceDragItem) return;

    const updates = computeInsertUpdates(sourceDragItem, pitchId, index);
    applyPitchTimelineUpdates(updates);
    showChangeFeedback(
      getActuallyChangedFixtureIds(updates.fixtureUpdates),
      sourceDragItem.kind === 'fixture' ? sourceDragItem.id : undefined
    );
    clearDragState();
  };

  const handleAddBreak = (pitchId: string, insertIndex?: number) => {
    const pitchStart = effectivePitchById.get(pitchId)?.startTime || DEFAULT_ASSIGN_TIME;
    const timeline = listPitchTimeline(pitchId);

    // Calculate start time based on insertion point
    let startMinutes: number;
    if (insertIndex !== undefined && insertIndex < timeline.length) {
      const itemBefore = insertIndex > 0 ? timeline[insertIndex - 1] : undefined;
      startMinutes = itemBefore
        ? getTimelineStartMinutes(itemBefore) + getTimelineBlockMinutes(itemBefore)
        : minutesFromMidnight(pitchStart);
    } else {
      const lastTimelineItem = timeline[timeline.length - 1];
      startMinutes = lastTimelineItem
        ? getTimelineStartMinutes(lastTimelineItem) + getTimelineBlockMinutes(lastTimelineItem)
        : minutesFromMidnight(pitchStart);
    }

    const nextBreak: PitchBreakItem = {
      id: uuidv4(),
      pitchId,
      startTime: timeFromMinutes(startMinutes),
      duration: DEFAULT_BREAK_DURATION,
      label: 'Break',
    };

    const idx = insertIndex !== undefined ? Math.max(0, Math.min(insertIndex, timeline.length)) : timeline.length;
    const nextTimeline = [...timeline.slice(0, idx), { kind: 'break' as const, item: nextBreak }, ...timeline.slice(idx)];
    const nextBreaks = [...pitchBreaks, nextBreak];
    const updates = buildPitchTimelineUpdates(pitchId, nextTimeline);
    applyPitchTimelineUpdates(updates, { baseBreaks: nextBreaks });
    showChangeFeedback(getActuallyChangedFixtureIds(updates.fixtureUpdates));
  };

  const handleDeleteBreak = (pitchId: string, breakId: string) => {
    const nextTimeline = listPitchTimeline(pitchId).filter(
      (timelineItem) => !(timelineItem.kind === 'break' && timelineItem.item.id === breakId)
    );

    const nextBreaks = pitchBreaks.filter((pitchBreak) => pitchBreak.id !== breakId);
    const updates = buildPitchTimelineUpdates(pitchId, nextTimeline);
    applyPitchTimelineUpdates(updates, { baseBreaks: nextBreaks });
    showChangeFeedback(getActuallyChangedFixtureIds(updates.fixtureUpdates));
    if (selectedBreakId === breakId) {
      setSelectedBreakId(null);
    }
  };

  const updateBreakLabel = (breakId: string, label: string) => {
    updatePitchBreak(breakId, { label });
  };

  const updateBreakDuration = (breakId: string, nextDuration: number) => {
    const safeDuration = Math.max(MIN_BREAK_DURATION, nextDuration || MIN_BREAK_DURATION);
    updatePitchBreak(breakId, { duration: safeDuration });
  };

  const commitBreakLabel = (breakId: string) => {
    const pitchBreak = pitchBreaks.find(pb => pb.id === breakId);
    if (pitchBreak) {
      const nextLabel = pitchBreak.label.trim() || 'Break';
      if (nextLabel !== pitchBreak.label) {
        updatePitchBreak(breakId, { label: nextLabel });
      }
    }
  };

  const commitBreakDuration = (pitchId: string) => {
    const updates = buildPitchTimelineUpdates(pitchId, listPitchTimeline(pitchId));
    applyPitchTimelineUpdates(updates);
    showChangeFeedback(getActuallyChangedFixtureIds(updates.fixtureUpdates));
  };

  const selectedBreak = selectedBreakId
    ? pitchBreaks.find((pitchBreak) => pitchBreak.id === selectedBreakId) || null
    : null;

  const onBreakResizeMouseDown = (event: React.MouseEvent, pitchBreak: PitchBreakItem) => {
    event.preventDefault();
    event.stopPropagation();
    setDraggingBreakResize({
      breakId: pitchBreak.id,
      pitchId: pitchBreak.pitchId,
      startClientY: event.clientY,
      initialDuration: pitchBreak.duration,
    });
  };

  React.useEffect(() => {
    if (!draggingBreakResize) return;

    const onMouseMove = (event: MouseEvent) => {
      const deltaPixels = event.clientY - draggingBreakResize.startClientY;
      const deltaMinutesRaw = deltaPixels / pixelsPerMinute;
      const deltaMinutesSnapped =
        Math.round(deltaMinutesRaw / BREAK_DURATION_STEP_MINUTES) * BREAK_DURATION_STEP_MINUTES;
      const nextDuration = Math.max(
        MIN_BREAK_DURATION,
        draggingBreakResize.initialDuration + deltaMinutesSnapped
      );

      const pitchBreak = pitchBreaks.find(pb => pb.id === draggingBreakResize.breakId);
      if (pitchBreak && pitchBreak.duration !== nextDuration) {
        updatePitchBreak(draggingBreakResize.breakId, { duration: nextDuration });
      }
    };

    const onMouseUp = () => {
      const pitchId = draggingBreakResize.pitchId;
      setDraggingBreakResize(null);

      const updates = buildPitchTimelineUpdates(pitchId, listPitchTimeline(pitchId));
      applyPitchTimelineUpdates(updates);
      showChangeFeedback(getActuallyChangedFixtureIds(updates.fixtureUpdates));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [
    draggingBreakResize,
    applyPitchTimelineUpdates,
    buildPitchTimelineUpdates,
    getActuallyChangedFixtureIds,
    listPitchTimeline,
    pixelsPerMinute,
    showChangeFeedback,
  ]);

  React.useEffect(() => {
    if (!pendingAutoScheduleReflow) return;

    setPendingAutoScheduleReflow(false);

    const mergedFixtureUpdates: FixtureBatchUpdate[] = [];
    const mergedBreakUpdates: BreakBatchUpdate[] = [];

    effectivePitches.forEach((pitch) => {
      const updates = buildPitchTimelineUpdates(pitch.id, listPitchTimeline(pitch.id));
      mergedFixtureUpdates.push(...updates.fixtureUpdates);
      mergedBreakUpdates.push(...updates.breakUpdates);
    });

    const changedFixtureIds = new Set(getActuallyChangedFixtureIds(mergedFixtureUpdates));
    const changedFixtureUpdates = mergedFixtureUpdates.filter((update) => changedFixtureIds.has(update.fixtureId));

    const currentBreakById = new Map(pitchBreaks.map((pitchBreak) => [pitchBreak.id, pitchBreak]));
    const changedBreakUpdates = mergedBreakUpdates.filter((update) => {
      const current = currentBreakById.get(update.breakId);
      if (!current) return false;

      const hasPitchUpdate = Object.prototype.hasOwnProperty.call(update.updates, 'pitchId');
      const hasStartUpdate = Object.prototype.hasOwnProperty.call(update.updates, 'startTime');
      const pitchChanged = hasPitchUpdate && current.pitchId !== update.updates.pitchId;
      const startChanged = hasStartUpdate && current.startTime !== update.updates.startTime;

      return pitchChanged || startChanged;
    });

    if (changedFixtureUpdates.length === 0 && changedBreakUpdates.length === 0) return;

    applyPitchTimelineUpdates({
      fixtureUpdates: changedFixtureUpdates,
      breakUpdates: changedBreakUpdates,
    });
    showChangeFeedback(Array.from(changedFixtureIds));
  }, [
    pendingAutoScheduleReflow,
    effectivePitches,
    pitchBreaks,
    buildPitchTimelineUpdates,
    listPitchTimeline,
    getActuallyChangedFixtureIds,
    applyPitchTimelineUpdates,
    showChangeFeedback,
  ]);

  React.useEffect(() => {
    if (pendingPitchStartReflowIds.length === 0) return;

    const pitchIds = Array.from(new Set(pendingPitchStartReflowIds));
    setPendingPitchStartReflowIds([]);

    const mergedFixtureUpdates: FixtureBatchUpdate[] = [];
    const mergedBreakUpdates: BreakBatchUpdate[] = [];

    pitchIds.forEach((pitchId) => {
      const updates = buildPitchTimelineUpdates(pitchId, listPitchTimeline(pitchId));
      mergedFixtureUpdates.push(...updates.fixtureUpdates);
      mergedBreakUpdates.push(...updates.breakUpdates);
    });

    const changedFixtureIds = new Set(getActuallyChangedFixtureIds(mergedFixtureUpdates));
    const changedFixtureUpdates = mergedFixtureUpdates.filter((update) => changedFixtureIds.has(update.fixtureId));

    const currentBreakById = new Map(pitchBreaks.map((pitchBreak) => [pitchBreak.id, pitchBreak]));
    const changedBreakUpdates = mergedBreakUpdates.filter((update) => {
      const current = currentBreakById.get(update.breakId);
      if (!current) return false;

      const hasPitchUpdate = Object.prototype.hasOwnProperty.call(update.updates, 'pitchId');
      const hasStartUpdate = Object.prototype.hasOwnProperty.call(update.updates, 'startTime');
      const pitchChanged = hasPitchUpdate && current.pitchId !== update.updates.pitchId;
      const startChanged = hasStartUpdate && current.startTime !== update.updates.startTime;

      return pitchChanged || startChanged;
    });

    if (changedFixtureUpdates.length === 0 && changedBreakUpdates.length === 0) return;

    applyPitchTimelineUpdates({
      fixtureUpdates: changedFixtureUpdates,
      breakUpdates: changedBreakUpdates,
    });
    showChangeFeedback(Array.from(changedFixtureIds));
  }, [
    pendingPitchStartReflowIds,
    pitchBreaks,
    buildPitchTimelineUpdates,
    listPitchTimeline,
    getActuallyChangedFixtureIds,
    applyPitchTimelineUpdates,
    showChangeFeedback,
  ]);

  // Time grid helpers
  const totalMinutes = (VIEW_END_HOUR - VIEW_START_HOUR) * 60;
  const gridHeight = totalMinutes * pixelsPerMinute;
  const scaledFontSize = (base: number) => `${(base * textScale).toFixed(1)}px`;
  const timeLabels = [];
  for (let h = VIEW_START_HOUR; h <= VIEW_END_HOUR; h++) {
    timeLabels.push(momentFromHour(h));
  }

  function momentFromHour(h: number) {
    return `${h.toString().padStart(2, '0')}:00`;
  }

  const ScheduleToolsPortal = (
    <SidebarGroup>
      <SidebarGroupLabel>Schedule Tools</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="space-y-2 rounded-md border border-sidebar-border/70 bg-background/60 p-2">
            <div className="text-xs font-medium text-muted-foreground">Add Pitch</div>
            <Select value={newPitchLocationId} onValueChange={setNewPitchLocationId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Link to location" />
              </SelectTrigger>
              <SelectContent>
                {locations.length === 0 ? (
                  <SelectItem value="unassigned">No locations available</SelectItem>
                ) : (
                  locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <SidebarMenuButton
              onClick={handleAddPitch}
              disabled={locations.length === 0}
              tooltip={locations.length === 0 ? 'Create a location first.' : undefined}
            >
              <Plus /> <span>Add Pitch</span>
            </SidebarMenuButton>
          </div>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={handleAutoSchedule}>
            <Clock /> <span>Auto Schedule All</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={handleAutoAssignUmpires}
            tooltip={
              hasUnassignedUmpires
                ? 'Some scheduled matches could not be assigned an umpire automatically.'
                : undefined
            }
          >
            <Clock />
            <span>Auto Assign Umpires</span>
            {hasUnassignedUmpires && <AlertTriangle className="ml-auto h-3.5 w-3.5 text-amber-500" />}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={handleResetSchedule}>
            <RotateCcw /> <span>Reset Schedule</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => effectivePitches.length > 0 && handleAddBreak(effectivePitches[0].id)}>
            <Plus /> <span>Add Break</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <div className="rounded-md border border-sidebar-border/70 bg-background/60 px-2 py-2">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Vertical Zoom</span>
              <span className="font-semibold text-foreground">{verticalScale}x</span>
            </div>
            <Slider
              min={MIN_VERTICAL_SCALE}
              max={MAX_VERTICAL_SCALE}
              step={1}
              value={[verticalScale]}
              onValueChange={(value) => {
                if (!value.length) return;
                setVerticalScale(value[0]);
              }}
              aria-label="Scheduler vertical zoom"
            />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );

  const CompetitionsDetailPortal = (
    <SidebarGroup className="mt-4">
      <SidebarGroupLabel>Competitions</SidebarGroupLabel>
      {competitions.length === 0 ? (
        <div className="px-2 py-1 text-xs text-muted-foreground">No competitions.</div>
      ) : (
        <SidebarMenu className="space-y-2">
          {competitions.map((comp) => {
            const groups = comp.groups ?? [];
            const isOpen = openCompetitionIds.includes(comp.id);
            const groupColorMap = createGroupColorMap(groups);

            return (
              <Collapsible
                key={comp.id}
                open={isOpen}
                onOpenChange={(open) => setCompetitionOpen(comp.id, open)}
                asChild
                className="group/competition"
              >
                <SidebarMenuItem className="rounded-md border border-sidebar-border/80 bg-background/40">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={comp.name} className="h-9 px-2">
                      <CompetitionBadge
                        code={comp.code}
                        color={comp.color}
                        size="sm"
                        className="h-5 w-5 text-[9px]"
                      />
                      <span className="truncate">{comp.name}</span>
                      <span className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5">{groups.length}</span>
                        <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/competition:rotate-90" />
                      </span>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-1.5 border-t border-sidebar-border/70 px-2 py-2">
                      {groups.length === 0 ? (
                        <div className="rounded-md border border-dashed px-2 py-1.5 text-[11px] text-muted-foreground">
                          No groups configured.
                        </div>
                      ) : (
                        groups.map((group) => {
                          const selectedPitchIds = getGroupPitchIds(group);
                          const groupColor = getGroupColorFromMap(groupColorMap, group.id);

                          return (
                            <div
                              key={group.id}
                              className="rounded-md border border-sidebar-border/70 bg-background/70 p-2"
                            >
                              <div className="mb-1.5 flex items-center gap-2">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: groupColor }}
                                />
                                <span className="truncate text-xs font-medium">{group.name}</span>
                              </div>
                              <div className="mb-1.5 grid grid-cols-3 gap-1">
                                <label className="flex items-center gap-1 rounded border border-sidebar-border/70 bg-background px-1.5 py-1 text-[9px] text-muted-foreground">
                                  <span className="font-semibold uppercase">D</span>
                                  <input
                                    type="number"
                                    className="h-4 w-full min-w-0 border-0 bg-transparent p-0 text-right text-[11px] font-medium text-foreground focus:outline-none"
                                    value={group.defaultDuration ?? DEFAULT_GROUP_DURATION}
                                    onChange={(e) =>
                                      updateGroup(comp.id, group.id, {
                                        defaultDuration: Math.max(
                                          1,
                                          parseInt(e.target.value) || DEFAULT_GROUP_DURATION
                                        ),
                                      })
                                    }
                                    aria-label={`${group.name} duration`}
                                  />
                                </label>
                                <label className="flex items-center gap-1 rounded border border-sidebar-border/70 bg-background px-1.5 py-1 text-[9px] text-muted-foreground">
                                  <span className="font-semibold uppercase">S</span>
                                  <input
                                    type="number"
                                    className="h-4 w-full min-w-0 border-0 bg-transparent p-0 text-right text-[11px] font-medium text-foreground focus:outline-none"
                                    value={group.defaultSlack ?? DEFAULT_GROUP_SLACK}
                                    onChange={(e) =>
                                      updateGroup(comp.id, group.id, {
                                        defaultSlack: Math.max(
                                          0,
                                          parseInt(e.target.value) || DEFAULT_GROUP_SLACK
                                        ),
                                      })
                                    }
                                    aria-label={`${group.name} slack`}
                                  />
                                </label>
                                <label className="flex items-center gap-1 rounded border border-sidebar-border/70 bg-background px-1.5 py-1 text-[9px] text-muted-foreground">
                                  <span className="font-semibold uppercase">R</span>
                                  <input
                                    type="number"
                                    className="h-4 w-full min-w-0 border-0 bg-transparent p-0 text-right text-[11px] font-medium text-foreground focus:outline-none"
                                    value={group.defaultRest ?? DEFAULT_GROUP_REST}
                                    onChange={(e) =>
                                      updateGroup(comp.id, group.id, {
                                        defaultRest: Math.max(
                                          1,
                                          parseInt(e.target.value) || DEFAULT_GROUP_REST
                                        ),
                                      })
                                    }
                                    aria-label={`${group.name} rest`}
                                  />
                                </label>
                              </div>
                              {effectivePitches.length === 0 ? (
                                <div className="text-[10px] text-muted-foreground">Add a pitch to assign groups.</div>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {effectivePitches.map((pitch) => {
                                    const isSelected = selectedPitchIds.includes(pitch.id);
                                    return (
                                      <button
                                        key={pitch.id}
                                        type="button"
                                        className={cn(
                                          'h-5 rounded border px-1.5 text-[10px] leading-none transition-colors',
                                          isSelected
                                            ? 'border-primary bg-primary/90 text-primary-foreground'
                                            : 'border-sidebar-border bg-muted/70 text-muted-foreground hover:bg-muted'
                                        )}
                                        onClick={() =>
                                          toggleGroupPitch(comp.id, group, pitch.id, !isSelected)
                                        }
                                      >
                                        {pitch.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          })}
        </SidebarMenu>
      )}
    </SidebarGroup>
  );

  const schedulePortalTarget = document.getElementById('sidebar-schedule-portal');
  const competitionsPortalTarget = document.getElementById('sidebar-competitions-portal');

  return (
    <div className="container mx-auto p-0 h-full flex flex-col relative">
      {schedulePortalTarget && createPortal(ScheduleToolsPortal, schedulePortalTarget)}
      {competitionsPortalTarget && createPortal(CompetitionsDetailPortal, competitionsPortalTarget)}

      {homelessPitchIds.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            <span>
              {homelessPitchIds.size} pitch{homelessPitchIds.size === 1 ? '' : 'es'} without a location.
            </span>
          </div>
          <span className="text-xs font-medium text-amber-800">
            {homelessScheduledFixtures} reservation{homelessScheduledFixtures === 1 ? '' : 's'} affected
          </span>
        </div>
      )}

      <div className="absolute inset-0 flex flex-col min-h-0 border rounded-lg bg-white overflow-hidden shadow-sm mb-0">
          {/* Header: Fixed top */}
          <div className="absolute top-0 left-0 right-0 h-20 border-b bg-slate-50 z-20 flex">
            <div className="w-16 flex-none border-r p-2 text-xs font-semibold text-center text-muted-foreground flex items-center justify-center">Time</div>
            {effectivePitches.map(pitch => (
              <div key={pitch.id} className="flex-1 border-r last:border-r-0 p-2 flex flex-col justify-center gap-1">
                <div className="flex items-center gap-1 w-full">
                  <Input
                    value={pitch.name}
                    onChange={(event) => updatePitchDraftField(pitch.id, 'name', event.target.value)}
                    onBlur={() => commitPitchDraft(pitch.id, ['name'])}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        (event.target as HTMLInputElement).blur();
                      }
                    }}
                    className="h-7 text-xs font-semibold"
                    aria-label={`Pitch name ${pitch.name}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleDeletePitch(pitch.id)}
                    title="Delete pitch"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                <Select
                  value={pitch.locationId || 'unassigned'}
                  onValueChange={(value) =>
                    updatePitch(pitch.id, { locationId: value === 'unassigned' ? undefined : value })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned location</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!pitch.locationId || !locationById.has(pitch.locationId)) && (
                  <div className="text-[10px] font-medium text-amber-700">Warning: homeless pitch</div>
                )}
              </div>
            ))}
          </div>

          {/* Scrollable Grid */}
          <div 
            ref={gridScrollRef} 
            className="absolute left-0 right-0 overflow-y-auto bg-slate-50/30 transition-[bottom] duration-300 ease-in-out"
            style={{ 
              top: '5rem', 
              bottom: selectedFixtureId ? `${DRAWER_HEIGHT_PX}px` : '0' 
            }}
          >
            <div className="flex relative" style={{ height: gridHeight }}>

              {/* Time Axis */}
              <div className="w-16 flex-none border-r bg-white z-10 sticky left-0 min-h-full">
                {timeLabels.map((time, i) => (
                  <div
                    key={time}
                    className="absolute w-full text-right pr-2 text-muted-foreground border-b border-gray-100"
                    style={{ top: i * 60 * pixelsPerMinute, height: 60 * pixelsPerMinute }}
                  >
                    <span className="-translate-y-1/2 block mt-[0px]" style={{ fontSize: scaledFontSize(12) }}>
                      {time}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pitch Columns */}
              {effectivePitches.map(pitch => {
                const pitchTimeline = listPitchTimeline(pitch.id);
                const pitchTimelineForRender = listPitchTimeline(pitch.id, insertPreviewMap, insertPreviewBreakMap);
                const viewStartMins = VIEW_START_HOUR * 60;
                const pitchStartMins = minutesFromMidnight(pitch.startTime || DEFAULT_ASSIGN_TIME);
                const insertionSlots = Array.from({ length: pitchTimeline.length + 1 }, (_, index) => {
                  let top = (pitchStartMins - viewStartMins) * pixelsPerMinute;

                  if (index > 0 && index < pitchTimeline.length) {
                    const next = pitchTimeline[index];
                    const nextStartMins = getTimelineStartMinutes(next);
                    top = (nextStartMins - viewStartMins) * pixelsPerMinute;
                  }

                  if (index === pitchTimeline.length && pitchTimeline.length > 0) {
                    const previous = pitchTimeline[index - 1];
                    const previousStart = getTimelineStartMinutes(previous);
                    top = (
                      (previousStart - viewStartMins) +
                      getTimelineBlockMinutes(previous)
                    ) * pixelsPerMinute;
                  }

                  return {
                    index,
                    top: Math.max(0, Math.min(gridHeight, top))
                  };
                });

                const pitchStartTop = Math.max(0, Math.min(gridHeight, (pitchStartMins - viewStartMins) * pixelsPerMinute));
                const pitchEndMins = minutesFromMidnight(pitch.endTime || DEFAULT_PITCH_END);
                const pitchEndTop = Math.max(0, Math.min(gridHeight, (pitchEndMins - viewStartMins) * pixelsPerMinute));

                return (
                  <div
                    key={pitch.id}
                    className="flex-1 border-r last:border-r-0 relative min-h-full"
                    onDragOver={(e) => {
                      onDragOver(e);
                      if (e.target === e.currentTarget) {
                        setDropTargetFixtureId(null);
                        setInsertTarget(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (
                        draggingItem &&
                        insertTarget &&
                        insertTarget.pitchId === pitch.id
                      ) {
                        const updates = computeInsertUpdates(
                          draggingItem,
                          pitch.id,
                          insertTarget.index
                        );
                        applyPitchTimelineUpdates(updates);
                        showChangeFeedback(
                          getActuallyChangedFixtureIds(updates.fixtureUpdates),
                          draggingItem.kind === 'fixture' ? draggingItem.id : undefined
                        );
                      }
                      clearDragState();
                    }}
                  >
                    {/* Hour lines */}
                    {timeLabels.map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-full border-b border-gray-100/50 pointer-events-none"
                        style={{ top: i * 60 * pixelsPerMinute, height: 60 * pixelsPerMinute }}
                      />
                    ))}

                    {/* Pitch Constraints (Out of bounds) */}
                    {(() => {
                      const pStart = minutesFromMidnight(pitch.startTime || DEFAULT_PITCH_START);
                      const pEnd = minutesFromMidnight(pitch.endTime || DEFAULT_PITCH_END);

                      const topUnavailableHeight = Math.max(0, (pStart - viewStartMins) * pixelsPerMinute);
                      const bottomUnavailableStart = Math.max(0, (pEnd - viewStartMins) * pixelsPerMinute);
                      const bottomUnavailableHeight = Math.max(0, gridHeight - bottomUnavailableStart);

                      return (
                        <>
                          {topUnavailableHeight > 0 && (
                            <div
                              className="absolute w-full bg-red-50/50 pointer-events-none"
                              style={{
                                top: 0,
                                height: topUnavailableHeight,
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,0,0,0.05) 5px, rgba(255,0,0,0.05) 10px)'
                              }}
                            />
                          )}
                          <div
                            className="absolute w-full bg-red-50/50 pointer-events-none"
                            style={{
                              top: bottomUnavailableStart,
                              height: bottomUnavailableHeight,
                              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,0,0,0.05) 5px, rgba(255,0,0,0.05) 10px)'
                            }}
                          />
                        </>
                      );
                    })()}

                    {/* Draggable Pitch Boundaries */}
                    <div className="absolute inset-x-0 z-30 pointer-events-none" style={{ top: pitchStartTop }}>
                      <div className="absolute inset-x-0 border-t-2 border-emerald-500/90" />
                      <button
                        type="button"
                        className="absolute inset-x-2 -top-2 h-4 cursor-row-resize pointer-events-auto"
                        onMouseDown={(event) => onPitchBoundaryMouseDown(event, pitch.id, 'startTime')}
                        title="Drag pitch start"
                      >
                        <span className="ml-auto block w-fit rounded bg-emerald-600/90 px-1 py-0 text-[9px] font-semibold text-white">
                          Start {pitch.startTime}
                        </span>
                      </button>
                    </div>

                    <div className="absolute inset-x-0 z-30 pointer-events-none" style={{ top: pitchEndTop }}>
                      <div className="absolute inset-x-0 border-t-2 border-rose-500/90" />
                      <button
                        type="button"
                        className="absolute inset-x-2 -top-2 h-4 cursor-row-resize pointer-events-auto"
                        onMouseDown={(event) => onPitchBoundaryMouseDown(event, pitch.id, 'endTime')}
                        title="Drag pitch end"
                      >
                        <span className="ml-auto block w-fit rounded bg-rose-600/90 px-1 py-0 text-[9px] font-semibold text-white">
                          End {pitch.endTime}
                        </span>
                      </button>
                    </div>

                    {/* Insert drop zones (start, between, end) */}
                    {draggingItem && insertionSlots.map(slot => {
                      const isActive = insertTarget?.pitchId === pitch.id && insertTarget.index === slot.index;
                      const previewHeight = Math.max(
                        0,
                        Math.min(draggingBlockHeight, gridHeight - slot.top)
                      );

                      return (
                        <div
                          key={`insert-${pitch.id}-${slot.index}`}
                          className="absolute left-[2.5%] w-[95%] -translate-y-1/2 z-30 pointer-events-auto"
                          style={{ top: slot.top }}
                        >
                          <div
                            className="absolute inset-x-0 -top-2 h-4"
                            onDragOver={(e) => onDragOverInsert(e, pitch.id, slot.index)}
                            onDrop={(e) => onDropInsert(e, pitch.id, slot.index)}
                          />
                          <div
                            className={cn(
                              'absolute inset-x-0 border-t-2 border-dashed pointer-events-none transition-all duration-150',
                              isActive ? 'border-emerald-500 opacity-100' : 'border-sky-400/50 opacity-35'
                            )}
                          />
                          {isActive && (
                            <div className="absolute -top-3 right-0 rounded bg-emerald-600/95 text-white px-1 py-0 text-[9px] font-semibold pointer-events-none">
                              Insert here
                            </div>
                          )}
                          {isActive && previewHeight > 0 && (
                            <div
                              className="absolute left-0 right-0 rounded border-2 border-emerald-500 bg-emerald-100/70 pointer-events-none"
                              style={{ top: 0, height: previewHeight }}
                            >
                              <div className="absolute top-0.5 left-1 rounded bg-emerald-700/90 text-white px-1 py-0 text-[9px] font-semibold">
                                New slot
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Timeline Items */}
                    {pitchTimelineForRender.map((timelineItem) => {
                      if (timelineItem.kind === 'fixture') {
                        const { fixture, competitionId, groups } = timelineItem.item;
                        const comp = competitions.find((c) => c.id === competitionId);
                        const home = comp?.teams.find((t) => t.id === fixture.homeTeamId);
                        const away = comp?.teams.find((t) => t.id === fixture.awayTeamId);
                        const group = groups.find((g) => g.id === fixture.groupId);
                        
                        const isKnockout = fixture.stage && fixture.stage !== 'Group';
                        const homeDisplay = home?.name || (fixture.homeTeamId === 'TBD' ? 'TBD' : fixture.description?.split(' vs ')[0] || 'Bye');
                        const awayDisplay = away?.name || (fixture.awayTeamId === 'TBD' ? 'TBD' : fixture.description?.split(' vs ')[1] || 'Bye');

                        const startMins = minutesFromMidnight(fixture.startTime || DEFAULT_ASSIGN_TIME);
                        const duration = fixture.duration || DEFAULT_GROUP_DURATION;
                        const slack = getFixtureSlack(fixture, groups);
                        const slackBefore = fixture.slackBefore || 0;

                        const top = (startMins - slackBefore - viewStartMins) * pixelsPerMinute;
                        const heightSlackBefore = slackBefore * pixelsPerMinute;
                        const heightMatch = duration * pixelsPerMinute;
                        const heightSlack = slack * pixelsPerMinute;

                        const hasOverrides = fixture.duration !== undefined || fixture.slack !== undefined || fixture.rest !== undefined;

                        if (top < 0 && top + heightSlackBefore + heightMatch + heightSlack < 0) return null;

                        return (
                          <div
                            key={fixture.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, { kind: 'fixture', id: fixture.id })}
                            onDragEnd={onDragEnd}
                            onDragOver={(e) => onDragOverFixture(e, fixture.id)}
                            onDrop={(e) => onDropFixture(e, fixture.id)}
                            onClick={() => handleFixtureClick(fixture.id)}
                            className={cn(
                              'absolute w-[95%] left-[2.5%] rounded shadow-sm cursor-move overflow-hidden group hover:z-20 transition-all duration-200',
                              draggingItem?.kind === 'fixture' && draggingItem.id === fixture.id && 'opacity-50',
                              recentlyChangedIds.includes(fixture.id) && 'fixture-change-fade',
                              recentlyPrimaryChangedId === fixture.id && 'fixture-change-primary',
                              dropTargetFixtureId === fixture.id && 'ring-2 ring-amber-500 shadow-md scale-[1.01]',
                              recentlySwappedIds.includes(fixture.id) && 'ring-2 ring-emerald-500',
                              teamConflictFixtureIds.has(fixture.id) && 'ring-2 ring-red-500',
                              selectedFixtureId === fixture.id && 'ring-4 ring-primary ring-offset-2 z-30'
                            )}
                            style={{
                              top,
                              height: heightSlackBefore + heightMatch + heightSlack,
                              borderLeft: `0.6rem solid ${comp?.color || '#1e293b'}`,
                              borderTop: teamConflictFixtureIds.has(fixture.id) ? '1px solid #ef4444' : '1px solid #e2e8f0',
                              borderRight: teamConflictFixtureIds.has(fixture.id) ? '1px solid #ef4444' : '1px solid #e2e8f0',
                              borderBottom: teamConflictFixtureIds.has(fixture.id) ? '1px solid #ef4444' : '1px solid #e2e8f0',
                              fontSize: scaledFontSize(10),
                              opacity: isKnockout ? 1 : undefined
                            }}
                            title={`${fixture.startTime} - ${comp?.name} - ${fixture.stage || 'Group'} - ${homeDisplay} vs ${awayDisplay}${teamConflictFixtureIds.has(fixture.id) ? ' ⚠ Team time conflict' : ''}`}
                          >
                            {/* ... (markers) ... */}
                            {dropTargetFixtureId === fixture.id && (
                              <div className="absolute top-0.5 right-5 rounded bg-amber-500/95 text-white px-1 py-0 font-semibold pointer-events-none" style={{ fontSize: scaledFontSize(9) }}>
                                Swap here
                              </div>
                            )}
                            {recentlySwappedIds.includes(fixture.id) && (
                              <div className="absolute top-0.5 right-5 rounded bg-emerald-600/95 text-white px-1 py-0 font-semibold pointer-events-none" style={{ fontSize: scaledFontSize(9) }}>
                                Swapped
                              </div>
                            )}
                            {recentlyPrimaryChangedId === fixture.id && (
                              <div className="absolute top-0.5 left-0.5 rounded bg-amber-600/95 text-white px-1 py-0 font-semibold pointer-events-none" style={{ fontSize: scaledFontSize(9) }}>
                                Moved
                              </div>
                            )}
                            {teamConflictFixtureIds.has(fixture.id) && (
                              <div className="absolute top-0.5 right-0.5 rounded bg-red-600/95 text-white px-1 py-0 font-semibold pointer-events-none z-10" style={{ fontSize: scaledFontSize(9) }}>
                                ⚠ Clash
                              </div>
                            )}

                            {/* Pre-match Slack Area (dependency wait) */}
                            {heightSlackBefore > 0 && (
                              <div
                                className="w-full border-b"
                                style={{
                                  height: heightSlackBefore,
                                  borderBottomColor: isKnockout ? '#ddd6fe' : '#bfdbfe',
                                  background: isKnockout
                                    ? 'repeating-linear-gradient(-45deg, #faf5ff, #faf5ff 2px, #f3e8ff 2px, #f3e8ff 4px)'
                                    : 'repeating-linear-gradient(-45deg, #f8fafc, #f8fafc 2px, #f1f5f9 2px, #f1f5f9 4px)'
                                }}
                              />
                            )}

                            {/* Match Duration Area */}
                            <div
                              className={cn(
                                'w-full flex flex-col px-1 py-0.5 relative',
                                isKnockout 
                                  ? 'bg-purple-100' 
                                  : 'bg-blue-100'
                              )}
                              style={{ height: heightMatch }}
                            >
                              {fixture.matchId && (
                                <div className="absolute top-0.5 right-0.5 font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded" style={{ fontSize: scaledFontSize(9) }}>
                                  {fixture.matchId}
                                </div>
                              )}
                              <div className={cn('font-bold truncate flex items-center gap-1', isKnockout ? 'text-purple-900' : 'text-blue-900')}>
                                {hasOverrides && <Clock className="w-3 h-3 text-amber-700 fill-amber-100" />}
                                {fixture.startTime} 
                                <span className="opacity-80 font-normal ml-0.5 scale-90 origin-left">
                                  {isKnockout ? `(${fixture.stage})` : (group ? `(${group.name})` : '')}
                                </span>
                              </div>
                              <div className={cn('truncate font-medium leading-tight', isKnockout ? 'text-purple-800' : 'text-blue-800')}>
                                {(() => {
                                  const restTeams = restWarningsByFixtureId.get(fixture.id);
                                  const homeNeedsRest = restTeams?.has(fixture.homeTeamId);
                                  const awayNeedsRest = restTeams?.has(fixture.awayTeamId);
                                  return (
                                    <>
                                      <span className={homeNeedsRest ? 'text-orange-600 font-bold' : ''} title={homeNeedsRest ? 'Insufficient rest' : ''}>{homeNeedsRest ? '⚠ ' : ''}{homeDisplay}</span>
                                      {' v '}
                                      <span className={awayNeedsRest ? 'text-orange-600 font-bold' : ''} title={awayNeedsRest ? 'Insufficient rest' : ''}>{awayDisplay}{awayNeedsRest ? ' ⚠' : ''}</span>
                                    </>
                                  );
                                })()}
                              </div>
                              {isKnockout && fixture.description && (
                                <div className="truncate text-purple-700 italic" style={{ fontSize: scaledFontSize(9) }}>
                                  {fixture.description}
                                </div>
                              )}
                            </div>

                            {/* Slack Duration Area */}
                            <div
                              className="w-full border-t"
                              style={{
                                height: heightSlack,
                                borderTopColor: isKnockout ? '#ddd6fe' : '#bfdbfe',
                                background: isKnockout
                                  ? 'repeating-linear-gradient(45deg, #f3e8ff, #f3e8ff 2px, #e9d5ff 2px, #e9d5ff 4px)'
                                  : 'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 2px, #e2e8f0 2px, #e2e8f0 4px)'
                              }}
                            />

                            {/* Remove Button (Hover only) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnassign(fixture.id);
                              }}
                              className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-white/50 hover:bg-red-100 text-slate-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      }

                      const pitchBreak = timelineItem.item;
                      const duration = Math.max(MIN_BREAK_DURATION, pitchBreak.duration || DEFAULT_BREAK_DURATION);
                      const startMins = minutesFromMidnight(pitchBreak.startTime || DEFAULT_ASSIGN_TIME);
                      const top = (startMins - viewStartMins) * pixelsPerMinute;
                      const height = duration * pixelsPerMinute;

                      if (top < 0 && top + height < 0) return null;

                      const isResizing = draggingBreakResize?.breakId === pitchBreak.id;
                      const isCompactBreak = height < 44;

                      return (
                        <div
                          key={pitchBreak.id}
                          draggable
                          onDragStart={(event) => onDragStart(event, { kind: 'break', id: pitchBreak.id })}
                          onDragEnd={onDragEnd}
                          onClick={() => {
                            setSelectedBreakId(pitchBreak.id);
                            setSelectedFixtureId(null);
                          }}
                          className={cn(
                            'absolute w-[95%] left-[2.5%] rounded border border-slate-700 overflow-hidden shadow-sm cursor-move',
                            isResizing && 'ring-2 ring-amber-400',
                            draggingItem?.kind === 'break' && draggingItem.id === pitchBreak.id && 'opacity-50',
                            selectedBreakId === pitchBreak.id && 'ring-2 ring-emerald-400'
                          )}
                          style={{
                            top,
                            height,
                            fontSize: scaledFontSize(10),
                            background: BREAK_PATTERN_GRAY,
                          }}
                          title={`${pitchBreak.startTime} - ${pitchBreak.label}`}
                        >
                          <div className="relative h-full w-full px-1.5 py-1 text-slate-100">
                            <div className="flex items-center justify-between gap-1">
                              <div className="font-semibold uppercase tracking-wide text-slate-100/90" style={{ fontSize: scaledFontSize(9) }}>
                                {pitchBreak.startTime}
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="font-semibold text-slate-100/90" style={{ fontSize: scaledFontSize(9) }}>{duration}m</div>
                                {!isCompactBreak && (
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteBreak(pitch.id, pitchBreak.id);
                                  }}
                                  className="h-4 w-4 flex items-center justify-center rounded bg-slate-800/35 hover:bg-red-700/60 text-slate-100"
                                  title="Delete break"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                                )}
                              </div>
                            </div>

                            {!isCompactBreak ? (
                              <input
                                value={pitchBreak.label}
                                onChange={(event) => updateBreakLabel(pitchBreak.id, event.target.value)}
                                onBlur={() => commitBreakLabel(pitchBreak.id)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    (event.target as HTMLInputElement).blur();
                                  }
                                }}
                                className="mt-1 h-5 w-full rounded border border-slate-300/80 bg-slate-100/20 px-1 font-semibold text-white placeholder:text-slate-100/80 focus:outline-none focus:ring-1 focus:ring-amber-300"
                                style={{ fontSize: scaledFontSize(10) }}
                                placeholder="Break label"
                                aria-label="Break label"
                              />
                            ) : (
                              <div className="mt-0.5 truncate text-slate-100/90" style={{ fontSize: scaledFontSize(9) }}>{pitchBreak.label}</div>
                            )}

                            {!isCompactBreak ? (
                              <div className="mt-1 text-slate-100/90" style={{ fontSize: scaledFontSize(9) }}>{duration} min</div>
                            ) : null}

                            <button
                              type="button"
                              onMouseDown={(event) => onBreakResizeMouseDown(event, pitchBreak)}
                              className="absolute inset-x-0 bottom-0 h-2 cursor-row-resize bg-slate-700/25 hover:bg-amber-500/40"
                              title="Drag to resize break duration"
                            >
                              <span className="mx-auto mt-[2px] block h-[2px] w-8 rounded bg-slate-100/80" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      
      {selectedFixtureId && (
        <div 
          className="absolute bottom-0 left-0 right-0 border-t bg-background shadow-inner z-40 transition-transform duration-300 ease-in-out"
          style={{ height: `${DRAWER_HEIGHT_PX}px` }}
        >
          <FixtureDetailsPanel
            fixtureId={selectedFixtureId}
            onClose={() => setSelectedFixtureId(null)}
            pitchBreaks={pitchBreaks}
          />
        </div>
      )}

      {selectedBreak && (
        <div className="absolute right-3 top-14 z-50 w-64 rounded-md border bg-background/95 p-2 shadow-md backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold">Break {selectedBreak.startTime}</div>
            <button
              type="button"
              className="h-5 w-5 rounded text-muted-foreground hover:bg-muted"
              onClick={() => setSelectedBreakId(null)}
              title="Close break editor"
            >
              <X className="mx-auto h-3 w-3" />
            </button>
          </div>

          <label className="mb-2 block text-xs">
            <div className="mb-1 text-muted-foreground">Label</div>
            <Input
              value={selectedBreak.label}
              onChange={(event) => updateBreakLabel(selectedBreak.id, event.target.value)}
              onBlur={() => commitBreakLabel(selectedBreak.id)}
              className="h-7 text-xs"
            />
          </label>

          <label className="mb-2 block text-xs">
            <div className="mb-1 text-muted-foreground">Duration (minutes)</div>
            <Input
              type="number"
              min={MIN_BREAK_DURATION}
              step={BREAK_DURATION_STEP_MINUTES}
              value={Math.max(MIN_BREAK_DURATION, selectedBreak.duration || DEFAULT_BREAK_DURATION)}
              onChange={(event) => updateBreakDuration(selectedBreak.id, Number(event.target.value))}
              onBlur={() => commitBreakDuration(selectedBreak.pitchId)}
              className="h-7 text-xs"
            />
          </label>

          <Button
            variant="destructive"
            size="sm"
            className="h-7 w-full text-xs"
            onClick={() => handleDeleteBreak(selectedBreak.pitchId, selectedBreak.id)}
          >
            Delete Break
          </Button>
        </div>
      )}
    </div>
  );
};

export default Schedule;
