# Team

**Source**: `src/lib/types.ts`
**Related**: [Competition.md](./Competition.md), [Club.md](./Club.md)

A team participating in a competition.

## Interface

```typescript
interface Team {
  id: string;                    // UUID
  name: string;                  // Team name
  groupId?: string;              // Reference to Group ID
  initials?: string;             // Short initials (usually from club code)
  primaryColor?: string;         // Team primary color
  secondaryColor?: string;       // Team secondary color
  clubId?: string;               // Reference to Club ID
  squadSize?: number;            // Number of players
  secondaryClubIds?: string[];   // Additional club affiliations
  clubContributions?: Record<string, number>;  // clubId -> player count
  overrideLeadClubId?: string;   // Override for lead club
  crest?: string;                // Base64 or URL to crest image
}
```

## Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | UUID v4 identifier |
| `name` | `string` | Yes | Display name of the team |
| `groupId` | `string` | No | ID of the group this team belongs to |
| `initials` | `string` | No | Short initials (typically derived from club code) |
| `primaryColor` | `string` | No | Primary team color (hex) |
| `secondaryColor` | `string` | No | Secondary team color (hex) |
| `clubId` | `string` | No | ID of the primary/lead club |
| `squadSize` | `number` | No | Number of players in the squad |
| `secondaryClubIds` | `string[]` | No | IDs of additional contributing clubs |
| `clubContributions` | `Record<string, number>` | No | Map of clubId to player count contributed |
| `overrideLeadClubId` | `string` | No | Manual override for which club is considered lead |
| `crest` | `string` | No | Base64 encoded image or URL to team crest |

## Multi-Club Teams

Teams can be formed from multiple clubs:
- `clubId`: Primary club (for display and organization)
- `secondaryClubIds`: Additional clubs contributing players
- `clubContributions`: Detailed breakdown of player counts per club
- `overrideLeadClubId`: Override which club is treated as primary

This supports tournaments where teams are composed of players from multiple clubs.

## Relationships

- Belongs to a `Competition`
- May belong to a `Group` via `groupId`
- References `Club` via `clubId` and `secondaryClubIds`
- Referenced by `Fixture` via `homeTeamId` and `awayTeamId`
