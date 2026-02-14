import React from 'react';
import { createPortal } from 'react-dom';
import { useTournament } from '@/context/TournamentContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Plus, X, ChevronDown, RotateCcw, Calendar, Users, GripVertical, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { getFixtureSlack, minutesFromMidnight, timeFromMinutes } from '@/utils/scheduleUtils';
import { Competition, Fixture, Group, Pitch } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getGroupPitchIds } from '@/lib/groupPitches';
import { createGroupColorMap, getGroupColorFromMap } from '@/lib/groupColors';
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

const PIXELS_PER_MINUTE = 2;
const VIEW_START_HOUR = 8;
const VIEW_END_HOUR = 20;
const DEFAULT_PITCH_START = '09:00';
const DEFAULT_PITCH_END = '18:00';
const DEFAULT_ASSIGN_TIME = '10:00';
const DEFAULT_GROUP_DURATION = 20;
const DEFAULT_GROUP_SLACK = 5;
const MIN_PITCH_WINDOW_MINUTES = 10;
const DRAG_SNAP_MINUTES = 5;
const DEFAULT_BREAK_DURATION = 15;
const MIN_BREAK_DURATION = 5;
const PITCH_BREAKS_STORAGE_KEY = 'tournament_pitch_breaks_v1';
const BREAK_PATTERN_DARK = 'repeating-linear-gradient(45deg, #1f2937, #1f2937 4px, #111827 4px, #111827 8px)';

type PitchFixtureItem = {
  competitionId: string;
  groups: Group[];
  fixture: Fixture;
};

