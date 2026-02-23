import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Competition, Fixture, Pitch, Team, Group, Club, Location, PitchBreakItem, Tournament } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getGroupPitchIds } from '@/lib/groupPitches';
import { generateMatchIdsForCompetition } from '@/utils/matchIdUtils';
import { migrateBase64ToIndexedDB, isBase64Url } from '@/lib/imageStore';

interface TournamentContextType {
  tournaments: Tournament[];
  currentTournament: Tournament | null;
  setCurrentTournament: (tournament: Tournament | null) => void;
  closeTournament: () => void;
  
  // Tournament Actions
  addTournament: (name: string, description?: string) => Tournament;
  importTournament: (tournament: Tournament) => Tournament;
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
  addPitch: (name: string, startTime?: string, endTime?: string, locationId?: string) => void;
  updatePitch: (id: string, updates: Partial<Pitch>) => void;
  deletePitch: (id: string) => void;

  // Location Actions
  locations: Location[];
  addLocation: (location: Omit<Location, 'id'>) => void;
  updateLocation: (id: string, updates: Partial<Location>) => void;
  deleteLocation: (id: string) => void;

  // Pitch Break Actions
  pitchBreaks: PitchBreakItem[];
  addPitchBreak: (breakItem: Omit<PitchBreakItem, 'id'>) => void;
  updatePitchBreak: (id: string, updates: Partial<PitchBreakItem>) => void;
  deletePitchBreak: (id: string) => void;

