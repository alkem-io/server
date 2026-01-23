# Implementation Plan: Jest to Vitest Migration

**Branch**: `027-vitest-migration` | **Date**: 2026-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/027-vitest-migration/spec.md`

## Summary

Replace Jest with Vitest as the test runner to achieve faster test execution and modern ESM-native testing. The migration will be a single atomic cutover affecting ~112 test files (76 in `src/`, 30 in `test/`, 6 in `contract-tests/`), converting Jest-specific APIs to Vitest equivalents (`jest.fn()` → `vi.fn()`, `jest.spyOn()` → `vi.spyOn()`, etc.) while preserving all existing test behavior and coverage reporting.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, @nestjs/testing, ts-jest 29.2.2 → vitest 3.x
**Storage**: N/A (test infrastructure only)
**Testing**: Jest 29.7.0 → Vitest 3.x
**Target Platform**: Linux server (CI: GitHub Actions)
**Project Type**: Single NestJS backend server
**Performance Goals**: ≥50% faster test execution (soft target; any measurable improvement acceptable)
**Constraints**: Must maintain lcov coverage output at `coverage-ci/lcov.info`
**Scale/Scope**: ~112 test files, ~3k LOC of test code, ~30 mock utilities

### Current Test Setup Analysis

| Category              | Count | Location                                           |
| --------------------- | ----- | -------------------------------------------------- |
| Unit tests            | 76    | `src/**/*.spec.ts`                                 |
| Schema/contract tests | 36    | `test/**/*.spec.ts`, `contract-tests/**/*.spec.ts` |
| Integration/E2E tests | 0     | None found                                         |
| Snapshot tests        | 0     | None in project                                    |

**Key Jest-specific patterns to migrate:**

- `jest.fn()` / `jest.spyOn()` / `jest.mock()` → `vi.fn()` / `vi.spyOn()` / `vi.mock()`
- `ModuleMocker` from `jest-mock` → Vitest equivalent or custom implementation
- Jest config files (`test/config/jest.config*.js`) → `vitest.config.ts`
- `ts-jest` transformer → Vitest's native TypeScript support

**Path aliases to configure in Vitest:**

- `@interfaces/*` → `src/common/interfaces/*`
- `@domain/*` → `src/domain/*`
- `@common/*` → `src/common/*`
- `@constants/*` → `src/common/constants/*`
- `@core/*` → `src/core/*`
- `@platform/*` → `src/platform/*`
- `@config/*` → `src/config/*`
- `@library/*` → `src/library/*`
- `@services/*` → `src/services/*`
- `@templates/*` → `src/platform/configuration/templates/*`
- `@src/*` → `src/*`
- `@test/*` → `test/*`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                 | Status  | Notes                                               |
| ----------------------------------------- | ------- | --------------------------------------------------- |
| 1. Domain-Centric Design First            | ✅ PASS | No domain logic changes; test infrastructure only   |
| 2. Modular NestJS Boundaries              | ✅ PASS | No module boundary changes                          |
| 3. GraphQL Schema as Stable Contract      | ✅ PASS | No schema changes                                   |
| 4. Explicit Data & Event Flow             | ✅ PASS | No data flow changes                                |
| 5. Observability & Operational Readiness  | ✅ PASS | No operational changes                              |
| 6. Code Quality with Pragmatic Testing    | ✅ PASS | Improves test infrastructure per constitution goals |
| 7. API Consistency & Evolution Discipline | ✅ PASS | No API changes                                      |
| 8. Secure-by-Design Integration           | ✅ PASS | No security surface changes                         |
| 9. Container & Deployment Determinism     | ✅ PASS | No container/deployment changes                     |
| 10. Simplicity & Incremental Hardening    | ✅ PASS | Single cutover maintains simplicity                 |

**Gate Result**: ✅ PASS - No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/027-vitest-migration/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Test configuration changes
vitest.config.ts              # NEW: Main Vitest configuration
vitest.workspace.ts           # NEW (if needed): Workspace configuration

# Files to remove
test/config/jest.config.js       # REMOVE: Replace with vitest.config.ts
test/config/jest.config.ci.js    # REMOVE: CI config in vitest.config.ts
test/config/jest.config.ci.nocov.js  # REMOVE: No-coverage config

# Files to modify
package.json                     # UPDATE: Dependencies and scripts
test/utils/default.mocker.factory.ts  # UPDATE: jest-mock → vitest
test/utils/*.ts                  # UPDATE: Jest → Vitest APIs
test/mocks/*.ts                  # UPDATE: Jest → Vitest APIs (if needed)
src/**/*.spec.ts                 # UPDATE: jest.* → vi.* (76 files)
test/**/*.spec.ts                # UPDATE: jest.* → vi.* (30 files)
contract-tests/**/*.spec.ts      # UPDATE: jest.* → vi.* (6 files)
```

**Structure Decision**: No structural changes to test directory layout. Tests remain in-place (`src/**/*.spec.ts`, `test/**/*.spec.ts`, `contract-tests/**/*.spec.ts`).

## Complexity Tracking

> No Constitution Check violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       | N/A        | N/A                                  |

---

## Post-Design Constitution Re-check

_Re-evaluated after Phase 1 design completion._

| Principle                                 | Status  | Post-Design Notes                                        |
| ----------------------------------------- | ------- | -------------------------------------------------------- |
| 1. Domain-Centric Design First            | ✅ PASS | Confirmed: No domain logic touched                       |
| 2. Modular NestJS Boundaries              | ✅ PASS | Confirmed: Test utilities remain in `test/`              |
| 3. GraphQL Schema as Stable Contract      | ✅ PASS | Confirmed: No schema changes                             |
| 4. Explicit Data & Event Flow             | ✅ PASS | Confirmed: No data flow changes                          |
| 5. Observability & Operational Readiness  | ✅ PASS | Confirmed: No logging/metrics changes                    |
| 6. Code Quality with Pragmatic Testing    | ✅ PASS | Improves: Faster feedback loops, modern tooling          |
| 7. API Consistency & Evolution Discipline | ✅ PASS | Confirmed: No API changes                                |
| 8. Secure-by-Design Integration           | ✅ PASS | Confirmed: No security surface changes                   |
| 9. Container & Deployment Determinism     | ✅ PASS | Confirmed: Dev dependencies only                         |
| 10. Simplicity & Incremental Hardening    | ✅ PASS | Design uses standard patterns (SWC, vite-tsconfig-paths) |

**Post-Design Gate Result**: ✅ PASS - No violations. Ready for task generation.

---

## Generated Artifacts

| Artifact      | Status      | Path                                       |
| ------------- | ----------- | ------------------------------------------ |
| research.md   | ✅ Complete | `specs/027-vitest-migration/research.md`   |
| data-model.md | ✅ Complete | `specs/027-vitest-migration/data-model.md` |
| quickstart.md | ✅ Complete | `specs/027-vitest-migration/quickstart.md` |
| contracts/    | ✅ Complete | `specs/027-vitest-migration/contracts/`    |

### Contracts Directory Contents

- `vitest.config.ts.template` - Target Vitest configuration
- `.swcrc.template` - SWC compiler configuration for decorator metadata
- `package.json.diff` - Dependency and script changes
- `default.mocker.factory.ts.template` - Migrated mock factory implementation
