import React from 'react';
import { resolveUmpireDisplay, useTournament } from '@/context/TournamentContext';
import { Fixture, Pitch, Competition, PitchBreakItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TeamDisplay } from '@/components/FixtureComponents';
import { formatKnockoutCode, toThreeChars } from '@/components/FixtureComponents';

import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface MatchDisplay {
  fixture: Fixture;
  competition: Competition;
  startTime: string;
  startMinutes: number | null;
  durationMinutes: number;
}

const DEFAULT_DURATION_MINUTES = 20;
const PITCH_BREAKS_STORAGE_KEY = 'tournament_pitch_breaks_v1';

const toMinutes = (value?: string): number | null => {
  if (!value) return null;
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
};

// Hexagon badge for group matches - uses competition color
const StageHexagon: React.FC<{ fixture: Fixture; competition: Competition }> = ({
  fixture,
  competition,
}) => {
  const groupIndexMap = React.useMemo(() => {
    const map = new Map<string, number>();
    (competition.groups || []).forEach((group, index) => {
      map.set(group.id, index + 1);
    });
    return map;
  }, [competition.groups]);

  const formatStageCode = (fixture: Fixture) => {
    if (fixture.stage === 'Group') {
      const index = fixture.groupId ? groupIndexMap.get(fixture.groupId) : undefined;
      if (index) {
        return index >= 10 ? `G${index}` : `GP${index}`;
      }
      return 'GP1';
    }
    return formatKnockoutCode(fixture);
  };

  const code = toThreeChars(formatStageCode(fixture));
  const gradientId = `hexGrad-${fixture.id}`;
  const color = competition.color || '#64748b';
  
  return (
    <svg
      viewBox="0 0 60 60"
      width="60"
      height="60"
      role="img"
      aria-label={`Stage ${code}`}
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-lg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="50%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <polygon
        points="30,5 52,16 52,44 30,55 8,44 8,16"
        fill={`url(#${gradientId})`}
      />
      <text
        x="30"
        y="33"
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        fontSize="14"
        fontWeight="900"
        fill="#F9FAFB"
        letterSpacing="0.5"
      >
        {code}
      </text>
    </svg>
  );
};

