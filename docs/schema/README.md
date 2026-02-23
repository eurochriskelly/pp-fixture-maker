# Tournament Schema Documentation

This directory contains the complete schema documentation for the Ping Pong Palace tournament management application.

## Overview

The tournament system stores all data in the browser's localStorage and exports to `.ppp` archive files. This documentation describes every type, interface, and storage pattern used in the application.

## Schema Files

| File | Description | Primary Type |
|------|-------------|--------------|
| [Tournament.md](./Tournament.md) | Root tournament object with metadata | `Tournament` |
| [Competition.md](./Competition.md) | Competitions within a tournament | `Competition` |
| [Team.md](./Team.md) | Teams participating in competitions | `Team` |
| [Group.md](./Group.md) | Groups/divisions within competitions | `Group` |
| [Fixture.md](./Fixture.md) | Matches/fixtures and scheduling | `Fixture` |
| [Club.md](./Club.md) | Club/organization entities | `Club` |
| [Pitch.md](./Pitch.md) | Playing fields/pitches | `Pitch` |
| [PitchBreakItem.md](./PitchBreakItem.md) | Scheduled breaks for pitches | `PitchBreakItem` |
| [local-storage.md](./local-storage.md) | All localStorage keys and patterns | - |
| [ppp-archive.md](./ppp-archive.md) | Export archive format specification | `PppArchivePayload` |

## Type Hierarchy

```
Tournament (Root)
├── competitions: Competition[]
│   ├── teams: Team[]
│   ├── groups: Group[]
│   └── fixtures: Fixture[]
├── pitches: Pitch[]
└── clubs: Club[]

PitchBreakItem[] (Stored separately in localStorage)
```

## Source Locations

- **Primary Types**: `src/lib/types.ts`
- **Storage Logic**: `src/context/TournamentContext.tsx`
- **Archive Format**: `src/lib/pppArchive.ts`
- **Match ID Generation**: `src/utils/matchIdUtils.ts`

## Maintenance

This documentation is automatically maintained by the `pp-maintain-docs` skill. When types change in the source code, run the skill to update these docs.

See: `docs/skills/pp-maintain-docs/SKILL.md`
