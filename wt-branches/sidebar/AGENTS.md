# Repository Guidelines

## Project Structure & Module Organization
This repository is a Vite + React + TypeScript app with Capacitor targets.

- `src/pages/`: route-level screens (`Index.tsx`, `Competition.tsx`, `Schedule.tsx`).
- `src/components/`: feature components; shared shadcn primitives live in `src/components/ui/`.
- `src/context/`: app state providers (for example `TournamentContext.tsx`).
- `src/lib/`, `src/utils/`, `src/hooks/`: types, utilities, and reusable hooks.
- `public/`: static assets served directly.
- `android/` and `ios/`: native Capacitor projects generated from the web build.

Keep routes in `src/App.tsx` and place new user-facing screens in `src/pages/`.

## Build, Test, and Development Commands
Use `pnpm` (lockfile is `pnpm-lock.yaml`).

- `pnpm dev`: start the local Vite dev server.
- `pnpm build`: create a production web build in `dist/`.
- `pnpm build:dev`: build with development mode settings.
- `pnpm preview`: serve the built app locally.
- `pnpm lint`: run ESLint on the full repository.
- `npx cap sync`: copy web build updates into native projects after `pnpm build`.

## Coding Style & Naming Conventions
- Language: TypeScript + React function components.
- Linting: ESLint (`eslint.config.js`) is the source of truth; run `pnpm lint` before opening a PR.
- Indentation: 2 spaces; keep code style consistent with nearby files.
- Naming conventions: components/pages use `PascalCase` (`GroupSettingsPanel.tsx`).
- Hooks, utilities, and functions use `camelCase` (`useTournament`, `minutesFromMidnight`).
- Use path alias imports via `@/` for `src/*`.

Prefer extending components outside `src/components/ui/` instead of modifying generated UI primitives directly.

## Testing Guidelines
There is currently no dedicated frontend test suite. Minimum expectation for contributions:

- `pnpm lint` passes.
- Manual smoke test for key flows (create competition, generate fixtures, schedule matches).
- For native-impacting changes, run platform checks from `android/` (for example `./gradlew test`).

When adding tests later, place them next to source files as `*.test.ts` or `*.test.tsx`.

## Documentation Requirements

### Schema Documentation

All TypeScript types and data structures must be documented in `docs/schema/`:

- **Location**: `docs/schema/*.md`
- **Entry Point**: `docs/schema/README.md`
- **Maintenance Skill**: `docs/skills/pp-maintain-docs/SKILL.md`

**When changing types or storage patterns:**
1. Update the corresponding markdown file(s) in `docs/schema/`
2. Use the `pp-maintain-docs` skill to verify documentation is in sync
3. Ensure field descriptions are accurate and complete

**Files to maintain:**
- `Tournament.md`, `Competition.md`, `Team.md`, `Group.md`, `Fixture.md`
- `Club.md`, `Pitch.md`, `PitchBreakItem.md`
- `local-storage.md` (storage keys and patterns)
- `ppp-archive.md` (export format)

## Commit & Pull Request Guidelines
Follow concise, imperative commit messages, preferably Conventional Commit style as seen in history (`feat: ...`, `chore: ...`).

- Keep commits focused on one change.
- PRs should include: purpose, scope, test evidence, and screenshots/GIFs for UI changes.
- Link related issues/tasks and call out any migration or config impact.
- **Note schema documentation updates** in PR description when types change.