const ByPitch: React.FC = () => {
  const { competitions, pitches } = useTournament();
  const teamNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    competitions.forEach((competition) => {
      competition.teams.forEach((team) => {
        map.set(team.id, team.name);
      });
    });
    return map;
  }, [competitions]);
  const pitchBreaks = React.useMemo<PitchBreakItem[]>(() => {
    try {
      const raw = localStorage.getItem(PITCH_BREAKS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
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
          duration: Math.max(1, Number(item.duration) || DEFAULT_DURATION_MINUTES),
          label: (typeof item.label === 'string' && item.label.trim()) || 'Break',
        }));
    } catch {
      return [];
    }
  }, []);

  // Build match rows for a given pitch
  const getMatchesForPitch = (pitch: Pitch): MatchDisplay[] => {
    const matches: MatchDisplay[] = [];

    // Iterate through all competitions
    for (const comp of competitions) {
      // Filter fixtures assigned to this pitch and sort by start time
      const fixturesForPitch = comp.fixtures
        .filter((f) => f.pitchId === pitch.id)
        .sort((a, b) => {
          const aTime = a.startTime ? parseInt(a.startTime.replace(':', ''), 10) : 0;
          const bTime = b.startTime ? parseInt(b.startTime.replace(':', ''), 10) : 0;
          return aTime - bTime;
        });

      // Convert each fixture to a match display
      for (const fixture of fixturesForPitch) {
        const group = fixture.groupId
          ? comp.groups.find((candidate) => candidate.id === fixture.groupId)
          : undefined;
        const startMinutes = toMinutes(fixture.startTime);
        matches.push({
          fixture,
          competition: comp,
          startTime: fixture.startTime || 'TBD',
          startMinutes,
          durationMinutes: fixture.duration ?? group?.defaultDuration ?? DEFAULT_DURATION_MINUTES,
        });
      }
    }

    return matches.sort((a, b) => {
      if (a.startMinutes === null && b.startMinutes === null) return 0;
      if (a.startMinutes === null) return 1;
      if (b.startMinutes === null) return -1;
      return a.startMinutes - b.startMinutes;
    });
  };

  // Pitches with assigned fixtures
  const pitchesWithMatches = pitches.filter((pitch) => {
    const matches = getMatchesForPitch(pitch);
    return matches.length > 0;
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">View all scheduled matches organized by pitch</p>
      </div>

      {pitchesWithMatches.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Scheduled Matches</CardTitle>
            <CardDescription>
              No matches have been assigned to pitches yet. Go to Scheduler to assign fixtures to pitches.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-max">
          {pitchesWithMatches.map((pitch) => {
            const matches = getMatchesForPitch(pitch);
            const breaksForPitch = pitchBreaks
              .filter((pitchBreak) => pitchBreak.pitchId === pitch.id)
              .sort((a, b) => (toMinutes(a.startTime) ?? 0) - (toMinutes(b.startTime) ?? 0));
            return (
              <Card key={pitch.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {pitch.name}
                    <Badge variant="secondary">{matches.length} matches</Badge>
                  </CardTitle>
                  {pitch.startTime && pitch.endTime && (
                    <CardDescription>
                      {pitch.startTime} - {pitch.endTime}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2">
                    {matches.map((match, idx) => {
                      const next = matches[idx + 1];
                      const currentEnd =
                        match.startMinutes === null ? null : match.startMinutes + match.durationMinutes;
                      const nextStart =
                        typeof next?.startMinutes === 'number' ? next.startMinutes : null;
                      const gapMinutes =
                        currentEnd === null || nextStart === null
                          ? 0
                          : Math.max(0, nextStart - currentEnd);
                      const breaksInWindow = gapMinutes > 0
                        ? breaksForPitch.filter((pitchBreak) => {
                            const breakStart = toMinutes(pitchBreak.startTime);
                            if (breakStart === null || currentEnd === null || nextStart === null) {
                              return false;
                            }
                            const breakEnd = breakStart + pitchBreak.duration;
                            return breakStart < nextStart && breakEnd > currentEnd;
                          })
                        : [];
                      return (
                        <React.Fragment key={match.fixture.id}>
                          <div className="rounded-lg border-[0.2rem] border-outset border-white bg-muted/30 px-4 pt-1 pb-0.5" style={{ borderStyle: 'outset' }}>
                            {/* Row 1: Time and Match ID */}
                            <div className="flex items-start justify-between">
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-1 font-mono font-semibold text-foreground text-sm">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  {match.startTime}
                                </div>
                                {/* Ticket-style Match ID Badge */}
                                <svg
                                  viewBox="0 0 72 28"
                                  width="64"
                                  height="24"
                                  role="img"
                                  aria-label={`Match ${match.fixture.matchId || ''}`}
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="flex-shrink-0"
                                >
                                  <defs>
                                    <linearGradient id={`ticketGrad-${match.fixture.id}`} x1="0%" y1="0%" x2="100%" y2="27%">
                                      <stop offset="0%" stopColor={match.competition.color || '#64748b'} stopOpacity={0.65} />
                                      <stop offset="25%" stopColor={match.competition.color || '#64748b'} stopOpacity={0.9} />
                                      <stop offset="40%" stopColor={match.competition.color || '#64748b'} stopOpacity={0.80} />
                                      <stop offset="60%" stopColor={match.competition.color || '#64748b'} stopOpacity={0.92} />
                                      <stop offset="75%" stopColor={match.competition.color || '#64748b'} stopOpacity={0.72} />
                                      <stop offset="100%" stopColor={match.competition.color || '#64748b'} stopOpacity={1.0} />
                                    </linearGradient>
                                  </defs>
                                  <path
                                    d="M8 1h56a6 6 0 0 1 6 6v2c-2.5 0-5 2-5 5s2.5 5 5 5v2a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6v-2c2.5 0 5-2 5-5s-2.5-5-5-5V7a6 6 0 0 1 6-6Z"
                                    fill={`url(#ticketGrad-${match.fixture.id})`}
                                    stroke="rgba(255,255,255,0.2)"
                                    strokeWidth="1.5"
                                  />
                                  <path
                                    d="M28 4v20"
                                    stroke="rgba(255,255,255,0.35)"
                                    strokeDasharray="2 3"
                                    strokeWidth="1.5"
                                  />
                                  {(() => {
                                    const matchIdStr = match.fixture.matchId || '';
                                    const parsed = matchIdStr.match(/^([^0-9.]+)[.]?([0-9]+)$/);
                                    const prefix = parsed ? parsed[1] : matchIdStr;
                                    const number = parsed ? parsed[2] : '';
                                    return (
                                      <>
                                        <text
                                          x="18"
                                          y="18"
                                          textAnchor="middle"
                                          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                                          fontSize="12"
                                          fontWeight="800"
                                          fill="#ffffff"
                                          letterSpacing="0.5"
                                        >
                                          {prefix}
                                        </text>
                                        <text
                                          x="46"
                                          y="18"
                                          textAnchor="middle"
                                          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                                          fontSize="11"
                                          fontWeight="700"
                                          fill="#ffffff"
                                          letterSpacing="0.5"
                                        >
                                          {number}
                                        </text>
                                      </>
                                    );
                                  })()}
                                </svg>
                              </div>
                            </div>

                            {/* Row 2: Teams (closer to top) */}
                            <div className="flex items-center justify-center gap-3 -mt-8">
                              <div className="flex justify-end flex-1 min-w-0">
                                <TeamDisplay
                                  teamId={match.fixture.homeTeamId}
                                  side="home"
                                  competition={match.competition}
                                />
                              </div>
                              <div className="flex justify-center flex-shrink-0">
                                <StageHexagon fixture={match.fixture} competition={match.competition} />
                              </div>
                              <div className="flex justify-start flex-1 min-w-0">
                                <TeamDisplay
                                  teamId={match.fixture.awayTeamId}
                                  side="away"
                                  competition={match.competition}
                                />
                              </div>
                            </div>

                            {/* Row 3: Officers - side by side */}
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-foreground">
                                  {match.fixture.umpireTeam
                                    ? resolveUmpireDisplay(match.fixture, teamNameById)
                                    : 'TBD'}
                                </span>
                                <span className="uppercase font-semibold">Umpire</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="uppercase font-semibold">Referee</span>
                                <span className="font-medium text-foreground">TBD</span>
                              </div>
                            </div>
                          </div>
                          {breaksInWindow.length > 0 && (
                            <div className="px-2 py-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="h-px flex-1 border-t border-dashed border-muted-foreground/35" />
                                {breaksInWindow.map((pitchBreak) => (
                                  <span
                                    key={pitchBreak.id}
                                    className={cn(
                                      'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                                      'border-muted-foreground/30 text-muted-foreground bg-muted/40'
                                    )}
                                  >
                                    {pitchBreak.label} {pitchBreak.duration}m
                                  </span>
                                ))}
                                <div className="h-px flex-1 border-t border-dashed border-muted-foreground/35" />
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ByPitch;
