# Competition

**Source**: `src/lib/types.ts`
**Related**: [Tournament.md](./Tournament.md), [Team.md](./Team.md), [Group.md](./Group.md), [Fixture.md](./Fixture.md)

A competition category within a tournament (e.g., "Under 9", "Senior Boys").

## Interface

```typescript
interface Competition {
  id: string;                    // UUID
  name: string;                  // Competition name
  code?: string;                 // 2-character code (e.g., "U9", "SB")
  color?: string;                // Hex color for visual identification
  teams: Team[];                 // Teams in this competition
  groups: Group[];               // Groups within competition
  fixtures: Fixture[];           // All matches/fixtures
}
```

## Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | UUID v4 identifier |
| `name` | `string` | Yes | Display name (e.g., "Under 9", "Senior Boys") |
| `code` | `string` | No | Auto-generated 2-char code from name (e.g., "U9", "SB") |
| `color` | `string` | No | Hex color for UI theming (e.g., "#3b82f6") |
| `teams` | `Team[]` | Yes | All teams in this competition |
| `groups` | `Group[]` | Yes | Group divisions (may be empty for knockout-only) |
| `fixtures` | `Fixture[]` | Yes | All scheduled matches |

## Code Generation

The `code` field is auto-generated from the competition name:
- "Under 9" → "U9"
- "Senior Boys" → "SB"
- "Mixed Juniors" → "MJ"

See: `src/utils/matchIdUtils.ts`

## Relationships

- Belongs to a `Tournament`
- Contains `Team`, `Group`, and `Fixture` objects
- Teams reference groups via `groupId`
- Fixtures reference teams by ID, groups by `groupId`

## Match IDs

Fixtures in a competition use match IDs in the format: `{code}.{number}`
- Example: "U9.01", "U9.02", "SB.01"

This ensures stable, human-readable fixture identifiers across the tournament.
