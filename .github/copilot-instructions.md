# Copilot Instructions for pp-fixture-maker

## Overview

This is a tournament fixture maker app that helps users create sports competitions, manage teams/groups, generate match fixtures, and schedule them across multiple pitches. Built as a React web app with Capacitor for iOS/Android targets.

## Build, Test, and Development Commands

Use `pnpm` (lockfile is `pnpm-lock.yaml`).

- `pnpm dev`: start local Vite dev server at http://[::]:8080
- `pnpm build`: create production web build in `dist/`
- `pnpm build:dev`: build with development mode settings
- `pnpm preview`: serve the built app locally
- `pnpm lint`: run ESLint on the full repository
- `npx cap sync`: copy web build updates into native projects after `pnpm build`

**Native platform testing:**
- Android: `cd android && ./gradlew test`

**No dedicated test suite exists yet.** Minimum validation:
- `pnpm lint` passes
- Manual smoke test key flows: create competition, add teams, generate fixtures, schedule matches

## Architecture

### Core Data Model

The app revolves around a centralized `TournamentContext` that manages all state via localStorage persistence:

- **Competitions**: Top-level containers with teams, groups, and fixtures
- **Teams**: Participants that can be assigned to groups or remain ungrouped
- **Groups**: Logical divisions of teams (e.g., "Group A", "U18 Division") with optional scheduling defaults (duration, slack time, primary pitch)
- **Fixtures**: Individual matches with home/away teams, assigned pitch, start time, duration, and stage (e.g., "Group", "Final")
- **Pitches**: Physical playing locations with optional time availability windows

State flows one-way: `TournamentContext` → Pages → Components. All mutations go through context actions (`addTeam`, `generateFixtures`, `autoScheduleMatches`, etc.).

### Routing & Navigation

Routes are defined in `src/App.tsx`:
- `/` (Index.tsx): Competition list and creation
- `/competition/:id` (Competition.tsx): Team/group management, fixture generation
- `/schedule` (Schedule.tsx): Global scheduling view across all pitches

**Always add new routes to `src/App.tsx`**. Place new user-facing screens in `src/pages/`.

### Key Algorithms

**Fixture Generation** (`src/lib/utils.ts` `generateRoundRobin`):
- Uses balanced round-robin algorithm for groups
- Handles odd-numbered teams with byes
- Generates cross-group fixtures based on rank ("1st vs 2nd", etc.)

**Auto-scheduling** (`src/context/TournamentContext.tsx` `autoScheduleMatches`):
- Assigns fixtures to pitches based on group's `primaryPitchId` (if set) or round-robin across available pitches
- Uses group-level `defaultDuration` and `defaultSlack` for timing
- Sequentially places matches with slack time between them
- Respects pitch availability windows (`startTime`/`endTime`)

## Project Conventions

### State Management

**Do not create local state for tournament data.** Always use `useTournament()` hook:

```tsx
const { competitions, addTeam, updateFixture, autoScheduleMatches } = useTournament();
```

The context auto-persists to localStorage. Avoid redundant storage layers or prop drilling.

### Component Organization

- `src/components/ui/`: shadcn/ui primitives (Accordion, Button, Dialog, etc.) — **do not modify these files**
- `src/components/`: feature components (GroupList, TeamEditDialog, GroupSettingsPanel)
- Extend shadcn components by wrapping them in new feature components, not by editing UI primitives

### Styling

Use Tailwind CSS exclusively. Path alias `@/` maps to `src/`.

**Common patterns:**
- Container max-width: `max-w-5xl`, `max-w-7xl`
- Card-based layouts: `<Card><CardHeader><CardTitle>...</CardTitle></CardHeader><CardContent>...</CardContent></Card>`
- Responsive grids: `grid gap-6 md:grid-cols-2 lg:grid-cols-3`
- Icons from lucide-react: `import { Plus, Trash2, Calendar } from 'lucide-react'`

### Naming Conventions

- **Components/Pages**: `PascalCase` (e.g., `GroupSettingsPanel.tsx`, `Competition.tsx`)
- **Hooks/Utilities/Functions**: `camelCase` (e.g., `useTournament`, `generateRoundRobin`, `minutesFromMidnight`)
- **Types/Interfaces**: `PascalCase` (e.g., `Competition`, `Fixture`, `Team`)

### TypeScript & Linting

- **Strict mode enabled** in `tsconfig.json`
- ESLint rule: `@typescript-eslint/no-unused-vars` is disabled (see `eslint.config.js`)
- Run `pnpm lint` before committing
- Use explicit types for context actions and component props

### Time Handling

Times are stored as **"HH:mm" strings** (e.g., "09:00", "14:30"). Use utility functions from `src/utils/` to convert:
- `minutesFromMidnight(time: string): number`
- `timeFromMinutes(minutes: number): string`

This avoids date-based timezone issues for same-day scheduling.

### Team Placeholders

Fixtures can reference `"TBD"` as a team ID when opponents aren't yet determined (e.g., knockout stage with pending results). Always handle `"TBD"` gracefully in team lookups.

## Capacitor Integration

After making changes to web code:
1. `pnpm build` (or `pnpm build:dev` for development builds)
2. `npx cap sync` to copy built web assets into `android/` and `ios/`
3. Open native projects in Android Studio/Xcode to build/test native apps

**Do not manually edit files in `android/` or `ios/` unless working on native platform code.**

## Common Workflows

### Adding a New Competition Feature

1. Define types in `src/lib/types.ts` (e.g., new field on `Competition` or `Fixture`)
2. Add context action in `src/context/TournamentContext.tsx` (e.g., `updateCompetitionFormat`)
3. Update relevant page in `src/pages/` (e.g., `Competition.tsx`)
4. Create or extend components in `src/components/` for UI (e.g., `FormatSettingsDialog.tsx`)
5. Ensure localStorage schema handles migration (context initializes with defaults)

### Modifying Scheduling Logic

Core scheduling lives in `TournamentContext.tsx` → `autoScheduleMatches` function. Key considerations:
- Group-level defaults (`defaultDuration`, `defaultSlack`, `primaryPitchId`) take precedence
- Fixtures without `groupId` use global defaults or manual assignment
- Always validate pitch availability windows before assignment

### Adding a shadcn Component

1. Install via `npx shadcn@latest add <component-name>` (updates `src/components/ui/`)
2. Import and use in feature components
3. Do not manually edit generated UI component files
