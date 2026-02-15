import React, { createContext, useContext, useState, useEffect } from 'react';
import { Competition, Fixture, Pitch, Team, Group, Club, PitchBreakItem } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getGroupPitchIds } from '@/lib/groupPitches';
import { generateMatchIdsForCompetition } from '@/utils/matchIdUtils';

interface TournamentContextType {
  competitions: Competition[];
  pitches: Pitch[];
  clubs: Club[];

  // Competition Actions
  addCompetition: (name: string) => void;
  deleteCompetition: (id: string) => void;

  // Club Actions
  addClub: (club: Omit<Club, 'id'>) => void;
  updateClub: (id: string, updates: Partial<Club>) => void;
  deleteClub: (id: string) => void;

  // Team Actions
  addTeam: (competitionId: string, name?: string, clubId?: string) => void;
  updateTeam: (competitionId: string, teamId: string, updates: Partial<Team>) => void;
  deleteTeam: (competitionId: string, teamId: string) => void;

  // Fixture Actions
  generateFixtures: (competitionId: string, targetGroupId?: string) => void;
  addManualFixture: (competitionId: string, fixture: Omit<Fixture, 'id' | 'competitionId'>) => void;
  addFixtures: (competitionId: string, fixtures: Omit<Fixture, 'id' | 'competitionId'>[]) => void;
  updateFixture: (competitionId: string, fixtureId: string, updates: Partial<Fixture>, shouldRecalculate?: boolean, pitchBreaks?: PitchBreakItem[]) => void;
  deleteFixture: (competitionId: string, fixtureId: string, shouldRecalculate?: boolean, pitchBreaks?: PitchBreakItem[]) => void;

  // Group Actions
  createGroup: (competitionId: string, name: string) => void;
  deleteGroup: (competitionId: string, groupId: string) => void;
  moveTeamToGroup: (competitionId: string, teamId: string, groupId: string | undefined) => void;
  autoAssignGroups: (competitionId: string, numGroups: number) => void;

  // Pitch Actions
  addPitch: (name: string, startTime?: string, endTime?: string) => void;
  updatePitch: (id: string, updates: Partial<Pitch>) => void;
  deletePitch: (id: string) => void;

  // Scheduling
  autoScheduleMatches: (competitionId: string, pitchBreaks?: PitchBreakItem[]) => void;
  resetAllSchedules: () => void;
  updateGroup: (competitionId: string, groupId: string, updates: Partial<Group>) => void;
  reorderFixtureToPitch: (fixtureId: string, targetPitchId: string, targetIndex?: number) => void;
  updateCompetition: (id: string, updates: Partial<Competition>) => void;
  batchUpdateFixtures: (updates: { competitionId: string, fixtureId: string, updates: Partial<Fixture> }[], shouldRecalculate?: boolean, pitchBreaks?: PitchBreakItem[]) => void;
  recalculateSchedule: (competitionId: string, pitchBreaks?: PitchBreakItem[]) => void;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
};

// Helper: Regenerate match IDs for a competition
const withRegeneratedMatchIds = (comp: Competition): Competition => {
  const matchIdMap = generateMatchIdsForCompetition(comp);
  return {
    ...comp,
    fixtures: comp.fixtures.map(f => ({
      ...f,
      matchId: matchIdMap.get(f.id)
    }))
  };
};

// Golden ratio for maximum color distribution
const GOLDEN_RATIO = 0.618033988749895;

