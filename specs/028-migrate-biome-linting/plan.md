# Implementation Plan: Migrate to Biome for Linting and Formatting

**Branch**: `028-migrate-biome-linting` | **Date**: 2026-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/028-migrate-biome-linting/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replace ESLint + Prettier with Biome for linting and formatting to achieve dramatically faster code quality feedback (target: 5x improvement). This is a tooling-only change that maintains existing code quality standards while enabling near-instantaneous developer feedback loops.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: Biome (replacing ESLint 9.26 + Prettier 3.3)
**Storage**: N/A (tooling change, no storage impact)
**Testing**: Jest (existing test framework unchanged)
**Target Platform**: Linux server, developer workstations (VS Code primary IDE)
**Project Type**: Single NestJS backend server
**Performance Goals**: Full lint <5x current time, incremental <2s, format-on-save <100ms
**Constraints**: Must maintain rule parity where possible, hard cutover (no parallel period)
**Scale/Scope**: ~3000 TypeScript files in src/

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Domain-Centric Design First | ✅ N/A | Tooling change, no domain logic affected |
| 2. Modular NestJS Boundaries | ✅ N/A | No module changes |
| 3. GraphQL Schema as Stable Contract | ✅ N/A | Schema unchanged |
| 4. Explicit Data & Event Flow | ✅ N/A | No data flow changes |
| 5. Observability & Operational Readiness | ✅ Pass | Linting is part of CI observability; no new metrics needed |
| 6. Code Quality with Pragmatic Testing | ✅ Pass | This change enhances code quality tooling; testing approach unchanged |
| 7. API Consistency & Evolution Discipline | ✅ N/A | No API changes |
| 8. Secure-by-Design Integration | ✅ N/A | No security changes |
| 9. Container & Deployment Determinism | ✅ Pass | Dev dependency only, no container changes |
| 10. Simplicity & Incremental Hardening | ✅ Pass | Replacing 2 tools with 1 simpler unified tool |

**Architecture Standards Compliance:**
- Directory layout: No changes
- GraphQL schema: No changes
- Migrations: N/A
- Feature flags: N/A
- Storage: N/A

**Engineering Workflow Compliance:**
- PR impact: Tooling change only, no schema/domain changes
- CI lint step modification required (covered in implementation)

## Project Structure

### Documentation (this feature)

```text
specs/028-migrate-biome-linting/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

Note: `data-model.md` and `contracts/` are not applicable for this tooling migration.

### Files Affected (repository root)

```text
# Configuration files to modify/create
biome.json                    # NEW: Biome configuration
package.json                  # Modify: scripts, devDependencies
.lintstagedrc.json           # Modify: update lint-staged commands

# Configuration files to remove
eslint.config.js             # REMOVE: ESLint configuration
.prettierrc                  # REMOVE: Prettier configuration
.prettierignore              # REMOVE: Prettier ignore patterns (merged into biome.json)

# IDE configuration
.vscode/settings.json        # Modify: update formatter/linter settings (if exists)
.vscode/extensions.json      # Modify: recommend Biome extension (if exists)
```

**Structure Decision**: This is a tooling migration affecting only configuration files at repository root. No source code structure changes.

## Complexity Tracking

> No constitution violations identified. This migration simplifies the tooling stack (2 tools → 1).
