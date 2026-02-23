---
name: pp-maintain-docs
description: |
  Use this skill when the user asks to "update schema docs", "maintain documentation", 
  "check if docs are current", "verify schema documentation", or mentions keeping docs 
  in sync with code.
metadata:
  short-description: Maintain tournament schema documentation
  user-invocable: true
---

# Maintain Tournament Schema Documentation

## Overview

This skill automatically verifies and updates the schema documentation in `docs/schema/` to ensure it matches the current TypeScript types and storage patterns in the codebase.

## Documentation Structure

The documentation is organized as follows:

- `docs/schema/README.md` - Entry point with navigation
- `docs/schema/{TypeName}.md` - Individual type documentation
- `docs/schema/local-storage.md` - Storage patterns and keys
- `docs/schema/ppp-archive.md` - Archive format specification

## Source Locations

| Documentation | Source Files |
|---------------|--------------|
| Type interfaces | `src/lib/types.ts` |
| Storage patterns | `src/context/TournamentContext.tsx` |
| Archive format | `src/lib/pppArchive.ts` |
| Match ID generation | `src/utils/matchIdUtils.ts` |

## Workflow

### Step 1: Identify Documented Types

Read each `.md` file in `docs/schema/` and extract the primary type name from the content. Look for:
- Interface declarations (e.g., `interface Tournament`)
- Type names in headers or descriptions

### Step 2: Verify Each Type

For each documented type:

1. **Find the interface** in `src/lib/types.ts`
2. **Compare fields** - Check if all fields in the markdown match the TypeScript interface
3. **Check for new fields** - Identify any fields in code not documented
4. **Check for removed fields** - Identify any fields documented but not in code
5. **Update the markdown file** with current interface definition

### Step 3: Verify Storage Documentation

Check `docs/schema/local-storage.md`:

1. **Find storage keys** in `src/context/TournamentContext.tsx`
   - Look for `localStorage.setItem` and `localStorage.getItem` calls
   - Look for storage key constants
2. **Compare keys** - Ensure all keys are documented
3. **Update storage.md** with any new or changed keys

### Step 4: Verify Archive Format

Check `docs/schema/ppp-archive.md`:

1. **Find archive types** in `src/lib/pppArchive.ts`
   - Look for `PppArchivePayload` or similar interfaces
   - Check export/import functions
2. **Compare format** - Ensure documented format matches code
3. **Update ppp-archive.md** with any changes

### Step 5: Check for Undocumented Types

Final verification step:

1. **Search for exported interfaces** in `src/lib/types.ts`
2. **Compare against documented types** - Check if any types are missing from docs
3. **Create new markdown files** for any undocumented types

### Step 6: Update README Navigation

Ensure `docs/schema/README.md`:
- Lists all type documentation files
- Has correct links to all files
- Describes the type hierarchy accurately

## Update Rules

When updating documentation:

1. **Preserve structure** - Keep the same sections (Interface, Field Descriptions, Relationships, etc.)
2. **Update TypeScript blocks** - Replace interface definitions with current code
3. **Add new fields** - Document any new fields with descriptions
4. **Remove obsolete fields** - Delete documentation for removed fields
5. **Update relationships** - Ensure relationship descriptions are accurate
6. **Keep source references** - Maintain "Source" and "Related" links

## Output

After running this skill, provide a summary:
- Which files were updated
- What changes were made
- Any undocumented types found
- Any discrepancies that need manual review

## Example

User: "Update the schema docs"

Assistant: 
1. Read all docs in `docs/schema/`
2. Read `src/lib/types.ts`, `src/context/TournamentContext.tsx`, `src/lib/pppArchive.ts`
3. Compare and update each file
4. Report: "Updated Tournament.md (added winPoints field), Competition.md (no changes), Team.md (removed deprecated field), etc."
