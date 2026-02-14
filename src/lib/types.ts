export interface Group {
  id: string;
  name: string;
  defaultDuration?: number; // minutes
  defaultSlack?: number; // minutes
  primaryPitchId?: string;
}

export interface Team {
  id: string;
  name: string;
  groupId?: string;
  initials?: string;
  primaryColor?: string;
  secondaryColor?: string;
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
  groupId?: string; // Optional: Link fixture to a group
}

export interface Competition {
  id: string;
  name: string;
  code?: string;
  color?: string; // Hex color for visual identification
  teams: Team[];
  groups: Group[];
  fixtures: Fixture[];
}

export interface Pitch {
  id: string;
  name: string;
  startTime?: string; // "HH:mm"
  endTime?: string; // "HH:mm"
}

export interface TournamentData {
  competitions: Competition[];
  pitches: Pitch[];
}
