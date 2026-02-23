# Local Storage

**Source**: `src/context/TournamentContext.tsx`

This document describes all localStorage keys used by the tournament application and the data storage patterns.

## Storage Keys

| Key | Data Type | Purpose | Location |
|-----|-----------|---------|----------|
| `tournament_maker_tournaments` | `Tournament[]` | Array of all tournaments | `TournamentContext.tsx` |
| `tournament_maker_current_id` | `string` | ID of currently selected tournament | `TournamentContext.tsx` |
| `tournament_pitch_breaks_v1` | `PitchBreakItem[]` | Pitch break schedules | `TournamentContext.tsx` |
| `club_search_api_key` | `string` | API key for club search feature | `ClubSearchContext.tsx` |

## Primary Storage Pattern

### Tournaments Array

All tournaments are stored as a JSON array:

```typescript
// Save
localStorage.setItem(
  'tournament_maker_tournaments', 
  JSON.stringify(tournaments)
);

// Load
const stored = localStorage.getItem('tournament_maker_tournaments');
const tournaments: Tournament[] = stored ? JSON.parse(stored) : [];
```

### Current Tournament ID

The ID of the currently active tournament is stored separately:

```typescript
// Save
localStorage.setItem(
  'tournament_maker_current_id', 
  currentTournamentId
);

// Load
const currentId = localStorage.getItem('tournament_maker_current_id');
```

### Pitch Breaks

Pitch breaks are stored separately from tournaments:

```typescript
// Save
localStorage.setItem(
  'tournament_pitch_breaks_v1', 
  JSON.stringify(pitchBreaks)
);

// Load
const stored = localStorage.getItem('tournament_pitch_breaks_v1');
const pitchBreaks: PitchBreakItem[] = stored ? JSON.parse(stored) : [];
```

## Legacy Migration Keys

These keys were used in earlier versions and are migrated on load:

| Key | Migrated To | Status |
|-----|-------------|--------|
| `tournament_competitions` | `tournament_maker_tournaments` | Deprecated |
| `tournament_pitches` | `tournament_maker_tournaments` | Deprecated |
| `tournament_clubs` | `tournament_maker_tournaments` | Deprecated |

Migration logic handles moving data from old format to new unified Tournament structure.

## Storage Limits

LocalStorage typically has:
- 5-10MB per origin (browser-dependent)
- Synchronous API (blocks main thread)
- String-only storage (requires JSON serialization)

## Data Integrity

The application maintains data integrity by:
1. Always saving the complete tournaments array after any mutation
2. Updating `updatedAt` timestamp on tournament changes
3. Validating data structure on load
4. Gracefully handling corrupted/missing data

## Storage Events

Changes to localStorage trigger events that can sync across tabs:

```typescript
window.addEventListener('storage', (event) => {
  if (event.key === 'tournament_maker_tournaments') {
    // Another tab updated tournaments
    // Reload data
  }
});
```

Currently, the application does not implement cross-tab synchronization.

## Backup and Export

For data backup, use the PPP archive format:
- Export: Creates `.ppp` file containing full tournament
- Import: Restores tournament from `.ppp` file
- See: [ppp-archive.md](./ppp-archive.md)

## Clear Storage

To clear all tournament data:

```javascript
localStorage.removeItem('tournament_maker_tournaments');
localStorage.removeItem('tournament_maker_current_id');
localStorage.removeItem('tournament_pitch_breaks_v1');
```

## Error Handling

Common storage errors:
- **QuotaExceededError**: Storage is full
- **SecurityError**: Private browsing mode or cookies disabled
- **SyntaxError**: Corrupted JSON data

The application handles these gracefully with user notifications.
