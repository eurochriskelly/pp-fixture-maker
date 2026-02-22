import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Competition, Fixture, Pitch, Team, Group, Club, PitchBreakItem, Tournament } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getGroupPitchIds } from '@/lib/groupPitches';
import { generateMatchIdsForCompetition } from '@/utils/matchIdUtils';

interface TournamentContextType {
  tournaments: Tournament[];
  currentTournament: Tournament | null;
  setCurrentTournament: (tournament: Tournament | null) => void;
  
  // Tournament Actions
  addTournament: (name: string, description?: string) => Tournament;
  deleteTournament: (id: string) => void;
  updateTournament: (id: string, updates: Partial<Tournament>) => void;
  
  // Competition Actions
  competitions: Competition[];
  addCompetition: (name: string) => void;
  deleteCompetition: (id: string) => void;
  updateCompetition: (id: string, updates: Partial<Competition>) => void;

  // Club Actions
  clubs: Club[];
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
  pitches: Pitch[];
  addPitch: (name: string, startTime?: string, endTime?: string) => void;
  updatePitch: (id: string, updates: Partial<Pitch>) => void;
  deletePitch: (id: string) => void;

  // Scheduling
  autoScheduleMatches: (competitionId: string, pitchBreaks?: PitchBreakItem[]) => void;
  resetAllSchedules: () => void;
  updateGroup: (competitionId: string, groupId: string, updates: Partial<Group>) => void;
  reorderFixtureToPitch: (fixtureId: string, targetPitchId: string, targetIndex?: number) => void;
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
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    const saved = localStorage.getItem('tournament_maker_tournaments');
    if (saved) {
      const loadedTournaments: Tournament[] = JSON.parse(saved);
      // Migrate: ensure all tournaments have updatedAt
      return loadedTournaments.map(t => ({
        ...t,
        competitions: t.competitions.map((comp, index) => ({
          ...comp,
          color: comp.color || generateCompetitionColor(index)
        }))
      }));
    }
    
    // Check for legacy data and migrate if needed
    const legacyCompetitions = localStorage.getItem('tournament_competitions');
    const legacyPitches = localStorage.getItem('tournament_pitches');
    const legacyClubs = localStorage.getItem('tournament_clubs');
    
    const hasLegacyData = legacyCompetitions || legacyPitches || legacyClubs;
    
    if (hasLegacyData) {
      const now = new Date().toISOString();
      const migratedTournament: Tournament = {
        id: uuidv4(),
        name: 'My Tournament (Migrated)',
        description: 'Migrated from previous version',
        createdAt: now,
        updatedAt: now,
        competitions: legacyCompetitions ? JSON.parse(legacyCompetitions) : [],
        pitches: legacyPitches ? JSON.parse(legacyPitches) : [],
        clubs: legacyClubs ? JSON.parse(legacyClubs) : []
      };
      
      // Migrate: ensure competitions have colors
      migratedTournament.competitions = migratedTournament.competitions.map((comp, index) => ({
        ...comp,
        color: comp.color || generateCompetitionColor(index)
      }));
      
      return [migratedTournament];
    }
    