  // Scheduling
  autoScheduleMatches: (competitionId: string, pitchBreaks?: PitchBreakItem[]) => void;
  autoAssignUmpires: (competitionId?: string) => void;
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

export const resolveUmpireDisplay = (
  fixture: Fixture,
  teamNameById: Map<string, string>
): string => {
  if (!fixture.umpireTeam) return 'TBD';
  if (fixture.umpireTeam.type === 'by-id') {
    return teamNameById.get(fixture.umpireTeam.value) || 'TBD';
  }
  return fixture.umpireTeam.value;
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
      
      // Migrate pitch breaks from legacy localStorage key if needed
      const legacyBreaksRaw = localStorage.getItem('tournament_pitch_breaks_v1');
      const hasMigratedBreaks = localStorage.getItem('ppp_breaks_migrated_v2');
      let legacyBreaks: PitchBreakItem[] = [];
      
      if (legacyBreaksRaw && !hasMigratedBreaks) {
        try {
          const parsed = JSON.parse(legacyBreaksRaw);
          if (Array.isArray(parsed)) {
            legacyBreaks = parsed;
          }
        } catch {
          // Ignore parse errors
        }
      }
      
      const migratedTournaments = loadedTournaments.map((t, index) => ({
        ...t,
        locations: t.locations || [],
        pitches: (t.pitches || []).map((pitch) => ({
          ...pitch,
          locationId: pitch.locationId,
        })),
        competitions: t.competitions.map((comp, compIndex) => ({
          ...comp,
          color: comp.color || generateCompetitionColor(compIndex)
        })),
        // Migrate breaks to first tournament if they haven't been migrated yet
        pitchBreaks: t.pitchBreaks || (index === 0 ? legacyBreaks : [])
      }));
      
      // Mark migration as complete and remove legacy data
      if (legacyBreaks.length > 0 && !hasMigratedBreaks) {
        localStorage.setItem('ppp_breaks_migrated_v2', 'true');
        localStorage.removeItem('tournament_pitch_breaks_v1');
      }
      
      return migratedTournaments;
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
        clubs: legacyClubs ? JSON.parse(legacyClubs) : [],
        locations: [],
        pitchBreaks: []
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
    // Check if there's a saved current tournament ID
    const saved = localStorage.getItem('tournament_maker_current_id');
    if (saved) return saved;
    
    // If we have tournaments from storage, don't auto-select - let user choose
    const savedTournaments = localStorage.getItem('tournament_maker_tournaments');
    if (savedTournaments) {
      const parsedTournaments: Tournament[] = JSON.parse(savedTournaments);
      if (parsedTournaments.length > 0) {
        // Return null to show hero section - user needs to explicitly open a tournament
        return null;
      }
    }
    
    return null;
  });

  const currentTournament = tournaments.find(t => t.id === currentTournamentId) || null;
  const competitions = currentTournament?.competitions || [];
  const pitches = currentTournament?.pitches || [];
  const clubs = currentTournament?.clubs || [];
  const locations = currentTournament?.locations || [];
  const pitchBreaks = currentTournament?.pitchBreaks || [];

  // Migrate base64 images to IndexedDB on load
  useEffect(() => {
    const migrateImages = async () => {
      let hasChanges = false;
      
      const updatedTournaments = await Promise.all(
        tournaments.map(async (tournament) => {
          const updatedClubs = await Promise.all(
            tournament.clubs.map(async (club) => {
              if (club.crest && isBase64Url(club.crest)) {
                const idbUrl = await migrateBase64ToIndexedDB(club.crest, `club-${club.id}`);
                if (idbUrl !== club.crest) {
                  hasChanges = true;
                  return { ...club, crest: idbUrl };
                }
              }
              return club;
            })
          );

          const updatedCompetitions = await Promise.all(
            tournament.competitions.map(async (competition) => {
              const updatedTeams = await Promise.all(
                competition.teams.map(async (team) => {
                  if (team.crest && isBase64Url(team.crest)) {
                    const idbUrl = await migrateBase64ToIndexedDB(
                      team.crest,
                      `team-${competition.id}-${team.id}`
                    );
                    if (idbUrl !== team.crest) {
                      hasChanges = true;
                      return { ...team, crest: idbUrl };
                    }
                  }
                  return team;
                })
              );
              return { ...competition, teams: updatedTeams };
            })
          );

          return {
            ...tournament,
            clubs: updatedClubs,
            competitions: updatedCompetitions,
          };
        })
      );

      if (hasChanges) {
        setTournaments(updatedTournaments);
      }
    };

    migrateImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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

  const closeTournament = useCallback(() => {
    setCurrentTournamentId(null);
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
      clubs: [],
      locations: [],
      pitchBreaks: []
    };
    setTournaments(prev => [...prev, newTournament]);
    return newTournament;
  }, []);

  const importTournament = useCallback((tournament: Tournament): Tournament => {
    const now = new Date().toISOString();
    const existingIds = new Set(tournaments.map(t => t.id));
    const shouldReplaceId = !tournament.id || existingIds.has(tournament.id);

    const normalizedTournament: Tournament = {
      ...tournament,
      id: shouldReplaceId ? uuidv4() : tournament.id,
      name: tournament.name?.trim() || 'Imported Tournament',
      createdAt: tournament.createdAt || now,
      updatedAt: now,
      competitions: (tournament.competitions || []).map((comp, index) => ({
        ...comp,
        color: comp.color || generateCompetitionColor(index)
      })),
      pitches: (tournament.pitches || []).map((pitch) => ({
        ...pitch,
        locationId: pitch.locationId,
      })),
      clubs: tournament.clubs || [],
      locations: tournament.locations || [],
      pitchBreaks: tournament.pitchBreaks || []
    };

    setTournaments(prev => [...prev, normalizedTournament]);
    return normalizedTournament;
  }, [tournaments]);

  const deleteTournament = useCallback((id: string) => {
    setTournaments(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (currentTournamentId === id) {
        setCurrentTournamentId(null);
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

  // Pitch Break Actions
  const addPitchBreak = useCallback((breakItem: Omit<PitchBreakItem, 'id'>) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      pitchBreaks: [...(t.pitchBreaks || []), { ...breakItem, id: uuidv4() }],
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const updatePitchBreak = useCallback((id: string, updates: Partial<PitchBreakItem>) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      pitchBreaks: (() => {
        const existingBreaks = t.pitchBreaks || [];
        let found = false;
        const updatedBreaks = existingBreaks.map((pb) => {
          if (pb.id !== id) return pb;
          found = true;
          return { ...pb, ...updates };
        });

        if (found) {
          return updatedBreaks;
        }

        if (!updates.pitchId || !updates.startTime) {
          return updatedBreaks;
        }

        return [
          ...updatedBreaks,
          {
            id,
            pitchId: updates.pitchId,
            startTime: updates.startTime,
            duration: updates.duration ?? 20,
            label: updates.label ?? 'Break',
          },
        ];
      })(),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const deletePitchBreak = useCallback((id: string) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      pitchBreaks: (t.pitchBreaks || []).filter(pb => pb.id !== id),
      updatedAt: new Date().toISOString()
    }));
  }, [currentTournamentId, updateCurrentTournament]);

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

  const addLocation = useCallback((location: Omit<Location, 'id'>) => {
    if (!currentTournamentId) return;
    updateCurrentTournament((t) => ({
      ...t,
      locations: [...(t.locations || []), { ...location, id: uuidv4() }],
      updatedAt: new Date().toISOString(),
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const updateLocation = useCallback((id: string, updates: Partial<Location>) => {
    if (!currentTournamentId) return;
    updateCurrentTournament((t) => ({
      ...t,
      locations: (t.locations || []).map((location) =>
        location.id === id ? { ...location, ...updates } : location
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, [currentTournamentId, updateCurrentTournament]);

  const deleteLocation = useCallback((id: string) => {
    if (!currentTournamentId) return;
    updateCurrentTournament((t) => ({
      ...t,
      locations: (t.locations || []).filter((location) => location.id !== id),
      pitches: t.pitches.map((pitch) =>
        pitch.locationId === id
          ? { ...pitch, locationId: undefined }
          : pitch
      ),
      updatedAt: new Date().toISOString(),
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
        const timelineAligned = reflowPitchTimelineWithBreaks(enforced, pitchBreaks);
        return prev.map(t => t.id === currentTournamentId ? timelineAligned : t);
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
        const timelineAligned = reflowPitchTimelineWithBreaks(enforced, pitchBreaks);
        return prev.map(t => t.id === currentTournamentId ? timelineAligned : t);
      }

      return prev.map(t => t.id === currentTournamentId ? nextTournament : t);
    });
  }, [currentTournamentId]);

  const addPitch = useCallback((name: string, startTime?: string, endTime?: string, locationId?: string) => {
    if (!currentTournamentId) return;
    updateCurrentTournament(t => ({
      ...t,
      pitches: [...t.pitches, { id: uuidv4(), name, startTime, endTime, locationId }],
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
        pitchBreaks: (t.pitchBreaks || []).filter(pb => pb.pitchId !== id),
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

  const reflowPitchTimelineWithBreaks = (
    tournament: Tournament,
    pitchBreaks: PitchBreakItem[] = []
  ): Tournament => {
    const effectivePitchBreaks = pitchBreaks.length > 0 ? pitchBreaks : (tournament.pitchBreaks || []);
    type TimelineFixtureRef = {
      kind: 'fixture';
      competitionId: string;
      fixtureId: string;
      pitchId: string;
      requestedStart: number;
      duration: number;
      slack: number;
      slackBefore: number;
      order: number;
    };
    type TimelineBreakRef = {
      kind: 'break';
      breakId: string;
      pitchId: string;
      requestedStart: number;
      duration: number;
      order: number;
    };
    type TimelineRef = TimelineFixtureRef | TimelineBreakRef;

    const pitchStartById = new Map(
      tournament.pitches.map((pitch) => [pitch.id, parseTimeToMinutes(pitch.startTime)])
    );
    const fixturesByPitch = new Map<string, TimelineFixtureRef[]>();
    const breaksByPitch = new Map<string, TimelineBreakRef[]>();
    const fixtureUpdatesByCompetitionId = new Map<string, Map<string, Partial<Fixture>>>();
    const breakUpdatesByBreakId = new Map<string, Partial<PitchBreakItem>>();
    let fixtureOrder = 0;
    let breakOrder = 0;

    tournament.competitions.forEach((competition) => {
      const groupsById = new Map((competition.groups || []).map((group) => [group.id, group]));

      competition.fixtures.forEach((fixture) => {
        if (!fixture.pitchId || !fixture.startTime) return;
        const { duration, slack } = getFixtureTimingConfig(fixture, groupsById);
        const requestedStart = parseTimeToMinutes(fixture.startTime) - (fixture.slackBefore || 0);
        const fixtureRef: TimelineFixtureRef = {
          kind: 'fixture',
          competitionId: competition.id,
          fixtureId: fixture.id,
          pitchId: fixture.pitchId,
          requestedStart,
          duration,
          slack,
          slackBefore: fixture.slackBefore || 0,
          order: fixtureOrder,
        };
        fixtureOrder += 1;

        if (!fixturesByPitch.has(fixture.pitchId)) {
          fixturesByPitch.set(fixture.pitchId, []);
        }
        fixturesByPitch.get(fixture.pitchId)!.push(fixtureRef);
      });
    });

    effectivePitchBreaks.forEach((pitchBreak) => {
      const breakRef: TimelineBreakRef = {
        kind: 'break',
        breakId: pitchBreak.id,
        pitchId: pitchBreak.pitchId,
        requestedStart: parseTimeToMinutes(pitchBreak.startTime),
        duration: Math.max(0, pitchBreak.duration || 0),
        order: breakOrder,
      };
      breakOrder += 1;

      if (!breaksByPitch.has(pitchBreak.pitchId)) {
        breaksByPitch.set(pitchBreak.pitchId, []);
      }
      breaksByPitch.get(pitchBreak.pitchId)!.push(breakRef);
    });

    const allPitchIds = new Set<string>([
      ...Array.from(fixturesByPitch.keys()),
      ...Array.from(breaksByPitch.keys()),
    ]);

    allPitchIds.forEach((pitchId) => {
      const timeline: TimelineRef[] = [
        ...(fixturesByPitch.get(pitchId) || []),
        ...(breaksByPitch.get(pitchId) || []),
      ];
      if (timeline.length === 0) return;

      timeline.sort((a, b) => {
        if (a.requestedStart !== b.requestedStart) return a.requestedStart - b.requestedStart;
        if (a.kind !== b.kind) return a.kind === 'fixture' ? -1 : 1;
        return a.order - b.order;
      });

      let cursor = pitchStartById.get(pitchId) ?? 10 * 60;
      let previousKind: 'fixture' | 'break' | null = null;

      timeline.forEach((item) => {
        if (item.kind === 'fixture') {
          const effectiveSlackBefore = previousKind === 'break' ? 0 : item.slackBefore;
          const startMinutes = cursor + effectiveSlackBefore;
          const updatesForCompetition =
            fixtureUpdatesByCompetitionId.get(item.competitionId) || new Map<string, Partial<Fixture>>();

          updatesForCompetition.set(item.fixtureId, {
            startTime: toTimeString(startMinutes),
            ...(effectiveSlackBefore !== item.slackBefore ? { slackBefore: effectiveSlackBefore } : {}),
          });
          fixtureUpdatesByCompetitionId.set(item.competitionId, updatesForCompetition);
          cursor = startMinutes + item.duration + item.slack;
          previousKind = 'fixture';
          return;
        }

        breakUpdatesByBreakId.set(item.breakId, {
          startTime: toTimeString(cursor),
        });
        cursor += item.duration;
        previousKind = 'break';
      });
    });

    return {
      ...tournament,
      competitions: tournament.competitions.map((competition) => {
        const updates = fixtureUpdatesByCompetitionId.get(competition.id);
        if (!updates || updates.size === 0) return competition;

        return {
          ...competition,
          fixtures: competition.fixtures.map((fixture) => {
            const fixtureUpdates = updates.get(fixture.id);
            return fixtureUpdates ? { ...fixture, ...fixtureUpdates } : fixture;
          }),
        };
      }),
      pitchBreaks: (tournament.pitchBreaks || []).map((pitchBreak) => {
        const breakUpdates = breakUpdatesByBreakId.get(pitchBreak.id);
        return breakUpdates ? { ...pitchBreak, ...breakUpdates } : pitchBreak;
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
      const timelineAligned = reflowPitchTimelineWithBreaks(enforced, pitchBreaks);
      return prev.map(t => t.id === currentTournamentId ? timelineAligned : t);
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
      const timelineAligned = reflowPitchTimelineWithBreaks(enforced, pitchBreaks);
      return prev.map(t => t.id === currentTournamentId ? timelineAligned : t);
    });
  }, [currentTournamentId]);

  const autoAssignUmpires = useCallback((competitionId?: string) => {
    if (!currentTournamentId) return;

    setTournaments(prev => {
      const tournament = prev.find(t => t.id === currentTournamentId);
      if (!tournament) return prev;

      const scopedCompetitionIds = new Set(
        competitionId ? [competitionId] : tournament.competitions.map((comp) => comp.id)
      );

      const nextTournament = {
        ...tournament,
        competitions: tournament.competitions.map((competition) => {
          if (!scopedCompetitionIds.has(competition.id)) return competition;

          const allFixtures = competition.fixtures;
          const fixtureById = new Map(allFixtures.map((fixture) => [fixture.id, fixture]));
          const pitchFixtures = new Map<string, Fixture[]>();

          allFixtures.forEach((fixture) => {
            if (!fixture.pitchId || !fixture.startTime) return;
            if (!pitchFixtures.has(fixture.pitchId)) {
              pitchFixtures.set(fixture.pitchId, []);
            }
            pitchFixtures.get(fixture.pitchId)!.push(fixture);
          });

          pitchFixtures.forEach((fixtures) => {
            fixtures.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
          });

          const umpireAssignments = new Map<string, Fixture['umpireTeam']>();
          const teamIds = competition.teams.map((team) => team.id);
          const scheduledWithTimes = allFixtures.filter((fixture) => fixture.startTime);
          const bufferMinutes = 30;

          pitchFixtures.forEach((fixturesOnPitch) => {
            fixturesOnPitch.forEach((fixture, index) => {
              if (index === 0) {
                const fixtureStart = parseTimeToMinutes(fixture.startTime);
                const candidateTeamId = teamIds.find((teamId) => {
                  if (teamId === fixture.homeTeamId || teamId === fixture.awayTeamId) return false;

                  const hasConflict = scheduledWithTimes.some((candidateFixture) => {
                    if (!candidateFixture.startTime) return false;
                    if (
                      candidateFixture.homeTeamId !== teamId &&
                      candidateFixture.awayTeamId !== teamId
                    ) {
                      return false;
                    }

                    const candidateStart = parseTimeToMinutes(candidateFixture.startTime);
                    return Math.abs(candidateStart - fixtureStart) < bufferMinutes;
                  });

                  return !hasConflict;
                });

                if (candidateTeamId) {
                  umpireAssignments.set(fixture.id, { type: 'by-id', value: candidateTeamId });
                } else {
                  umpireAssignments.set(fixture.id, undefined);
                }
                return;
              }

              const previousFixture = fixtureById.get(fixturesOnPitch[index - 1].id);
              if (previousFixture?.matchId) {
                umpireAssignments.set(fixture.id, {
                  type: 'by-match',
                  value: `Loser ${previousFixture.matchId}`
                });
              } else {
                umpireAssignments.set(fixture.id, undefined);
              }
            });
          });

          return {
            ...competition,
            fixtures: allFixtures.map((fixture) => {
              if (!umpireAssignments.has(fixture.id)) return fixture;
              return {
                ...fixture,
                umpireTeam: umpireAssignments.get(fixture.id)
              };
            }),
          };
        }),
        updatedAt: new Date().toISOString(),
      };

      return prev.map(t => t.id === currentTournamentId ? nextTournament : t);
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
         updatedTournament = reflowPitchTimelineWithBreaks(updatedTournament, pitchBreaks);
      }

      return prev.map(t => t.id === currentTournamentId ? updatedTournament : t);
    });
  }, [currentTournamentId]);

  return (
    <TournamentContext.Provider value={{
      tournaments,
      currentTournament,
      setCurrentTournament,
      closeTournament,
      addTournament,
      importTournament,
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
      locations,
      addLocation,
      updateLocation,
      deleteLocation,
      pitchBreaks,
      addPitchBreak,
      updatePitchBreak,
      deletePitchBreak,
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
      autoAssignUmpires,
      resetAllSchedules,
      reorderFixtureToPitch,
      batchUpdateFixtures,
      recalculateSchedule
    }}>
      {children}
    </TournamentContext.Provider>
  );
};
