import React from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, ArrowLeft, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GroupSettingsPanel } from '@/components/GroupSettingsPanel';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getFixtureSlack, minutesFromMidnight, timeFromMinutes } from '@/utils/scheduleUtils';
import { Fixture, Group } from '@/lib/types';
import { cn } from '@/lib/utils';

const PIXELS_PER_MINUTE = 2;
const VIEW_START_HOUR = 8;
const VIEW_END_HOUR = 20;

type PitchFixtureItem = {
  competitionId: string;
  groups: Group[];
  fixture: Fixture;
};

type FixtureBatchUpdate = {
  competitionId: string;
  fixtureId: string;
  updates: Partial<Fixture>;
};

const Schedule = () => {
  const {
    competitions,
    pitches,
    addPitch,
    deletePitch,
    updateFixture,
    autoScheduleMatches,
    batchUpdateFixtures,
  } = useTournament();
  const navigate = useNavigate();

  const [newPitchName, setNewPitchName] = React.useState('');
  const [pitchStart, setPitchStart] = React.useState('09:00');
  const [pitchEnd, setPitchEnd] = React.useState('18:00');
  const [startTime] = React.useState('10:00');

  // Drag state
  const [draggingFixtureId, setDraggingFixtureId] = React.useState<string | null>(null);
  const [dropTargetFixtureId, setDropTargetFixtureId] = React.useState<string | null>(null);
  const [insertTarget, setInsertTarget] = React.useState<{ pitchId: string; index: number } | null>(null);
  const [recentlyChangedIds, setRecentlyChangedIds] = React.useState<string[]>([]);
  const [recentlyPrimaryChangedId, setRecentlyPrimaryChangedId] = React.useState<string | null>(null);
  const [recentlySwappedIds, setRecentlySwappedIds] = React.useState<string[]>([]);
  const changeFeedbackTimeoutRef = React.useRef<number | null>(null);
  const swapFeedbackTimeoutRef = React.useRef<number | null>(null);
  const clearDragState = React.useCallback(() => {
    setDraggingFixtureId(null);
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

  const fixtureById = new Map<string, Fixture>();
  competitions.forEach(comp => {
    comp.fixtures.forEach(fixture => {
      fixtureById.set(fixture.id, fixture);
    });
  });

  const handleAddPitch = () => {
    if (newPitchName.trim()) {
      addPitch(newPitchName, pitchStart, pitchEnd);
      setNewPitchName('');
    }
  };

  const handleAutoSchedule = () => {
    competitions.forEach(c => autoScheduleMatches(c.id));
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

  // Drag and Drop Handlers
  const onDragStart = (e: React.DragEvent, fixtureId: string) => {
    e.dataTransfer.setData('fixtureId', fixtureId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingFixtureId(fixtureId);
    setDropTargetFixtureId(null);
    setInsertTarget(null);
  };

  const onDragEnd = () => {
    clearDragState();
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDragOverFixture = (e: React.DragEvent, fixtureId: string) => {
    e.stopPropagation();
    onDragOver(e);

    if (!draggingFixtureId || draggingFixtureId === fixtureId) {
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

  const listPitchFixtures = (pitchId: string, updateMap?: Map<string, Partial<Fixture>>): PitchFixtureItem[] => {
    return competitions
      .flatMap(comp => comp.fixtures.map(fixture => {
        const effectiveFixture = updateMap?.has(fixture.id)
          ? { ...fixture, ...updateMap.get(fixture.id) }
          : fixture;

        return {
          competitionId: comp.id,
          groups: comp.groups || [],
          fixture: effectiveFixture,
        };
      }))
      .filter(item => item.fixture.pitchId === pitchId)
      .sort((a, b) => {
        const aStart = minutesFromMidnight(a.fixture.startTime || '10:00');
        const bStart = minutesFromMidnight(b.fixture.startTime || '10:00');
        return aStart - bStart;
      });
  };

  const findFixtureContext = (fixtureId: string) => {
    for (const comp of competitions) {
      const fixture = comp.fixtures.find(f => f.id === fixtureId);
      if (fixture) {
        return {
          competitionId: comp.id,
          groups: comp.groups || [],
          fixture
        };
      }
    }
    return null;
  };

  const getBlockMinutes = (fixture: Fixture, groups: Group[]) => {
    const duration = fixture.duration || 20;
    const slack = getFixtureSlack(fixture, groups);
    return duration + slack;
  };

  const buildPitchTimelineUpdates = (
    pitchId: string,
    ordered: PitchFixtureItem[]
  ) => {
    const pitchStart = pitches.find(p => p.id === pitchId)?.startTime || '10:00';
    let cursor = minutesFromMidnight(pitchStart);

    return ordered.map(item => {
      const startTime = timeFromMinutes(cursor);
      cursor += getBlockMinutes(item.fixture, item.groups);

      return {
        competitionId: item.competitionId,
        fixtureId: item.fixture.id,
        updates: { pitchId, startTime }
      };
    });
  };

  const computeInsertUpdates = (sourceFixtureId: string, targetPitchId: string, targetIndex: number): FixtureBatchUpdate[] => {
    const source = findFixtureContext(sourceFixtureId);
    if (!source) return [];

    const sourcePitchId = source.fixture.pitchId;
    const clampedTargetIndex = Math.max(0, targetIndex);

    if (sourcePitchId && sourcePitchId === targetPitchId) {
      const samePitchList = listPitchFixtures(sourcePitchId);
      const sourceIndex = samePitchList.findIndex(item => item.fixture.id === sourceFixtureId);
      if (sourceIndex < 0) return [];

      samePitchList.splice(sourceIndex, 1);

      let insertIndex = clampedTargetIndex;
      if (sourceIndex < clampedTargetIndex) {
        insertIndex = clampedTargetIndex - 1;
      }
      insertIndex = Math.max(0, Math.min(insertIndex, samePitchList.length));

      if (insertIndex === sourceIndex) return [];

      samePitchList.splice(insertIndex, 0, source);
      return buildPitchTimelineUpdates(targetPitchId, samePitchList);
    }

    const targetList = listPitchFixtures(targetPitchId);
    const insertIndex = Math.max(0, Math.min(clampedTargetIndex, targetList.length));
    targetList.splice(insertIndex, 0, source);

    if (sourcePitchId) {
      const sourceList = listPitchFixtures(sourcePitchId).filter(item => item.fixture.id !== sourceFixtureId);
      return [
        ...buildPitchTimelineUpdates(sourcePitchId, sourceList),
        ...buildPitchTimelineUpdates(targetPitchId, targetList),
      ];
    }

    return buildPitchTimelineUpdates(targetPitchId, targetList);
  };

  const applyBatchUpdates = (updates: FixtureBatchUpdate[]) => {
    if (updates.length > 0) {
      batchUpdateFixtures(updates);
    }
  };

  const insertPreviewUpdates =
    draggingFixtureId && insertTarget
      ? computeInsertUpdates(draggingFixtureId, insertTarget.pitchId, insertTarget.index)
      : [];

  const insertPreviewMap = new Map<string, Partial<Fixture>>(
    insertPreviewUpdates
      .filter(update => update.fixtureId !== draggingFixtureId)
      .map(update => [update.fixtureId, update.updates])
  );

  const getEffectiveFixture = (fixture: Fixture) => {
    if (!insertPreviewMap.has(fixture.id)) return fixture;
    return { ...fixture, ...insertPreviewMap.get(fixture.id) };
  };

  const draggingFixtureContext = draggingFixtureId ? findFixtureContext(draggingFixtureId) : null;
  const draggingBlockHeight = draggingFixtureContext
    ? getBlockMinutes(draggingFixtureContext.fixture, draggingFixtureContext.groups) * PIXELS_PER_MINUTE
    : 0;

  const swapFixtures = (sourceFixtureId: string, targetFixtureId: string) => {
    if (sourceFixtureId === targetFixtureId) return;

    const source = findFixtureContext(sourceFixtureId);
    const target = findFixtureContext(targetFixtureId);
    if (!source || !target) return;

    const sourcePitchId = source.fixture.pitchId;
    const targetPitchId = target.fixture.pitchId;

    if (!targetPitchId) return;

    // Both fixtures are on the same pitch: swap order and reflow that pitch timeline.
    if (sourcePitchId && sourcePitchId === targetPitchId) {
      const list = listPitchFixtures(sourcePitchId);
      const sourceIndex = list.findIndex(item => item.fixture.id === sourceFixtureId);
      const targetIndex = list.findIndex(item => item.fixture.id === targetFixtureId);
      if (sourceIndex < 0 || targetIndex < 0) return;

      [list[sourceIndex], list[targetIndex]] = [list[targetIndex], list[sourceIndex]];
      const updates = buildPitchTimelineUpdates(sourcePitchId, list);
      batchUpdateFixtures(updates);
      showChangeFeedback(getActuallyChangedFixtureIds(updates), sourceFixtureId);
      showSwapFeedback([sourceFixtureId, targetFixtureId]);
      return;
    }

    // Fixtures are on different pitches: swap slot positions and reflow both affected pitch timelines.
    if (sourcePitchId) {
      const sourceList = listPitchFixtures(sourcePitchId);
      const targetList = listPitchFixtures(targetPitchId);

      const sourceIndex = sourceList.findIndex(item => item.fixture.id === sourceFixtureId);
      const targetIndex = targetList.findIndex(item => item.fixture.id === targetFixtureId);
      if (sourceIndex < 0 || targetIndex < 0) return;

      sourceList.splice(sourceIndex, 1);
      targetList.splice(targetIndex, 1);

      sourceList.splice(sourceIndex, 0, target);
      targetList.splice(targetIndex, 0, source);

      const updates = [
        ...buildPitchTimelineUpdates(sourcePitchId, sourceList),
        ...buildPitchTimelineUpdates(targetPitchId, targetList)
      ];
      batchUpdateFixtures(updates);
      showChangeFeedback(getActuallyChangedFixtureIds(updates), sourceFixtureId);
      showSwapFeedback([sourceFixtureId, targetFixtureId]);
      return;
    }

    // Source is unassigned: replace target slot with source and unassign the target fixture.
    const targetList = listPitchFixtures(targetPitchId);
    const targetIndex = targetList.findIndex(item => item.fixture.id === targetFixtureId);
    if (targetIndex < 0) return;

    targetList.splice(targetIndex, 1, source);

    const updates = [
      ...buildPitchTimelineUpdates(targetPitchId, targetList),
      {
        competitionId: target.competitionId,
        fixtureId: target.fixture.id,
        updates: { pitchId: undefined, startTime: undefined }
      }
    ];
    batchUpdateFixtures(updates);
    showChangeFeedback(getActuallyChangedFixtureIds(updates), sourceFixtureId);
  };

  const onDropFixture = (e: React.DragEvent, targetFixtureId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const fixtureId = e.dataTransfer.getData('fixtureId');
    if (!fixtureId || fixtureId === targetFixtureId) return;

    swapFixtures(fixtureId, targetFixtureId);
    clearDragState();
  };

  const onDropInsert = (e: React.DragEvent, pitchId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const fixtureId = e.dataTransfer.getData('fixtureId');
    if (!fixtureId) return;

    const updates = computeInsertUpdates(fixtureId, pitchId, index);
    applyBatchUpdates(updates);
    showChangeFeedback(getActuallyChangedFixtureIds(updates), fixtureId);
    clearDragState();
  };

  const onDropUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    const fixtureId = e.dataTransfer.getData('fixtureId');
    if (fixtureId) {
      handleUnassign(fixtureId);
      clearDragState();
    }
  };

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

  return (
    <div className="container mx-auto p-4 max-w-[1600px] h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-none">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Global Schedule</h1>
        </div>
        <Button onClick={handleAutoSchedule} variant="secondary" size="sm">
          <Clock className="mr-2 h-4 w-4" /> Auto Schedule All
        </Button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-80 flex-none flex flex-col gap-4 min-h-0 overflow-y-auto">
          <Accordion type="single" collapsible className="w-full" defaultValue="unassigned">
            <AccordionItem value="pitches">
              <AccordionTrigger>Manage Pitches</AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex flex-col gap-2 mb-4">
                      <Input
                        placeholder="Pitch Name"
                        value={newPitchName}
                        onChange={(e) => setNewPitchName(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Input
                          type="time"
                          value={pitchStart}
                          onChange={(e) => setPitchStart(e.target.value)}
                          className="text-xs"
                        />
                        <span className="self-center">-</span>
                        <Input
                          type="time"
                          value={pitchEnd}
                          onChange={(e) => setPitchEnd(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                      <Button className="w-full" onClick={handleAddPitch}>
                        <Plus className="mr-2 h-4 w-4" /> Add Pitch
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {pitches.map(pitch => (
                        <div key={pitch.id} className="flex flex-col p-2 bg-slate-100 rounded gap-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{pitch.name}</span>
                            <Button variant="ghost" size="icon" onClick={() => deletePitch(pitch.id)}>
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="groups">
              <AccordionTrigger>Group Settings</AccordionTrigger>
              <AccordionContent>
                <GroupSettingsPanel />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="unassigned">
              <AccordionTrigger>Unassigned ({unassignedFixtures.length})</AccordionTrigger>
              <AccordionContent>
                <div
                  onDragOver={onDragOver}
                  onDrop={onDropUnassigned}
                  className="min-h-[200px] border-2 border-dashed rounded-md p-2 bg-slate-50/50"
                >
                  <div className="space-y-2">
                    {unassignedFixtures.map(fixture => {
                      const comp = competitions.find(c => c.id === fixture.competitionId);
                      const home = comp?.teams.find(t => t.id === fixture.homeTeamId);
                      const away = comp?.teams.find(t => t.id === fixture.awayTeamId);

                      return (
                        <div
                          key={fixture.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, fixture.id)}
                          onDragEnd={onDragEnd}
                          className="p-2 border rounded shadow-sm bg-white text-xs cursor-move hover:bg-slate-50 relative"
                        >
                          <div className="font-semibold text-primary/80 mb-1">{comp?.name}</div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="truncate">{home?.name || 'Bye'}</span>
                            <span className="text-muted-foreground text-[10px]">vs</span>
                            <span className="truncate">{away?.name || 'Bye'}</span>
                          </div>
                          <div className="mt-2 flex gap-1">
                            <Select onValueChange={(val) => handleAssign(fixture.competitionId, fixture.id, val, startTime)}>
                              <SelectTrigger className="h-6 text-[10px] w-full">
                                <SelectValue placeholder="Assign" />
                              </SelectTrigger>
                              <SelectContent>
                                {pitches.map(p => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Main Time Grid */}
        <div className="flex-1 flex flex-col h-full min-w-0 border rounded-lg bg-white overflow-hidden shadow-sm">
          {/* Header */}
          <div className="flex border-b bg-slate-50 sticky top-0 z-20">
            <div className="w-16 flex-none border-r p-2 text-xs font-semibold text-center text-muted-foreground">Time</div>
            {pitches.map(pitch => (
              <div key={pitch.id} className="flex-1 border-r last:border-r-0 p-2 text-sm font-bold text-center truncate">
                {pitch.name}
              </div>
            ))}
          </div>

          {/* Scrollable Grid */}
          <div className="flex-1 overflow-y-auto relative bg-slate-50/30">
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
              {pitches.map(pitch => {
                const pitchFixtures = listPitchFixtures(pitch.id);
                const pitchFixturesForRender = listPitchFixtures(pitch.id, insertPreviewMap);
                const viewStartMins = VIEW_START_HOUR * 60;
                const pitchStartMins = minutesFromMidnight(pitch.startTime || '10:00');
                const insertionSlots = Array.from({ length: pitchFixtures.length + 1 }, (_, index) => {
                  let top = (pitchStartMins - viewStartMins) * PIXELS_PER_MINUTE;

                  if (index > 0 && index < pitchFixtures.length) {
                    const next = pitchFixtures[index];
                    top = (minutesFromMidnight(next.fixture.startTime || '10:00') - viewStartMins) * PIXELS_PER_MINUTE;
                  }

                  if (index === pitchFixtures.length && pitchFixtures.length > 0) {
                    const previous = pitchFixtures[index - 1];
                    const previousStart = minutesFromMidnight(previous.fixture.startTime || '10:00');
                    top = (
                      (previousStart - viewStartMins) +
                      getBlockMinutes(previous.fixture, previous.groups)
                    ) * PIXELS_PER_MINUTE;
                  }

                  return {
                    index,
                    top: Math.max(0, Math.min(gridHeight, top))
                  };
                });

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
                        draggingFixtureId &&
                        insertTarget &&
                        insertTarget.pitchId === pitch.id
                      ) {
                        const updates = computeInsertUpdates(
                          draggingFixtureId,
                          pitch.id,
                          insertTarget.index
                        );
                        applyBatchUpdates(updates);
                        showChangeFeedback(getActuallyChangedFixtureIds(updates), draggingFixtureId);
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
                    {/* Assuming pitch.startTime/endTime are set, or default 09:00-18:00 */}
                    {/* Render red hatch for unavailable times */}
                    {(() => {
                      const pStart = minutesFromMidnight(pitch.startTime || '09:00');
                      const pEnd = minutesFromMidnight(pitch.endTime || '18:00');
                      const viewStartMins = VIEW_START_HOUR * 60;

                      const topUnavailableHeight = Math.max(0, (pStart - viewStartMins) * PIXELS_PER_MINUTE);
                      const bottomUnavailableStart = Math.max(0, (pEnd - viewStartMins) * PIXELS_PER_MINUTE);
                      const bottomUnavailableHeight = Math.max(0, gridHeight - bottomUnavailableStart);

                      return (
                        <>
                          {/* Top unavailable */}
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
                          {/* Bottom unavailable */}
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

                    {/* Insert drop zones (start, between, end) */}
                    {draggingFixtureId && insertionSlots.map(slot => {
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
                              "absolute inset-x-0 border-t-2 border-dashed pointer-events-none transition-all duration-150",
                              isActive ? "border-emerald-500 opacity-100" : "border-sky-400/50 opacity-35"
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

                    {/* Fixtures */}
                    {pitchFixturesForRender.map(({ fixture, competitionId, groups }) => {
                      const comp = competitions.find(c => c.id === competitionId);
                      const home = comp?.teams.find(t => t.id === fixture.homeTeamId);
                      const away = comp?.teams.find(t => t.id === fixture.awayTeamId);

                      const startMins = minutesFromMidnight(fixture.startTime || '10:00');
                      const duration = fixture.duration || 20;
                      const slack = getFixtureSlack(fixture, groups);

                      const top = (startMins - viewStartMins) * PIXELS_PER_MINUTE;
                      const heightMatch = duration * PIXELS_PER_MINUTE;
                      const heightSlack = slack * PIXELS_PER_MINUTE;

                      if (top < 0 && top + heightMatch + heightSlack < 0) return null;

                      return (
                        <div
                          key={fixture.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, fixture.id)}
                          onDragEnd={onDragEnd}
                          onDragOver={(e) => onDragOverFixture(e, fixture.id)}
                          onDrop={(e) => onDropFixture(e, fixture.id)}
                          className={cn(
                            "absolute w-[95%] left-[2.5%] rounded border shadow-sm cursor-move text-[10px] overflow-hidden group hover:z-20 transition-all duration-200",
                            draggingFixtureId === fixture.id && "opacity-50",
                            recentlyChangedIds.includes(fixture.id) && "fixture-change-fade",
                            recentlyPrimaryChangedId === fixture.id && "fixture-change-primary",
                            dropTargetFixtureId === fixture.id && "ring-2 ring-amber-500 shadow-md scale-[1.01]",
                            recentlySwappedIds.includes(fixture.id) && "ring-2 ring-emerald-500"
                          )}
                          style={{
                            top,
                            height: heightMatch + heightSlack
                          }}
                          title={`${fixture.startTime} - ${comp?.name} - ${home?.name} vs ${away?.name}`}
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

                          {/* Match Duration Area */}
                          <div
                            className="w-full bg-blue-100 flex flex-col px-1 py-0.5"
                            style={{ height: heightMatch }}
                          >
                            <div className="font-bold truncate text-blue-900">{fixture.startTime}</div>
                            <div className="truncate font-medium text-blue-800 leading-tight">{home?.name} v {away?.name}</div>
                          </div>

                          {/* Slack Duration Area */}
                          <div
                            className="w-full border-t border-blue-200/50"
                            style={{
                              height: heightSlack,
                              background: 'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 2px, #e2e8f0 2px, #e2e8f0 4px)'
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
                    })}

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
