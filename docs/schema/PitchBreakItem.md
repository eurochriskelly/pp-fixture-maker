# PitchBreakItem

**Source**: `src/lib/types.ts`
**Related**: [Pitch.md](./Pitch.md), [local-storage.md](./local-storage.md)

A scheduled break or closure for a specific pitch. These are stored separately from the Tournament object.

## Interface

```typescript
interface PitchBreakItem {
  id: string;                    // UUID
  pitchId: string;               // Which pitch
  startTime: string;             // Break start "HH:mm"
  duration: number;              // Break duration in minutes
  label: string;                 // Label (e.g., "Lunch", "Ceremony")
}
```

## Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | UUID v4 identifier |
| `pitchId` | `string` | Yes | ID of the pitch this break applies to |
| `startTime` | `string` | Yes | Start time in "HH:mm" format |
| `duration` | `number` | Yes | Duration in minutes |
| `label` | `string` | Yes | Human-readable label describing the break |

## Common Labels

Typical break labels:
- "Lunch" - Lunch break
- "Opening Ceremony" - Tournament opening
- "Closing Ceremony" - Tournament closing
- "Pitch Maintenance" - Field maintenance
- "Break" - General break period

## Time Format

- `startTime`: "HH:mm" in 24-hour format (e.g., "12:00", "15:30")
- `duration`: Number of minutes (e.g., 30, 60, 120)

## Storage

**Important**: Pitch breaks are stored separately from the Tournament object in localStorage.

```typescript
// Storage key
localStorage.setItem('tournament_pitch_breaks_v1', JSON.stringify(pitchBreaks));

// Retrieval
const pitchBreaks: PitchBreakItem[] = JSON.parse(
  localStorage.getItem('tournament_pitch_breaks_v1') || '[]'
);
```

This design keeps pitch scheduling data separate from tournament structure data, allowing independent updates.

## Scheduling Impact

When scheduling fixtures:
- Pitch breaks block the pitch for the specified duration
- No fixtures can be scheduled during break times
- The scheduler considers breaks when calculating available time slots
- Breaks are shown in the timeline view alongside fixtures

## Relationships

- References `Pitch` via `pitchId`
- Stored separately from `Tournament` in localStorage
- Used by scheduling logic in `TournamentContext`

## Export/Import

When exporting a tournament to `.ppp` archive:
- Pitch breaks are NOT included in the Tournament object
- They must be handled separately if needed
- Consider future enhancement to include breaks in archive

See: [local-storage.md](./local-storage.md), [ppp-archive.md](./ppp-archive.md)
