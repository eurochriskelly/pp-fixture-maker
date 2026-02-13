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
import { Fixture } from '@/lib/types';
import { cn } from '@/lib/utils';

const PIXELS_PER_MINUTE = 2;
const SNAP_MINUTES = 5;
const VIEW_START_HOUR = 8;
const VIEW_END_HOUR = 20;

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
  const [startTime, setStartTime] = React.useState('10:00');
  const [currentTime] = React.useState(new Date()); // For highlighting current time if needed

  // Drag state
  const [draggingFixtureId, setDraggingFixtureId] = React.useState<string | null>(null);

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
  };

  const onDragEnd = () => {
    setDraggingFixtureId(null);
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDropPitch = (e: React.DragEvent, pitchId: string) => {
    e.preventDefault();
    const fixtureId = e.dataTransfer.getData('fixtureId');
    if (!fixtureId) return;

    // Calculate time from drop position
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top + e.currentTarget.scrollTop;
    const minutes = Math.floor(offsetY / PIXELS_PER_MINUTE) + (VIEW_START_HOUR * 60);

    // Snap to nearest 5 minutes
    const snappedMinutes = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
    const timeString = timeFromMinutes(snappedMinutes);

    // Find the fixture context
    const comp = competitions.find(c => c.fixtures.some(f => f.id === fixtureId));
    if (!comp) return;
    const fixture = comp.fixtures.find(f => f.id === fixtureId);
    if (!fixture) return;

    // 1. Identify valid collision candidates on the target pitch
    // Exclude the fixture itself (if we dropped it on the same pitch)
    const existingFixturesOnPitch = competitions
      .flatMap(c => c.fixtures)
      .filter(f => f.pitchId === pitchId && f.id !== fixtureId);

    const newStart = snappedMinutes;
    // Get group settings or default
    const groups = comp.groups || [];
    const grp = groups.find(g => g.id === fixture.groupId);
    const slack = (grp as any)?.defaultSlack || 5;
    const newEnd = snappedMinutes + (fixture.duration || 20) + slack;

    // Find the first fixture that overlaps significantly
    // Overlap: (StartA < EndB) and (EndA > StartB)
    const collidingFixture = existingFixturesOnPitch.find(f => {
      const fStart = minutesFromMidnight(f.startTime || '00:00');
      const fComp = competitions.find(c => c.id === f.competitionId);
      const fGrp = fComp?.groups.find(g => g.id === f.groupId);
      const fSlack = (fGrp as any)?.defaultSlack || 5;
      const fEnd = fStart + (f.duration || 20) + fSlack;

      return (newStart < fEnd) && (newEnd > fStart);
    });

    if (collidingFixture) {
      if (fixture.pitchId && fixture.startTime) {
        const oldPitchId = fixture.pitchId;
        const oldStartTime = fixture.startTime;
        const collidingComp = competitions.find(c => c.id === collidingFixture.competitionId);

        if (collidingComp) {
          // Batch update both
          batchUpdateFixtures([
            {
              competitionId: comp.id,
              fixtureId: fixture.id,
              updates: { pitchId, startTime: timeString }
            },
            {
              competitionId: collidingComp.id,
              fixtureId: collidingFixture.id,
              updates: { pitchId: oldPitchId, startTime: oldStartTime }
            }
          ]);
          return;
        }
      }
    }

    updateFixture(comp.id, fixture.id, {
      pitchId,
      startTime: timeString
    });
  };

  const onDropUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    const fixtureId = e.dataTransfer.getData('fixtureId');
    if (fixtureId) {
      handleUnassign(fixtureId);
    }
  };

  // Data Preparation
  const allFixtures = competitions.flatMap(comp =>
    comp.fixtures.map(f => ({ ...f, competitionName: comp.name }))
  );

  const unassignedFixtures = allFixtures.filter(f => !f.pitchId);
  const assignedFixtures = allFixtures.filter(f => f.pitchId);

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
              {pitches.map(pitch => (
                <div
                  key={pitch.id}
                  className="flex-1 border-r last:border-r-0 relative"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDropPitch(e, pitch.id)}
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


                  {/* Fixtures */}
                  {assignedFixtures
                    .filter(f => f.pitchId === pitch.id)
                    .map(fixture => {
                      const comp = competitions.find(c => c.id === fixture.competitionId);
                      const groups = comp?.groups || [];
                      const home = comp?.teams.find(t => t.id === fixture.homeTeamId);
                      const away = comp?.teams.find(t => t.id === fixture.awayTeamId);

                      const startMins = minutesFromMidnight(fixture.startTime || '10:00');
                      const duration = fixture.duration || 20;
                      const slack = getFixtureSlack(fixture, groups);

                      const viewStartMins = VIEW_START_HOUR * 60;
                      const top = (startMins - viewStartMins) * PIXELS_PER_MINUTE;
                      const heightMatch = duration * PIXELS_PER_MINUTE;
                      const heightSlack = slack * PIXELS_PER_MINUTE;

                      if (top < 0 && top + heightMatch + heightSlack < 0) return null; // Fully out of view (top)

                      return (
                        <div
                          key={fixture.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, fixture.id)}
                          onDragEnd={onDragEnd}
                          className={cn(
                            "absolute w-[95%] left-[2.5%] rounded border shadow-sm cursor-move text-[10px] overflow-hidden group hover:z-20", // z-20 on hover to show above others if overlapping
                            draggingFixtureId === fixture.id && "opacity-50"
                          )}
                          style={{
                            top,
                            height: heightMatch + heightSlack
                          }}
                          title={`${fixture.startTime} - ${comp?.name} - ${home?.name} vs ${away?.name}`}
                        >
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
                    })
                  }

                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;

