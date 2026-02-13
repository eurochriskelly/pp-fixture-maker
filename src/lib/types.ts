export interface Team {
  id: string;
  name: string;
}

export interface Fixture {
  id: string;
  competitionId: string;
  homeTeamId: string; // ID or "TBD" or placeholder
  awayTeamId: string; // ID or "TBD" or placeholder
  pitchId?: string;
  startTime?: string; // "HH:mm"
  duration: number; // minutes
  stage: string; // "Group", "Final", etc.
  description?: string; // Optional description like "1st vs 2nd"
}

export interface Competition {
  id: string;
  name: string;
  teams: Team[];
  fixtures: Fixture[];
}

export interface Pitch {
  id: string;
  name: string;
}

export interface TournamentData {
  competitions: Competition[];
  pitches: Pitch[];
}
