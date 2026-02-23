# Tournament

**Source**: `src/lib/types.ts`
**Related**: [Competition.md](./Competition.md), [Club.md](./Club.md), [Pitch.md](./Pitch.md)

The root entity containing all tournament data.

## Interface

```typescript
interface Tournament {
  id: string;                    // UUID
  name: string;                  // Tournament name
  description?: string;          // Optional description
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  competitions: Competition[];   // Array of competitions
  pitches: Pitch[];              // Array of available pitches
  clubs: Club[];                 // Array of clubs
  
  // Overview/metadata fields
  region?: string;               // Geographic region
  startDate?: string;            // Tournament start date
  endDate?: string;              // Tournament end date
  location?: string;             // Physical location
  latitude?: string;             // GPS coordinates
  longitude?: string;            // GPS coordinates
  winPoints?: number;            // Points for win
  drawPoints?: number;           // Points for draw
  losePoints?: number;           // Points for loss
  organizerCode?: string;        // Access code for organizer
  coordinatorCode?: string;      // Access code for coordinator
  refereeCode?: string;          // Access code for referee
}
```

## Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | UUID v4 identifier |
| `name` | `string` | Yes | Display name of the tournament |
| `description` | `string` | No | Long-form description |
| `createdAt` | `string` | Yes | ISO 8601 timestamp of creation |
| `updatedAt` | `string` | Yes | ISO 8601 timestamp of last update |
| `competitions` | `Competition[]` | Yes | All competitions in this tournament |
| `pitches` | `Pitch[]` | Yes | All available playing fields |
| `clubs` | `Club[]` | Yes | All participating clubs |
| `region` | `string` | No | Geographic region (e.g., "North", "South") |
| `startDate` | `string` | No | Tournament start date (ISO date) |
| `endDate` | `string` | No | Tournament end date (ISO date) |
| `location` | `string` | No | Physical venue address |
| `latitude` | `string` | No | GPS latitude coordinate |
| `longitude` | `string` | No | GPS longitude coordinate |
| `winPoints` | `number` | No | Points awarded for a win (default: 3) |
| `drawPoints` | `number` | No | Points awarded for a draw (default: 1) |
| `losePoints` | `number` | No | Points awarded for a loss (default: 0) |
| `organizerCode` | `string` | No | Access code for organizer role |
| `coordinatorCode` | `string` | No | Access code for coordinator role |
| `refereeCode` | `string` | No | Access code for referee role |

## Relationships

- Contains multiple `Competition` objects
- References `Club` and `Pitch` entities at tournament level
- All child arrays are serialized together in the Tournament object

## Storage

Tournaments are stored as an array in localStorage under the key `tournament_maker_tournaments`.

See: [local-storage.md](./local-storage.md)

## Related Types

- `TournamentData` - Legacy export helper type (clubs, competitions, pitches only)