    return [];
  });

  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(() => {
    // First check if there's a saved current tournament ID
    const saved = localStorage.getItem('tournament_maker_current_id');
    if (saved) return saved;
    
    // If we just migrated, select the first tournament
    const savedTournaments = localStorage.getItem('tournament_maker_tournaments');
    if (savedTournaments) {
      const tournaments: Tournament[] = JSON.parse(savedTournaments);
      if (tournaments.length > 0) {
        return tournaments[0].id;
      }
    }
    
    // Check if we need to migrate and set the migrated tournament as current
    const legacyCompetitions = localStorage.getItem('tournament_competitions');
    const legacyPitches = localStorage.getItem('tournament_pitches');
    const legacyClubs = localStorage.getItem('tournament_clubs');
    
    if (legacyCompetitions || legacyPitches || legacyClubs) {
      // Migration will happen in tournaments state init, we'll get the ID from there
      // Return null for now, it will be set when tournaments state initializes
      return null;
    }
    
    return null;
  });

  const currentTournament = tournaments.find(t => t.id === currentTournamentId) || null;
  const competitions = currentTournament?.competitions || [];
  const pitches = currentTournament?.pitches || [];
  const clubs = currentTournament?.clubs || [];

  // Handle migration: if we have tournaments but no current selection, select the first one
  useEffect(() => {
    if (!currentTournamentId && tournaments.length > 0) {
      setCurrentTournamentId(tournaments[0].id);
    }
  }, [currentTournamentId, tournaments]);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('tournament_maker_tournaments', JSON.stringify(tournaments));
  }, [tournaments]);

  useEffect(() => {
    if (currentTournamentId) {
      localStorage.setItem('tournament_maker_current_id', currentTournamentId);
    } else {
      localStorage.removeItem('tournament_maker_current_id');
    }
  }, [currentTournamentId]);

  const setCurrentTournament = useCallback((tournament: Tournament | null) => {
    setCurrentTournamentId(tournament?.id || null);
  }, []);

  const addTournament = useCallback((name: string, description?: string): Tournament => {
    const now = new Date().toISOString();
    const newTournament: Tournament = {
      id: uuidv4(),
      name,
      description,
      createdAt: now,
      updatedAt: now,
      competitions: [],
      pitches: [],
      clubs: []
    };
    setTournaments(prev => [...prev, newTournament]);
    return newTournament;
  }, []);

  const deleteTournament = useCallback((id: string) => {
    setTournaments(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (currentTournamentId === id) {
        setCurrentTournamentId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  }, [currentTournamentId]);

  const updateTournament = useCallback((id: string, updates: Partial<Tournament>) => {
    setTournaments(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    ));
  }, []);

  const updateCurrentTournament = useCallback((updater: (t: Tournament) => Tournament) => {
    if (!currentTournamentId) return;
    setTournaments(prev => prev.map(t => 
      t.id === currentTournamentId ? updater(t) : t
    ));
  }, [currentTournamentId]);

  const addCompetition = useCallback((name: string) => {
    if (!currentTournamentId) return;
    
    // Generate code from initials
    const words = name.trim().split(/\s+/);
    let code = '';
    if (words.length === 1) {
      code = words[0].substring(0, 2).toUpperCase();
    } else {
      code = words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }

    updateCurrentTournament(t => {
      const color = generateCompetitionColor(t.competitions.length);
      const newComp: Competition = {
        id: uuidv4(),
        name,
        code,
        color,
        teams: [],
        groups: [],
        fixtures: []
      };
      return {
        ...t,
        competitions: [...t.competitions, newComp],
        updatedAt: new Date().toISOString()
      };
    });
  }, [currentTournamentId, updateCurrentTournament]);

  const updateCompetition = useCallback((id: string, updates: Partial<Competition>) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      competitions: t.competitions.map(c => c.id === id ? { ...c, ...updates } : c),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const deleteCompetition = useCallback((id: string) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      competitions: t.competitions.filter(c => c.id !== id),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const addClub = useCallback((club: Omit<Club, 'id'>) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      clubs: [...t.clubs, { ...club, id: uuidv4() }],
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const updateClub = useCallback((id: string, updates: Partial<Club>) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      clubs: t.clubs.map(c => c.id === id ? { ...c, ...updates } : c),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const deleteClub = useCallback((id: string) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      clubs: t.clubs.filter(c => c.id !== id),
      competitions: t.competitions.map(comp => ({
        ...comp,
        teams: comp.teams.map(team => t.clubs.find(c => c.id === id && team.clubId === id) 
          ? { ...team, clubId: undefined } 
          : team
        )
      })),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const addTeam = useCallback((competitionId: string, name?: string, clubId?: string) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      competitions: t.competitions.map(comp => {
        if (comp.id !== competitionId) return comp;
        
        let finalName = name;
        let initials;
        let primaryColor;
        let secondaryColor;

        if (clubId) {
           const club = t.clubs.find(c => c.id === clubId);
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
            name: finalName!, 
            clubId,
            initials,
            primaryColor,
            secondaryColor
          }]
        };
      }),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const updateTeam = useCallback((competitionId: string, teamId: string, updates: Partial<Team>) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      competitions: t.competitions.map(comp => {
        if (comp.id !== competitionId) return comp;
        return {
          ...comp,
          teams: comp.teams.map(team => team.id === teamId ? { ...team, ...updates } : team)
        };
      }),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const deleteTeam = useCallback((competitionId: string, teamId: string) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      competitions: t.competitions.map(comp => {
        if (comp.id !== competitionId) return comp;
        return {
          ...comp,
          teams: comp.teams.filter(team => team.id !== teamId)
        };
      }),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const createGroup = useCallback((competitionId: string, name: string) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      competitions: t.competitions.map(comp => {
        if (comp.id !== competitionId) return comp;
        return {
          ...comp,
          groups: [...(comp.groups || []), { id: uuidv4(), name }]
        };
      }),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const updateGroup = useCallback((competitionId: string, groupId: string, updates: Partial<Group>) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      competitions: t.competitions.map(comp => {
        if (comp.id !== competitionId) return comp;
        return {
          ...comp,
          groups: (comp.groups || []).map(g => g.id === groupId ? { ...g, ...updates } : g)
        };
      }),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const deleteGroup = useCallback((competitionId: string, groupId: string) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      competitions: t.competitions.map(comp => {
        if (comp.id !== competitionId) return comp;
        return {
          ...comp,
          groups: (comp.groups || []).filter(g => g.id !== groupId),
          teams: comp.teams.map(team => team.groupId === groupId ? { ...team, groupId: undefined } : team)
        };
      }),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const moveTeamToGroup = useCallback((competitionId: string, teamId: string, groupId: string | undefined) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      competitions: t.competitions.map(comp => {
        if (comp.id !== competitionId) return comp;
        return {
          ...comp,
          teams: comp.teams.map(team => team.id === teamId ? { ...team, groupId } : team)
        };
      }),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const autoAssignGroups = useCallback((competitionId: string, numGroups: number) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      competitions: t.competitions.map(comp => {
        if (comp.id !== competitionId) return comp;
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
      }),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const generateFixtures = useCallback((competitionId: string, targetGroupId?: string) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      competitions: t.competitions.map(comp => {
        if (comp.id !== competitionId) return comp;
        
        const generatedFixtures: Fixture[] = [];

        const groupsToProcess = (comp.groups && comp.groups.length > 0)
          ? comp.groups
              .filter(group => !targetGroupId || group.id === targetGroupId)
              .map(group => ({
                id: group.id,
                name: group.name,
                teams: comp.teams.filter(team => team.groupId === group.id)
              }))
          : (!targetGroupId ? [{ id: 'default', name: 'All Teams', teams: comp.teams }] : []);

        groupsToProcess.forEach(group => {
          const teams = [...group.teams];
          if (teams.length < 2) return;

          // If odd number of teams, add a dummy team for "bye"
          const hasGhost = teams.length % 2 !== 0;
          if (hasGhost) {
            teams.push({ id: 'ghost', name: 'Bye' } as Team);
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
      }),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const addManualFixture = useCallback((competitionId: string, fixture: Omit<Fixture, 'id' | 'competitionId'>) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      competitions: t.competitions.map(comp => {
        if (comp.id !== competitionId) return comp;
        const updatedComp = {
          ...comp,
          fixtures: [...comp.fixtures, { ...fixture, id: uuidv4(), competitionId }]
        };
        return withRegeneratedMatchIds(updatedComp);
      }),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const addFixtures = useCallback((competitionId: string, newFixtures: Omit<Fixture, 'id' | 'competitionId'>[]) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      competitions: t.competitions.map(comp => {
        if (comp.id !== competitionId) return comp;
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
      }),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const updateFixture = useCallback((competitionId: string, fixtureId: string, updates: Partial<Fixture>, shouldRecalculate = false, pitchBreaks: PitchBreakItem[] = []) => {
    if (!currentTournamentId) return;
    
    setTournaments(prev => {
      const tournament = prev.find(t => t.id === currentTournamentId);
      if (!tournament) return prev;
      
      const nextTournament = {
        ...tournament,
        competitions: tournament.competitions.map(comp => {
          if (comp.id !== competitionId) return comp;
          const updatedComp = {
            ...comp,
            fixtures: comp.fixtures.map(f => f.id === fixtureId ? { ...f, ...updates } : f)
          };
          return withRegeneratedMatchIds(updatedComp);
        }),
        updatedAt: new Date().toISOString()
      };

      if (shouldRecalculate) {
        const recalculatedComp = recalculateCompetitionSchedule(
          nextTournament.competitions.find(c => c.id === competitionId)!,
          nextTournament.pitches,
          pitchBreaks
        );
        nextTournament.competitions = nextTournament.competitions.map(c => 
          c.id === competitionId ? recalculatedComp : c
        );
        
        const enforced = enforceNoPitchOverlaps(nextTournament, pitchBreaks);
        return prev.map(t => t.id === currentTournamentId ? enforced : t);
      }

      return prev.map(t => t.id === currentTournamentId ? nextTournament : t);
    });
  }, [currentTournamentId]);

  const deleteFixture = useCallback((competitionId: string, fixtureId: string, shouldRecalculate = false, pitchBreaks: PitchBreakItem[] = []) => {
    if (!currentTournamentId) return;
    
    setTournaments(prev => {
      const tournament = prev.find(t => t.id === currentTournamentId);
      if (!tournament) return prev;
      
      const nextTournament = {
        ...tournament,
        competitions: tournament.competitions.map(comp => {
          if (comp.id !== competitionId) return comp;
          const updatedComp = {
            ...comp,
            fixtures: comp.fixtures.filter(f => f.id !== fixtureId)
          };
          return withRegeneratedMatchIds(updatedComp);
        }),
        updatedAt: new Date().toISOString()
      };

      if (shouldRecalculate) {
        const recalculatedComp = recalculateCompetitionSchedule(
          nextTournament.competitions.find(c => c.id === competitionId)!,
          nextTournament.pitches,
          pitchBreaks
        );
        nextTournament.competitions = nextTournament.competitions.map(c => 
          c.id === competitionId ? recalculatedComp : c
        );
        
        const enforced = enforceNoPitchOverlaps(nextTournament, pitchBreaks);
        return prev.map(t => t.id === currentTournamentId ? enforced : t);
      }

      return prev.map(t => t.id === currentTournamentId ? nextTournament : t);
    });
  }, [currentTournamentId]);

  const addPitch = useCallback((name: string, startTime?: string, endTime?: string) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      pitches: [...t.pitches, { id: uuidv4(), name, startTime, endTime }],
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const updatePitch = useCallback((id: string, updates: Partial<Pitch>) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      pitches: t.pitches.map(p => p.id === id ? { ...p, ...updates } : p),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const deletePitch = useCallback((id: string) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => {
      const filteredPitches = t.pitches.filter(p => p.id !== id);
      const updatedComps = t.competitions.map(comp => {
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
      });
      
      return {
        ...t,
        pitches: filteredPitches,
        competitions: updatedComps,
        updatedAt: new Date().toISOString()
      };
    });
  }, [currentTournamentId, updateCurrentTournament]);

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
      // Prefer fixture specific override, then group default, then fallback
      duration: fixture.duration ?? group?.defaultDuration ?? 20,
      slack: fixture.slack ?? group?.defaultSlack ?? 5,
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

  const enforceNoPitchOverlaps = (tournament: Tournament, pitchBreaks: PitchBreakItem[] = []): Tournament => {
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
      tournament.pitches.map((pitch) => [pitch.id, parseTimeToMinutes(pitch.startTime)])
    );
    const fixturesByPitch = new Map<string, PitchFixtureRef[]>();
    let order = 0;

    tournament.competitions.forEach((competition) => {
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

    return {
      ...tournament,
      competitions: tournament.competitions.map((competition) => {
        const updates = updatesByCompetitionId.get(competition.id);
        if (!updates || updates.size === 0) return competition;

        return {
          ...competition,
          fixtures: competition.fixtures.map((fixture) => {
            const fixtureUpdates = updates.get(fixture.id);
            return fixtureUpdates ? { ...fixture, ...fixtureUpdates } : fixture;
          }),
        };
      }),
    };
  };

  const recalculateCompetitionSchedule = (competition: Competition, pitches: Pitch[], pitchBreaks: PitchBreakItem[] = []): Competition => {
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

  const recalculateSchedule = useCallback((competitionId: string, pitchBreaks: PitchBreakItem[] = []) => {
    if (!currentTournamentId) return;
    
    setTournaments(prev => {
      const tournament = prev.find(t => t.id === currentTournamentId);
      if (!tournament) return prev;
      
      const recalculatedComp = recalculateCompetitionSchedule(
        tournament.competitions.find(c => c.id === competitionId)!,
        tournament.pitches,
        pitchBreaks
      );
      
      const updatedTournament = {
        ...tournament,
        competitions: tournament.competitions.map(c => 
          c.id === competitionId ? recalculatedComp : c
        )
      };
      
      const enforced = enforceNoPitchOverlaps(updatedTournament, pitchBreaks);
      return prev.map(t => t.id === currentTournamentId ? enforced : t);
    });
  }, [currentTournamentId]);

  const autoScheduleMatches = useCallback((competitionId: string, pitchBreaks: PitchBreakItem[] = []) => {
    const KNOCKOUT_TIER: Record<string, number> = {
      'Round of 16': 0,
      'Quarter-Final': 1,
      'Semi-Final': 2,
      '3rd Place Playoff': 3,
      'Final': 3,
    };

    if (!currentTournamentId) return;
    
    setTournaments(prev => {
      const tournament = prev.find(t => t.id === currentTournamentId);
      if (!tournament) return prev;
      
      const scheduledCompetitions = tournament.competitions.map((competition) => {
        if (competition.id !== competitionId || competition.fixtures.length === 0) {
          return competition;
        }

        const fallbackPitchId = tournament.pitches[0]?.id;
        const validPitchIds = new Set(tournament.pitches.map((pitch) => pitch.id));
        const pitchStartById = new Map(
          tournament.pitches.map((pitch) => [pitch.id, parseTimeToMinutes(pitch.startTime)])
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
          tournament.pitches.map((pitch) => [pitch.id, parseTimeToMinutes(pitch.startTime)])
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
            : tournament.pitches.map((p) => p.id);

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
      
      const updatedTournament = {
        ...tournament,
        competitions: withMatchIds
      };
      
      const enforced = enforceNoPitchOverlaps(updatedTournament, pitchBreaks);
      return prev.map(t => t.id === currentTournamentId ? enforced : t);
    });
  }, [currentTournamentId]);

  const resetAllSchedules = useCallback(() => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      competitions: t.competitions.map((comp) => ({
        ...comp,
        fixtures: comp.fixtures.map((f) => ({
          ...f,
          pitchId: undefined,
          startTime: undefined,
        })),
      })),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const reorderFixtureToPitch = useCallback((fixtureId: string, targetPitchId: string, targetIndex: number = -1) => {
    if (!currentTournamentId) return;
    
    setTournaments(prev => {
      const tournament = prev.find(t => t.id === currentTournamentId);
      if (!tournament) return prev;
      
      let targetFixture: Fixture | undefined;
      let sourceCompId: string | undefined;

      for (const comp of tournament.competitions) {
        const f = comp.fixtures.find(fx => fx.id === fixtureId);
        if (f) {
          targetFixture = f;
          sourceCompId = comp.id;
          break;
        }
      }

      if (!targetFixture || !sourceCompId) return prev;

      const pitchFixtures = tournament.competitions
        .flatMap(c => c.fixtures)
        .filter(f => f.pitchId === targetPitchId && f.id !== fixtureId)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

      if (targetIndex >= 0 && targetIndex <= pitchFixtures.length) {
        pitchFixtures.splice(targetIndex, 0, targetFixture);
      } else {
        pitchFixtures.push(targetFixture);
      }

      const pitch = tournament.pitches.find(p => p.id === targetPitchId);
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

      const updatedTournament = {
        ...tournament,
        competitions: tournament.competitions.map(comp => {
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
        })
      };
      
      return prev.map(t => t.id === currentTournamentId ? updatedTournament : t);
    });
  }, [currentTournamentId]);

  const batchUpdateFixtures = useCallback((updates: { competitionId: string, fixtureId: string, updates: Partial<Fixture> }[], shouldRecalculate = false, pitchBreaks: PitchBreakItem[] = []) => {
    if (!currentTournamentId) return;
    
    setTournaments(prev => {
      const tournament = prev.find(t => t.id === currentTournamentId);
      if (!tournament) return prev;
      
      const nextCompetitions = tournament.competitions.map(comp => {
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

      let updatedTournament = {
        ...tournament,
        competitions: nextCompetitions
      };

      if (shouldRecalculate) {
         const affectedCompetitionIds = new Set(updates.map(u => u.competitionId));
         const recalculated = updatedTournament.competitions.map(comp => {
            if (affectedCompetitionIds.has(comp.id)) {
               return recalculateCompetitionSchedule(comp, updatedTournament.pitches, pitchBreaks);
            }
            return comp;
         });
         updatedTournament = { ...updatedTournament, competitions: recalculated };
         updatedTournament = enforceNoPitchOverlaps(updatedTournament, pitchBreaks);
      }

      return prev.map(t => t.id === currentTournamentId ? updatedTournament : t);
    });
  }, [currentTournamentId]);

  return (
    <TournamentContext.Provider value={{
      tournaments,
      currentTournament,
      setCurrentTournament,
      addTournament,
      deleteTournament,
      updateTournament,
      competitions,
      addCompetition,
      deleteCompetition,
      updateCompetition,
      clubs,
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
      pitches,
      addPitch,
      updatePitch,
      deletePitch,
      autoScheduleMatches,
      resetAllSchedules,
      reorderFixtureToPitch,
      batchUpdateFixtures,
      recalculateSchedule
    }}>
      {children}
    </TournamentContext.Provider>
  );
};
