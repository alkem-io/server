# Quickstart: verifying Redis outage resilience

**Feature**: `107-redis-outage-resilience` · **Story**: [server#6330](https://github.com/alkem-io/server/issues/6330)
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

**Pass criteria**: process alive, requests answered, one log record, no request
slower than ~1 s. → **AC1 / US1 / FR-001, FR-005, FR-006**

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
`../agents-hq/specs/107-oidc-session-revocation/quickstart.md §6`
("Redis down at deletion → deletion succeeds").

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

| § | Criterion | Requirement | Result |
|---|---|---|---|
| 1 | Defect reproduces on `develop` | — | |
| 2 | API survives the outage, one record, requests answered | AC1 · FR-001, FR-005, FR-006 | |
| 3 | Automatic recovery, no restart, 2 records per cycle | AC4 · FR-011 – FR-014 | |
| 4 | Boots with Redis already down | US1-4 | |
| 5 | Worker survives, no log flood | AC2 · FR-002, FR-010a | |
| 6 | `deleteUser` succeeds with Redis down | AC5 · SC-006 | |
| 7 | Tests / build / lint green; new tests fail on `develop` | SC-007 | |
