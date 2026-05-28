# Testing — Flakiness Anti-Patterns

This reference catalogues the five anti-patterns the Alkemio Server test suite has paid for (spec [`100-fix-flaky-tests`](../specs/100-fix-flaky-tests/)) and the deterministic replacement we standardised on. When you see one of these patterns in review, point reviewers here.

The patterns assume the project's Vitest config (`vitest.config.ts`): `pool: 'threads'`, `isolate: false`, `clearMocks: true`, v8 coverage. Some patterns only fail under coverage instrumentation; others only fail under CI runner contention. The fixes below hold under both modes.

---

## 1. Mock identity under v8 coverage

**Failure signature** (issue [#6012](https://github.com/alkem-io/server/issues/6012)):

```text
AssertionError: expected "vi.fn()" to be called with arguments: [ ... ]

Number of calls: 0

❯ src/common/pipes/validation.pipe.spec.ts:100:31
```

The mock looks called from a fresh-test reading of the code, but the assertion reports zero calls. **Passes locally without coverage, fails intermittently under CI's `pnpm test:ci` with v8 coverage.**

### Root cause

`vi.mock('mod', () => ({ fn: vi.fn() }))` evaluates its factory each time the module graph is resolved. Under v8 coverage with `isolate: false`, the SUT (loaded via `import`) and the test body (which imports the symbol again to assert on it) can resolve to different module instances — each with its own `vi.fn()`. The spec's `expect(fn).toHaveBeenCalled()` checks a mock that was never invoked, because the SUT called the *other* copy.

### Wrong

```ts
import { plainToInstance } from 'class-transformer';

vi.mock('class-transformer', () => ({
  plainToInstance: vi.fn().mockImplementation((_cls, value) => value),
}));

// ...later in a test:
expect(plainToInstance).toHaveBeenCalledWith(MyDto, value);
```

### Right

```ts
const { plainToInstanceMock } = vi.hoisted(() => ({
  plainToInstanceMock: vi
    .fn()
    .mockImplementation((_cls: unknown, value: unknown) => value),
}));

vi.mock('class-transformer', () => ({
  plainToInstance: plainToInstanceMock,
}));

// ...later in a test:
expect(plainToInstanceMock).toHaveBeenCalledWith(MyDto, value);
```

`vi.hoisted` runs once before the module factory and stores the mock identity in test-file scope. Both the SUT (through the factory closure) and the test body share the same `vi.fn()` instance, regardless of how many times the factory re-evaluates under coverage.

### When `vi.mocked(symbol)` is not enough

The `vi.mocked(symbol)` indirection looks like it dodges the identity issue, but it only resolves to whatever `symbol` was imported into the test file. If that import is a different instance from the SUT's, `vi.mocked` returns the wrong handle. Always hoist when you assert on the mock.

### Reference implementations in the codebase

- `src/common/pipes/validation.pipe.spec.ts` — the original #6012 fix, with belt-and-braces `vi.resetModules()` + dynamic import.
- `src/apm/apm.spec.ts:3-6` — `mockStart` hoist.
- `src/apm/plugins/apm.apollo.plugin.spec.ts:3` — `mockTransaction`, `mockApmAgent` hoist.

---

## 2. Random input driving assertion volume

**Failure signature** (issue [#6013](https://github.com/alkem-io/server/issues/6013)):

```text
AssertionError: expected 0 to be greater than 0

❯ test/schema-contract/perf/large-schema.spec.ts:57
    expect(report.entries.length).toBeGreaterThan(0);
```

The test rarely fails — only when the random distribution happens to produce a degenerate input.

### Root cause

`Math.random()` is unseeded. A low-probability draw across many candidates yields a non-trivial chance of producing zero "interesting" outputs, which fails a volume assertion. Example: 260 candidates each rolled at `p = 0.02` to be removed; `P(zero removals) = 0.98^260 ≈ 0.5%`.

### Wrong

```ts
function mutateSchema(base: string): string {
  return base
    .split('\n')
    .filter(line => {
      if (line.trim().startsWith('field5:') && Math.random() < 0.02) {
        return false; // simulate removal
      }
      return true;
    })
    .join('\n');
}

it('produces a non-empty change report', () => {
  const report = buildChangeReport(oldSDL, mutateSchema(oldSDL), ctx);
  expect(report.entries.length).toBeGreaterThan(0);
});
```

### Right

```ts
const REMOVE_EVERY_N_FIELD5 = 50;
function mutateSchema(base: string): string {
  let field5Idx = 0;
  return base
    .split('\n')
    .filter(line => {
      if (line.trim().startsWith('field5:')) {
        const drop = field5Idx % REMOVE_EVERY_N_FIELD5 === 0;
        field5Idx++;
        if (drop) return false;
      }
      return true;
    })
    .join('\n');
}
```

A deterministic counter produces the same domain shape (~5 removals on a 260-type schema) without the stochastic tail.

### When a seedable PRNG is worth it

Almost never for unit tests. If the test genuinely needs a probabilistic distribution (e.g., property-based testing), use [`fast-check`](https://github.com/dubzzz/fast-check) with an explicit seed, not bare `Math.random()`.

---

## 3. Wall-clock performance assertions in unit tests

**Failure signature** (PL-05, PL-06):

```text
AssertionError: expected 127 to be less than 125
AssertionError: expected 12340 to be less than 10000
```

Tests pass on idle machines, fail under CI runner contention.

### Root cause

`expect(elapsed).toBeLessThan(N)` against wall-clock time is hostage to scheduler jitter, GC pauses, machine load, and v8 warmup. Unit tests run alongside hundreds of other tests in the same pool; their wall-clock varies by 5–10× depending on contention. The assertion has no robust budget that's tight enough to be meaningful AND loose enough to never flake.

### Wrong

```ts
it('should process items concurrently', async () => {
  const startTime = Date.now();
  const delay = 50;
  await asyncMap([1, 2, 3], async n => {
    await new Promise(resolve => setTimeout(resolve, delay));
    return n;
  });
  const elapsed = Date.now() - startTime;
  expect(elapsed).toBeLessThan(delay * 2.5);
});
```

### Right — concurrency probe (when the test intent is "concurrent dispatch")

```ts
it('should dispatch mapper bodies concurrently rather than serially', async () => {
  const N = 3;
  let started = 0;
  let startedAtFirstResolve = 0;

  const result = await asyncMap([1, 2, 3], async n => {
    started++;
    await new Promise(resolve => setTimeout(resolve, 5));
    if (startedAtFirstResolve === 0) startedAtFirstResolve = started;
    return n;
  });

  expect(result).toEqual([1, 2, 3]);
  // Serial dispatch would give startedAtFirstResolve === 1.
  expect(startedAtFirstResolve).toBe(N);
});
```

### Right — informational only (when there is no operation-shape proxy)

When the test really is about wall-clock (e.g., an SLA you want to keep visible), surface the duration via Vitest's `task.meta` and **drop the `expect(...)` gate**:

```ts
it('emits identical SDL across light and full bootstrap', async ({ task }) => {
  const light = await captureSchema(SchemaBootstrapModule);
  const full = await captureSchema(AppModule);
  expect(light.sdl).toBe(full.sdl);

  // Informational — visible in the reporter, does not gate.
  task.meta = {
    ...(task.meta ?? {}),
    lightDurationMs: light.durationMs,
    fullDurationMs: full.durationMs,
  };
});
```

### Do **not** use `console.*` for informational output

Biome `noConsole: error` applies to `*.spec.ts` (no override in `biome.json`). Use `task.meta` or leave the value captured-but-unasserted.

### Do **not** create a new CI workflow

This was explicitly out of scope for the structural-flakiness work (spec 100-fix-flaky-tests, Q5). If a wall-clock SLA needs to gate, that is a separate initiative.

---

## 4. Process-state leakage across test files

**Failure signature**: A test sets an env var or spies on a global in `beforeAll`; an unrelated test file in a subsequent run sees the still-mutated state and fails or asserts incorrectly. Usually reproduces by file-order shuffles.

### Root cause

Vitest with `pool: 'threads'` and `isolate: false` shares the worker process across files. `beforeAll`/`afterAll` mutate state at the file scope, but:

1. If `beforeAll` throws after the mutation, `afterAll` may not run.
2. If the test runner crashes mid-file (rare but possible — OOM, signal), `afterAll` never runs.
3. `delete process.env.X` is wrong if the parent process inherited `X`.

### Wrong

```ts
beforeAll(() => {
  process.env.SCHEMA_OVERRIDE_REVIEWS_JSON = JSON.stringify([...]);
});
afterAll(() => {
  delete process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
});
```

### Right — capture-and-restore for env vars

```ts
let origReviewsJson: string | undefined;

beforeAll(() => {
  origReviewsJson = process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
  process.env.SCHEMA_OVERRIDE_REVIEWS_JSON = JSON.stringify([...]);
});
afterAll(() => {
  if (origReviewsJson === undefined) {
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
  } else {
    process.env.SCHEMA_OVERRIDE_REVIEWS_JSON = origReviewsJson;
  }
});
```

Or use Vitest's first-class `vi.stubEnv` / `vi.unstubAllEnvs` — same shape, less typing.

### Right — per-test scope for prototype spies

```ts
let randomSpy: MockInstance;

beforeEach(() => {
  randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
});
afterEach(() => {
  randomSpy.mockRestore();
});
```

`beforeEach`/`afterEach` re-establishes the spy per test. A single failing test cannot leak the spy because the next test's `beforeEach` (and the failing test's `afterEach`) re-binds and restores it.

---

## 5. Async-completion races

**Failure signature**: Test asserts a side-effect of fire-and-forget async work happened, but the assertion runs before the side-effect completes. Flakes intermittently depending on microtask scheduling.

### Root cause

A service triggers async work without the caller awaiting completion (e.g., `void this.emitter.emit(event)` and the listener does the real work). The test wants to verify the listener ran but has no completion signal to await.

### Wrong

```ts
it('schedules the side-effect', () => {
  service.fireAndForget();
  expect(handler).toHaveBeenCalled(); // racy
});
```

### Right — `vi.waitFor`

```ts
it('schedules the side-effect', async () => {
  service.fireAndForget();
  await vi.waitFor(() => {
    expect(handler).toHaveBeenCalled();
  });
});
```

`vi.waitFor` polls the predicate up to a configurable timeout (default 1 s; Vitest 4.x has improved reliability). It exits as soon as the assertion passes — no fixed sleep, no race window. Reference implementation: `src/domain/communication/space-move-rooms/space.move.rooms.service.spec.ts:104-105, 141-142`.

---

## Verification: the 200x bar

When you fix a flake, verify the fix actually holds:

```bash
pnpm test:flake-verify <path-to-spec> [<path>...]
```

Runs the spec file(s) 200 times under v8 coverage (the trigger condition for the mock-identity flake). Override the iteration count with `FLAKE_VERIFY_RUNS`, e.g. `FLAKE_VERIFY_RUNS=50 pnpm test:flake-verify ...` for a quicker smoke. The script exits non-zero on the first failing iteration and prints that iteration's output. See [`specs/100-fix-flaky-tests/quickstart.md`](../specs/100-fix-flaky-tests/quickstart.md) for details.

## Automated detection (evaluation)

Spec 100-fix-flaky-tests / FR-015 evaluated automated detection for the top two patterns. Outcome:

- **Mock-identity detector**: `.scripts/lint/detect-mock-identity-flake.sh`. Heuristic — flags `*.spec.ts` files that contain `vi.mock(...)` with bare `vi.fn()` inside the factory *and* import the mocked module's symbol, *and* do not already use `vi.hoisted`. Run manually or wire into a pre-commit hook; exits non-zero on hits.
- **Wall-clock-perf detector**: `.scripts/lint/detect-wallclock-perf.sh`. Heuristic — flags `*.spec.ts` files that combine `toBeLessThan(N)` or `toBeLessThanOrEqual(N)` (with `N ≥ 100`) and a reference to `Date.now()` / `performance.now()` in the same file. Same shape: exits non-zero on hits.

Both are intentionally heuristic. They accept false positives in exchange for being grep-tractable: comments that quote the literal pattern (e.g., documenting an *old* assertion that was removed) can trip the wall-clock detector — refactor the comment if it matters.

**Pre-commit wiring**: not wired by default. The repo's existing pre-commit runs lint-staged + `tsc` + `vitest`, which is already the longest part of the commit cycle. Wiring these heuristic detectors into pre-commit would add ~1–2 s and introduce false-positive friction for an anti-pattern that arises rarely (the audit found 3 mock-identity sites and 3 wall-clock sites across ~600 spec files). Recommended: run them manually before opening a PR that touches `*.spec.ts`, or as a review-time check. The pre-commit wiring is one line away if the team's experience changes the calculus:

```jsonc
// .lintstagedrc.json — illustrative; not applied
{
  "*.spec.ts": [".scripts/lint/detect-mock-identity-flake.sh", ".scripts/lint/detect-wallclock-perf.sh"]
}
```

Richer detection (Biome plugin or ESLint rule with AST awareness) was rejected as disproportionate for two patterns whose false-positive rate without AST is acceptable given the review-time anti-pattern reference above.
