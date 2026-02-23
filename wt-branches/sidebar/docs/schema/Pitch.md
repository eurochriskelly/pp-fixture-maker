# Pitch

**Source**: `src/lib/types.ts`
**Related**: [Tournament.md](./Tournament.md), [Fixture.md](./Fixture.md), [Group.md](./Group.md), [PitchBreakItem.md](./PitchBreakItem.md)

A playing field or pitch where matches are held.

## Interface

```typescript
interface Pitch {
  id: string;                    // UUID
  name: string;                  // Pitch name
  startTime?: string;            // Opening time "HH:mm"
  endTime?: string;              // Closing time "HH:mm"
}
```

## Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | UUID v4 identifier |
| `name` | `string` | Yes | Display name (e.g., "Pitch 1", "Main Field", "North Court") |
| `startTime` | `string` | No | Daily opening time in "HH:mm" format |
| `endTime` | `string` | No | Daily closing time in "HH:mm" format |

## Time Format

Times use 24-hour format:
- `"09:00"` - 9:00 AM
- `"17:30"` - 5:30 PM
- `"12:00"` - Noon

These times define the operational hours of the pitch for scheduling purposes.

## Usage

Pitches are used by:
- **Fixtures**: Assigned via `Fixture.pitchId`
- **Groups**: Restricted to certain pitches via `Group.pitchIds`
- **Scheduling**: Timeline view shows all pitches side-by-side
- **Breaks**: `PitchBreakItem` references pitches for scheduled breaks

## Naming Conventions

Common pitch naming patterns:
- "Pitch 1", "Pitch 2", "Pitch 3" - Simple numbering
- "Main Field", "Secondary Field" - By importance
- "North Court", "South Court" - By location
- "Grass A", "Grass B", "Astro" - By surface type

## Scheduling Constraints

When scheduling fixtures:
- Pitch must be available (not in use by another fixture)
- Match time must be within pitch operating hours (`startTime` to `endTime`)
- Pitch breaks (see `PitchBreakItem`) must be respected
- Group restrictions (`Group.pitchIds`) may limit which pitches can be used

## Relationships

- Stored at `Tournament` level (shared across competitions)
- Referenced by `Fixture` via `pitchId`
- Referenced by `Group` via `pitchIds` and `primaryPitchId`
- Referenced by `PitchBreakItem` via `pitchId`

## Related Types

- `PitchBreakItem` - Scheduled breaks for pitches
- `Group.pitchIds` - Pitch restrictions for groups
