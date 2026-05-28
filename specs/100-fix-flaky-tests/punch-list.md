# Audit Punch List

**Date**: 2026-04-28
**Feature**: `100-fix-flaky-tests`

This document is the authoritative enumeration of audit-identified flaky test sites under remediation by this work. It serves the role of "data model" for this feature: the entities being changed are test files, characterised by file, pattern, severity, and chosen remediation.

It satisfies FR-013 (the audit and fix sites must be enumerated as a deliverable visible at review time).

## Schema

Each entry has these fields:

| Field | Description |
| ----- | ----------- |
| ID | Sequential identifier within this list (`PL-NN`). |
| File | Path relative to repo root. |
| Lines | Approximate line range of the flake site. |
| Pattern | One of: `mock-identity`, `random-input`, `wall-clock-perf`, `process-state`, `async-completion`. |
| Severity | `CONFIRMED-FLAKY` (matches pattern; fix needed), `THEORETICAL-LOW-RISK` (pattern present but unlikely to flake), `NOT-FLAKY` (false positive — recorded for traceability, no work). |
| Priority | `P1` (entry-point issues #6012/#6013), `P2` (broader audit), `P3` (regression-prevention support). |
| Tracked Issue | GitHub issue reference if any. |
| Remediation | Mechanism per `research.md`. |
| Surface | `test-only` or `production` (per FR-005, Q1 clarification). |
| Status | `open` / `fixed` / `deferred-with-reason` / `verified-clean`. |

State transitions:
- Actionable entries (Severity = `CONFIRMED-FLAKY` or `THEORETICAL-LOW-RISK`) start `open`.
- After fix + 200x verification (per FR-012), `open` → `fixed`.
- `NOT-FLAKY` entries are recorded directly as `verified-clean` (no `open` phase) — the evidence justifying the verdict is the entry's Remediation field plus inclusion in the PR description.
- `deferred-with-reason` requires a written rationale recorded in this file (currently unused — no entries are deferred).

---

## Entries

### PL-01 — `validation.pipe.spec.ts` mock-identity flake (issue #6012)

| Field | Value |
| ----- | ----- |
| File | `src/common/pipes/validation.pipe.spec.ts` |
| Lines | 6, 13, 100 |
| Pattern | `mock-identity` |
| Severity | CONFIRMED-FLAKY |
| Priority | P1 |
| Tracked Issue | [#6012](https://github.com/alkem-io/server/issues/6012) |
| Remediation | Apply `vi.hoisted()` (Decision 1). Two factories need hoisting: `BaseHandler` (line 6) and `class-transformer.plainToInstance` (line 13). Update assertions at lines 100+ to reference the hoisted handle. |
| Surface | test-only |
| Status | open |

**Verification target**: 200 consecutive runs under `pnpm test:flake-verify src/common/pipes/validation.pipe.spec.ts` — zero failures. Three CI occurrences observed prior to fix (PR #6011 runs 25054522143 and 25060088496; develop run 25048322310).

---

### PL-02 — `large-schema.spec.ts` stochastic mutation (issue #6013)

| Field | Value |
| ----- | ----- |
| File | `test/schema-contract/perf/large-schema.spec.ts` |
| Lines | 40 (mutation), 57-58 (assertions) |
| Pattern | `random-input` + `wall-clock-perf` |
| Severity | CONFIRMED-FLAKY |
| Priority | P1 |
| Tracked Issue | [#6013](https://github.com/alkem-io/server/issues/6013) |
| Remediation | Two changes per Decisions 2 and 3: (a) replace `Math.random() < 0.02` with deterministic counter (`every 50th field5 line`); (b) drop the `< 5000ms` wall-clock assertion (line 58) — Vitest's 90 s `testTimeout` already enforces a hard ceiling, and the test's purpose is volume not speed. |
| Surface | test-only |
| Status | open |

**Verification target**: 200 consecutive runs, zero failures. The `entries.length > 0` assertion stays.

---

### PL-03 — `admin.whiteboard.service.spec.ts` mock-identity risk

| Field | Value |
| ----- | ----- |
| File | `src/platform-admin/domain/whiteboard/admin.whiteboard.service.spec.ts` |
| Lines | 14-19 (factory), 22 (import), 169 (`vi.mocked` assertion) |
| Pattern | `mock-identity` |
| Severity | CONFIRMED-FLAKY |
| Priority | P2 |
| Tracked Issue | — |
| Remediation | Hoist `base64ToBuffer` mock per Decision 1. The async `importOriginal` partial-mock pattern needs the inner `vi.fn()` instances pulled into a `vi.hoisted` block so they're shared with the test-body's `vi.mocked()` references. |
| Surface | test-only |
| Status | open |

---

### PL-04 — `innovation.hub.interceptor.spec.ts` defensive hoist

| Field | Value |
| ----- | ----- |
| File | `src/common/interceptors/innovation.hub.interceptor.spec.ts` |
| Lines | 5-12 (factory), 22 (import), 76, 89, 100 (assertions via `vi.mocked`) |
| Pattern | `mock-identity` |
| Severity | THEORETICAL-LOW-RISK |
| Priority | P2 |
| Tracked Issue | — |
| Remediation | Apply `vi.hoisted` to the `GqlExecutionContext.create` mock per Decision 1. The current `vi.mocked()` indirection masks but does not eliminate the identity risk under coverage. Defensive fix to bring the pattern in line with the rest of the suite. |
| Surface | test-only |
| Status | open |

---

### PL-05 — `async.map.spec.ts` wall-clock concurrency budget

| Field | Value |
| ----- | ----- |
| File | `src/common/utils/async.map.spec.ts` |
| Lines | 25 |
| Pattern | `wall-clock-perf` |
| Severity | CONFIRMED-FLAKY |
| Priority | P2 |
| Tracked Issue | — |
| Remediation | Per Decision 3: replace the `expect(elapsed).toBeLessThan(delay * 2.5)` assertion with a direct concurrency probe — a counter incremented when each promise body enters, and an assertion that all bodies entered before any resolved. Captures the actual property under test (concurrency, not speed) without referencing wall-clock. |
| Surface | test-only |
| Status | open |

---

### PL-06 — `bootstrap-parity.spec.ts` startup SLA budgets

| Field | Value |
| ----- | ----- |
| File | `test/schema/bootstrap-parity.spec.ts` |
| Lines | 126-127 |
| Pattern | `wall-clock-perf` |
| Severity | CONFIRMED-FLAKY |
| Priority | P2 |
| Tracked Issue | — |
| Remediation | Per Decision 3: remove both `expect(...)` budget assertions so they no longer gate the build. Optionally surface the durations via Vitest's `task.meta` attachment (visible in test reporter output) or capture them in local variables without assertion. **Do not** use `console.*` — Biome `noConsole: error` applies to spec files (no override in `biome.json`). Keep the parity assertion (light vs full schema produces the same logical structure) — that is the test's primary purpose. See task T008 for the canonical mechanism. |
| Surface | test-only |
| Status | open |

---

### PL-07 — `breaking-override.spec.ts` env-state isolation

| Field | Value |
| ----- | ----- |
| File | `test/schema-contract/integration/breaking-override.spec.ts` |
| Lines | 24-46 |
| Pattern | `process-state` |
| Severity | THEORETICAL-LOW-RISK |
| Priority | P2 |
| Tracked Issue | — |
| Remediation | Per Decision 4: capture original env-var values at the start of `beforeAll`; in `afterAll`, restore them unconditionally (without try/catch swallowing). Optionally adopt `vi.stubEnv` if it shrinks the diff. |
| Surface | test-only |
| Status | open |

> Note: This file lives under `test/schema-contract/integration/` but uses the `.spec.ts` suffix and is a unit-style file-system test of the contract loader, not a service-integration test. Per Decision 9, in scope.

---

### PL-08 — `generate.name.id.spec.ts` `Math.random` spy lifecycle

| Field | Value |
| ----- | ----- |
| File | `src/services/infrastructure/naming/generate.name.id.spec.ts` |
| Lines | 8-14 |
| Pattern | `process-state` |
| Severity | THEORETICAL-LOW-RISK |
| Priority | P2 |
| Tracked Issue | — |
| Remediation | Per Decision 4: move the `vi.spyOn(Math, 'random')` from `beforeAll`/`afterAll` to `beforeEach`/`afterEach` (or scope it inside a single test using `vi.spyOn` + `mockRestore` in `finally`). Eliminates the leakage class entirely; cost is per-test re-establishment of the spy, which is negligible. |
| Surface | test-only |
| Status | open |

---

### PL-09 — `space.move.rooms.service.spec.ts` (verified clean)

| Field | Value |
| ----- | ----- |
| File | `src/domain/communication/space-move-rooms/space.move.rooms.service.spec.ts` |
| Lines | 104-105, 141-142 |
| Pattern | `async-completion` |
| Severity | NOT-FLAKY |
| Priority | n/a |
| Tracked Issue | — |
| Remediation | None. The `vi.waitFor(() => expect(...).toHaveBeenCalled())` usage is the canonical safe pattern (Decision 5). Recorded for traceability. |
| Surface | n/a |
| Status | verified-clean |

---

### PL-10 — `collaborative-document-integration.controller.spec.ts` (verified clean)

| Field | Value |
| ----- | ----- |
| File | `src/services/collaborative-document-integration/collaborative-document-integration.controller.spec.ts` |
| Lines | 17 |
| Pattern | `mock-identity` (suspected) |
| Severity | NOT-FLAKY |
| Priority | n/a |
| Tracked Issue | — |
| Remediation | None. The mocked `ack` symbol is never imported into the test file or asserted on; the test uses local mocks. No identity-split risk. Recorded for traceability. |
| Surface | n/a |
| Status | verified-clean |

---

## Summary

| Severity | Count |
| -------- | ----- |
| CONFIRMED-FLAKY | 5 (PL-01, PL-02, PL-03, PL-05, PL-06) |
| THEORETICAL-LOW-RISK | 3 (PL-04, PL-07, PL-08) |
| NOT-FLAKY (verified-clean) | 2 (PL-09, PL-10) |
| **Total** | **10** |

Of the 10 entries, 8 require code changes (PL-01 through PL-08); 2 are recorded as verified-clean for traceability. SC-003 (100% remediation rate) is met when all 8 actionable entries reach `fixed` status; the 2 `verified-clean` entries are exempt because no remediation is warranted.

## Pattern coverage

| Pattern | Sites |
| ------- | ----- |
| `mock-identity` | PL-01, PL-03, PL-04 |
| `random-input` | PL-02 |
| `wall-clock-perf` | PL-02 (combined), PL-05, PL-06 |
| `process-state` | PL-07, PL-08 |
| `async-completion` | PL-09 (verified-clean) |

All five patterns from `research.md` have at least one site in the codebase, validating the audit categories and motivating one section per pattern in `docs/testing-flakiness.md`.

## Out-of-scope (excluded by Q3 clarification)

- All `test/functional/integration/**/*.it-spec.ts` files (integration tests).
- All `test/functional/e2e/**/*.e2e-spec.ts` files (e2e tests).

These layers were not audited for this feature. Flakes there are tracked separately.
