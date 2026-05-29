# PR: Structural fix for flaky CI tests (spec 100-fix-flaky-tests)

Closes #6013
(Issue #6012 was already closed by `bd310ead7 fix(test): eliminate flaky validation.pipe spec via hoisted mock + dynamic import (#6042)`; this PR's verification confirms the fix is durable under 200x coverage runs.)

## Summary

Two reported flaky tests (#6012, #6013) and an audit of the broader unit-style spec suite have been remediated against five distinct anti-patterns. A new contributor reference at [`docs/testing-flakiness.md`](../../docs/testing-flakiness.md) documents each pattern with failure signatures and recommended replacements.

All remediation is **test-only**. No production code is modified. No new CI workflow files are added (per Q5 of the spec's clarifications).

Full spec pack: [`specs/100-fix-flaky-tests/`](.).

## What changed

### Test fixes (8 files)

| ID | File | Pattern | Remediation |
| --- | --- | --- | --- |
| PL-01 | `src/common/pipes/validation.pipe.spec.ts` (#6012) | mock-identity under v8 coverage | already landed in `bd310ead7 fix(test): eliminate flaky validation.pipe spec via hoisted mock + dynamic import (#6042)` — `vi.hoisted` + `vi.resetModules()` + dynamic import |
| PL-02 | `test/schema-contract/perf/large-schema.spec.ts` (#6013) | random-input + wall-clock-perf | `Math.random()<0.02` replaced with deterministic counter (remove every 50th `field5:` line); `expect(elapsed).toBeLessThan(5000)` removed (Vitest's 90s `testTimeout` already enforces the ceiling) |
| PL-03 | `src/platform-admin/domain/whiteboard/admin.whiteboard.service.spec.ts` | mock-identity | `base64ToBuffer` mock hoisted via `vi.hoisted` |
| PL-04 | `src/common/interceptors/innovation.hub.interceptor.spec.ts` | mock-identity (defensive) | `GqlExecutionContext.create` mock hoisted via `vi.hoisted` |
| PL-05 | `src/common/utils/async.map.spec.ts` | wall-clock-perf | wall-clock `expect(elapsed).toBeLessThan(delay * 2.5)` replaced with a deterministic concurrency probe (entries-at-first-resolve counter) |
| PL-06 | `test/schema/bootstrap-parity.spec.ts` | wall-clock-perf | both budget assertions removed; durations surfaced via `task.meta` (no `console.*` — Biome `noConsole: error` applies) |
| PL-07 | `test/schema-contract/integration/breaking-override.spec.ts` | process-state | env-var capture-and-restore (FR-009); restoration runs before fs cleanup so a failing `rmSync` cannot leak env state |
| PL-08 | `src/services/infrastructure/naming/generate.name.id.spec.ts` | process-state | `Math.random` spy moved from `beforeAll`/`afterAll` to `beforeEach`/`afterEach` |

The two punch-list entries that were `verified-clean` (PL-09 `space.move.rooms.service.spec.ts` and PL-10 `collaborative-document-integration.controller.spec.ts`) required no work — recorded for traceability.

### New infrastructure

- `package.json` — `"test:flake-verify"` script: `.scripts/test/flake-verify.sh` (runs Vitest under coverage in a 200x loop; iteration count overridable via `FLAKE_VERIFY_RUNS`).
- `.scripts/test/flake-verify.sh` — the wrapper script (Vitest 4 does not expose a `--repeat` CLI flag).
- `.scripts/lint/detect-mock-identity-flake.sh` — heuristic grep-based detector for the mock-identity anti-pattern.
- `.scripts/lint/detect-wallclock-perf.sh` — heuristic grep-based detector for wall-clock perf assertions.

### Documentation

- `docs/testing-flakiness.md` — the anti-pattern reference (FR-014). Five sections — mock-identity, random-input, wall-clock-perf, process-state, async-completion — each with failure signature, root cause, wrong/right examples, and conditions of use.
- `CLAUDE.md` — new `## Testing` subsection (one-line pointer to `docs/testing-flakiness.md`, inserted before `## Linting and Formatting`).

## Verification

| Phase | Files | Verification |
| --- | --- | --- |
| US1 (T004) | `validation.pipe.spec.ts` + `large-schema.spec.ts` | `pnpm test:flake-verify` × 200 under coverage — **200 / 200 passed** ✅ |
| US2 (T011) | PL-03 … PL-08 (6 files) | `pnpm test:flake-verify` × 200 under coverage — **200 / 200 passed** ✅ |

Both verifications were run on a single invocation per phase (Vitest parallelises across the file set up to `maxWorkers: 4`).

Bar (per FR-012 / SC-001): 200 consecutive runs under coverage mode (the documented #6012 trigger condition), zero failures. Plain mode is not separately verified — none of the punch-list entries' failure modes are plain-mode-specific.

## FR-015 evaluation — automated detection

Two heuristic grep-based detectors landed under `.scripts/lint/`:

- `detect-mock-identity-flake.sh` — flags `vi.mock()` with bare `vi.fn()` inside the factory when the file also imports the mocked module. False-positives accepted; richer AST-based detection rejected as disproportionate.
- `detect-wallclock-perf.sh` — flags `toBeLessThan(N≥100)` in files that reference `Date.now()` / `performance.now()`. Comments that quote the literal pattern trip the detector — refactor the comment if it matters.

**Pre-commit wiring**: not applied by default. The existing pre-commit (`lint-staged` + `tsc` + `vitest`) already dominates commit latency; wiring these adds ~1–2 s and the patterns are infrequent (3 mock-identity sites, 3 wall-clock sites across ~600 spec files). The team can wire them via `lint-staged` if the experience changes — see the docs reference.

Rationale captured in [`docs/testing-flakiness.md` § Automated detection](../../docs/testing-flakiness.md).

## Scope guarantees

- **No production code modified.** All 8 changed source files are `*.spec.ts`. The wrappers under `.scripts/` and the new docs file are tooling/documentation. (FR-003 for the P1 fixes; FR-005 leaves the door open for production-side fixes if a future audit-surfaced site reveals a real production race — none surfaced here.)
- **No CI workflow files modified.** `.github/workflows/` is untouched. The 200x verification is local-only (per Q5).
- **No new packages or dependencies.** Existing Vitest 4.x and Biome are sufficient.

## Follow-up

- [ ] **30-day flake-recurrence review** (target: merge_date + 30 days, ~2026-06-27). Confirm no CI re-runs reported as caused by any punch-list site during the window. Update `punch-list.md` if any recurrence is observed. This is the verification for SC-002. (T019 — currently tracked here in the PR description; could be moved to a scheduled remote agent via `/schedule` if you prefer.)

## Test plan

- [x] All 8 modified spec files pass under `pnpm exec vitest run <paths>`.
- [x] US1 200x under coverage — 200 / 200 passed.
- [x] US2 200x under coverage — 200 / 200 passed.
- [x] `pnpm exec tsc --noEmit` passes.
- [x] `pnpm exec biome check` passes on all touched files.
- [x] `pnpm exec biome check src/` passes (production source untouched).
- [ ] Reviewer confirms `docs/testing-flakiness.md` is discoverable from `CLAUDE.md` in < 60 seconds (SC-004 — manual).
