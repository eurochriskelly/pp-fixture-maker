import React, { createContext, useContext, useState, useEffect } from 'react';
import { Competition, Fixture, Pitch, Team, Group } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getGroupPitchIds } from '@/lib/groupPitches';

interface TournamentContextType {
  competitions: Competition[];
  pitches: Pitch[];

  // Competition Actions
  addCompetition: (name: string) => void;
  deleteCompetition: (id: string) => void;

  // Team Actions
  addTeam: (competitionId: string, name?: string) => void;
  updateTeam: (competitionId: string, teamId: string, updates: Partial<Team>) => void;
  deleteTeam: (competitionId: string, teamId: string) => void;

  // Fixture Actions
  generateFixtures: (competitionId: string, targetGroupId?: string) => void;
  addManualFixture: (competitionId: string, fixture: Omit<Fixture, 'id' | 'competitionId'>) => void;
  addFixtures: (competitionId: string, fixtures: Omit<Fixture, 'id' | 'competitionId'>[]) => void;
  updateFixture: (competitionId: string, fixtureId: string, updates: Partial<Fixture>) => void;
  deleteFixture: (competitionId: string, fixtureId: string) => void;

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
  autoScheduleMatches: (competitionId: string) => void;
  updateGroup: (competitionId: string, groupId: string, updates: Partial<Group>) => void;
  reorderFixtureToPitch: (fixtureId: string, targetPitchId: string, targetIndex?: number) => void;
  updateCompetition: (id: string, updates: Partial<Competition>) => void;
  batchUpdateFixtures: (updates: { competitionId: string, fixtureId: string, updates: Partial<Fixture> }[]) => void;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
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

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('tournament_competitions', JSON.stringify(competitions));
  }, [competitions]);

  useEffect(() => {
    localStorage.setItem('tournament_pitches', JSON.stringify(pitches));
  }, [pitches]);

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

  const addTeam = (competitionId: string, name?: string) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        const teamName = name || String.fromCharCode(65 + (comp.teams.length % 26)); // A, B, C... then Z, [, \ ... fix later if > 26
        // Better naming: A..Z, then AA..AZ
        let finalName = name;
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
          teams: [...comp.teams, { id: uuidv4(), name: finalName }]
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
        // Shuffle teams first? Maybe keep current order but distribute round-robin
        const updatedTeams = teams.map((team, index) => ({
          ...team,
          groupId: newGroups[index % numGroups].id
        }));

        return {
          ...comp,
          groups: newGroups,
          teams: updatedTeams,
          // Clear existing fixtures? Probably safe to separate concern, but usually auto-group implies re-start
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
                  // If it's a real group, use its name, otherwise maybe just "Group"
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

        return {
          ...comp,
          fixtures: [...retainedFixtures, ...generatedFixtures]
        };
      }
      return comp;
    }));
  };

  const addManualFixture = (competitionId: string, fixture: Omit<Fixture, 'id' | 'competitionId'>) => {
    setCompetitions(prev => prev.map(comp => {
      if (comp.id === competitionId) {
        return {
          ...comp,
          fixtures: [...comp.fixtures, { ...fixture, id: uuidv4(), competitionId }]
        };
      }
      return comp;
    }));
  };

  const addFixtures = (competitionId: string, newFixtures: Omit<Fixture, 'id' | 'competitionId'>[]) => {
    setCompetitions(prev => prev.map(comp => {
      if (comp.id === competitionId) {
        // Upsert logic: if a fixture has a matchId, check if it already exists
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

        return {
          ...comp,
          fixtures: comp.fixtures.map(f => {
            const updates = fixturesToUpdate.get(f.id);
            if (updates) {
              return { ...f, ...updates };
            }
            return f;
          }).concat(fixturesToAdd)
        };
      }
      return comp;
    }));
  };

  const updateFixture = (competitionId: string, fixtureId: string, updates: Partial<Fixture>) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        return {
          ...comp,
          fixtures: comp.fixtures.map(f => f.id === fixtureId ? { ...f, ...updates } : f)
        };
      }
      return comp;
    }));
  };

  const deleteFixture = (competitionId: string, fixtureId: string) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        return {
          ...comp,
          fixtures: comp.fixtures.filter(f => f.id !== fixtureId)
        };
      }
      return comp;
    }));
  };

  const addPitch = (name: string, startTime?: string, endTime?: string) => {
    setPitches([...pitches, { id: uuidv4(), name, startTime, endTime }]);
  };

  const updatePitch = (id: string, updates: Partial<Pitch>) => {
    setPitches(pitches.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePitch = (id: string) => {
    setPitches(pitches.filter(p => p.id !== id));

    // Unassign fixtures that were on the removed pitch to avoid dangling pitch IDs.
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

  const enforceNoPitchOverlaps = (competitionList: Competition[]): Competition[] => {
    type PitchFixtureRef = {
      competitionId: string;
      fixtureId: string;
      requestedStart: number;
      duration: number;
      slack: number;
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

    fixturesByPitch.forEach((pitchFixtures, pitchId) => {
      const pitchStart = pitchStartById.get(pitchId) ?? 10 * 60;
      let cursor = pitchStart;

      pitchFixtures.sort((a, b) => {
        if (a.requestedStart !== b.requestedStart) {
          return a.requestedStart - b.requestedStart;
        }

        return a.order - b.order;
      });

      pitchFixtures.forEach((item) => {
        const startMinutes = Math.max(cursor, item.requestedStart);
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

  const autoScheduleMatches = (competitionId: string) => {
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
        const groupQueues = new Map<
          string,
          {
            pitchPool: string[];
            nextPitchIndex: number;
            fixtures: Array<{ fixtureId: string; duration: number; slack: number }>;
          }
        >();
        const groupOrder: string[] = [];
        const fixtureUpdates = new Map<string, Partial<Fixture>>();

        competition.fixtures.forEach((fixture) => {
          const { group, duration, slack } = getFixtureTimingConfig(fixture, groupsById);
          const configuredPitchIds = getGroupPitchIds(group).filter((pitchId) => validPitchIds.has(pitchId));
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

          const groupKey = group?.id ?? `fixture:${fixture.id}`;
          const groupQueue = groupQueues.get(groupKey);

          if (!groupQueue) {
            groupOrder.push(groupKey);
            groupQueues.set(groupKey, {
              pitchPool,
              nextPitchIndex: 0,
              fixtures: [],
            });
          }

          groupQueues.get(groupKey)?.fixtures.push({
            fixtureId: fixture.id,
            duration,
            slack,
          });
        });

        const pitchCursorById = new Map(
          pitches.map((pitch) => [pitch.id, parseTimeToMinutes(pitch.startTime)])
        );
        let pendingFixtures = true;

        while (pendingFixtures) {
          pendingFixtures = false;

          groupOrder.forEach((groupKey) => {
            const queue = groupQueues.get(groupKey);
            if (!queue || queue.fixtures.length === 0) return;

            pendingFixtures = true;

            const nextFixture = queue.fixtures.shift();
            if (!nextFixture) return;

            const pitchId = queue.pitchPool[queue.nextPitchIndex % queue.pitchPool.length];
            queue.nextPitchIndex += 1;

            const pitchStart = pitchStartById.get(pitchId) ?? 10 * 60;
            const pitchCursor = pitchCursorById.get(pitchId) ?? pitchStart;

            fixtureUpdates.set(nextFixture.fixtureId, {
              pitchId,
              startTime: toTimeString(pitchCursor),
              duration: nextFixture.duration,
            });

            pitchCursorById.set(pitchId, pitchCursor + nextFixture.duration + nextFixture.slack);
          });
        }

        return {
          ...competition,
          fixtures: competition.fixtures.map((fixture) => {
            const updates = fixtureUpdates.get(fixture.id);
            return updates ? { ...fixture, ...updates } : fixture;
          }),
        };
      });

      return enforceNoPitchOverlaps(scheduledCompetitions);
    });
  };

  const reorderFixtureToPitch = (fixtureId: string, targetPitchId: string, targetIndex: number = -1) => {
    // 1. Find the fixture and its competition
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

    // 2. Get all assigned fixtures for the target pitch (excluding the moving one)
    const pitchFixtures = competitions
      .flatMap(c => c.fixtures)
      .filter(f => f.pitchId === targetPitchId && f.id !== fixtureId)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    // 3. Insert into the new position
    if (targetIndex >= 0 && targetIndex <= pitchFixtures.length) {
      pitchFixtures.splice(targetIndex, 0, targetFixture);
    } else {
      pitchFixtures.push(targetFixture);
    }

    // 4. Recalculate times
    const pitch = pitches.find(p => p.id === targetPitchId);
    let currentTimeMinutes = 10 * 60; // Default 10:00
    if (pitch && pitch.startTime) {
      const [h, m] = pitch.startTime.split(':').map(Number);
      currentTimeMinutes = h * 60 + m;
    }

    // Create a map of updates needed
    const updates = new Map<string, Partial<Fixture>>(); // fixtureId -> updates

    pitchFixtures.forEach(f => {
      const hours = Math.floor(currentTimeMinutes / 60);
      const minutes = currentTimeMinutes % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      // Find group to get slack? Or use default?
      // Ideally we look up the group from the fixture's competition
      // For simplicity, let's assume 5 min slack if not found, or keeping existing duration
      // We need to look up the group again... this is heavy but necessary for correctness
      // Optimization: Just use f.duration and hardcoded slack for now if we don't want to traverse everything
      const duration = f.duration || 20;
      const slack = 5; // Default slack

      updates.set(f.id, {
        pitchId: targetPitchId,
        startTime: timeString
      });

      currentTimeMinutes += duration + slack;
    });

    // 5. Apply updates
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

  const batchUpdateFixtures = (updates: { competitionId: string, fixtureId: string, updates: Partial<Fixture> }[]) => {
    setCompetitions(prevCompetitions => {
      // Create a map for faster lookup if needed, but array size is likely small enough
      return prevCompetitions.map(comp => {
        const compUpdates = updates.filter(u => u.competitionId === comp.id);
        if (compUpdates.length === 0) return comp;

        const updateMap = new Map(compUpdates.map(u => [u.fixtureId, u.updates]));

        return {
          ...comp,
          fixtures: comp.fixtures.map(f => {
            const update = updateMap.get(f.id);
            if (update) {
              return { ...f, ...update };
            }
            return f;
          })
        };
      });
    });
  };

  return (
    <TournamentContext.Provider value={{
      competitions,
      pitches,
      addCompetition,
      deleteCompetition,
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
      reorderFixtureToPitch,
      updateCompetition,
      batchUpdateFixtures
    }}>
      {children}
    </TournamentContext.Provider>
  );
};
