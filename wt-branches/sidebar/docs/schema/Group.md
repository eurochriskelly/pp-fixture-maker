# Group

**Source**: `src/lib/types.ts`
**Related**: [Competition.md](./Competition.md), [Team.md](./Team.md), [Fixture.md](./Fixture.md)

A group or division within a competition, used for round-robin stage organization.

## Interface

```typescript
interface Group {
  id: string;                    // UUID
  name: string;                  // Group name (e.g., "Group A", "Gp. 1")
  defaultDuration?: number;      // Default match duration in minutes
  defaultSlack?: number;         // Default time between matches in minutes
  defaultRest?: number;          // Default rest time after match in minutes
  pitchIds?: string[];           // Allowed pitches for this group
  primaryPitchId?: string;       // Primary/fallback pitch ID
}
```

## Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | UUID v4 identifier |
| `name` | `string` | Yes | Display name (e.g., "Group A", "Group 1", "North Division") |
| `defaultDuration` | `number` | No | Default match duration in minutes |
| `defaultSlack` | `number` | No | Default buffer time between matches in minutes |
| `defaultRest` | `number` | No | Default rest time for teams after playing in minutes |
| `pitchIds` | `string[]` | No | IDs of pitches where this group's matches can be played |
| `primaryPitchId` | `string` | No | Primary pitch ID, used as fallback if others unavailable |

## Naming Conventions

Groups are typically named:
- "Group A", "Group B", "Group C" for alphabetic grouping
- "Gp. 1", "Gp. 2", "Gp. 3" for numeric grouping
- Custom names like "North", "South", "East", "West" for geographic divisions

## Scheduling Defaults

Default values set at the group level are inherited by fixtures unless overridden:
- `defaultDuration`: How long each match lasts
- `defaultSlack`: Buffer between consecutive matches on same pitch
- `defaultRest`: Minimum rest time for teams between their matches

These defaults can be overridden per-fixture in the `Fixture` object.

## Relationships

- Belongs to a `Competition`
- Teams reference groups via `Team.groupId`
- Fixtures reference groups via `Fixture.groupId`
- References `Pitch` objects via `pitchIds` and `primaryPitchId`

## Group Fixtures

When fixtures are created for a group:
- Each team plays every other team in the group
- Results determine standings for knockout stage qualification
- Fixtures can have descriptions like "1st vs 2nd" for ranking matches