type PitchBreakItem = {
  id: string;
  pitchId: string;
  startTime: string;
  duration: number;
  label: string;
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

const UnassignedCompetitionSection = ({
  comp,
  fixtures,
  effectivePitches,
  onDragStart,
  onDragEnd,
  onDropUnassigned,
  handleAssign,
  showHeader = true,
}: {
  comp: Competition;
  fixtures: (Fixture & { competitionName: string })[];
  effectivePitches: (Pitch & { name: string; startTime: string; endTime: string })[];
  onDragStart: (e: React.DragEvent, dragItem: DragItemRef) => void;
  onDragEnd: () => void;
  onDropUnassigned: (e: React.DragEvent) => void;
  handleAssign: (competitionId: string, fixtureId: string, pitchId: string, time: string) => void;
  showHeader?: boolean;
}) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const competitionColor = comp.color ?? '#1e293b';

  const fixtureList = (
    <div
      className={cn('space-y-2 pb-4 pt-2', {
        'px-4': showHeader,
        'px-0': !showHeader,
      })}
      onDrop={onDropUnassigned}
    >
      {fixtures.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-6 text-center text-sm text-muted-foreground">
          Drag fixtures here to move them to {comp.name}
        </div>
      ) : (
        fixtures.map((fixture) => {
          const home = comp.teams.find((t) => t.id === fixture.homeTeamId);
          const away = comp.teams.find((t) => t.id === fixture.awayTeamId);
          const isKnockout = fixture.stage && fixture.stage !== 'Group';
          const homeDisplay =
            home?.name ||
            (fixture.homeTeamId === 'TBD'
              ? 'TBD'
              : fixture.description?.split(' vs ')[0] || 'Bye');
          const awayDisplay =
            away?.name ||
            (fixture.awayTeamId === 'TBD'
              ? 'TBD'
              : fixture.description?.split(' vs ')[1] || 'Bye');

          return (
            <div
              key={fixture.id}
              draggable
              onDragStart={(e) => onDragStart(e, { kind: 'fixture', id: fixture.id })}
              onDragEnd={onDragEnd}
              className={cn(
                'p-2 border rounded shadow-sm text-xs cursor-move relative',
                isKnockout ? 'bg-purple-50 hover:bg-purple-100' : 'bg-white hover:bg-slate-50'
              )}
            >
              <div className="flex justify-between items-center gap-2">
                <span className="truncate">{homeDisplay}</span>
                <span className="text-muted-foreground text-[10px]">vs</span>
                <span className="truncate">{awayDisplay}</span>
              </div>
              {isKnockout && fixture.description && (
                <div className="text-[10px] text-purple-600 italic mt-1 truncate">
                  {fixture.description}
                </div>
              )}
              <div className="mt-2 flex gap-1">
                <Select
                  onValueChange={(val) =>
                    handleAssign(fixture.competitionId, fixture.id, val, DEFAULT_ASSIGN_TIME)
                  }
                >
                  <SelectTrigger className="h-6 text-[10px] w-full">
                    <SelectValue placeholder="Assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {effectivePitches.map((pitch) => (
                      <SelectItem key={pitch.id} value={pitch.id}>
                        {pitch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  if (!showHeader) {
    return fixtureList;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div
        className="absolute inset-y-0 left-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: competitionColor }}
      />
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 pr-4 pl-6 py-3 text-sm font-semibold text-slate-900"
      >
        <span className="text-sm font-semibold tracking-wide uppercase">
          {comp.name.toUpperCase()}
        </span>
        <span className="flex items-center gap-3 text-[11px] text-muted-foreground uppercase">
          <span>{fixtures.length} FIXTURES</span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-200', {
              'rotate-180': isOpen,
            })}
          />
        </span>
      </button>

      {isOpen && fixtureList}
    </div>
  );
};

const Schedule = () => {
  const {
    competitions,
    pitches,
    addPitch,
    updatePitch,
    deletePitch,
    updateFixture,
    autoScheduleMatches,
    resetAllSchedules,
    batchUpdateFixtures,
    updateGroup,
  } = useTournament();
  const navigate = useNavigate();

  const [pitchDrafts, setPitchDrafts] = React.useState<Record<string, PitchDraft>>({});
  const pitchDraftsRef = React.useRef<Record<string, PitchDraft>>({});
  const [pitchBreaks, setPitchBreaks] = React.useState<PitchBreakItem[]>(() => {
    try {
      const saved = localStorage.getItem(PITCH_BREAKS_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.pitchId === 'string' &&
          typeof item.startTime === 'string'
        )
        .map((item) => ({
          id: item.id,
          pitchId: item.pitchId,
          startTime: item.startTime,
          duration: Math.max(MIN_BREAK_DURATION, Number(item.duration) || DEFAULT_BREAK_DURATION),
          label: (typeof item.label === 'string' && item.label.trim()) || 'Break',
        }));
    } catch {
      return [];
    }
  });
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
  const [competitionPanelState, setCompetitionPanelState] = React.useState<
    Record<string, { groups: boolean; fixtures: boolean }>
  >({});
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
    localStorage.setItem(PITCH_BREAKS_STORAGE_KEY, JSON.stringify(pitchBreaks));
  }, [pitchBreaks]);

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
    const activePitchIds = new Set(pitches.map((pitch) => pitch.id));
    setPitchBreaks((current) => current.filter((pitchBreak) => activePitchIds.has(pitchBreak.pitchId)));
  }, [pitches]);

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
    setCompetitionPanelState((prev) => {
      const next: Record<string, { groups: boolean; fixtures: boolean }> = {};
      competitions.forEach((comp) => {
        next[comp.id] = prev[comp.id] ?? { groups: false, fixtures: false };
      });
      return next;
    });
  }, [competitions]);

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

    addPitch(name, DEFAULT_PITCH_START, DEFAULT_PITCH_END);
  };

  const handleDeletePitch = (pitchId: string) => {
    const pitch = effectivePitchById.get(pitchId);
    if (!pitch) return;

    const confirmed = window.confirm(`Remove ${pitch.name}? Fixtures on this pitch will be unassigned.`);
    if (!confirmed) return;

    deletePitch(pitchId);
    setPitchBreaks((current) => current.filter((pitchBreak) => pitchBreak.pitchId !== pitchId));
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
      const rawMinutes = VIEW_START_HOUR * 60 + Math.round(yInGrid / PIXELS_PER_MINUTE);
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
  }, [draggingPitchBoundary, commitPitchDraft, pitches]);

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
    competitions.forEach(c => autoScheduleMatches(c.id));
    window.setTimeout(() => {
      setPendingAutoScheduleReflow(true);
    }, 0);
  };

  const handleResetSchedule = () => {
    const confirmed = window.confirm('Remove all fixtures from the schedule? They will become unassigned.');
    if (!confirmed) return;
    resetAllSchedules();
  };

  const handleAssign = (competitionId: string, fixtureId: string, pitchId: string, time: string) => {
    if (!pitchId) return;
    updateFixture(competitionId, fixtureId, {
      pitchId,
      startTime: time
    });
  };

  const handleUnassign = (fixtureId: string) => {
    const comp = competitions.find(c => c.fixtures.some(f => f.id === fixtureId));
    if (comp) {
      updateFixture(comp.id, fixtureId, {
        pitchId: undefined,
        startTime: undefined
      });
    }
  };

  const toggleCompetition = (competitionId: string) => {
    setOpenCompetitionIds((prev) =>
      prev.includes(competitionId)
        ? prev.filter((id) => id !== competitionId)
        : [...prev, competitionId]
    );
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
      const breakUpdateMap = new Map(breakUpdates.map((update) => [update.breakId, update.updates]));
      setPitchBreaks((current) =>
        current.map((pitchBreak) =>
          breakUpdateMap.has(pitchBreak.id) ? { ...pitchBreak, ...breakUpdateMap.get(pitchBreak.id) } : pitchBreak
        )
      );
    }
  }, [batchUpdateFixtures, competitions, groupTimingSnapshot, pitchBreaks]);

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
        const aStart = minutesFromMidnight(a.fixture.startTime || DEFAULT_ASSIGN_TIME);
        const bStart = minutesFromMidnight(b.fixture.startTime || DEFAULT_ASSIGN_TIME);
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
      const aStart =
        a.kind === 'fixture'
          ? minutesFromMidnight(a.item.fixture.startTime || DEFAULT_ASSIGN_TIME)
          : minutesFromMidnight(a.item.startTime || DEFAULT_ASSIGN_TIME);
      const bStart =
        b.kind === 'fixture'
          ? minutesFromMidnight(b.item.fixture.startTime || DEFAULT_ASSIGN_TIME)
          : minutesFromMidnight(b.item.startTime || DEFAULT_ASSIGN_TIME);

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

  const applyPitchTimelineUpdates = (updates: { fixtureUpdates: FixtureBatchUpdate[]; breakUpdates: BreakBatchUpdate[] }) => {
    if (updates.fixtureUpdates.length > 0) {
      batchUpdateFixtures(updates.fixtureUpdates);
    }

    if (updates.breakUpdates.length > 0) {
      const breakUpdateMap = new Map(updates.breakUpdates.map((update) => [update.breakId, update.updates]));
      setPitchBreaks((current) =>
        current.map((pitchBreak) =>
          breakUpdateMap.has(pitchBreak.id) ? { ...pitchBreak, ...breakUpdateMap.get(pitchBreak.id) } : pitchBreak
        )
      );
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
        ? getFixtureBlockMinutes(fixtureContext.fixture, fixtureContext.groups) * PIXELS_PER_MINUTE
        : 0;
    }

    const breakContext = findBreakContext(draggingItem.id);
    return breakContext
      ? Math.max(MIN_BREAK_DURATION, breakContext.pitchBreak.duration || DEFAULT_BREAK_DURATION) * PIXELS_PER_MINUTE
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

  const onDropUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    const sourceDragItem = getDragItemFromDataTransfer(e.dataTransfer);
    if (sourceDragItem?.kind === 'fixture') {
      handleUnassign(sourceDragItem.id);
      clearDragState();
    }
  };

  const handleAddBreak = (pitchId: string) => {
    const pitchStart = effectivePitchById.get(pitchId)?.startTime || DEFAULT_ASSIGN_TIME;
    const timeline = listPitchTimeline(pitchId);
    const lastTimelineItem = timeline[timeline.length - 1];
    const startMinutes = lastTimelineItem
      ? (lastTimelineItem.kind === 'fixture'
          ? minutesFromMidnight(lastTimelineItem.item.fixture.startTime || DEFAULT_ASSIGN_TIME)
          : minutesFromMidnight(lastTimelineItem.item.startTime || DEFAULT_ASSIGN_TIME)) + getTimelineBlockMinutes(lastTimelineItem)
      : minutesFromMidnight(pitchStart);

    const nextBreak: PitchBreakItem = {
      id: uuidv4(),
      pitchId,
      startTime: timeFromMinutes(startMinutes),
      duration: DEFAULT_BREAK_DURATION,
      label: 'Break',
    };

    const nextTimeline = [...timeline, { kind: 'break' as const, item: nextBreak }];
    setPitchBreaks((current) => [...current, nextBreak]);
    const updates = buildPitchTimelineUpdates(pitchId, nextTimeline);
    applyPitchTimelineUpdates(updates);
    showChangeFeedback(getActuallyChangedFixtureIds(updates.fixtureUpdates));
  };

  const handleDeleteBreak = (pitchId: string, breakId: string) => {
    const nextTimeline = listPitchTimeline(pitchId).filter(
      (timelineItem) => !(timelineItem.kind === 'break' && timelineItem.item.id === breakId)
    );

    setPitchBreaks((current) => current.filter((pitchBreak) => pitchBreak.id !== breakId));
    const updates = buildPitchTimelineUpdates(pitchId, nextTimeline);
    applyPitchTimelineUpdates(updates);
    showChangeFeedback(getActuallyChangedFixtureIds(updates.fixtureUpdates));
  };

  const updateBreakLabel = (breakId: string, label: string) => {
    setPitchBreaks((current) =>
      current.map((pitchBreak) => (pitchBreak.id === breakId ? { ...pitchBreak, label } : pitchBreak))
    );
  };

  const commitBreakLabel = (breakId: string) => {
    setPitchBreaks((current) =>
      current.map((pitchBreak) => {
        if (pitchBreak.id !== breakId) return pitchBreak;
        const nextLabel = pitchBreak.label.trim() || 'Break';
        return nextLabel === pitchBreak.label ? pitchBreak : { ...pitchBreak, label: nextLabel };
      })
    );
  };

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
      const deltaMinutesRaw = deltaPixels / PIXELS_PER_MINUTE;
      const deltaMinutesSnapped =
        Math.round(deltaMinutesRaw / DRAG_SNAP_MINUTES) * DRAG_SNAP_MINUTES;
      const nextDuration = Math.max(
        MIN_BREAK_DURATION,
        draggingBreakResize.initialDuration + deltaMinutesSnapped
      );

      setPitchBreaks((current) =>
        current.map((pitchBreak) =>
          pitchBreak.id === draggingBreakResize.breakId && pitchBreak.duration !== nextDuration
            ? { ...pitchBreak, duration: nextDuration }
            : pitchBreak
        )
      );
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

  // Data Preparation
  const allFixtures = competitions.flatMap(comp =>
    comp.fixtures.map(f => ({ ...f, competitionName: comp.name }))
  );

  const unassignedFixtures = allFixtures.filter(f => !getEffectiveFixture(f).pitchId);

  // Time grid helpers
  const totalMinutes = (VIEW_END_HOUR - VIEW_START_HOUR) * 60;
  const gridHeight = totalMinutes * PIXELS_PER_MINUTE;
  const timeLabels = [];
  for (let h = VIEW_START_HOUR; h <= VIEW_END_HOUR; h++) {
    timeLabels.push(momentFromHour(h));
  }

  function momentFromHour(h: number) {
    return `${h.toString().padStart(2, '0')}:00`;
  }

  const SidebarContentPortal = (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Schedule Tools</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleAddPitch}>
              <Plus /> <span>Add Pitch</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleAutoSchedule}>
              <Clock /> <span>Auto Schedule All</span>
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
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup className="mt-4">
        <SidebarGroupLabel>Unassigned & Groups</SidebarGroupLabel>
        <div className="space-y-3 px-2">
          {competitions.length === 0 ? (
             <div className="text-xs text-muted-foreground p-2">No competitions.</div>
          ) : (
            competitions.map((comp) => {
              const groups = comp.groups ?? [];
              const compUnassignedFixtures = unassignedFixtures.filter(
                (fixture) => fixture.competitionId === comp.id
              );
              const competitionColor = comp.color ?? '#1e293b';
              const isOpen = openCompetitionIds.includes(comp.id);
              const groupColorMap = createGroupColorMap(groups);

              return (
                 <div key={comp.id} className="border rounded-md bg-background overflow-hidden">
                    <div className="h-1 w-full" style={{ backgroundColor: competitionColor }} />
                    <div 
                      className="p-2 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleCompetition(comp.id)}
                    >
                       <span className="font-semibold text-xs truncate">{comp.name}</span>
                       <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
                    </div>
                    
                    {isOpen && (
                      <div className="p-2 bg-muted/20 space-y-2">
                         {/* Groups Toggles */}
                         <div className="space-y-1">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase">Groups</div>
                             {groups.map(group => {
                                const selectedPitchIds = getGroupPitchIds(group);
                                const groupColor = getGroupColorFromMap(groupColorMap, group.id);
                                return (
                                  <div key={group.id} className="text-[10px] border rounded p-1.5 bg-background">
                                    <div className="flex items-center gap-1 mb-1">
                                      <span className="w-2 h-2 rounded-full" style={{backgroundColor: groupColor}} />
                                      <span className="font-medium truncate">{group.name}</span>
                                    </div>
                                    <div className="flex gap-1 mb-1">
                                       <Input 
                                          className="h-5 text-[9px] px-1 w-12" 
                                          value={group.defaultDuration ?? DEFAULT_GROUP_DURATION}
                                          onChange={e => updateGroup(comp.id, group.id, { defaultDuration: parseInt(e.target.value) || 20 })} 
                                       />
                                       <span className="text-[9px] text-muted-foreground self-center">min</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                       {pitches.map(p => (
                                          <div key={p.id} 
                                            className={cn("px-1 rounded cursor-pointer", selectedPitchIds.includes(p.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                                            onClick={() => toggleGroupPitch(comp.id, group, p.id, !selectedPitchIds.includes(p.id))}
                                          >
                                             {p.name}
                                          </div>
                                       ))}
                                    </div>
                                  </div>
                                )
                             })}
                         </div>

                         {/* Unassigned Fixtures */}
                         <div className="space-y-1">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase flex justify-between">
                              <span>Unscheduled</span>
                              <Badge variant="secondary" className="h-4 px-1 text-[9px]">{compUnassignedFixtures.length}</Badge>
                            </div>
                            <div onDragOver={onDragOver}>
                                <UnassignedCompetitionSection
                                    comp={comp}
                                    fixtures={compUnassignedFixtures}
                                    effectivePitches={effectivePitches}
                                    onDragStart={onDragStart}
                                    onDragEnd={onDragEnd}
                                    onDropUnassigned={onDropUnassigned}
                                    handleAssign={handleAssign}
                                    showHeader={false}
                                  />
                            </div>
                         </div>
                      </div>
                    )}
                 </div>
              );
            })
          )}
        </div>
      </SidebarGroup>
    </>
  );

  const portalTarget = document.getElementById('sidebar-schedule-portal');

  return (
    <div className="container mx-auto p-0 h-full flex flex-col">
      {portalTarget && createPortal(SidebarContentPortal, portalTarget)}

      <div className="flex-1 flex flex-col h-full min-w-0 border rounded-lg bg-white overflow-hidden shadow-sm">
          {/* Header */}
          <div className="flex border-b bg-slate-50 sticky top-0 z-20">
            <div className="w-16 flex-none border-r p-2 text-xs font-semibold text-center text-muted-foreground">Time</div>
            {effectivePitches.map(pitch => (
              <div key={pitch.id} className="flex-1 border-r last:border-r-0 p-2">
                <div className="flex items-center gap-1">
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
              </div>
            ))}
          </div>

          {/* Scrollable Grid */}
          <div ref={gridScrollRef} className="flex-1 overflow-y-auto relative bg-slate-50/30">
            <div className="flex relative" style={{ height: gridHeight }}>

              {/* Time Axis */}
              <div className="w-16 flex-none border-r bg-white z-10 sticky left-0">
                {timeLabels.map((time, i) => (
                  <div
                    key={time}
                    className="absolute w-full text-right pr-2 text-xs text-muted-foreground border-b border-gray-100"
                    style={{ top: i * 60 * PIXELS_PER_MINUTE, height: 60 * PIXELS_PER_MINUTE }}
                  >
                    <span className="-translate-y-1/2 block mt-[0px]">{time}</span>
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
                  let top = (pitchStartMins - viewStartMins) * PIXELS_PER_MINUTE;

                  if (index > 0 && index < pitchTimeline.length) {
                    const next = pitchTimeline[index];
                    const nextStartMins =
                      next.kind === 'fixture'
                        ? minutesFromMidnight(next.item.fixture.startTime || DEFAULT_ASSIGN_TIME)
                        : minutesFromMidnight(next.item.startTime || DEFAULT_ASSIGN_TIME);
                    top = (nextStartMins - viewStartMins) * PIXELS_PER_MINUTE;
                  }

                  if (index === pitchTimeline.length && pitchTimeline.length > 0) {
                    const previous = pitchTimeline[index - 1];
                    const previousStart =
                      previous.kind === 'fixture'
                        ? minutesFromMidnight(previous.item.fixture.startTime || DEFAULT_ASSIGN_TIME)
                        : minutesFromMidnight(previous.item.startTime || DEFAULT_ASSIGN_TIME);
                    top = (
                      (previousStart - viewStartMins) +
                      getTimelineBlockMinutes(previous)
                    ) * PIXELS_PER_MINUTE;
                  }

                  return {
                    index,
                    top: Math.max(0, Math.min(gridHeight, top))
                  };
                });

                const pitchStartTop = Math.max(0, Math.min(gridHeight, (pitchStartMins - viewStartMins) * PIXELS_PER_MINUTE));
                const pitchEndMins = minutesFromMidnight(pitch.endTime || DEFAULT_PITCH_END);
                const pitchEndTop = Math.max(0, Math.min(gridHeight, (pitchEndMins - viewStartMins) * PIXELS_PER_MINUTE));

                return (
                  <div
                    key={pitch.id}
                    className="flex-1 border-r last:border-r-0 relative"
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
                        style={{ top: i * 60 * PIXELS_PER_MINUTE, height: 60 * PIXELS_PER_MINUTE }}
                      />
                    ))}

                    {/* Pitch Constraints (Out of bounds) */}
                    {(() => {
                      const pStart = minutesFromMidnight(pitch.startTime || DEFAULT_PITCH_START);
                      const pEnd = minutesFromMidnight(pitch.endTime || DEFAULT_PITCH_END);

                      const topUnavailableHeight = Math.max(0, (pStart - viewStartMins) * PIXELS_PER_MINUTE);
                      const bottomUnavailableStart = Math.max(0, (pEnd - viewStartMins) * PIXELS_PER_MINUTE);
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
                        
                        const isKnockout = fixture.stage && fixture.stage !== 'Group';
                        const homeDisplay = home?.name || (fixture.homeTeamId === 'TBD' ? 'TBD' : fixture.description?.split(' vs ')[0] || 'Bye');
                        const awayDisplay = away?.name || (fixture.awayTeamId === 'TBD' ? 'TBD' : fixture.description?.split(' vs ')[1] || 'Bye');

                        const startMins = minutesFromMidnight(fixture.startTime || DEFAULT_ASSIGN_TIME);
                        const duration = fixture.duration || DEFAULT_GROUP_DURATION;
                        const slack = getFixtureSlack(fixture, groups);
                        const slackBefore = fixture.slackBefore || 0;

                        const top = (startMins - slackBefore - viewStartMins) * PIXELS_PER_MINUTE;
                        const heightSlackBefore = slackBefore * PIXELS_PER_MINUTE;
                        const heightMatch = duration * PIXELS_PER_MINUTE;
                        const heightSlack = slack * PIXELS_PER_MINUTE;

                        if (top < 0 && top + heightSlackBefore + heightMatch + heightSlack < 0) return null;

                        return (
                          <div
                            key={fixture.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, { kind: 'fixture', id: fixture.id })}
                            onDragEnd={onDragEnd}
                            onDragOver={(e) => onDragOverFixture(e, fixture.id)}
                            onDrop={(e) => onDropFixture(e, fixture.id)}
                            className={cn(
                              'absolute w-[95%] left-[2.5%] rounded shadow-sm cursor-move text-[10px] overflow-hidden group hover:z-20 transition-all duration-200',
                              draggingItem?.kind === 'fixture' && draggingItem.id === fixture.id && 'opacity-50',
                              recentlyChangedIds.includes(fixture.id) && 'fixture-change-fade',
                              recentlyPrimaryChangedId === fixture.id && 'fixture-change-primary',
                              dropTargetFixtureId === fixture.id && 'ring-2 ring-amber-500 shadow-md scale-[1.01]',
                              recentlySwappedIds.includes(fixture.id) && 'ring-2 ring-emerald-500'
                            )}
                            style={{
                              top,
                              height: heightSlackBefore + heightMatch + heightSlack,
                              borderLeft: `0.6rem solid ${comp?.color || '#1e293b'}`,
                              borderTop: '1px solid #e2e8f0',
                              borderRight: '1px solid #e2e8f0',
                              borderBottom: '1px solid #e2e8f0',
                              opacity: isKnockout ? 1 : undefined
                            }}
                            title={`${fixture.startTime} - ${comp?.name} - ${fixture.stage || 'Group'} - ${homeDisplay} vs ${awayDisplay}`}
                          >
                            {dropTargetFixtureId === fixture.id && (
                              <div className="absolute top-0.5 right-5 rounded bg-amber-500/95 text-white px-1 py-0 text-[9px] font-semibold pointer-events-none">
                                Swap here
                              </div>
                            )}
                            {recentlySwappedIds.includes(fixture.id) && (
                              <div className="absolute top-0.5 right-5 rounded bg-emerald-600/95 text-white px-1 py-0 text-[9px] font-semibold pointer-events-none">
                                Swapped
                              </div>
                            )}
                            {recentlyPrimaryChangedId === fixture.id && (
                              <div className="absolute top-0.5 left-0.5 rounded bg-amber-600/95 text-white px-1 py-0 text-[9px] font-semibold pointer-events-none">
                                Moved
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
                                'w-full flex flex-col px-1 py-0.5',
                                isKnockout 
                                  ? 'bg-purple-100' 
                                  : 'bg-blue-100'
                              )}
                              style={{ height: heightMatch }}
                            >
                              <div className={cn('font-bold truncate', isKnockout ? 'text-purple-900' : 'text-blue-900')}>
                                {fixture.startTime} {isKnockout && `(${fixture.stage})`}
                              </div>
                              <div className={cn('truncate font-medium leading-tight', isKnockout ? 'text-purple-800' : 'text-blue-800')}>
                                {homeDisplay} v {awayDisplay}
                              </div>
                              {isKnockout && fixture.description && (
                                <div className="truncate text-[9px] text-purple-700 italic">
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
                      const top = (startMins - viewStartMins) * PIXELS_PER_MINUTE;
                      const height = duration * PIXELS_PER_MINUTE;

                      if (top < 0 && top + height < 0) return null;

                      const isResizing = draggingBreakResize?.breakId === pitchBreak.id;

                      return (
                        <div
                          key={pitchBreak.id}
                          draggable
                          onDragStart={(event) => onDragStart(event, { kind: 'break', id: pitchBreak.id })}
                          onDragEnd={onDragEnd}
                          className={cn(
                            'absolute w-[95%] left-[2.5%] rounded border border-slate-700 text-[10px] overflow-hidden shadow-sm cursor-move',
                            isResizing && 'ring-2 ring-amber-400',
                            draggingItem?.kind === 'break' && draggingItem.id === pitchBreak.id && 'opacity-50'
                          )}
                          style={{
                            top,
                            height,
                            background: BREAK_PATTERN_DARK,
                          }}
                          title={`${pitchBreak.startTime} - ${pitchBreak.label}`}
                        >
                          <div className="relative h-full w-full px-1.5 py-1 text-slate-100">
                            <div className="flex items-center justify-between gap-1">
                              <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-200/90">
                                Break {pitchBreak.startTime}
                              </div>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteBreak(pitch.id, pitchBreak.id);
                                }}
                                className="h-4 w-4 flex items-center justify-center rounded bg-slate-900/45 hover:bg-red-700/60 text-slate-100"
                                title="Delete break"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            <input
                              value={pitchBreak.label}
                              onChange={(event) => updateBreakLabel(pitchBreak.id, event.target.value)}
                              onBlur={() => commitBreakLabel(pitchBreak.id)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  (event.target as HTMLInputElement).blur();
                                }
                              }}
                              className="mt-1 w-full h-5 rounded border border-slate-500/80 bg-slate-900/40 px-1 text-[10px] font-semibold text-slate-100 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-300"
                              placeholder="Break label"
                              aria-label="Break label"
                            />

                            <div className="mt-1 text-[9px] text-slate-200/90">{duration} min</div>

                            <button
                              type="button"
                              onMouseDown={(event) => onBreakResizeMouseDown(event, pitchBreak)}
                              className="absolute inset-x-0 bottom-0 h-2 cursor-row-resize bg-black/20 hover:bg-amber-500/40"
                              title="Drag to resize break duration"
                            >
                              <span className="mx-auto mt-[2px] block h-[2px] w-8 rounded bg-slate-100/70" />
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
    </div>
  );
};

export default Schedule;