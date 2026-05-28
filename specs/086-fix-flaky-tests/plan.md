# Implementation Plan: Structural Fix for Flaky CI Tests

**Branch**: `086-fix-flaky-tests` | **Date**: 2026-04-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/086-fix-flaky-tests/spec.md`

## Summary

Two reported flaky tests (#6012, #6013) and a wider audit of the unit-test suite have surfaced five distinct anti-patterns producing intermittent CI failures. This plan turns the audit punch list into a sequenced fix programme: (1) eliminate the two reported flakes via deterministic mock identity (`vi.hoisted`) and deterministic mutation; (2) remediate every CONFIRMED-FLAKY and THEORETICAL-LOW-RISK site identified by the audit using the same patterns; (3) resolve wall-clock performance assertions in-place using the FR-005 menu — operation-budget proxies where available, otherwise downgrade to a non-gating informational form (the `expect(...)` is removed) or removal with rationale; no new CI performance job is added (FR-011); (4) publish a concise anti-pattern reference at `docs/testing-flakiness.md`, linked from `CLAUDE.md`. All remediation is in-tree. Verification is per-file: 200 consecutive runs under coverage mode with zero failures.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta-pinned 22.21.1)
**Primary Dependencies**: Vitest 4.0.17, `@vitest/coverage-v8`, `@golevelup/ts-vitest`, NestJS testing utilities
**Storage**: N/A (test-infrastructure work; no schema, no migrations)
**Testing**: Vitest 4.x with `pool: 'threads'`, `isolate: false`, `clearMocks: true`, v8 coverage provider, 90s default timeout (per `vitest.config.ts`)
**Target Platform**: macOS dev machines, Linux CI runners (self-hosted Hetzner per `ci-tests.yml`)
**Project Type**: single (in-tree TypeScript monorepo; no client/server split for this feature)
**Performance Goals**: N/A — this work removes wall-clock perf assertions from the unit-test gate (FR-011)
**Constraints**:
  - `pool: 'threads'` + `isolate: false` means worker module cache is reused across files. This amplifies the v8-coverage mock-identity flake — the SUT and test file may resolve different module instances even though they share a worker.
  - `clearMocks: true` clears call data between tests but does not reconcile divergent mock identities.
  - No new CI workflow files may be added (per Q5 clarification).
**Scale/Scope**: ~3,000 TypeScript files; 6,394 unit tests across 580 test files (per latest CI run); audit punch list = 10 sites, of which 5 confirmed-flaky and 3 theoretical-low-risk are in scope.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

The constitution principles below are evaluated against this test-infrastructure feature. Most product-shape principles do not apply (no domain code, no schema, no events). The relevant gates:

| Principle | Verdict | Rationale |
| --------- | ------- | --------- |
| 1. Domain-Centric Design First | N/A | No domain code modified by P1/P3 work. P2 may modify production code only when an audit-identified test-side flake reveals an actual production race (per FR-005, Q1 clarification). Such cases will preserve domain-service boundaries. |
| 2. Modular NestJS Boundaries | N/A | No new modules. |
| 3. GraphQL Schema as Stable Contract | N/A | No schema changes. (Note: `large-schema.spec.ts` and `bootstrap-parity.spec.ts` exercise the schema-contract tooling but do not modify the contract itself.) |
| 4. Explicit Data & Event Flow | N/A | No new write paths. |
| 5. Observability & Operational Readiness | N/A | No new module surface. SC-002 explicitly avoids new telemetry (Q2 clarification). |
| 6. Code Quality with Pragmatic Testing | **Aligned** | This work directly serves principle 6: removing brittle, flaky, retry-dependent tests; preserving tests that defend invariants; no placeholder fixes; no skip-on-CI shortcuts (FR-006). |
| 7. API Consistency & Evolution Discipline | N/A | No API changes. |
| 8. Secure-by-Design Integration | N/A | No external integration. |
| 9. Container & Deployment Determinism | N/A | No image or deployment changes. |
| 10. Simplicity & Incremental Hardening | **Aligned** | Each fix uses the simplest viable mechanism: `vi.hoisted` for identity, deterministic counter for stochastic mutation, operation-budget assertions for wall-clock budgets. No caching layer, CQRS, or new infra introduced. New CI performance job explicitly rejected (FR-011). |

**Architecture Standards**: No directory layout changes, no schema regeneration, no migrations. The new docs file at `docs/testing-flakiness.md` follows the existing `docs/` convention.

**Result**: PASS. No deviations require justification.

## Project Structure

### Documentation (this feature)

```text
specs/086-fix-flaky-tests/
├── plan.md              # This file
├── research.md          # Phase 0 — anti-pattern fix mechanisms, justified against vitest config
├── punch-list.md        # Phase 1 — enumerated audit sites, severity, chosen remediation (in place of data-model.md)
├── quickstart.md        # Phase 1 — how to run 200x verification locally and on CI
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 (NOT created by /speckit.plan)
```

There is no `contracts/` directory: this work has no API surface (no GraphQL types, no REST endpoints). There is no `data-model.md`: there is no domain entity. The closest analogue is `punch-list.md`, which enumerates the test sites under remediation.

### Source Code (repository root)

This feature touches existing source paths only — no new modules. Affected files:

```text
# Test files (the punch list — see punch-list.md for full enumeration)
src/common/pipes/validation.pipe.spec.ts                                        # P1: #6012 fix
src/platform-admin/domain/whiteboard/admin.whiteboard.service.spec.ts           # P2: mock identity
src/common/interceptors/innovation.hub.interceptor.spec.ts                      # P2: defensive hoist
src/common/utils/async.map.spec.ts                                              # P2: wall-clock budget
src/services/infrastructure/naming/generate.name.id.spec.ts                     # P2: spy lifecycle
test/schema-contract/perf/large-schema.spec.ts                                  # P1: #6013 fix
test/schema-contract/integration/breaking-override.spec.ts                      # P2: env isolation
test/schema/bootstrap-parity.spec.ts                                            # P2: wall-clock budget

