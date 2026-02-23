# Fixture

**Source**: `src/lib/types.ts`
**Related**: [Competition.md](./Competition.md), [Team.md](./Team.md), [Group.md](./Group.md), [Pitch.md](./Pitch.md)

A match or fixture between two teams.

## Interface

```typescript
interface Fixture {
  id: string;                    // UUID
  competitionId: string;         // Parent competition ID
  homeTeamId: string;            // Team ID or "TBD"/placeholder
  awayTeamId: string;            // Team ID or "TBD"/placeholder
  pitchId?: string;              // Assigned pitch ID
  startTime?: string;            // Start time "HH:mm"
  duration?: number;             // Match duration (override)
  slack?: number;                // Post-match slack (override)
  rest?: number;                 // Post-match rest (override)
  stage: string;                 // "Group", "Round of 16", "Quarter-Final", etc.
  description?: string;          // Description like "1st vs 2nd"
  groupId?: string;              // Link to group
  matchId?: string;              // Stable match ID (e.g., "QF1", "U9.01")
  slackBefore?: number;          // Pre-match padding (knockout dependencies)
  umpireTeam?: {                 // Umpire assignment
    type: "by-id" | "by-match";
    value: string;               // Team UUID or "Winner/Loser MatchID"
  };
}
```

## Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | UUID v4 identifier |
| `competitionId` | `string` | Yes | ID of the parent competition |
| `homeTeamId` | `string` | Yes | ID of home team, or "TBD" placeholder |
| `awayTeamId` | `string` | Yes | ID of away team, or "TBD" placeholder |
| `pitchId` | `string` | No | ID of assigned pitch |
| `startTime` | `string` | No | Start time in "HH:mm" format |
| `duration` | `number` | No | Match duration in minutes (overrides group default) |
| `slack` | `number` | No | Post-match buffer in minutes (overrides group default) |
| `rest` | `number` | No | Post-match rest for teams in minutes (overrides group default) |
| `stage` | `string` | Yes | Tournament stage: "Group", "Round of 16", "Quarter-Final", "Semi-Final", "Final", "3rd Place" |
| `description` | `string` | No | Human-readable description (e.g., "1st vs 2nd", "Winner QF1 vs Winner QF2") |
| `groupId` | `string` | No | ID of group this fixture belongs to (if group stage) |
| `matchId` | `string` | No | Stable identifier (e.g., "U9.01", "QF1", "SF2") |
| `slackBefore` | `number` | No | Pre-match padding in minutes (for knockout dependencies) |
| `umpireTeam` | `object` | No | Umpire assignment specification |

## Umpire Assignment

The `umpireTeam` field specifies who should umpire the match:

```typescript
umpireTeam: {
  type: "by-id" | "by-match";
  value: string;
}
```

- **type: "by-id"** - `value` is a Team UUID (specific team must umpire)
- **type: "by-match"** - `value` is a match reference like "Winner U9.05" or "Loser U9.06"

## Stage Values

Common stage values:
- `"Group"` - Round-robin group stage matches
- `"Round of 16"` - Knockout round with 16 teams
- `"Quarter-Final"` - Quarter final matches
- `"Semi-Final"` - Semi final matches  
- `"Final"` - Championship match
- `"3rd Place"` - Third place playoff

## Placeholder Teams

For knockout stages where opponents aren't yet determined:
- `homeTeamId` or `awayTeamId` may be "TBD"
- `description` explains how teams are determined (e.g., "Winner Group A vs Winner Group B")

## Match IDs

Stable match IDs follow patterns:
- Group stage: `{competitionCode}.{number}` (e.g., "U9.01", "U9.02")
- Knockout: `{stageAbbreviation}{number}` (e.g., "QF1", "QF2", "SF1", "F1")

## Scheduling Overrides

Duration, slack, and rest can be overridden per-fixture. If not specified, values are inherited from:
1. Group defaults (if `groupId` is set)
2. Application defaults

## Relationships

- Belongs to a `Competition` via `competitionId`
- References `Team` objects via `homeTeamId` and `awayTeamId`
- May reference a `Group` via `groupId`
- References a `Pitch` via `pitchId`
