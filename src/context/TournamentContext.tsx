import React, { createContext, useContext, useState, useEffect } from 'react';
import { Competition, Fixture, Pitch, Team } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface TournamentContextType {
  competitions: Competition[];
  pitches: Pitch[];
  
  // Competition Actions
  addCompetition: (name: string) => void;
  deleteCompetition: (id: string) => void;
  
  // Team Actions
  addTeam: (competitionId: string, name?: string) => void;
  updateTeam: (competitionId: string, teamId: string, name: string) => void;
  deleteTeam: (competitionId: string, teamId: string) => void;
  
  // Fixture Actions
  generateFixtures: (competitionId: string) => void;
  addManualFixture: (competitionId: string, fixture: Omit<Fixture, 'id' | 'competitionId'>) => void;
  updateFixture: (competitionId: string, fixtureId: string, updates: Partial<Fixture>) => void;
  deleteFixture: (competitionId: string, fixtureId: string) => void;
  
  // Pitch Actions
  addPitch: (name: string) => void;
  deletePitch: (id: string) => void;
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
    const newComp: Competition = {
      id: uuidv4(),
      name,
      teams: [],
      fixtures: []
    };
    setCompetitions([...competitions, newComp]);
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

  const updateTeam = (competitionId: string, teamId: string, name: string) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        return {
          ...comp,
          teams: comp.teams.map(t => t.id === teamId ? { ...t, name } : t)
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

  const generateFixtures = (competitionId: string) => {
    setCompetitions(competitions.map(comp => {
      if (comp.id === competitionId) {
        const teams = [...comp.teams];
        if (teams.length < 2) return comp;

        // If odd number of teams, add a dummy team for "bye"
        const hasGhost = teams.length % 2 !== 0;
        if (hasGhost) {
          teams.push({ id: 'ghost', name: 'Bye' });
        }

        const n = teams.length;
        const rounds = n - 1;
        const matchesPerRound = n / 2;
        const generatedFixtures: Fixture[] = [];

        // Round Robin Algorithm
        // Fix the first team, rotate others clockwise
        // Or simple cyclic algorithm
        
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
                duration: 20, // Default duration
                description: `Round ${round + 1}`
              });
            }
          }
          
          // Rotate teams: Keep index 0 fixed, rotate 1 to n-1
          // [0, 1, 2, 3] -> [0, 3, 1, 2] -> [0, 2, 3, 1]
          const fixed = currentTeams[0];
          const rest = currentTeams.slice(1);
          const last = rest.pop();
          if (last) rest.unshift(last);
          currentTeams = [fixed, ...rest];
        }

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

  const addPitch = (name: string) => {
    setPitches([...pitches, { id: uuidv4(), name }]);
  };

  const deletePitch = (id: string) => {
    setPitches(pitches.filter(p => p.id !== id));
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
      generateFixtures,
      addManualFixture,
      updateFixture,
      deleteFixture,
      addPitch,
      deletePitch
    }}>
      {children}
    </TournamentContext.Provider>
  );
};