# New / modified documentation
docs/testing-flakiness.md            # New — anti-pattern reference (per FR-014)
CLAUDE.md                            # One-line pointer added in a new ## Testing subsection (per T013)

# No production code changes anticipated for the current punch list. FR-005 leaves the door open
# for production-side fixes if the audit uncovers a real production-side race; none surfaced
# during the pre-spec audit.
```

**Structure Decision**: This is in-tree, single-project remediation. No new directories are created beyond `docs/testing-flakiness.md`. The fix sites map directly onto existing test files; the punch list (`punch-list.md`) is the authoritative checklist. Per FR-004 (post-analyze update), in-scope = any `*.spec.ts` file that is not `*.it-spec.ts` and not `*.e2e-spec.ts`, regardless of directory. This includes:
  - All `*.spec.ts` files under `src/` (the bulk of the unit-test suite).
  - Three `*.spec.ts` files under `test/` that are unit-style: `test/schema-contract/perf/large-schema.spec.ts` (PL-02, P1 entry point), `test/schema/bootstrap-parity.spec.ts` (PL-06), and `test/schema-contract/integration/breaking-override.spec.ts` (PL-07).

Out of scope: integration tests (`test/functional/integration/*.it-spec.ts`) and e2e tests (`test/functional/e2e/*.e2e-spec.ts`), which carry different flake profiles (DB isolation, container readiness) and warrant their own spec.

> Note: The `test/schema-contract/integration/breaking-override.spec.ts` file uses the `.spec.ts` suffix despite living under an `integration/` directory. It is a unit-style file-system test of the contract loader, not a service-integration test. The naming-suffix-based scope rule correctly classifies it as in-scope.

## Complexity Tracking

> No constitution violations require justification.

The earlier draft of FR-004 used the phrase "`*.spec.ts` under `src/`," which was at odds with the P1 entry point (`test/schema-contract/perf/large-schema.spec.ts`, #6013). `/speckit.analyze` flagged this as F1; FR-004 has since been rewritten to the suffix-based rule ("any `*.spec.ts` that is not `*.it-spec.ts` and not `*.e2e-spec.ts`, regardless of directory"). The plan now matches the spec; no scope deviation remains.
