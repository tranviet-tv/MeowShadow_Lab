---
trigger: always_on
description: Strictly enforces the use of relative file and directory paths. Disallows absolute paths.
---

# Rule: Relative File Paths Only

## Objective
Ensure all file and directory paths written in code, documentation, configuration files, scripts, and conversation outputs use **relative paths** only. Absolute paths tied to specific machines or local user directories must never be used.

## Policy & Requirements

1. **Mandatory Relative Paths**:
   - Always specify file and folder locations relative to the workspace root (e.g., `apps/web/src/App.tsx`, `packages/shared-types/index.ts`, `./docker-compose.yml`) or relative to the current working file/directory (e.g., `../utils/logger.ts`).
   - When presenting file paths or markdown links to the user or in project documentation, use relative paths.

2. **Strict Prohibition of Absolute Paths**:
   - **NEVER** write or commit absolute paths (e.g., paths starting with `/Users/...`, `/home/...`, `C:\...`, or `/tmp/...`).
   - Do not hardcode local environment paths in scripts, environment templates, or configuration files.

3. **Code Imports and Module Resolution**:
   - Use relative import specifiers (e.g., `./component`, `../services/api`) or configured workspace aliases (e.g., `@/components`, `@repo/shared-types`).
   - Never reference filesystem absolute paths in `import`, `require`, or module loaders.

4. **Exception Handling for System Tools**:
   - If an internal tool specifically requires an absolute path parameter to execute a system command (per tool schema requirements), resolve it internally, but any user-facing text, documentation, created code, or generated configuration must remain strictly relative.

## Examples

- ❌ **Forbidden**:
  - `/Users/tranviet/4.Personal_project/1.MeowShadow_Lab/apps/api/src/index.ts`
  - `cd /Users/tranviet/4.Personal_project/1.MeowShadow_Lab && npm run dev`
  - `path: /Users/tranviet/data/storage`

- ✅ **Required**:
  - `apps/api/src/index.ts` or `./apps/api/src/index.ts`
  - `cd apps/api && npm run dev`
  - `path: ./storage` or `path: storage/`
