import React from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TeamBadge, TeamDisplay } from '@/components/FixtureComponents';
import { formatKnockoutCode, toThreeChars } from '@/components/FixtureComponents';
import { Club, Competition, Fixture, Team } from '@/lib/types';
import { ArrowRight, Clock, MapPin } from 'lucide-react';

interface TeamFixtureDisplay {
  fixture: Fixture;
  competition: Competition;
  startTime: string;
  startMinutes: number | null;
  pitchName: string;
}

interface TeamUmpireDisplay {
  fixture: Fixture;
  competition: Competition;
  startTime: string;
  startMinutes: number | null;
  pitchName: string;
}

type TeamTimelineEntry =
  | {
      type: 'fixture';
      data: TeamFixtureDisplay;
    }
  | {
      type: 'umpire';
      data: TeamUmpireDisplay;
    };

interface TeamSchedule {
  teamId: string;
  teamName: string;
  team: Team;
  competitionId: string;
  competitionName: string;
  fixtures: TeamFixtureDisplay[];
  umpireDuties: TeamUmpireDisplay[];
  timeline: TeamTimelineEntry[];
  silverEntries: SilverEntry[];
}

interface SilverEntry {
  id: string;
  startTime: string;
  startMinutes: number | null;
  bracketLabel: string;
}

interface ClubSchedule {
  club: Club;
  teams: TeamSchedule[];
}

const toMinutes = (value?: string): number | null => {
  if (!value) return null;
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
};

const sortFixtures = (items: TeamFixtureDisplay[]) =>
  [...items].sort((a, b) => {
    if (a.startMinutes === null && b.startMinutes === null) return 0;
    if (a.startMinutes === null) return 1;
    if (b.startMinutes === null) return -1;
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return a.competition.name.localeCompare(b.competition.name);
  });

const sortUmpireDuties = (items: TeamUmpireDisplay[]) =>
  [...items].sort((a, b) => {
    if (a.startMinutes === null && b.startMinutes === null) return 0;
    if (a.startMinutes === null) return 1;
    if (b.startMinutes === null) return -1;
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return a.competition.name.localeCompare(b.competition.name);
  });

const sortTimeline = (items: TeamTimelineEntry[]) =>
  [...items].sort((a, b) => {
    const aMinutes = a.data.startMinutes;
    const bMinutes = b.data.startMinutes;
    if (aMinutes === null && bMinutes === null) return 0;
    if (aMinutes === null) return 1;
    if (bMinutes === null) return -1;
    if (aMinutes !== bMinutes) return aMinutes - bMinutes;
    if (a.type !== b.type) return a.type === 'fixture' ? -1 : 1;
    return a.data.competition.name.localeCompare(b.data.competition.name);
  });

const sortSilver = (items: SilverEntry[]) =>
  [...items].sort((a, b) => {
    if (a.startMinutes === null && b.startMinutes === null) return 0;
    if (a.startMinutes === null) return 1;
    if (b.startMinutes === null) return -1;
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return a.bracketLabel.localeCompare(b.bracketLabel);
  });

