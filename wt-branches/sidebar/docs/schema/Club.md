# Club

**Source**: `src/lib/types.ts`
**Related**: [Tournament.md](./Tournament.md), [Team.md](./Team.md)

A club or organization that participates in the tournament.

## Interface

```typescript
interface Club {
  id: string;                    // UUID
  name: string;                  // Club name
  address?: string;              // Physical address
  coordinates?: { lat: number; lng: number };  // GPS coordinates
  primaryColor?: string;         // Club primary color
  secondaryColor?: string;       // Club secondary color
  abbreviation: string;          // Max 5 characters
  code: string;                  // 2 characters (e.g., "MU", "MC")
  crest?: string;                // Base64 or URL to crest
  contactName?: string;          // Contact person
  contactEmail?: string;         // Contact email
  contactPhone?: string;         // Contact phone
}
```

## Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | UUID v4 identifier |
| `name` | `string` | Yes | Full club name |
| `address` | `string` | No | Physical address (may be multi-line) |
| `coordinates` | `{ lat: number; lng: number }` | No | GPS coordinates for map display |
| `primaryColor` | `string` | No | Primary club color (hex, e.g., "#dc2626") |
| `secondaryColor` | `string` | No | Secondary club color (hex, e.g., "#fbbf24") |
| `abbreviation` | `string` | Yes | Short abbreviation, max 5 characters |
| `code` | `string` | Yes | 2-character code for team identification |
| `crest` | `string` | No | Base64 encoded image or URL to club crest/logo |
| `contactName` | `string` | No | Name of primary contact person |
| `contactEmail` | `string` | No | Contact email address |
| `contactPhone` | `string` | No | Contact phone number |

## Code Format

The `code` field is a 2-character identifier used to generate team initials:
- Examples: "MU" (Manchester United), "MC" (Manchester City)
- Must be unique within the tournament
- Used in team names and displays

## Abbreviation Format

The `abbreviation` field is a longer display name:
- Max 5 characters
- Examples: "Man Utd", "Man City", "Liverpool"
- Used when more context than the 2-char code is needed

## Colors

Club colors are inherited by teams unless overridden:
- `primaryColor`: Main club color (typically used for jerseys)
- `secondaryColor`: Accent color (typically used for trim/alternate jerseys)

Teams can override these with their own `primaryColor` and `secondaryColor` fields.

## GPS Coordinates

Used for:
- Map display showing club locations
- Distance calculations
- Travel time estimations

Format:
```typescript
coordinates: {
  lat: 53.4808,   // Latitude
  lng: -2.2426    // Longitude
}
```

## Relationships

- Stored at `Tournament` level (shared across competitions)
- Referenced by `Team` via `clubId` and `secondaryClubIds`
- Multiple teams can reference the same club

## Contact Information

Contact fields support tournament organization:
- Tournament-wide communications
- Emergency contacts
- Results reporting

All contact fields are optional but recommended for better tournament management.
