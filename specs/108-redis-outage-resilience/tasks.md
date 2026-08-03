# Tasks: Redis outage must degrade the platform, not kill it

**Input**: Design documents from `/specs/108-redis-outage-resilience/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Required. The spec mandates regression coverage (FR-024 – FR-027) and
SC-007 requires demonstrating that the new tests **fail against `develop`** — a
resilience bug with no test that would have caught it is half-fixed.

**Organization**: Grouped by user story. Note the honest dependency shape for this
feature: US1 and US2 are *both* P1 and share the same foundational fix — the
factory. Once Phase 2 lands, US1 and US2 are each one wiring task, and US3/US4 are
properties of the factory rather than separate features. This is recorded rather
than padded out into artificial independence.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths in every description

## Path Conventions

Single project. Source at `src/`, unit specs co-located as `*.spec.ts` beside the
code they cover, per `CLAUDE.md`.

---

## Phase 1: Setup

**Purpose**: Establish the baseline and the new module directory.

- [X] T001 Capture a pre-change gate baseline so "green" is a measured claim, not an assumption: run `pnpm lint` and `pnpm test:ci:no:coverage` on `story/6330-redis-outage-crash` before any edit; record the exact totals in the PR body.
- [X] T002 [P] Create the directory `src/core/cache/` — the single cache construction point per plan.md Structure Decision.
- [X] T003 [P] Add a `CACHE` member to the `LogContext` enum in `src/common/enums/logging.context.ts`. Verified during `/speckit-analyze`: the enum has 87 members and **none** is `CACHE` or `REDIS`, so this is an unconditional addition, not a conditional one. Required by FR-018 — every new record needs an explicit context.

**Checkpoint**: baseline recorded, log context available.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared factory and reporter. **This is the fix.** Every user
story below is either a wiring task onto this phase or a property of it.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [US1] [US4] Implement `CacheConnectionReporter` in `src/core/cache/cache.connection.reporter.ts` per [contracts/connection-state-reporter.md](./contracts/connection-state-reporter.md): one private `reportedDown` boolean; `reportError(error)` emits exactly one `warn` on the HEALTHY→DOWN transition and nothing thereafter; `reportReady()` emits exactly one `warn` on DOWN→HEALTHY and nothing from the initial state; read-only `isDown` getter. Winston `LoggerService` injected, `warn(message, context)` signature, `LogContext` member from T003. Record only the error's `message` and `code` — never the error object, never connection options (FR-019, G3).
  - *Acceptance*: satisfies FR-015 – FR-019; contract guarantees G1–G4.

- [X] T005 [P] [US4] Write `src/core/cache/cache.connection.reporter.spec.ts` covering contract test obligations T1–T7: 1 error → 1 record; 50 consecutive errors → still 1 record; error→ready→error → 3 records total; `ready` from initial state → 0 records; `isDown` transitions; no secret material in any record; every record goes through the injected logger with a context.
  - *Acceptance*: SC-004 becomes a counted assertion. Depends on T004.

- [X] T006 [US1] [US2] [US3] Implement `createRedisCacheStore(config, logger)` in `src/core/cache/cache.store.factory.ts` per [contracts/cache-store-factory.md](./contracts/cache-store-factory.md). Returns a `cache-manager` store-factory function. Inside it:
  1. call `redisStore.create({ host, port, connect_timeout: 2_147_483_647, enable_offline_queue: false, retry_strategy: ({ attempt }) => Math.min(attempt * 250, 5_000) })` — the values and the reasoning for each are in research R6; **do not** pass `redisOptions`, which `redis@3.1.2` silently ignores (R6.1);
  2. construct a `CacheConnectionReporter` and attach `client.on('error', …)` and `client.on('ready', …)` **before returning**, with no `await` in between (G2 — this is the line that stops the process dying);
  3. return the store wrapped by the fail-soft proxy from T007.
  - *Acceptance*: FR-003, FR-011 – FR-014, FR-020, FR-021; G1, G2, G5, G8.

- [X] T007 [US1] Implement the fail-soft wrapper inside `src/core/cache/cache.store.factory.ts`: spread the original store (preserving `name` and `getClient` — G6, and `TaskService` depends on it), overriding only `get`, `set`, `del`, `reset`. `get` resolves `undefined` on any rejection; `set`/`del`/`reset` resolve. Catch **broadly**, never by error code (FR-008). Race every call against a **1000 ms** ceiling (FR-009a). Forward `set`'s third argument to the underlying store **unmodified** — this preserves the legacy `{ ttl: seconds }` semantics and is the guarantee the whole design rests on (G7, research R4).
  - *Acceptance*: FR-005 – FR-009a; G3, G4, G6, G7. Depends on T006.

- [X] T008 [P] [US1] Write `src/core/cache/cache.store.factory.spec.ts` covering contract test obligations T1–T8, driving the factory with a substitute client/store that fails on demand — **not** through a consumer, since consumers already tolerate misses and such a test would pass against `develop` and prove nothing (FR-027). Assert: emitting `'error'` does not throw; rejecting `get` → `undefined`; rejecting `set`/`del` → resolve; a never-settling operation resolves at the 1 s ceiling (fake timers); `retry_strategy` returns a number for attempts 1…100, monotonic, capped at 5000, never an `Error`; `getClient` and `name` survive wrapping; construction with an unreachable host does not throw; `set` forwards its third argument unmodified.
  - *Acceptance*: FR-024 – FR-027, SC-007. Depends on T006, T007.

**Checkpoint**: the fix exists and is proven in isolation. Nothing is wired to it yet.

---

## Phase 3: User Story 1 — The platform keeps serving while Redis is gone (P1) 🎯 MVP

**Goal**: The API process survives a Redis outage and keeps answering requests
from the source of truth.

**Independent Test**: [quickstart.md](./quickstart.md) §2 — stop
`alkemio_dev_redis`, confirm the process stays alive and 20 consecutive requests
still answer.

- [X] T009 [US1] Replace the inline cache configuration in `src/app.module.ts` (currently lines ~142–156, including the `import * as redisStore from 'cache-manager-redis-store'` at line 107) with a call to `createRedisCacheStore`. Inject `WINSTON_MODULE_NEST_PROVIDER` alongside `ConfigService`. Keep `isGlobal: true` and the `storage.redis` config key unchanged.
  - *Acceptance*: FR-001, FR-020; US1 acceptance scenarios 1–4. Verified live by quickstart §2, whose sustained 10-minute poll is what establishes **SC-001**, and whose latency check establishes **SC-009**. Depends on T006, T007.

**Checkpoint**: the API process survives. This alone is a shippable MVP — it
converts a platform outage into a degradation.

---

## Phase 4: User Story 2 — The background worker survives the same outage (P1)

**Goal**: The auth-reset worker survives the same outage and keeps consuming.

**Independent Test**: [quickstart.md](./quickstart.md) §5 — with the worker
consuming, stop Redis; confirm the process lives and the queue keeps draining.

- [X] T010 [US2] Apply the identical replacement in `src/core/bootstrap/auth-reset.worker.module.ts` (currently lines ~58–73, plus the `redisStore` import at line 12). **Preserve verbatim** the comment block at lines 54–57 explaining why `ScheduleModule` is deliberately absent, and change nothing else about the module graph.
  - *Acceptance*: FR-002, FR-020; US2 acceptance scenarios 1 and 3. Depends on T006, T007. Not `[P]` with T009 despite being a different file — they must be reviewed as one change, since the entire point is that the two sites stop drifting.

- [X] T011 [US2] In `src/services/task/task.service.ts`, suppress the per-operation `logger.error` calls on the direct-client path (lines ~96, ~172, ~198) while the connection is known down, consulting the reporter's `isDown`. **Change no counter logic** — every callback already `resolve()`s and callers already fall back to in-object counters; only log volume changes.
  - *Acceptance*: FR-010, FR-010a; US2 acceptance scenario 2. Depends on T004.

- [X] T012 [P] [US2] Extend `src/services/task/task.service.spec.ts` with a case proving the counter path still falls back (not throws) when the client errors, and that it does not log per failed operation while down. Do not disturb the existing 600-line spec's structure.
  - *Acceptance*: guards server#6310's fix against this change. Depends on T011.

**Checkpoint**: both processes survive. AC1 and AC2 met.

---

## Phase 5: User Story 3 — Recovery is automatic (P2)

> **Status — NOT EXECUTED by the automated SDD run.** T013, T014, T015 and T020
> all require stopping the shared `alkemio_dev_redis` container. At the time of
> this run the developer's dev stack was live (21 containers up for an hour),
> and that Redis is shared with the OIDC session store, the file services and
> the auth-reset scaler. Stopping it would have disrupted an active environment
> the worker was explicitly told not to touch. These four tasks are handed to a
> human with the procedure written out in full in `quickstart.md`; the results
> log there is left blank rather than filled in with claims nobody verified.
> The unit-level properties these would confirm *are* covered automatically —
> see T005, T008, T012 and the red/green demonstration in T019.


**Goal**: Redis returns; the platform uses it again with no restart.

**Independent Test**: [quickstart.md](./quickstart.md) §3 — restart Redis, confirm
cache writes resume within 60 s with no operator action, across three cycles.

- [ ] T013 [US3] Verify the recovery path end to end against a live Redis per quickstart §3: `docker stop` / `docker start alkemio_dev_redis` three times, confirming exactly 2 records per cycle and a stable `connected_clients` count (no connection or listener accumulation).
  - *Acceptance*: FR-011 – FR-014, SC-002, SC-003; US3 acceptance scenarios 1–3. Depends on T009. **No code task** — recovery is delivered by the `retry_strategy` configuration in T006. Recorded as its own task because SC-003 and the no-accumulation property are claims that must be *observed*, not inferred from configuration.

**Checkpoint**: outage and recovery are both clean.

---

## Phase 6: User Story 4 — Operators can see the outage without drowning in it (P2)

**Goal**: One record per state change, through Winston, with no secrets.

**Independent Test**: [quickstart.md](./quickstart.md) §2 — leave the outage
running a minute and confirm no second record arrives.

- [ ] T014 [US4] Verify observability against a live outage per quickstart §2 and §5: exactly one record on loss, one on recovery, none in between, from **both** processes; confirm no credentials appear; confirm nothing was written via `console` (Biome's `noConsole` rule enforces this at lint time, so this is a review check).
  - *Acceptance*: FR-015 – FR-019, SC-004; US4 acceptance scenarios 1–4. Depends on T009, T010, T011. Behaviour is delivered by T004; this task is the live confirmation of it.

**Checkpoint**: the degradation is diagnosable.

---

## Phase 7: User Story 5 — The blocked verification of server#6315 is unblocked (P3)

**Goal**: `deleteUser` succeeds with Redis down, end to end.

**Independent Test**: [quickstart.md](./quickstart.md) §6.

- [ ] T015 [US5] Execute quickstart §6 — register a user with an active session, stop Redis, run `deleteUser`, confirm it completes and the process survives. Record the outcome on [server#6315](https://github.com/alkem-io/server/issues/6315) so its verification record stops reading "blocked", and note it in the PR body.
  - *Acceptance*: FR-001, FR-005, FR-006, SC-006; US5 acceptance scenarios 1–2. Depends on T009. **No code task** — this is a consequence of US1, and is tracked separately because it is the externally-visible proof the fix did what it claims.

**Checkpoint**: all user stories delivered.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T016 [P] Delete the inert `CacheModule.register()` and its `@nestjs/cache-manager` import from `src/core/authentication/authentication.module.ts` (lines 2 and 15). Verified dead in research R2: `AuthenticationService` does not inject `CACHE_MANAGER`, and `ActorContextCacheService` is declared in `ActorContextModule` so it resolves the global cache regardless.
  - *Acceptance*: FR-022, SC-005. Independent of every other task.

- [X] T017 [P] Extend `RedisClientLike` in `src/common/interfaces/redis.interfaces.ts` only as far as the reporter and factory require. Keep the existing callback-style documentation comments intact — they record *why* the interface is callback-shaped and remain accurate.
  - *Acceptance*: no consumer signature changes; SC-008.

- [X] T018a Prove the blast radius stayed inside the cache (FR-023, FR-004). Confirm by inspection of the final diff that **no** file under `src/core/auth/oidc/`, `src/core/health/`, `src/main.server.ts` or the TypeORM configuration blocks in `src/app.module.ts` / `src/core/bootstrap/auth-reset.worker.module.ts` was modified — those subsystems own independent `ioredis` connections or a database-backed TypeORM cache and are explicitly out of scope (research R3). Also confirm no code path treats "client exists but is disconnected" as an error condition (FR-004): the only disconnected-state handling is the client's own immediate rejection plus the wrapper's catch, with no `throw` and no `isDown` gate on any operation (contract G5).
  - *Acceptance*: FR-004, FR-023. Depends on T009, T010, T011, T016, T017.

- [X] T018 Run the three exit gates in one uninterrupted pass, in the order `CLAUDE.md` prescribes: `pnpm test:ci:no:coverage`, then `pnpm build`, then `pnpm lint`. Any failure → fix → restart from the first gate. Record the **real** output in the PR body; if a gate cannot be made green, say so plainly rather than claiming green.

- [X] T019 Demonstrate SC-007 rather than asserting it: stash the source change, run the two new spec files, confirm they **FAIL**; restore and confirm they **PASS**. Record both outcomes in the PR body.
  - *Acceptance*: SC-007; the anti-vacuous-test check. Depends on T005, T008.

- [ ] T020 Complete the [quickstart.md](./quickstart.md) results-log table with real outcomes for §1–§7, including §1 (reproducing the defect on `develop` first — a regression procedure nobody has watched fail is not trustworthy).
  - *Acceptance*: **FR-028** — the manual procedure exists as a repeatable, written document with recorded outcomes, covering the process-survival properties that no unit test can reach.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup. **Blocks every user story.** This
  phase contains the entire fix.
- **US1 (Phase 3)** and **US2 (Phase 4)**: both depend only on Phase 2. Both are
  P1. They touch different files (T009 vs T010/T011) and can be worked in
  parallel, but should land together — the whole point is that the two bootstrap
  sites stop diverging.
- **US3 (Phase 5)**, **US4 (Phase 6)**, **US5 (Phase 7)**: verification-only
  phases. Their behaviour ships in Phase 2; they depend on Phases 3–4 being wired
  so there is a running process to observe.
- **Polish (Phase 8)**: T016 and T017 are independent of everything and can run at
  any point. T018–T020 are terminal and depend on all preceding work.

### Within Each User Story

- Tests are written alongside their implementation and must be shown to fail
  against `develop` (T019), which is this feature's substitute for red-green
  ordering — the "red" state is `develop` itself.
- Reporter (T004) before factory (T006), because the factory constructs it.
- Factory (T006) before wrapper (T007), same file, sequential.
- Both before either wiring task (T009, T010).

### Parallel Opportunities

- T002, T003 in parallel (Setup).
- T005 and T008 in parallel once their subjects exist (different spec files).
- T009 ‖ T010 ‖ T011 once Phase 2 completes (three different files).
- T012 ‖ T016 ‖ T017 (three different files, no shared state).
- The live-verification tasks T013, T014, T015 all exercise the same running
  stack and are best run as one session against one boot, in quickstart order.

---

## Parallel Example: after Phase 2

```bash
# Three different files, no shared state — dispatch together:
Task: "Wire the shared factory into src/app.module.ts"                        # T009
Task: "Wire the shared factory into src/core/bootstrap/auth-reset.worker.module.ts"  # T010
Task: "Suppress per-operation error logging in src/services/task/task.service.ts"    # T011

