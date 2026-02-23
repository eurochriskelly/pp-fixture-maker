# PitchBreakItem

**Source**: `src/lib/types.ts`
**Related**: [Pitch.md](./Pitch.md), [local-storage.md](./local-storage.md)

A scheduled break or closure for a specific pitch. Stored as part of the Tournament object.

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

**Important**: Pitch breaks are stored as part of the `Tournament` object in the `pitchBreaks` array.

```typescript
// Part of Tournament interface
interface Tournament {
  // ... other fields
  pitchBreaks: PitchBreakItem[];
}

// Access via TournamentContext
const { pitchBreaks, addPitchBreak, updatePitchBreak, deletePitchBreak } = useTournament();
```

This design ensures breaks are tournament-specific and are automatically included in exports.

## Scheduling Impact

When scheduling fixtures:
- Pitch breaks block the pitch for the specified duration
- No fixtures can be scheduled during break times
- The scheduler considers breaks when calculating available time slots
- Breaks are shown in the timeline view alongside fixtures

## Relationships

- References `Pitch` via `pitchId`
- Stored inside `Tournament.pitchBreaks` array
- Managed via `TournamentContext` (addPitchBreak, updatePitchBreak, deletePitchBreak)
- Used by scheduling logic in `TournamentContext`

## Export/Import

When exporting a tournament to `.ppp` archive (format `ppp-tournament-v2`):
- Pitch breaks ARE included in the Tournament object via `pitchBreaks` array
- Breaks are automatically preserved during export and import
- Each tournament maintains its own separate set of breaks

## Migration History

**v2 Update (2025)**: Pitch breaks were moved from separate localStorage key (`tournament_pitch_breaks_v1`) into the `Tournament.pitchBreaks` array. This change:
- Makes breaks tournament-specific
- Ensures breaks are included in PPP archive exports
- Improves data integrity and simplifies backup/restore

Legacy breaks are automatically migrated on first load after the update.

See: [Tournament.md](./Tournament.md), [ppp-archive.md](./ppp-archive.md), [local-storage.md](./local-storage.md)
