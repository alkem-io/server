# Phase 0 Research: Anti-Pattern Fix Mechanisms

**Date**: 2026-04-28
**Feature**: `100-fix-flaky-tests`

This document records the technical decisions for *how* each anti-pattern is remediated, justified against the specific Vitest configuration in use (`pool: 'threads'`, `isolate: false`, `clearMocks: true`, v8 coverage). The spec deliberately abstains from prescribing fix mechanisms — those are research-and-design decisions captured here.

There were no `NEEDS CLARIFICATION` markers in `Technical Context`; all dependencies and tools are already in the project. Every decision below addresses a chosen remediation pattern, not an unknown.

---

## Decision 1: Mock identity preservation under v8 coverage

**Pattern addressed**: A test mocks an external module via `vi.mock('mod', () => ({ fn: vi.fn() }))` and the test file *also* imports `fn` from the mocked module to assert on it (`expect(fn).toHaveBeenCalled()` or `vi.mocked(fn).mockReturnValue(...)`). Under v8 coverage with `isolate: false`, the SUT and the test can resolve different module instances; the factory creates a fresh `vi.fn()` per evaluation, so the spec's reference to `fn` is a different mock from the one the SUT actually calls.

**Decision**: Adopt `vi.hoisted()` for any test that mocks-and-asserts on a module symbol. The hoisted handle is created once and shared by both the factory and the test body.

```ts
const mocks = vi.hoisted(() => ({
  plainToInstance: vi.fn().mockImplementation((_cls, value) => value),
}));

vi.mock('class-transformer', () => ({
  plainToInstance: mocks.plainToInstance,
}));

// In tests:
expect(mocks.plainToInstance).toHaveBeenCalledWith(MyDto, value);
```

**Rationale**:
- `vi.hoisted` runs before any module factory is evaluated and stores the mock identity in test-file scope. The factory closes over the hoisted handle rather than creating a new `vi.fn()`. Both the SUT (via the mock factory) and the test body (via `mocks.plainToInstance`) reference the same `vi.fn()` instance regardless of how many times the factory is evaluated under coverage instrumentation.
- It is the officially-documented Vitest pattern for this exact failure mode and is already used elsewhere in the repo (`src/apm/apm.spec.ts:3-6`, `src/apm/plugins/apm.apollo.plugin.spec.ts:3`), so no new convention is being introduced.
- Compatible with `clearMocks: true`: clearing the call data between tests doesn't change identity.
- Compatible with `isolate: false`: hoisted handles live in test-file scope, not worker scope, so workers reusing module cache do not cross-contaminate.

