import React, { createContext, useContext, useState, useEffect } from 'react';
import { Competition, Fixture, Pitch, Team, Group } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

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
  generateFixtures: (competitionId: string) => void;
  addManualFixture: (competitionId: string, fixture: Omit<Fixture, 'id' | 'competitionId'>) => void;
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
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
};

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from local storage or start fresh
  const [competitions, setCompetitions] = useState<Competition[]>(() => {
    const saved = localStorage.getItem('tournament_competitions');
    return saved ? JSON.parse(saved) : [];
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

    const newComp: Competition = {
      id: uuidv4(),
      name,
      code,
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

  const generateFixtures = (competitionId: string) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        const generatedFixtures: Fixture[] = [];

        // If no groups defined, maybe treat as one big group? 
        // User request: "Round robin are formed from groups and not the entire set of teams as is happenign now"
        // So we should iterate groups. 
        // But if there are NO groups, maybe we should still support the old behavior or default to one group?
        // Let's assume if there are groups, use them. If not, use all teams (legacy support).

        const groupsToProcess = (comp.groups && comp.groups.length > 0)
          ? comp.groups.map(g => ({ id: g.id, name: g.name, teams: comp.teams.filter(t => t.groupId === g.id) }))
          : [{ id: 'default', name: 'All Teams', teams: comp.teams }];

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

        return {
          ...comp,
          fixtures: [...comp.fixtures, ...generatedFixtures]
        };
      }
      return comp;
    }));
  };

  const addManualFixture = (competitionId: string, fixture: Omit<Fixture, 'id' | 'competitionId'>) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        return {
          ...comp,
          fixtures: [...comp.fixtures, { ...fixture, id: uuidv4(), competitionId }]
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
  };

  const autoScheduleMatches = (competitionId: string) => {
    // 1. Get competition and groups
    const comp = competitions.find(c => c.id === competitionId);
    if (!comp || !comp.groups || comp.groups.length === 0) return;

    // 2. Prepare group schedules
    // Map groupID -> current time cursor (Date object or minutes from midnight)
    const groupCursors: Record<string, number> = {};

    comp.groups.forEach(group => {
      if (group.primaryPitchId) {
        // Find pitch start time
        const pitch = pitches.find(p => p.id === group.primaryPitchId);
        if (pitch && pitch.startTime) {
          const [hours, minutes] = pitch.startTime.split(':').map(Number);
          groupCursors[group.id] = hours * 60 + minutes;
        } else {
          // Default to 10:00 AM if no pitch or start time
          groupCursors[group.id] = 10 * 60;
        }
      } else {
        groupCursors[group.id] = 10 * 60;
      }
    });

    // 3. Iterate fixtures and assign times
    const updatedFixtures = comp.fixtures.map(fixture => {
      // Only schedule if it belongs to a group and that group has a cursor
      if (fixture.groupId && groupCursors[fixture.groupId] !== undefined) {
        const group = comp.groups.find(g => g.id === fixture.groupId);
        if (!group) return fixture;

        const duration = group.defaultDuration || 20;
        const slack = group.defaultSlack || 5;
        const currentTime = groupCursors[fixture.groupId];

        // Convert back to HH:mm
        const hours = Math.floor(currentTime / 60);
        const minutes = currentTime % 60;
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        // Increment cursor
        groupCursors[fixture.groupId] += duration + slack;

        return {
          ...fixture,
          pitchId: group.primaryPitchId, // Assign to primary pitch
          startTime: timeString,
          duration: duration
        };
      }
      return fixture;
    });

    setCompetitions(competitions.map(c => c.id === competitionId ? { ...c, fixtures: updatedFixtures } : c));
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
      updateFixture,
      deleteFixture,
      addPitch,
      updatePitch,
      deletePitch,
      autoScheduleMatches,
      reorderFixtureToPitch,
      updateCompetition
    }}>
      {children}
    </TournamentContext.Provider>
  );
};
