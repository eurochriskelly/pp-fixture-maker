export interface Group {
  id: string;
  name: string;
  defaultDuration?: number; // minutes
  defaultSlack?: number; // minutes
  pitchIds?: string[];
  primaryPitchId?: string;
}

export interface Club {
  id: string;
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  primaryColor?: string;
  secondaryColor?: string;
  abbreviation: string; // max 5 chars
  code: string; // 2 chars
  crest?: string; // base64 or URL
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface Team {
  id: string;
  name: string;
  groupId?: string;
  initials?: string;
  primaryColor?: string;
  secondaryColor?: string;
  clubId?: string;
  squadSize?: number;
  secondaryClubIds?: string[];
  clubContributions?: Record<string, number>; // clubId -> count
  overrideLeadClubId?: string;
  crest?: string; // Optional custom crest
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
  matchId?: string; // Optional: Stable ID for knockout matches (e.g. "QF1", "Final")
  slackBefore?: number; // minutes of padding before match (e.g. knockout dependency wait)
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
  clubs: Club[];
}