# Independent cleanups, any time:
Task: "Delete the inert CacheModule.register() in authentication.module.ts"   # T016
Task: "Extend RedisClientLike in redis.interfaces.ts"                         # T017
```

---

## Implementation Strategy

### MVP first

Phases 1 → 2 → 3 delivers the whole availability benefit: the API stops dying.
Stop there and it is already shippable.

### Incremental delivery

1. Setup + Foundational → the fix exists, unit-proven, wired to nothing.
2. + US1 → the API survives. **MVP.**
3. + US2 → the worker survives. AC1 and AC2 both met — this is the honest
   "done" line for the story, since shipping US1 without US2 leaves an identical
   crash in a quieter process.
4. + US3/US4/US5 → live confirmation of recovery, observability, and the
   unblocked server#6315 check.
5. + Polish → dead code removed, gates green, SC-007 demonstrated.

---

## Notes

- `[P]` = different files, no dependencies.
- Commit in logical slices; keep the working tree green between tasks. Note that
  this repo's pre-commit hook runs `tsc --noEmit` **and the full Vitest suite**,
  so every commit is already gated.
- All commits must be signed (`CLAUDE.md` → Git Conventions).
- No migration, no schema change, no `schema:diff` run — this feature touches no
  GraphQL surface.
- Do **not** "fix" `redisOptions` → `connect_timeout: 60000` while in the area. It
  looks like an obvious cleanup and it is a trap: `connect_timeout` doubles as the
  total retry budget in `redis@3.1.2`, so a 60 s value makes the client abandon
  Redis permanently after a minute of outage — the exact failure this story
  removes. See research R6.2.