const GROUP_COLORS = [
  '#DC2626',
  '#2563EB',
  '#16A34A',
  '#CA8A04',
  '#9333EA',
  '#C2410C',
  '#0891B2',
  '#BE185D',
  '#4338CA',
  '#3F6212',
];

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
  const isGroup = fixture.stage === 'Group';

  if (isGroup) {
    const groupIndex = fixture.groupId ? (groupIndexMap.get(fixture.groupId) || 1) : 1;
    const color = GROUP_COLORS[(groupIndex - 1) % GROUP_COLORS.length];
    const gradientId = `hexGrad-by-team-${fixture.id}`;

    return (
      <svg
        viewBox="0 0 60 60"
        width="58"
        height="58"
        role="img"
        aria-label={`Group ${code}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="50%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <polygon points="30,5 52,16 52,44 30,55 8,44 8,16" fill={`url(#${gradientId})`} />
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
  }

  const finalGradientId = `finalGrad-by-team-${fixture.id}`;
  return (
    <svg
      viewBox="0 0 44 40"
      width="57"
      height="52"
      role="img"
      aria-label={`Stage ${code}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={finalGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9CA3AF" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#374151" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#9CA3AF" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path
        d="M22 2c7 5 14 4 18 6v14c0 10-7 15-18 16C11 37 4 32 4 22V8c4-2 11-1 18-6Z"
        fill={`url(#${finalGradientId})`}
      />
      <text
        x="22"
        y="25"
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        fontSize="12"
        fontWeight="900"
        fill="#F9FAFB"
        letterSpacing="0.5"
      >
        {code}
      </text>
    </svg>
  );
};

const MatchTicket: React.FC<{ fixture: Fixture; competition: Competition }> = ({ fixture, competition }) => {
  const rawLabel = fixture.matchId || fixture.stage || 'M1';
  const parsed = rawLabel.match(/^([^0-9.]+)[.]?([0-9]+)$/);
  const prefix = (parsed ? parsed[1] : rawLabel).slice(0, 3).toUpperCase();
  const number = parsed ? parsed[2] : '';
  const gradientId = `ticketGrad-by-team-${fixture.id}`;

  return (
    <svg
      viewBox="0 0 72 28"
      width="66"
      height="25"
      role="img"
      aria-label={`Match ${rawLabel}`}
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="27%">
          <stop offset="0%" stopColor={competition.color || '#64748b'} stopOpacity={0.65} />
          <stop offset="25%" stopColor={competition.color || '#64748b'} stopOpacity={0.9} />
          <stop offset="40%" stopColor={competition.color || '#64748b'} stopOpacity={0.8} />
          <stop offset="60%" stopColor={competition.color || '#64748b'} stopOpacity={0.92} />
          <stop offset="75%" stopColor={competition.color || '#64748b'} stopOpacity={0.72} />
          <stop offset="100%" stopColor={competition.color || '#64748b'} stopOpacity={1} />
        </linearGradient>
      </defs>
      <path
        d="M8 1h56a6 6 0 0 1 6 6v2c-2.5 0-5 2-5 5s2.5 5 5 5v2a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6v-2c2.5 0 5-2 5-5s-2.5-5-5-5V7a6 6 0 0 1 6-6Z"
        fill={`url(#${gradientId})`}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
      />
      <path d="M28 4v20" stroke="rgba(255,255,255,0.35)" strokeDasharray="2 3" strokeWidth="1.5" />
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
    </svg>
  );
};

const isKnownPitch = (pitchName?: string): pitchName is string =>
  Boolean(pitchName && pitchName !== 'TBD Pitch' && pitchName !== 'Unknown Pitch');

const ByTeam: React.FC = () => {
  const { competitions, clubs, pitches } = useTournament();

  const pitchNameById = React.useMemo(
    () => new Map(pitches.map((pitch) => [pitch.id, pitch.name])),
    [pitches]
  );

  const clubById = React.useMemo(
    () => new Map(clubs.map((club) => [club.id, club])),
    [clubs]
  );

  const resolveLeadClubId = React.useCallback(
    (team?: Team): string | undefined => {
      if (!team) return undefined;
      if (team.overrideLeadClubId) return team.overrideLeadClubId;

      const allClubIds = Array.from(
        new Set([team.clubId, ...(team.secondaryClubIds || [])].filter(Boolean) as string[])
      );
      if (allClubIds.length === 0) return undefined;
      if (allClubIds.length === 1) return allClubIds[0];

      const contributions = team.clubContributions || {};
      const sorted = [...allClubIds].sort((a, b) => {
        const contributionDelta = (contributions[b] || 0) - (contributions[a] || 0);
        if (contributionDelta !== 0) return contributionDelta;
        const nameA = clubById.get(a)?.name || '';
        const nameB = clubById.get(b)?.name || '';
        return nameA.localeCompare(nameB);
      });

      return sorted[0] || team.clubId;
    },
    [clubById]
  );

  const clubSchedules = React.useMemo<ClubSchedule[]>(() => {
    const byClub = new Map<
      string,
      {
        club: Club;
        byTeam: Map<string, TeamSchedule>;
      }
    >();

    competitions.forEach((competition) => {
      const teamById = new Map(competition.teams.map((team) => [team.id, team]));

      const addFixtureForTeam = (fixture: Fixture, teamId: string) => {
        const team = teamById.get(teamId);
        if (!team) return;

        const leadClubId = resolveLeadClubId(team);
        if (!leadClubId) return;

        const club = clubById.get(leadClubId);
        if (!club) return;

        const clubSchedule = byClub.get(leadClubId) || {
          club,
          byTeam: new Map<string, TeamSchedule>(),
        };

        const teamSchedule = clubSchedule.byTeam.get(team.id) || {
          teamId: team.id,
          teamName: team.name,
          team,
          competitionId: competition.id,
          competitionName: competition.name,
          fixtures: [],
          umpireDuties: [],
          timeline: [],
          silverEntries: [],
        };

        teamSchedule.fixtures.push({
          fixture,
          competition,
          startTime: fixture.startTime || 'TBD',
          startMinutes: toMinutes(fixture.startTime),
          pitchName: fixture.pitchId ? (pitchNameById.get(fixture.pitchId) || 'Unknown Pitch') : 'TBD Pitch',
        });
        teamSchedule.timeline.push({
          type: 'fixture',
          data: {
            fixture,
            competition,
            startTime: fixture.startTime || 'TBD',
            startMinutes: toMinutes(fixture.startTime),
            pitchName: fixture.pitchId
              ? (pitchNameById.get(fixture.pitchId) || 'Unknown Pitch')
              : 'TBD Pitch',
          },
        });

        clubSchedule.byTeam.set(team.id, teamSchedule);
        byClub.set(leadClubId, clubSchedule);
      };

      const addUmpireDutyForTeam = (fixture: Fixture, teamId: string) => {
        const team = teamById.get(teamId);
        if (!team) return;
        const leadClubId = resolveLeadClubId(team);
        if (!leadClubId) return;
        const club = clubById.get(leadClubId);
        if (!club) return;

        const clubSchedule = byClub.get(leadClubId) || {
          club,
          byTeam: new Map<string, TeamSchedule>(),
        };

        const teamSchedule = clubSchedule.byTeam.get(team.id) || {
          teamId: team.id,
          teamName: team.name,
          team,
          competitionId: competition.id,
          competitionName: competition.name,
          fixtures: [],
          umpireDuties: [],
          timeline: [],
          silverEntries: [],
        };

        const duty = {
          fixture,
          competition,
          startTime: fixture.startTime || 'TBD',
          startMinutes: toMinutes(fixture.startTime),
          pitchName: fixture.pitchId ? (pitchNameById.get(fixture.pitchId) || 'Unknown Pitch') : 'TBD Pitch',
        };
        teamSchedule.umpireDuties.push(duty);
        teamSchedule.timeline.push({
          type: 'umpire',
          data: duty,
        });

        clubSchedule.byTeam.set(team.id, teamSchedule);
        byClub.set(leadClubId, clubSchedule);
      };

      competition.fixtures.forEach((fixture) => {
        addFixtureForTeam(fixture, fixture.homeTeamId);
        addFixtureForTeam(fixture, fixture.awayTeamId);
        if (fixture.umpireTeam?.type === 'by-id') {
          addUmpireDutyForTeam(fixture, fixture.umpireTeam.value);
        }
      });
    });

    const toBracketLabel = (fixture: Fixture) => {
      const parts = [fixture.stage];
      if (fixture.description && fixture.description !== fixture.stage) {
        parts.push(fixture.description);
      } else if (fixture.matchId) {
        parts.push(fixture.matchId);
      }
      return parts.filter(Boolean).join(' • ');
    };

    return Array.from(byClub.values())
      .map((schedule) => {
        const silverEntriesByCompetition = new Map<string, SilverEntry[]>();
        competitions.forEach((competition) => {
          silverEntriesByCompetition.set(
            competition.id,
            sortSilver(
              competition.fixtures
                .filter((fixture) => fixture.stage && fixture.stage !== 'Group')
                .map((fixture) => ({
                  id: `${competition.id}-${fixture.id}`,
                  startTime: fixture.startTime || 'TBD',
                  startMinutes: toMinutes(fixture.startTime),
                  bracketLabel: toBracketLabel(fixture),
                }))
            )
          );
        });

        const teams = Array.from(schedule.byTeam.values())
          .map((teamSchedule) => ({
            ...teamSchedule,
            fixtures: sortFixtures(teamSchedule.fixtures),
            umpireDuties: sortUmpireDuties(teamSchedule.umpireDuties),
            timeline: sortTimeline(teamSchedule.timeline),
            silverEntries: silverEntriesByCompetition.get(teamSchedule.competitionId) || [],
          }))
          .filter((teamSchedule) => teamSchedule.timeline.length > 0)
          .sort((a, b) => a.teamName.localeCompare(b.teamName));

        return {
          club: schedule.club,
          teams,
        };
      })
      .filter((schedule) => schedule.teams.length > 0)
      .sort((a, b) => a.club.name.localeCompare(b.club.name));
  }, [clubById, competitions, pitchNameById, resolveLeadClubId]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">
          View all scheduled matches by club, then by team, each sorted by kickoff time.
        </p>
      </div>

      {clubSchedules.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Scheduled Club Fixtures</CardTitle>
            <CardDescription>
              No scheduled fixtures are tied to clubs yet. Assign teams to clubs and schedule matches first.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 auto-rows-max">
          {clubSchedules.map((schedule) => {
            const fixtureCount = schedule.teams.reduce(
              (count, teamSchedule) => count + teamSchedule.fixtures.length,
              0
            );

            return (
              <Card key={schedule.club.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 flex-wrap">
                    {schedule.club.name}
                    <Badge variant="secondary">{schedule.teams.length} teams</Badge>
                    <Badge variant="outline">{fixtureCount} fixtures</Badge>
                  </CardTitle>
                  <CardDescription>{schedule.club.abbreviation || schedule.club.code}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {schedule.teams
                      .slice()
                      .sort((a, b) => {
                        const competitionDelta = a.competitionName.localeCompare(b.competitionName);
                        if (competitionDelta !== 0) return competitionDelta;
                        return a.teamName.localeCompare(b.teamName);
                      })
                      .map((teamSchedule) => {
                        const firstPitch = teamSchedule.timeline.find((entry) => entry.type === 'fixture')?.data.pitchName;
                        const showStartPitch = isKnownPitch(firstPitch);

                        return (
                          <section key={teamSchedule.teamId} className="space-y-2">
                            <div className="border-b pb-2">
                              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                                {teamSchedule.competitionName}
                              </h3>
                            </div>
                            <div className="space-y-2.5 rounded-xl border border-slate-200/80 bg-slate-50/40 p-3">
                              <div className="border-b border-slate-200 pb-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <TeamBadge team={teamSchedule.team} />
                                    <h4 className="font-semibold text-sm uppercase tracking-wide text-slate-700 truncate">
                                      {teamSchedule.teamName}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Badge variant="secondary">{teamSchedule.fixtures.length} matches</Badge>
                                    {teamSchedule.umpireDuties.length > 0 && (
                                      <Badge variant="outline">{teamSchedule.umpireDuties.length} umpiring</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {showStartPitch && (
                                <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                                  <MapPin className="h-3.5 w-3.5" />
                                  Start on {firstPitch}
                                </div>
                              )}

                              <div className="space-y-2.5">
                                {teamSchedule.timeline.map((timelineEntry, index) => {
                                  if (timelineEntry.type === 'umpire') {
                                    const duty = timelineEntry.data;
                                    return (
                                      <div
                                        key={`${teamSchedule.teamId}-${duty.fixture.id}-${duty.competition.id}-umpire`}
                                        className="rounded-md border border-dashed border-blue-300 bg-blue-50/70 px-3 py-2"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex items-center gap-2 text-sm font-mono font-semibold text-blue-900">
                                            <Clock className="h-4 w-4 text-blue-700" />
                                            {duty.startTime}
                                          </div>
                                          <Badge variant="outline" className="border-blue-300 text-blue-900">
                                            Umpiring duties
                                          </Badge>
                                        </div>
                                      </div>
                                    );
                                  }

                                  const entry = timelineEntry.data;
                                  const isOurTeamHome = entry.fixture.homeTeamId === teamSchedule.teamId;
                                  const opponentTeamId = isOurTeamHome
                                    ? entry.fixture.awayTeamId
                                    : entry.fixture.homeTeamId;

                                  const nextTimelineEntry = teamSchedule.timeline[index + 1];
                                  const nextPitch = nextTimelineEntry?.data.pitchName;
                                  const pitchChanged = Boolean(
                                    nextTimelineEntry &&
                                      isKnownPitch(entry.pitchName) &&
                                      isKnownPitch(nextPitch) &&
                                      entry.pitchName !== nextPitch
                                  );
                                  const movementLabel = pitchChanged
                                    ? nextTimelineEntry?.type === 'umpire'
                                      ? `Go to ${nextPitch} for umpiring duties`
                                      : timelineEntry.type === 'umpire'
                                        ? `Go back to ${nextPitch} for your next match`
                                        : `Go to ${nextPitch} for your next match`
                                    : '';

                                  return (
                                    <React.Fragment
                                      key={`${teamSchedule.teamId}-${entry.fixture.id}-${entry.competition.id}`}
                                    >
                                      <div className="rounded-lg border-[0.2rem] border-outset border-white bg-muted/30 px-3 py-1.5">
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex items-center gap-2 text-sm font-mono font-semibold shrink-0">
                                              <Clock className="h-4 w-4 text-muted-foreground" />
                                              {entry.startTime}
                                            </div>
                                            <div className="min-w-0">
                                              <TeamDisplay
                                                teamId={opponentTeamId}
                                                side="away"
                                                competition={entry.competition}
                                              />
                                            </div>
                                          </div>
                                          <div className="shrink-0 flex items-center gap-1.5">
                                            <MatchTicket fixture={entry.fixture} competition={entry.competition} />
                                            <StageHexagon fixture={entry.fixture} competition={entry.competition} />
                                          </div>
                                        </div>
                                      </div>

                                      {pitchChanged && (
                                        <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                                          <ArrowRight className="h-3.5 w-3.5" />
                                          {movementLabel}
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>

                              {teamSchedule.silverEntries.length > 0 && (
                                <div className="mt-2 border-t border-slate-200 pt-2">
                                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                    Path to silver
                                  </div>
                                  <div className="space-y-1.5">
                                    {teamSchedule.silverEntries.map((entry) => (
                                      <div
                                        key={`${teamSchedule.teamId}-${entry.id}`}
                                        className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs"
                                      >
                                        <span className="font-mono font-semibold text-slate-700">{entry.startTime}</span>
                                        <span className="text-right text-slate-600">
                                          {teamSchedule.competitionName} • {entry.bracketLabel}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </section>
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

export default ByTeam;
