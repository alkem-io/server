# Quickstart: Verifying Flake Fixes

**Feature**: `086-fix-flaky-tests`

This document tells a contributor how to verify that a fix from the punch list (`punch-list.md`) actually closes its flake. The verification bar is per-file and per-fix: 200 consecutive runs under the same conditions that previously triggered the flake (typically v8 coverage), with zero failures (FR-012, SC-001).

## One-time setup

The feature adds a single `pnpm` script for repeated execution. Confirm it exists:

```bash
grep '"test:flake-verify"' package.json
```

Expected output:

```json
"test:flake-verify": "vitest run --coverage --repeat=200"
```

If the script is missing, the fix PR adds it. Until then, equivalent ad-hoc form:

```bash
pnpm exec vitest run --coverage --repeat=200 <path-to-spec>
```

## Verifying a single fix

```bash
pnpm test:flake-verify src/common/pipes/validation.pipe.spec.ts
```

What this does:
- Runs the file 200 times in sequence.
- Coverage instrumentation is on for every run (the trigger condition for mock-identity flakes).
- Vitest reports per-run pass/fail; the script exits with a non-zero status if any run fails.

Acceptable outcome: `Tests  9 passed (9)` for every iteration; final summary shows `Test Files  200 passed`. Anything else is a regression — investigate before claiming the fix.

Typical wall-clock for a single ~9-test file: ~2–4 minutes for 200 iterations. Do not background the run.

## Verifying multiple fixes in parallel

`pnpm test:flake-verify` accepts a glob for path arguments. To verify a small set:

```bash
pnpm test:flake-verify \
  src/common/pipes/validation.pipe.spec.ts \
  src/platform-admin/domain/whiteboard/admin.whiteboard.service.spec.ts \
  src/common/interceptors/innovation.hub.interceptor.spec.ts
```

Vitest will run each file 200 times. Worker pool (`maxWorkers: 4`) means ~4 files in flight at once. Wall-clock scales near-linearly with file count.

## What to do if a fix flakes during verification

1. Capture the failure: full Vitest output, which iteration number it failed on, and the error text.
2. Compare the error against the original failure signature. If the signature differs, the fix may have replaced one flake class with another — re-research the root cause.
3. Do **not** "retry until green" or relax the iteration count. FR-006 forbids retry-based passing.
4. If the fix is fundamentally insufficient, choose the next option from the FR-005 menu — downgrade the failing assertion to a non-gating informational form (remove the `expect(...)` while preserving surrounding behaviour-coverage), or mark the punch-list entry `deferred-with-reason` with a written rationale. Skip-on-CI and net-new CI workflows are not valid (see FR-006 and FR-011).

## CI verification

Per-fix 200x runs are local-only. CI does not run `--repeat=200` per file because the cost is prohibitive and the local verification is sufficient signal under FR-012. CI runs the standard `pnpm test:ci` once per PR; the success criterion in CI is simply that the affected tests pass under coverage on the standard one-iteration run.

The 30-day post-merge observation window (SC-002) is human-driven, not automated: the team reports any re-runs attributed to punch-list sites via the issue tracker, PR comments, or team channels.

## Quick reference: which files require coverage mode for verification?

| File (PL ID) | Verification command |
| ------------ | -------------------- |
| PL-01 `validation.pipe.spec.ts` | `pnpm test:flake-verify src/common/pipes/validation.pipe.spec.ts` |
| PL-02 `large-schema.spec.ts` | `pnpm test:flake-verify test/schema-contract/perf/large-schema.spec.ts` |
| PL-03 `admin.whiteboard.service.spec.ts` | `pnpm test:flake-verify src/platform-admin/domain/whiteboard/admin.whiteboard.service.spec.ts` |
| PL-04 `innovation.hub.interceptor.spec.ts` | `pnpm test:flake-verify src/common/interceptors/innovation.hub.interceptor.spec.ts` |
| PL-05 `async.map.spec.ts` | `pnpm test:flake-verify src/common/utils/async.map.spec.ts` |
| PL-06 `bootstrap-parity.spec.ts` | `pnpm test:flake-verify test/schema/bootstrap-parity.spec.ts` |
| PL-07 `breaking-override.spec.ts` | `pnpm test:flake-verify test/schema-contract/integration/breaking-override.spec.ts` |
| PL-08 `generate.name.id.spec.ts` | `pnpm test:flake-verify src/services/infrastructure/naming/generate.name.id.spec.ts` |

PL-09 and PL-10 require no verification (verified-clean — no fix landed).

## Anti-pattern reference

After this feature merges, the project's flakiness anti-pattern reference lives at `docs/testing-flakiness.md`, linked from a dedicated `## Testing` subsection in `CLAUDE.md` (added by T013). When reviewing a new test or writing one, consult that file before introducing any of:

- A `vi.mock(<...>, () => ({ fn: vi.fn() }))` factory where the test also imports the mocked symbol.
- `Math.random()` or unseeded `Date.now()` in test inputs.
- `expect(elapsed).toBeLessThan(N)` with `N` in milliseconds against wall-clock measurements.
- Mutations of `process.env` or prototype methods in `beforeAll` without paired capture-and-restore.
- Fire-and-forget async work without `vi.waitFor` or an equivalent completion signal.
