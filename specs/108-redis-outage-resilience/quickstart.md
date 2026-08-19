# Quickstart: verifying Redis outage resilience

**Feature**: `108-redis-outage-resilience` · **Story**: [server#6330](https://github.com/alkem-io/server/issues/6330)
**Satisfies**: FR-028 — the written procedure for the properties that are not unit-testable

## Why this document exists

Most of this feature is covered by unit tests that fail against `develop` and
pass after the change (see `contracts/*.md` → *Test obligations*). One property
is not reachable that way: **that a real process survives a real outage.**
Asserting it needs a live Redis, a live process, and the ability to kill one out
from under the other. `docs/testing-flakiness.md` is explicit that bolting a live
infrastructure dependency onto the unit suite is an anti-pattern this project has
already paid for, so that property gets a written procedure instead of a flaky
test.

This procedure is also, verbatim, the check that server#6315 was blocked on —
see §6.

## Prerequisites

```bash
pnpm install
pnpm run start:services      # PostgreSQL, RabbitMQ, Redis, Ory Kratos/Oathkeeper
pnpm run migration:run
```

The Redis container is `alkemio_dev_redis` (`quickstart-services.yml`, service
`redis`). Every step below stops and starts *that* container by name.

Two terminals are useful: one running the server, one issuing the commands.

---

## §1 — Reproduce the defect first

**Do this before applying the change.** A regression procedure nobody has seen
fail is a procedure nobody can trust.

```bash
git stash                        # or check out develop in a scratch worktree
pnpm start:dev
```

Wait for the API to answer:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/auth/oidc/id-token-hint
# expect: 401   (401 means "alive and answering" — the endpoint requires a session)
```

Now stop Redis:

```bash
docker stop alkemio_dev_redis
```

**Expected on `develop` (the bug):** within a few seconds the server terminal
prints

```text
AbortError: Ready check failed: Redis connection lost and command aborted.
    at RedisClient.flush_and_error (node_modules/redis/index.js:298:23)
Emitted 'error' event on RedisClient instance at:
    at RedisClient.on_info_cmd (node_modules/redis/index.js:432:14)
  code: 'UNCERTAIN_STATE', command: 'INFO'
```

and the process **exits**. The `nest start --watch` parent exits with it, so
there is no auto-restart. Confirm nothing is listening:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/auth/oidc/id-token-hint
# expect: 502 (or connection refused) — the process is gone
docker start alkemio_dev_redis
```

If the process did **not** exit, you are not on the unfixed code. Stop and check.

---

## §2 — AC1: the API survives the outage

Now on the fix branch:

```bash
pnpm start:dev
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/auth/oidc/id-token-hint   # 401
docker stop alkemio_dev_redis
```

**Expected:**

- The process **stays alive**. No `AbortError`, no exit, no watcher restart.
- Exactly **one** warning appears, naming the cache log context — not a repeating
  stream. Leave it a minute and confirm no second record arrives (that is SC-004
  and FR-017 observed directly).
- Requests keep being answered:

```bash
for i in $(seq 1 20); do
  curl -s -o /dev/null -w '%{http_code} ' http://localhost:3000/api/auth/oidc/id-token-hint
done; echo
# expect: 401 twenty times — never 502, never a hang
```

- Latency stays sane. Cache-touching paths degrade to database reads; nothing
  waits tens of seconds (SC-009):

```bash
curl -s -o /dev/null -w 'total=%{time_total}s\n' http://localhost:3000/api/auth/oidc/id-token-hint
# expect: well under 1s
```

- **Sustained observation — SC-001 requires a continuous 10-minute window**, not a
  spot check. A process that survives 20 requests and dies at minute 4 has not
  passed. Leave the outage running and poll:

```bash
end=$((SECONDS+600))
while [ $SECONDS -lt $end ]; do
  curl -s -o /dev/null -w '%{http_code} ' http://localhost:3000/api/auth/oidc/id-token-hint
  sleep 10
done; echo
# expect: 401 for all 60 samples — no 502, no gap, process still alive at the end
```

**Pass criteria**: process alive for the full 10 minutes, all samples answered,
exactly one log record for the whole window, no request slower than ~1 s.
→ **AC1 / US1 / FR-001, FR-005, FR-006, FR-017 · SC-001, SC-004, SC-009**

---

## §3 — AC4: recovery is automatic

With the server still running from §2:

```bash
docker start alkemio_dev_redis
```

**Expected:**

- Within ~5 s (the backoff cap, FR-012) a **single** recovery record appears.
- **No restart is performed or required** (SC-002).
- Cache writes resume. Verify from outside the process:

```bash
docker exec alkemio_dev_redis redis-cli DBSIZE
# exercise a cached path, e.g. load any space in the client, then:
docker exec alkemio_dev_redis redis-cli DBSIZE
# expect: the second number is larger — the cache is being populated again
```

Repeat stop/start **three times** and confirm behaviour is identical each cycle,
with exactly 2 records per cycle and no accumulation of connections:

```bash
docker exec alkemio_dev_redis redis-cli INFO clients | grep connected_clients
# expect: stable across cycles, not growing
```

**Pass criteria**: recovery within 60 s with no operator action, 2 records per
cycle, stable client count. → **AC4 / US3 / FR-011 – FR-014, SC-003, SC-004**

---

## §4 — Redis already down at boot

```bash
docker stop alkemio_dev_redis
pnpm start:dev
```

**Expected:** the server **starts** and answers requests. One record reports the
cache as unavailable. Then:

```bash
docker start alkemio_dev_redis
```

and the connection establishes with one recovery record, no restart.

**Pass criteria**: boot completes with Redis absent. → **US1 acceptance scenario 4**

---

## §5 — AC2: the auth-reset worker survives

The worker is a second process with its own module graph, so it needs its own
walk — a fix that only covered the API would pass §2 and still leave this broken.

```bash
node dist/src/main.worker.js        # after `pnpm build`
# or run the worker entrypoint however your local setup starts it
```

With the worker running and consuming, trigger reset work (for example an
`authorizationPolicyResetAll` from the platform admin surface), then mid-run:

```bash
docker stop alkemio_dev_redis
```

**Expected:**

- The worker process **stays alive** and keeps consuming from the queue.
- Its logs show **one** cache-unavailable record, not one per counter operation
  (FR-010a — this is the `TaskService` flood suppression).
- Queue depth keeps draining:

```bash
docker exec alkemio_dev_rabbitmq rabbitmqctl list_queues name messages | grep -i auth
```

**Known and accepted limitation** (Clarification Q3): while Redis is down and
multiple worker replicas are running, the atomic progress counters fall back to
process-local counting and may undercount, so a task in flight may not reach a
terminal state and needs re-running. This is the pre-existing degraded mode for
cache-less environments. It is strictly better than the current behaviour, where
the task also never completes *and* the platform is down. Do not fail this step
on it — record it.

```bash
docker start alkemio_dev_redis
```

**Pass criteria**: worker alive, still consuming, one record. → **AC2 / US2 / FR-002, FR-010, FR-010a**

---

## §6 — AC5: unblocking server#6315

This is the check that could not be run before this fix, because the process died
before the mutation could complete. It corresponds to
`specs/107-oidc-session-revocation/quickstart.md` §6 ("Redis down at deletion →
deletion succeeds") — **in this repository**, on the unmerged
`story/6315-oidc-session-revocation-cascade` branch, not in the workspace repo as
the story text suggests.

```bash
# 1. Register a user and confirm they have an active session.
# 2. Stop Redis:
docker stop alkemio_dev_redis
# 3. Execute deleteUser for that user through the GraphQL API.
```

**Expected:**

- The mutation **completes successfully**.
- The process stays alive throughout.
- Best-effort OIDC session revocation is skipped or fails silently — it does not
  fail the deletion. That is exactly the guarantee server#6315 encoded in
  `src/domain/community/user/user.service.delete.spec.ts` and could never
  demonstrate end to end.

```bash
docker start alkemio_dev_redis
```

**Pass criteria**: `deleteUser` succeeds with Redis down. → **AC5 / US5 / SC-006**

Record the outcome on server#6315 as well, so its verification record stops
saying "blocked".

---

## §7 — Automated gates

```bash
pnpm test:ci:no:coverage
pnpm build
pnpm lint
```

All three must pass in one uninterrupted run.

### Proving the new tests would have caught this (SC-007)

Not optional — a regression test that passes against the broken code is not a
regression test.

```bash
git stash                       # revert the source change, keep the specs
pnpm test -- src/core/cache/cache.store.factory.spec.ts
# expect: FAILURES
git stash pop
pnpm test -- src/core/cache/cache.store.factory.spec.ts
# expect: PASS
```

---

## Results log

> §7 was executed by the automated SDD run. **§2 and §3 were executed
> afterwards, by hand, against the shared dev stack** on 2026-08-03 — see the
> run record below. §1, §4, §5 and §6 remain unrun.
>
> **Amended after code review (PR #6331).** The "Cache connection lost" record
> observed in §2 arrived via `on_info_cmd`'s ready-check path
> (`redis/index.js:432`), which emits unconditionally — *not* via the socket
> path (`index.js:341`), which emits only when no `retry_strategy` is
> configured, and one is. So that record was a timing race on an `INFO` being in
> flight when the container stopped, and §2 could not have distinguished a
> working detector from a broken one. A `reconnecting` listener now covers the
> socket path. The case that discriminates the two is **§4 (Redis down at
> boot)**, which was never run — it is written up as MT-1 in
> [`manual-tests-review-fixes.md`](./manual-tests-review-fixes.md), together with
> the cases for the other nine review findings.

| § | Criterion | Requirement | Result |
|---|---|---|---|
| 1 | Defect reproduces on `develop` | — | *not run — the crash is already evidenced by the #6330 report* |
| 2 | API survives the outage, one record, requests answered | AC1 · FR-001, FR-005, FR-006 | **PARTIAL** — process survived and the cache degraded correctly; **SC-009 FAILED** (see run record) |
| 3 | Automatic recovery, no restart, 2 records per cycle | AC4 · FR-011 – FR-014 | **PASS** — same PID, second record, 200 in 3 ms |
| 4 | Boots with Redis already down | US1-4 | *not run* |
| 5 | Worker survives, no log flood | AC2 · FR-002, FR-010a | *not run* |
| 6 | `deleteUser` succeeds with Redis down | AC5 · SC-006 | *not run — server#6315 was abandoned, so the check it was blocking no longer exists* |
| 7 | Tests / build / lint green | — | **PASS** — 7457 passed / 7 skipped; build exit 0; lint exit 0 |
| 7 | New tests fail against the unfixed behaviour | SC-007 | **PASS** — 11 targeted failures with the fix reverted, 0 with it restored |

### Run record — 2026-08-03, §2 and §3, shared dev stack

Build from this branch at `8333e6ea7`, `node dist/main` as PID 2963681 on
`:4000`. Redis was `alkemio_dev_redis`; note that `:6379` is a Traefik-published
route to that same container (verified with a marker key written on one port and
read back on the other), so `docker stop` is a total outage, not a partial one.
Outage window 18:00:22 → 18:03:45, i.e. **3 m 23 s**.

**What passed**

| Observation | Evidence |
|---|---|
| Process survived the outage | PID 2963681 before, during and after — no exit, no restart |
| The crash signature is now handled, not fatal | `WARN [cache] Cache connection lost … Ready check failed: Redis connection lost and command aborted. (code: UNCERTAIN_STATE)` — the exact `AbortError` from the #6330 report, arriving as one log record |
| Exactly one record per transition (FR-017, SC-004) | 2 `[cache]` records for the whole cycle: one on loss, one on `Cache connection re-established; caching has resumed.` No per-retry flood over 3 m 23 s |
| Automatic recovery (AC4, FR-011–FR-014) | After `docker start`, same PID, `200` in 3.5 ms / 2.7 ms / 6.4 ms with no operator action |

**What failed — SC-009, and it is not the cache's fault**

`§2`'s pass criteria require *"no request slower than ~1 s"* and requests
answered normally. Neither held:

- Every request during the outage returned **HTTP 401 `session_store_unavailable`**
  (`UNAUTHENTICATED`, numericCode 11101) — including **unauthenticated** queries
  that answered `200` seconds earlier. `{ platform { id } }` went `200` → `401`
  → `200` across the cycle.
- Requests took roughly **42 seconds** each during the outage, not the sub-second
  fail-fast SC-009 specifies. A 10-request loop that takes 13 s normally ran past
  a 120 s ceiling.

The cause is outside this feature. The rejection is raised by the OIDC
cookie-session strategy — `src/core/auth/oidc/strategies/cookie-session.errors.ts`
and its exception filter — reached via `src/core/interceptors/auth.interceptor.ts:213`.
That path uses **`ioredis`**, not the cache client this feature hardens, and it is
**pre-existing on `develop`**: both files are present there unmodified, and this
branch changes neither.

So the two halves of #6330's "Expected behavior" split cleanly:

- *"a Redis outage should not terminate the process"* — **fixed and demonstrated.**
- *"a Redis outage should be a degradation"* — **not yet true at the platform
  level.** The process now survives, but the session store fails closed, so the
  API is still effectively unavailable during a Redis outage. It fails without
  crashing instead of failing by crashing.

This is a separate defect in a separate subsystem and is **not** in scope here;
it needs its own story. Recorded rather than silently fixed, and SC-009 is left
marked FAILED rather than quietly reworded to match what was observed.

**Not established**: SC-001 requires a continuous **10-minute** outage window.
This run observed 3 m 23 s. Process survival beyond that is untested.