**Alternatives considered**:
- **Behavioural assertion (don't assert on the mock)**: Spy on the SUT's *output* rather than its *call to the dependency*. Side-steps mock identity entirely. Rejected as the default because the existing tests' value comes precisely from asserting the dependency was called with the right arguments — switching to output-only assertions weakens coverage. Reserved as a fallback for cases where `vi.hoisted` would force a large rewrite.
- **`isolate: true`**: Forces fresh module instances per test file, which would also fix the identity issue. Rejected: it doubles or triples test runtime and is a global config change with broad blast radius for one specific class of bug. The vitest config explicitly chose `isolate: false` for memory efficiency and clean process exit (per inline comment at `vitest.config.ts:35-37`).
- **Drop v8 coverage in CI**: Trades one signal for another — coverage is more valuable than an in-place fix. Rejected.
- **`vi.doMock` with manual mock object**: More verbose than `vi.hoisted` and less idiomatic in this repo. Rejected.

---

## Decision 2: Determinism for stochastic test inputs

**Pattern addressed**: Tests use unseeded `Math.random()` (or similar) to drive the *content* of test input. With low-probability draws, a small-but-nonzero share of runs produces a degenerate test scenario whose assertion fails. Concrete case: `large-schema.spec.ts` uses `Math.random() < 0.02` per line across 260 candidates; ~0.5% of runs produce zero mutations, which fails `toBeGreaterThan(0)`.

**Decision**: Replace `Math.random()` with a deterministic counter (every-Nth removal) for cases where the test only needs *some* nonzero mutation volume. Where the test needs a specific distribution, replace with a fixed schedule that produces the intended distribution exactly.

```ts
// Before
if (line.startsWith('field5:') && Math.random() < 0.02) return false;

// After — deterministic, removes ~5 out of 260
let field5Idx = 0;
const REMOVE_EVERY_N = 50;
// ...
if (line.startsWith('field5:') && (field5Idx++ % REMOVE_EVERY_N) === 0) return false;
```

**Rationale**:
- The test asserts on *volume*, not on randomness. Determinism preserves the invariant being tested while eliminating the failure mode.
- Choosing N to produce the same expected magnitude (~5 removals) keeps the perf characteristic the test was probing.
- Counter-based mutation is intelligible at review time; a seedable PRNG would be more general but adds complexity for no test-quality gain.

**Alternatives considered**:
- **Seedable PRNG (e.g., `mulberry32`)**: Reproducible draws across runs. Rejected: heavier than the problem warrants for the one site found, and the deterministic counter is more obvious to readers.
- **Increase probability to ~1**: Removes the bug but loses the original test intent (some preservation of the original line shape). Rejected.
- **Try/loop until non-zero result**: Loops until the mutation produces something non-empty. Rejected: hides the failure mode behind a retry, which FR-006 explicitly forbids.

**Generalisation**: For any test with `Math.random()` or unseeded `Date.now()` driving an assertion, the rule is: replace the non-determinism with a deterministic input that produces the same domain shape.

---

## Decision 3: Wall-clock performance assertions in unit tests

**Pattern addressed**: Tests assert on absolute elapsed time (`expect(elapsed).toBeLessThan(5000)`, `expect(elapsed).toBeLessThan(delay * 2.5)`, `expect(durationMs).toBeLessThanOrEqual(2000)`). On CI runners under contention these regularly miss the budget. Three sites: `large-schema.spec.ts:58`, `async.map.spec.ts:25`, `bootstrap-parity.spec.ts:126-127`.

**Decision**: Resolve in-place per FR-011, choosing the simplest replacement per site:

| Site | Test purpose | Resolution |
| ---- | ------------ | ---------- |
| `large-schema.spec.ts:58` | Sanity check that the diff *completes*, not that it's fast | Drop the `< 5000ms` assertion entirely; keep the volume assertion (`entries.length > 0`). Vitest's 90 s `testTimeout` already enforces a hard ceiling. |
| `async.map.spec.ts:25` | Verify operations run *concurrently* not serially | Replace wall-clock with a non-time-based concurrency check (e.g., assert that all promise callbacks have been entered before any has resolved, using a counter incremented on entry and a Promise that resolves only when the counter reaches the expected concurrency). Operation-budget rather than wall-clock. |
| `bootstrap-parity.spec.ts:126-127` | Startup SLA — light vs full bootstrap should both complete | Downgrade to non-gating informational form: remove both `expect(...)` calls; optionally surface durations via Vitest's `task.meta` attachment or unasserted local variables. **Do not** use `console.*` — Biome `noConsole: error` applies to spec files (no override in `biome.json`). See task T008 for the canonical mechanism. If gating is essential later, move to a dedicated workflow — but per Q5/FR-011 that is out of scope. |

**Rationale**:
- The pattern in `async.map.spec.ts` is the most interesting: the *test intent* is concurrency, but it has been encoded as a timing budget. A direct concurrency probe (counter + barrier) verifies the actual property without referencing wall-clock.
- For `large-schema.spec.ts`, the wall-clock guard is structurally redundant once the inner determinism is fixed: the test exists to verify the diff *engine produces output*, not that it's fast.
- For `bootstrap-parity.spec.ts`, the budgets reflect a real SLA but are too tight for CI under load. Downgrading to a non-gating informational form (no `expect(...)`) preserves the visibility without flake exposure.

**Alternatives considered**:
- **Generous margins (e.g., `× 5` instead of `× 2.5`)**: Cheap, but only kicks the can. Rejected: still flakey under heavy contention, and obscures whether the property under test is actually concurrency.
- **Move to a dedicated CI perf job**: Q5 clarification explicitly excluded creating new CI infrastructure.
- **Skip-on-CI**: Forbidden by FR-006.

---

## Decision 4: Process-state isolation safety

**Pattern addressed**: Tests mutate `process.env`, prototype methods, or other shared global state in `beforeAll` and rely on `afterAll` for cleanup. If `beforeAll` itself throws, or the test runner crashes, the cleanup may not run, and the state leak poisons sibling test files.

**Decision**: Adopt the `try/finally` cleanup idiom inside the lifecycle hooks themselves, not just in `afterAll`. For env-var mutations, capture the original value (or `undefined`) at the start of `beforeAll` and restore it in `afterAll`'s top-level statement (no try/catch swallowing). For `vi.spyOn(globalThis, ...)` patterns, prefer per-test or per-describe spy-and-restore via `beforeEach`/`afterEach` over `beforeAll`/`afterAll` so a single failing test does not poison subsequent files.

```ts
// Before — env vars set in beforeAll, cleaned in afterAll's catch:
beforeAll(() => { process.env.X = 'foo'; ... });
afterAll(() => { try { delete process.env.X; ... } catch {} });

// After — capture-and-restore, cleanup unconditional:
let originalX: string | undefined;
beforeAll(() => {
  originalX = process.env.X;
  process.env.X = 'foo';
});
afterAll(() => {
  if (originalX === undefined) delete process.env.X;
  else process.env.X = originalX;
});
```

**Rationale**:
- Capturing the original value handles the "process inherited an env var I shouldn't delete" case.
- Removing the try/catch makes failures visible rather than silent.
- For `Math.random` spies, moving to per-test scope eliminates the leakage class entirely; the cost is minor (Vitest's `clearMocks: true` already resets call data; `mockRestore` on each test is cheap).

**Alternatives considered**:
- **Vitest's `vi.stubEnv` / `vi.unstubAllEnvs`**: First-class API for env-var stubbing with auto-cleanup. Rejected as the default only because the codebase isn't currently using it; using the existing `process.env` style with capture-and-restore is a smaller, more local change. May adopt `vi.stubEnv` opportunistically where it reduces lines.
- **Run each affected file in its own isolated worker**: Possible per-file via vitest config, but a global config change for one site is excessive. Rejected.

---

## Decision 5: Async-completion determinism

**Pattern addressed**: Tests trigger fire-and-forget asynchronous work (e.g., a service emits a domain event without the caller awaiting the side-effect's completion) and use `vi.waitFor(() => expect(...).toHaveBeenCalled())` to poll. The audit found `space.move.rooms.service.spec.ts:104-105, 141-142`.

**Decision**: Verified during punch-list confirmation that this site uses `vi.waitFor` in its standard, safe form. No change required at this site. The general rule is recorded in the anti-pattern reference for future code review.

**Rationale**:
- `vi.waitFor` is the canonical Vitest primitive for async completion polling. It re-runs the predicate up to a configurable timeout (default 1 s; Vitest 4.x increased reliability). The existing usage already passes a closure around `expect(...)`, which is the correct shape.
- Promoting the pattern from "incidentally used" to "documented" in the anti-pattern reference (`docs/testing-flakiness.md`) covers FR-010 without a code change.

**Alternatives considered**:
- **Refactor SUT to await side effects**: Would be a production-code change; not warranted because the production path is correctly fire-and-forget and the test polls for it. Rejected.

---

## Decision 6: Anti-pattern reference structure (FR-014, SC-004)

**Decision**: Create `docs/testing-flakiness.md` with one section per anti-pattern documented in this plan, linked from a dedicated `## Testing` subsection in `CLAUDE.md` (per T013 — inserted directly before the existing `## Linting and Formatting` subsection).

Each section follows the format:

```markdown
## Anti-Pattern: <name>
**Failure signature**: <what the assertion error looks like in CI logs>
**Root cause**: <one paragraph>
**Wrong**:
<code example>
**Right**:
<code example>
**When to use the alternative**: <conditions>
```

**Rationale**:
- Discovery is via `CLAUDE.md` link (per Q4) and grep on the failure signature in the CI log; both put a contributor at the right anti-pattern in well under 60 seconds (SC-004).
- One file per project, not one file per pattern: lower file count, easier to scan.
- Ships alongside the fixes so the reference is grounded in concrete code that just landed, not aspirational examples.

**Alternatives considered**: covered by Q4 — a dedicated docs file linked from CLAUDE.md was the chosen option.

---

## Decision 7: Automated-detection evaluation (FR-015)

**Decision**: Evaluate two automated-detection mechanisms and record the outcome on each in the final PR description.

1. **Mock-identity-under-coverage detector**: A Biome custom rule (or grep-based pre-commit hook) flagging the pattern `vi.mock(<...>, <factory creating vi.fn()>)` in any file that also imports the mocked symbol. Heuristic — false-positive risk if the imported symbol is never asserted on. Outcome target: build a pre-commit grep + AST-light check via a small script under `.scripts/lint/`, or document why a heuristic-free rule is infeasible.
2. **Wall-clock-perf-assertion detector**: Grep for `toBeLessThan(\s*\d{2,}\s*)` and similar `toBe*` patterns combined with `Date.now()` / `performance.now()` calls in the same file. False-positive risk: any wall-clock comparison in non-test code. Outcome target: pre-commit grep restricted to `**/*.spec.ts`, or document why heuristic isn't useful.

**Rationale**:
- FR-015 only requires *evaluation*, not implementation, when implementation isn't feasible. This decision keeps the bar low (a small script, not a full lint plugin) and documents both attempts.
- Biome doesn't currently support custom rules without a plugin system that the repo isn't using — a grep-based pre-commit script is a smaller, more obvious unit of work than introducing a new Biome plugin or migrating to ESLint.

**Alternatives considered**:
- **Add a Biome plugin / ESLint rule**: Higher cost; deferred unless the heuristic-free detection becomes a recurrent need.
- **Skip FR-015**: Rejected — FR-015 says "evaluate or record why infeasible," and this decision performs the evaluation.

---

## Decision 8: Verification harness (FR-012, SC-001)

**Decision**: Adopt Vitest's `--repeat=N` flag for per-file 200x verification, executed under coverage mode. Wrap as a one-line `pnpm` script in `package.json`:

```json
{
  "scripts": {
    "test:flake-verify": "vitest run --coverage --repeat=200"
  }
}
```

A target file is verified by passing its path: `pnpm test:flake-verify src/common/pipes/validation.pipe.spec.ts`.

**Rationale**:
- Vitest 4.x supports `--repeat` natively; no shell-loop needed.
- Coverage mode is the trigger condition for the mock-identity flake; baking it into the verify script means contributors can't accidentally verify in non-coverage mode.
- Single `pnpm` script keeps `quickstart.md` short and avoids per-fix bespoke verification commands.

**Alternatives considered**:
- **Bash `for` loop**: Works, but boilerplate per fix.
- **Add a CI workflow that runs the verify**: Out of scope per Q5 (no new CI workflows).
- **Run all files 200x in CI**: Cost-prohibitive; the spec only requires per-fix verification, which is local.

---

## Decision 9: Spec-scope edge case — `test/`-directory specs

**Decision**: Treat any `*.spec.ts` file (not `*.it-spec.ts`, not `*.e2e-spec.ts`) as in scope for this work, regardless of directory.

**Rationale**:
- A strict "under `src/`" reading would exclude #6013 (under `test/`), which contradicts P1.
- The integration/e2e exclusion is preserved by suffix (`.it-spec.ts`, `.e2e-spec.ts`), which is the project's actual naming convention for those categories.

**Captured as**: FR-004 was rewritten during `/speckit.analyze` (finding F1) to use the suffix-based rule, so the spec, plan, and research are now in agreement. No outstanding tension remains.

---

## Open questions

None. All technical-context unknowns are resolved by the above decisions. Phase 1 proceeds with no NEEDS CLARIFICATION outstanding.