// Generate a color using golden ratio to spread hues evenly
function generateCompetitionColor(index: number): string {
  // Use golden ratio to distribute hues across 360 degrees
  const hue = (index * GOLDEN_RATIO * 360) % 360;
  // Use high saturation and medium-dark lightness for vibrant, distinct colors
  const saturation = 70;
  const lightness = 35;
  
  // Convert HSL to RGB
  const h = hue / 360;
  const s = saturation / 100;
  const l = lightness / 100;
  
  const hueToRgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  
  const r = Math.round(hueToRgb(p, q, h + 1/3) * 255);
  const g = Math.round(hueToRgb(p, q, h) * 255);
  const b = Math.round(hueToRgb(p, q, h - 1/3) * 255);
  
  // Convert to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from local storage or start fresh
  const [competitions, setCompetitions] = useState<Competition[]>(() => {
    const saved = localStorage.getItem('tournament_competitions');
    if (!saved) return [];
    
    const loadedCompetitions: Competition[] = JSON.parse(saved);
    // Migrate: assign colors to competitions that don't have them
    return loadedCompetitions.map((comp, index) => ({
      ...comp,
      color: comp.color || generateCompetitionColor(index)
    }));
  });

  const [pitches, setPitches] = useState<Pitch[]>(() => {
    const saved = localStorage.getItem('tournament_pitches');
    return saved ? JSON.parse(saved) : [];
  });

  const [clubs, setClubs] = useState<Club[]>(() => {
    const saved = localStorage.getItem('tournament_clubs');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('tournament_competitions', JSON.stringify(competitions));
  }, [competitions]);

  useEffect(() => {
    localStorage.setItem('tournament_pitches', JSON.stringify(pitches));
  }, [pitches]);

  useEffect(() => {
    localStorage.setItem('tournament_clubs', JSON.stringify(clubs));
  }, [clubs]);

  const addCompetition = (name: string) => {
    // Generate code from initials
    const words = name.trim().split(/\s+/);
    let code = '';
    if (words.length === 1) {
      code = words[0].substring(0, 2).toUpperCase();
    } else {
      code = words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }

    // Assign color using golden ratio for max visual distinction
    const color = generateCompetitionColor(competitions.length);

    const newComp: Competition = {
      id: uuidv4(),
      name,
      code,
      color,
      teams: [],
      groups: [],
      fixtures: []
    };
    setCompetitions([...competitions, newComp]);
  };

  const updateCompetition = (id: string, updates: Partial<Competition>) => {
    setCompetitions(competitions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCompetition = (id: string) => {
    setCompetitions(competitions.filter(c => c.id !== id));
  };

  const addClub = (club: Omit<Club, 'id'>) => {
    setClubs([...clubs, { ...club, id: uuidv4() }]);
  };

  const updateClub = (id: string, updates: Partial<Club>) => {
    setClubs(clubs.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteClub = (id: string) => {
    setClubs(clubs.filter(c => c.id !== id));
    // Optionally update teams that were linked to this club
    setCompetitions(competitions.map(comp => ({
      ...comp,
      teams: comp.teams.map(t => t.clubId === id ? { ...t, clubId: undefined } : t)
    })));
  };

  const addTeam = (competitionId: string, name?: string, clubId?: string) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        let finalName = name;
        let initials;
        let primaryColor;
        let secondaryColor;

        if (clubId) {
           const club = clubs.find(c => c.id === clubId);
           if (club && !finalName) {
             finalName = club.name;
             initials = club.code;
             primaryColor = club.primaryColor;
             secondaryColor = club.secondaryColor;
           }
        }

        if (!finalName) {
          const index = comp.teams.length;
          if (index < 26) {
            finalName = String.fromCharCode(65 + index);
          } else {
            finalName = `Team ${index + 1}`;
          }
        }

        return {
          ...comp,
          teams: [...comp.teams, { 
            id: uuidv4(), 
            name: finalName, 
            clubId,
            initials,
            primaryColor,
            secondaryColor
          }]
        };
      }
      return comp;
    }));
  };

  const updateTeam = (competitionId: string, teamId: string, updates: Partial<Team>) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        return {
          ...comp,
          teams: comp.teams.map(t => t.id === teamId ? { ...t, ...updates } : t)
        };
      }
      return comp;
    }));
  };

  const deleteTeam = (competitionId: string, teamId: string) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        return {
          ...comp,
          teams: comp.teams.filter(t => t.id !== teamId)
        };
      }
      return comp;
    }));
  };

  const createGroup = (competitionId: string, name: string) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        return {
          ...comp,
          groups: [...(comp.groups || []), { id: uuidv4(), name }]
        };
      }
      return comp;
    }));
  };

  const updateGroup = (competitionId: string, groupId: string, updates: Partial<Group>) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        return {
          ...comp,
          groups: (comp.groups || []).map(g => g.id === groupId ? { ...g, ...updates } : g)
        };
      }
      return comp;
    }));
  };

  const deleteGroup = (competitionId: string, groupId: string) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        return {
          ...comp,
          groups: (comp.groups || []).filter(g => g.id !== groupId),
          teams: comp.teams.map(t => t.groupId === groupId ? { ...t, groupId: undefined } : t)
        };
      }
      return comp;
    }));
  };

  const moveTeamToGroup = (competitionId: string, teamId: string, groupId: string | undefined) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        return {
          ...comp,
          teams: comp.teams.map(t => t.id === teamId ? { ...t, groupId } : t)
        };
      }
      return comp;
    }));
  };

  const autoAssignGroups = (competitionId: string, numGroups: number) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        const teams = [...comp.teams];
        // Create new groups
        const newGroups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
          id: uuidv4(),
          name: `Gp. ${i + 1}`
        }));

        // Distribute teams
        const updatedTeams = teams.map((team, index) => ({
          ...team,
          groupId: newGroups[index % numGroups].id
        }));

        return {
          ...comp,
          groups: newGroups,
          teams: updatedTeams,
          fixtures: []
        };
      }
      return comp;
    }));
  };

  const generateFixtures = (competitionId: string, targetGroupId?: string) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        const generatedFixtures: Fixture[] = [];

        const groupsToProcess = (comp.groups && comp.groups.length > 0)
          ? comp.groups
              .filter(group => !targetGroupId || group.id === targetGroupId)
              .map(group => ({
                id: group.id,
                name: group.name,
                teams: comp.teams.filter(t => t.groupId === group.id)
              }))
          : (!targetGroupId ? [{ id: 'default', name: 'All Teams', teams: comp.teams }] : []);

        groupsToProcess.forEach(group => {
          const teams = [...group.teams];
          if (teams.length < 2) return;

          // If odd number of teams, add a dummy team for "bye"
          const hasGhost = teams.length % 2 !== 0;
          if (hasGhost) {
            teams.push({ id: 'ghost', name: 'Bye' });
          }

          const n = teams.length;
          const rounds = n - 1;
          const matchesPerRound = n / 2;

          let currentTeams = [...teams];

          for (let round = 0; round < rounds; round++) {
            for (let match = 0; match < matchesPerRound; match++) {
              const home = currentTeams[match];
              const away = currentTeams[n - 1 - match];

              if (home.id !== 'ghost' && away.id !== 'ghost') {
                generatedFixtures.push({
                  id: uuidv4(),
                  competitionId,
                  homeTeamId: home.id,
                  awayTeamId: away.id,
                  stage: 'Group',
                  description: (group.id !== 'default') ? `${group.name} - R${round + 1}` : `Round ${round + 1}`,
                  duration: 20,
                  groupId: (group.id !== 'default') ? group.id : undefined
                });
              }
            }

            // Rotate teams
            const fixed = currentTeams[0];
            const rest = currentTeams.slice(1);
            const last = rest.pop();
            if (last) rest.unshift(last);
            currentTeams = [fixed, ...rest];
          }
        });

        const retainedFixtures = comp.fixtures.filter(fixture => {
          if (fixture.stage !== 'Group') return true;
          if (targetGroupId) {
            return fixture.groupId !== targetGroupId;
          }
          return false;
        });

        const updatedComp = {
          ...comp,
          fixtures: [...retainedFixtures, ...generatedFixtures]
        };

        return withRegeneratedMatchIds(updatedComp);
      }
      return comp;
    }));
  };

  const addManualFixture = (competitionId: string, fixture: Omit<Fixture, 'id' | 'competitionId'>) => {
    setCompetitions(prev => prev.map(comp => {
      if (comp.id === competitionId) {
        const updatedComp = {
          ...comp,
          fixtures: [...comp.fixtures, { ...fixture, id: uuidv4(), competitionId }]
        };
        return withRegeneratedMatchIds(updatedComp);
      }
      return comp;
    }));
  };

  const addFixtures = (competitionId: string, newFixtures: Omit<Fixture, 'id' | 'competitionId'>[]) => {
    setCompetitions(prev => prev.map(comp => {
      if (comp.id === competitionId) {
        const fixturesToAdd: Fixture[] = [];
        const fixturesToUpdate = new Map<string, Partial<Fixture>>();

        newFixtures.forEach(newFix => {
          if (newFix.matchId) {
            const existing = comp.fixtures.find(f => f.matchId === newFix.matchId);
            if (existing) {
              fixturesToUpdate.set(existing.id, newFix);
            } else {
              fixturesToAdd.push({ ...newFix, id: uuidv4(), competitionId });
            }
          } else {
            fixturesToAdd.push({ ...newFix, id: uuidv4(), competitionId });
          }
        });

        const updatedComp = {
          ...comp,
          fixtures: comp.fixtures.map(f => {
            const updates = fixturesToUpdate.get(f.id);
            if (updates) {
              return { ...f, ...updates };
            }
            return f;
          }).concat(fixturesToAdd)
        };

        return withRegeneratedMatchIds(updatedComp);
      }
      return comp;
    }));
  };

  const updateFixture = (competitionId: string, fixtureId: string, updates: Partial<Fixture>, shouldRecalculate = false, pitchBreaks: PitchBreakItem[] = []) => {
    setCompetitions(competitions => {
      const nextCompetitions = competitions.map(comp => {
        if (comp.id === competitionId) {
          const updatedComp = {
            ...comp,
            fixtures: comp.fixtures.map(f => f.id === fixtureId ? { ...f, ...updates } : f)
          };
          return withRegeneratedMatchIds(updatedComp);
        }
        return comp;
      });

      if (shouldRecalculate) {
        const recalculated = nextCompetitions.map(comp => {
          if (comp.id === competitionId) {
            return recalculateCompetitionSchedule(comp, pitchBreaks);
          }
          return comp;
        });
        return enforceNoPitchOverlaps(recalculated, pitchBreaks);
      }

      return nextCompetitions;
    });
  };

  const deleteFixture = (competitionId: string, fixtureId: string, shouldRecalculate = false, pitchBreaks: PitchBreakItem[] = []) => {
    setCompetitions(competitions => {
      const nextCompetitions = competitions.map(comp => {
        if (comp.id === competitionId) {
          const updatedComp = {
            ...comp,
            fixtures: comp.fixtures.filter(f => f.id !== fixtureId)
          };
          return withRegeneratedMatchIds(updatedComp);
        }
        return comp;
      });

      if (shouldRecalculate) {
        const recalculated = nextCompetitions.map(comp => {
          if (comp.id === competitionId) {
            return recalculateCompetitionSchedule(comp, pitchBreaks);
          }
          return comp;
        });
        return enforceNoPitchOverlaps(recalculated, pitchBreaks);
      }

      return nextCompetitions;
    });
  };

  const addPitch = (name: string, startTime?: string, endTime?: string) => {
    setPitches([...pitches, { id: uuidv4(), name, startTime, endTime }]);
  };

  const updatePitch = (id: string, updates: Partial<Pitch>) => {
    setPitches(pitches.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePitch = (id: string) => {
    setPitches(pitches.filter(p => p.id !== id));
    setCompetitions(prevCompetitions =>
      prevCompetitions.map(comp => {
        const nextGroups = (comp.groups || []).map((group) => {
          const currentPitchIds = getGroupPitchIds(group);
          if (!currentPitchIds.includes(id)) return group;

          const filteredPitchIds = currentPitchIds.filter((pitchId) => pitchId !== id);
          return {
            ...group,
            pitchIds: filteredPitchIds,
            primaryPitchId: filteredPitchIds[0],
          };
        });
        const hasAffectedGroups = nextGroups.some((group, index) => group !== (comp.groups || [])[index]);
        const hasAffectedFixtures = comp.fixtures.some(fixture => fixture.pitchId === id);
        if (!hasAffectedFixtures && !hasAffectedGroups) return comp;

        return {
          ...comp,
          groups: nextGroups,
          fixtures: comp.fixtures.map(fixture => {
            if (fixture.pitchId !== id) return fixture;
            return {
              ...fixture,
              pitchId: undefined,
              startTime: undefined,
            };
          })
        };
      })
    );
  };

  const parseTimeToMinutes = (time?: string, fallback: number = 10 * 60) => {
    if (!time) return fallback;
    const [hours, minutes] = time.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return fallback;
    return hours * 60 + minutes;
  };

  const toTimeString = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getFixtureTimingConfig = (fixture: Fixture, groupsById: Map<string, Group>) => {
    const group = fixture.groupId ? groupsById.get(fixture.groupId) : undefined;
    return {
      group,
      duration: group?.defaultDuration ?? fixture.duration ?? 20,
      slack: group?.defaultSlack ?? 5,
    };
  };

  /** Given a proposed start time and fixture duration, advance past any overlapping breaks on that pitch. */
  const advancePastBreaks = (
    proposedStart: number,
    duration: number,
    breaksForPitch: { start: number; end: number }[]
  ): number => {
    let start = proposedStart;
    // Iterate until we find a slot that doesn't overlap any break
    let changed = true;
    while (changed) {
      changed = false;
      for (const br of breaksForPitch) {
        const fixtureEnd = start + duration;
        // Overlap if fixture starts before break ends AND fixture ends after break starts
        if (start < br.end && fixtureEnd > br.start) {
          start = br.end;
          changed = true;
        }
      }
    }
    return start;
  };

  /** Build a lookup of break intervals (in minutes) per pitch. */
  const buildBreakIntervalsByPitch = (
    pitchBreaks: PitchBreakItem[]
  ): Map<string, { start: number; end: number }[]> => {
    const map = new Map<string, { start: number; end: number }[]>();
    for (const br of pitchBreaks) {
      const start = parseTimeToMinutes(br.startTime);
      const end = start + (br.duration || 0);
      if (!map.has(br.pitchId)) map.set(br.pitchId, []);
      map.get(br.pitchId)!.push({ start, end });
    }
    return map;
  };

  const enforceNoPitchOverlaps = (competitionList: Competition[], pitchBreaks: PitchBreakItem[] = []): Competition[] => {
    type PitchFixtureRef = {
      competitionId: string;
      fixtureId: string;
      requestedStart: number;
      duration: number;
      slack: number;
      slackBefore: number;
      order: number;
    };

    const pitchStartById = new Map(
      pitches.map((pitch) => [pitch.id, parseTimeToMinutes(pitch.startTime)])
    );
    const fixturesByPitch = new Map<string, PitchFixtureRef[]>();
    let order = 0;

    competitionList.forEach((competition) => {
      const groupsById = new Map((competition.groups || []).map((group) => [group.id, group]));

      competition.fixtures.forEach((fixture) => {
        if (!fixture.pitchId) return;

        const pitchStart = pitchStartById.get(fixture.pitchId) ?? 10 * 60;
        const { duration, slack } = getFixtureTimingConfig(fixture, groupsById);
        const fixtureRef: PitchFixtureRef = {
          competitionId: competition.id,
          fixtureId: fixture.id,
          requestedStart: parseTimeToMinutes(fixture.startTime, pitchStart),
          duration,
          slack,
          slackBefore: fixture.slackBefore || 0,
          order,
        };

        order += 1;

        if (!fixturesByPitch.has(fixture.pitchId)) {
          fixturesByPitch.set(fixture.pitchId, []);
        }

        fixturesByPitch.get(fixture.pitchId)?.push(fixtureRef);
      });
    });

    const updatesByCompetitionId = new Map<string, Map<string, Partial<Fixture>>>();
    const breakIntervalsByPitch = buildBreakIntervalsByPitch(pitchBreaks);

    fixturesByPitch.forEach((pitchFixtures, pitchId) => {
      const pitchStart = pitchStartById.get(pitchId) ?? 10 * 60;
      let cursor = pitchStart;
      const breaksForPitch = breakIntervalsByPitch.get(pitchId) || [];

      pitchFixtures.sort((a, b) => {
        if (a.requestedStart !== b.requestedStart) {
          return a.requestedStart - b.requestedStart;
        }

        return a.order - b.order;
      });

      pitchFixtures.forEach((item) => {
        const effectiveEarliest = cursor + item.slackBefore;
        let startMinutes = Math.max(effectiveEarliest, item.requestedStart);
        startMinutes = advancePastBreaks(startMinutes, item.duration, breaksForPitch);
        const updatesForCompetition =
          updatesByCompetitionId.get(item.competitionId) || new Map<string, Partial<Fixture>>();

        updatesForCompetition.set(item.fixtureId, {
          startTime: toTimeString(startMinutes),
        });
        updatesByCompetitionId.set(item.competitionId, updatesForCompetition);

        cursor = startMinutes + item.duration + item.slack;
      });
    });

    return competitionList.map((competition) => {
      const updates = updatesByCompetitionId.get(competition.id);
      if (!updates || updates.size === 0) return competition;

      return {
        ...competition,
        fixtures: competition.fixtures.map((fixture) => {
          const fixtureUpdates = updates.get(fixture.id);
          return fixtureUpdates ? { ...fixture, ...fixtureUpdates } : fixture;
        }),
      };
    });
  };

  const recalculateCompetitionSchedule = (competition: Competition, pitchBreaks: PitchBreakItem[] = []): Competition => {
    const KNOCKOUT_TIER: Record<string, number> = {
      'Round of 16': 0,
      'Quarter-Final': 1,
      'Semi-Final': 2,
      '3rd Place Playoff': 3,
      'Final': 3,
    };
    const groupsById = new Map((competition.groups || []).map((group) => [group.id, group]));
    const pitchStartById = new Map(pitches.map((pitch) => [pitch.id, parseTimeToMinutes(pitch.startTime)]));
    const fixtureUpdates = new Map<string, Partial<Fixture>>();
    const pitchCursorById = new Map(pitches.map((pitch) => [pitch.id, parseTimeToMinutes(pitch.startTime)]));
    const breakIntervalsByPitch = buildBreakIntervalsByPitch(pitchBreaks);

    const getStartTime = (f: Fixture) => (f.startTime ? parseTimeToMinutes(f.startTime) : undefined);

    const groupStageFixtures = competition.fixtures.filter((f) => !f.stage || f.stage === 'Group');
    const knockoutFixtures = competition.fixtures.filter((f) => f.stage && f.stage !== 'Group');

    const groupFixturesByPitch = new Map<string, Fixture[]>();
    groupStageFixtures.forEach((f) => {
      if (!f.pitchId) return;
      if (!groupFixturesByPitch.has(f.pitchId)) groupFixturesByPitch.set(f.pitchId, []);
      groupFixturesByPitch.get(f.pitchId)!.push(f);
    });

    let groupStageEndTime = 0;
    for (const [pitchId, fixtures] of groupFixturesByPitch) {
      fixtures.sort((a, b) => (getStartTime(a) || 0) - (getStartTime(b) || 0));

      let cursor = pitchStartById.get(pitchId) || 0;
      const breaksForPitch = breakIntervalsByPitch.get(pitchId) || [];

      for (const fixture of fixtures) {
        const { duration, slack } = getFixtureTimingConfig(fixture, groupsById);
        const start = advancePastBreaks(cursor, duration, breaksForPitch);
        fixtureUpdates.set(fixture.id, { startTime: toTimeString(start), duration });
        cursor = start + duration + slack;
        pitchCursorById.set(pitchId, cursor);
      }
    }

    for (const [, cursor] of pitchCursorById) {
      groupStageEndTime = Math.max(groupStageEndTime, cursor);
    }

    const fixturesByTier = new Map<number, Fixture[]>();
    knockoutFixtures.forEach((f) => {
      const tier = KNOCKOUT_TIER[f.stage as string] ?? 99;
      if (!fixturesByTier.has(tier)) fixturesByTier.set(tier, []);
      fixturesByTier.get(tier)!.push(f);
    });

    const sortedTiers = Array.from(fixturesByTier.keys()).sort((a, b) => a - b);
    let tierMinStartTime = groupStageEndTime;

    for (const tier of sortedTiers) {
      const tierFixtures = fixturesByTier.get(tier)!;
      const tierFixturesByPitch = new Map<string, Fixture[]>();
      
      tierFixtures.forEach((f) => {
        if (!f.pitchId) return;
        if (!tierFixturesByPitch.has(f.pitchId)) tierFixturesByPitch.set(f.pitchId, []);
        tierFixturesByPitch.get(f.pitchId)!.push(f);
      });

      let tierMaxEndTime = tierMinStartTime;

      for (const [pitchId, fixtures] of tierFixturesByPitch) {
        fixtures.sort((a, b) => (getStartTime(a) || 0) - (getStartTime(b) || 0));

        let cursor = pitchCursorById.get(pitchId) || 0;
        const breaksForPitch = breakIntervalsByPitch.get(pitchId) || [];

        for (const fixture of fixtures) {
          const { duration, slack } = getFixtureTimingConfig(fixture, groupsById);
          let start = Math.max(cursor, tierMinStartTime);
          start = advancePastBreaks(start, duration, breaksForPitch);
          const slackBefore = Math.max(0, start - cursor);

          fixtureUpdates.set(fixture.id, { 
            startTime: toTimeString(start), 
            duration,
            slackBefore 
          });
          
          const end = start + duration + slack;
          cursor = end;
          tierMaxEndTime = Math.max(tierMaxEndTime, end);
        }
        pitchCursorById.set(pitchId, cursor);
      }
      
      tierMinStartTime = tierMaxEndTime;
    }

    return {
      ...competition,
      fixtures: competition.fixtures.map((f) => {
        const update = fixtureUpdates.get(f.id);
        return update ? { ...f, ...update } : f;
      }),
    };
  };

  const recalculateSchedule = (competitionId: string, pitchBreaks: PitchBreakItem[] = []) => {
    setCompetitions((prevCompetitions) => {
      const scheduledCompetitions = prevCompetitions.map((competition) => {
        if (competition.id !== competitionId) return competition;
        return recalculateCompetitionSchedule(competition, pitchBreaks);
      });
      return enforceNoPitchOverlaps(scheduledCompetitions, pitchBreaks);
    });
  };

  const autoScheduleMatches = (competitionId: string, pitchBreaks: PitchBreakItem[] = []) => {
    const KNOCKOUT_TIER: Record<string, number> = {
      'Round of 16': 0,
      'Quarter-Final': 1,
      'Semi-Final': 2,
      '3rd Place Playoff': 3,
      'Final': 3,
    };

    setCompetitions((prevCompetitions) => {
      const scheduledCompetitions = prevCompetitions.map((competition) => {
        if (competition.id !== competitionId || competition.fixtures.length === 0) {
          return competition;
        }

        const fallbackPitchId = pitches[0]?.id;
        const validPitchIds = new Set(pitches.map((pitch) => pitch.id));
        const pitchStartById = new Map(
          pitches.map((pitch) => [pitch.id, parseTimeToMinutes(pitch.startTime)])
        );
        const groupsById = new Map((competition.groups || []).map((group) => [group.id, group]));
        const fixtureUpdates = new Map<string, Partial<Fixture>>();

        const groupStageFixtures = competition.fixtures.filter(
          (f) => !f.stage || f.stage === 'Group'
        );
        const knockoutFixtures = competition.fixtures.filter(
          (f) => f.stage && f.stage !== 'Group'
        );

        type QueueEntry = { fixtureId: string; duration: number; slack: number };
        type GroupQueue = { pitchPool: string[]; nextPitchIndex: number; fixtures: QueueEntry[] };

        const groupQueues = new Map<string, GroupQueue>();
        const groupOrder: string[] = [];
        const usedPitchIds = new Set<string>();

        groupStageFixtures.forEach((fixture) => {
          const { group, duration, slack } = getFixtureTimingConfig(fixture, groupsById);
          const configuredPitchIds = getGroupPitchIds(group).filter((id) => validPitchIds.has(id));
          const fixturePitchId =
            fixture.pitchId && validPitchIds.has(fixture.pitchId) ? fixture.pitchId : undefined;
          const pitchPool =
            configuredPitchIds.length > 0
              ? configuredPitchIds
              : fixturePitchId
                ? [fixturePitchId]
                : fallbackPitchId
                  ? [fallbackPitchId]
                  : [];

          if (pitchPool.length === 0) {
            fixtureUpdates.set(fixture.id, { duration });
            return;
          }

          pitchPool.forEach((id) => usedPitchIds.add(id));

          const groupKey = group?.id ?? `fixture:${fixture.id}`;
          if (!groupQueues.has(groupKey)) {
            groupOrder.push(groupKey);
            groupQueues.set(groupKey, { pitchPool, nextPitchIndex: 0, fixtures: [] });
          }
          groupQueues.get(groupKey)!.fixtures.push({ fixtureId: fixture.id, duration, slack });
        });

        const pitchCursorById = new Map(
          pitches.map((pitch) => [pitch.id, parseTimeToMinutes(pitch.startTime)])
        );
        const breakIntervals = buildBreakIntervalsByPitch(pitchBreaks);
        let pending = true;

        while (pending) {
          pending = false;
          groupOrder.forEach((groupKey) => {
            const queue = groupQueues.get(groupKey);
            if (!queue || queue.fixtures.length === 0) return;
            pending = true;

            const entry = queue.fixtures.shift()!;
            const pitchId = queue.pitchPool[queue.nextPitchIndex % queue.pitchPool.length];
            queue.nextPitchIndex += 1;

            const rawCursor = pitchCursorById.get(pitchId) ?? (pitchStartById.get(pitchId) ?? 10 * 60);
            const breaksForPitch = breakIntervals.get(pitchId) || [];
            const cursor = advancePastBreaks(rawCursor, entry.duration, breaksForPitch);
            fixtureUpdates.set(entry.fixtureId, {
              pitchId,
              startTime: toTimeString(cursor),
              duration: entry.duration,
            });
            pitchCursorById.set(pitchId, cursor + entry.duration + entry.slack);
          });
        }

        if (knockoutFixtures.length > 0) {
          const knockoutPitchPool = usedPitchIds.size > 0
            ? Array.from(usedPitchIds)
            : pitches.map((p) => p.id);

          let groupStageEndTime = 0;
          for (const [, cursor] of pitchCursorById) {
            groupStageEndTime = Math.max(groupStageEndTime, cursor);
          }

          const fixturesByTier = new Map<number, { fixture: Fixture; duration: number; slack: number }[]>();
          knockoutFixtures.forEach((fixture) => {
            const { duration, slack } = getFixtureTimingConfig(fixture, groupsById);
            const tier = KNOCKOUT_TIER[fixture.stage] ?? 99;
            if (!fixturesByTier.has(tier)) {
              fixturesByTier.set(tier, []);
            }
            fixturesByTier.get(tier)!.push({ fixture, duration, slack });
          });

          const sortedTiers = Array.from(fixturesByTier.keys()).sort((a, b) => a - b);
          let tierMinStartTime = groupStageEndTime;

          for (const tier of sortedTiers) {
            const tierFixtures = fixturesByTier.get(tier)!;
            const naturalCursorById = new Map<string, number>();
            for (const pitchId of knockoutPitchPool) {
              naturalCursorById.set(pitchId, pitchCursorById.get(pitchId) ?? 0);
              pitchCursorById.set(pitchId, Math.max(pitchCursorById.get(pitchId) ?? 0, tierMinStartTime));
            }

            let nextPitchIndex = 0;
            let tierMaxEndTime = tierMinStartTime;

            for (const entry of tierFixtures) {
              const pitchId = knockoutPitchPool[nextPitchIndex % knockoutPitchPool.length];
              nextPitchIndex += 1;

              const rawCursor = pitchCursorById.get(pitchId) ?? tierMinStartTime;
              const breaksForPitch = breakIntervals.get(pitchId) || [];
              const cursor = advancePastBreaks(rawCursor, entry.duration, breaksForPitch);
              const naturalEnd = naturalCursorById.get(pitchId) ?? 0;
              const slackBefore = Math.max(0, cursor - naturalEnd);

              fixtureUpdates.set(entry.fixture.id, {
                pitchId,
                startTime: toTimeString(cursor),
                duration: entry.duration,
                slackBefore,
              });

              const endTime = cursor + entry.duration + entry.slack;
              pitchCursorById.set(pitchId, endTime);
              tierMaxEndTime = Math.max(tierMaxEndTime, endTime);
            }

            tierMinStartTime = tierMaxEndTime;
          }
        }

        return {
          ...competition,
          fixtures: competition.fixtures.map((fixture) => {
            const updates = fixtureUpdates.get(fixture.id);
            return updates ? { ...fixture, ...updates } : fixture;
          }),
        };
      });

      const withMatchIds = scheduledCompetitions.map(comp => withRegeneratedMatchIds(comp));
      return enforceNoPitchOverlaps(withMatchIds, pitchBreaks);
    });
  };

  const resetAllSchedules = () => {
    setCompetitions((prev) =>
      prev.map((comp) => ({
        ...comp,
        fixtures: comp.fixtures.map((f) => ({
          ...f,
          pitchId: undefined,
          startTime: undefined,
        })),
      }))
    );
  };

  const reorderFixtureToPitch = (fixtureId: string, targetPitchId: string, targetIndex: number = -1) => {
    let targetFixture: Fixture | undefined;
    let sourceCompId: string | undefined;

    for (const comp of competitions) {
      const f = comp.fixtures.find(fx => fx.id === fixtureId);
      if (f) {
        targetFixture = f;
        sourceCompId = comp.id;
        break;
      }
    }

    if (!targetFixture || !sourceCompId) return;

    const pitchFixtures = competitions
      .flatMap(c => c.fixtures)
      .filter(f => f.pitchId === targetPitchId && f.id !== fixtureId)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    if (targetIndex >= 0 && targetIndex <= pitchFixtures.length) {
      pitchFixtures.splice(targetIndex, 0, targetFixture);
    } else {
      pitchFixtures.push(targetFixture);
    }

    const pitch = pitches.find(p => p.id === targetPitchId);
    let currentTimeMinutes = 10 * 60; // Default 10:00
    if (pitch && pitch.startTime) {
      const [h, m] = pitch.startTime.split(':').map(Number);
      currentTimeMinutes = h * 60 + m;
    }

    const updates = new Map<string, Partial<Fixture>>();

    pitchFixtures.forEach(f => {
      const hours = Math.floor(currentTimeMinutes / 60);
      const minutes = currentTimeMinutes % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      const duration = f.duration || 20;
      const slack = 5;

      updates.set(f.id, {
        pitchId: targetPitchId,
        startTime: timeString
      });

      currentTimeMinutes += duration + slack;
    });

    setCompetitions(competitions.map(comp => {
      const needsUpdate = comp.fixtures.some(f => updates.has(f.id));
      if (!needsUpdate) return comp;

      return {
        ...comp,
        fixtures: comp.fixtures.map(f => {
          if (updates.has(f.id)) {
            return { ...f, ...updates.get(f.id) };
          }
          return f;
        })
      };
    }));
  };

  const batchUpdateFixtures = (updates: { competitionId: string, fixtureId: string, updates: Partial<Fixture> }[], shouldRecalculate = false, pitchBreaks: PitchBreakItem[] = []) => {
    setCompetitions(prevCompetitions => {
      const nextCompetitions = prevCompetitions.map(comp => {
        const compUpdates = updates.filter(u => u.competitionId === comp.id);
        if (compUpdates.length === 0) return comp;

        const updateMap = new Map(compUpdates.map(u => [u.fixtureId, u.updates]));

        const updatedComp = {
          ...comp,
          fixtures: comp.fixtures.map(f => {
            const update = updateMap.get(f.id);
            if (update) {
              return { ...f, ...update };
            }
            return f;
          })
        };

        return withRegeneratedMatchIds(updatedComp);
      });

      if (shouldRecalculate) {
         const affectedCompetitionIds = new Set(updates.map(u => u.competitionId));
         const recalculated = nextCompetitions.map(comp => {
            if (affectedCompetitionIds.has(comp.id)) {
               return recalculateCompetitionSchedule(comp, pitchBreaks);
            }
            return comp;
         });
         return enforceNoPitchOverlaps(recalculated, pitchBreaks);
      }

      return nextCompetitions;
    });
  };

  return (
    <TournamentContext.Provider value={{
      competitions,
      pitches,
      clubs,
      addCompetition,
      deleteCompetition,
      addClub,
      updateClub,
      deleteClub,
      addTeam,
      updateTeam,
      deleteTeam,
      createGroup,
      updateGroup,
      deleteGroup,
      moveTeamToGroup,
      autoAssignGroups,
      generateFixtures,
      addManualFixture,
      addFixtures,
      updateFixture,
      deleteFixture,
      addPitch,
      updatePitch,
      deletePitch,
      autoScheduleMatches,
      resetAllSchedules,
      reorderFixtureToPitch,
      updateCompetition,
      batchUpdateFixtures,
      recalculateSchedule
    }}>
      {children}
    </TournamentContext.Provider>
  );
};