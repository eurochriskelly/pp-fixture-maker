# PPP Archive Format

**Source**: `src/lib/pppArchive.ts`

The PPP (Ping Pong Palace) archive format is used for exporting and importing tournaments.

## File Format

- **Extension**: `.ppp`
- **Format**: ZIP archive (uncompressed/stored method)
- **Contents**: Single file named `tournament.json`

## Archive Structure

```
archive.ppp (ZIP)
└── tournament.json
```

## Payload Interface

```typescript
interface PppArchivePayload {
  format: 'ppp-tournament-v2';   // Format identifier
  exportedAt: string;             // ISO timestamp of export
  tournament: Tournament;         // Complete tournament object with pitchBreaks
}
```

## Payload Fields

| Field | Type | Description |
|-------|------|-------------|
| `format` | `"ppp-tournament-v2"` | Format version identifier (v2 includes pitch breaks) |
| `exportedAt` | `string` | ISO 8601 timestamp when exported |
| `tournament` | `Tournament` | Complete tournament object with all data including `pitchBreaks` |

## Export Function

```typescript
export function createPppArchive(tournament: Tournament): Blob {
  const payload: PppArchivePayload = {
    format: 'ppp-tournament-v2',
    exportedAt: new Date().toISOString(),
    tournament, // Includes pitchBreaks array
  };
  
  const json = JSON.stringify(payload, null, 2);
  // ... ZIP creation logic
  return new Blob([zipData], { type: 'application/zip' });
}
```

## Import Function

```typescript
export async function parsePppArchive(file: File): Promise<PppArchivePayload> {
  // ... ZIP extraction logic
  const json = await entry.getData(new TextWriter());
  const payload: PppArchivePayload = JSON.parse(json);
  
  // Validation
  if (payload.format !== 'ppp-tournament-v2') {
    throw new Error('Unsupported PPP format version');
  }
  
  return payload;
}
```

## File Naming Convention

Exported files are named using the tournament name:

```typescript
function safeFileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tournament';
}

// Example: "Summer Tournament 2024" -> "summer-tournament-2024.ppp"
```

## Version History

| Version | Status | Notes |
|---------|--------|-------|
| `ppp-tournament-v2` | Current | Includes pitchBreaks array in Tournament |
| `ppp-tournament-v1` | Deprecated | Initial format (breaks stored separately) |

## What's Included

The archive contains the complete `Tournament` object:
- All competitions with teams, groups, and fixtures
- All clubs
- All pitches
- All pitch breaks (lunch, setup, etc.)
- Tournament metadata (dates, location, points, access codes)

## What's NOT Included

The following are NOT included in PPP archives:
- Application settings
- User preferences
- UI state (sidebar open/closed, current tournament selection)

## Import Process

When importing a PPP file:
1. Extract `tournament.json` from ZIP
2. Parse JSON payload
3. Validate format version
4. Generate new UUID for imported tournament (avoid collisions)
5. Update `createdAt` and `updatedAt` timestamps
6. Add to tournaments array in localStorage
7. Optionally set as current tournament

## Security Considerations

- Always validate format version before processing
- Sanitize imported data (though JSON.parse is generally safe)
- Generate new UUIDs to prevent ID collisions
- Consider file size limits to prevent abuse

## Migration Notes

If format changes in the future:
1. Update format identifier (e.g., `ppp-tournament-v2`)
2. Maintain backward compatibility in import function
3. Document migration path for old archives

See: [Tournament.md](./Tournament.md), [local-storage.md](./local-storage.md)
