# Quickstart: verifying Redis session-store resilience

**Feature**: `109-redis-session-store-resilience` · **Story**: [server#6332](https://github.com/alkem-io/server/issues/6332)
**Satisfies**: FR-031, and the properties of SC-001 – SC-007 that are not reachable from a unit test

## Why this document exists

Most of this feature is covered by unit specs that fail against `develop`
@ `caa1a0d33` and pass after the change (each `contracts/*.md` carries its own
*Test obligations* table). Two properties are not reachable that way:

1. **That a real process, holding real connections, degrades rather than stops
   answering when Redis is killed out from under it.** Asserting that needs a live
   Redis and the ability to stop it mid-flight. `docs/testing-flakiness.md` is
   explicit that bolting a live infrastructure dependency onto the unit suite is an
   anti-pattern this project has already paid for.
2. **That the new regression specs actually fail against the unfixed code**
   (FR-031). A test that has never been observed failing is an assertion about the
   test, not about the defect.

This is also, verbatim, the procedure that
`108-redis-outage-resilience` recorded as **SC-009 FAILED** — see §7. Closing that
is the point of this feature.

## Prerequisites

```bash
pnpm install
pnpm run start:services      # PostgreSQL, RabbitMQ, Redis, Ory Kratos/Oathkeeper
pnpm run migration:run
```

The Redis container is `alkemio_dev_redis` (`quickstart-services.yml`, service
`redis`). `:6379` on the dev stack is a Traefik-published route to that same
container, so stopping it is a **total** outage, not a partial one.

Two terminals: one running the server, one issuing commands.

### On ports — this matters for comparability

| Origin | What it is | Used below for |
|---|---|---|
| `localhost:4000` | the server's own GraphQL port (`alkemio.yml`: `port: ${GRAPHQL_PORT}:4000`) | **all GraphQL probes** |
| `localhost:3000` | the Traefik/Oathkeeper gateway in front of it | the REST route, as `108-redis-outage-resilience` used |

The GraphQL probes deliberately hit `:4000` **because that is where the issue's
recorded evidence was measured** — the `2.29 s / 32.55 s / 42.04 s` baseline this
feature is judged against. Running the "after" measurement through the gateway
while the "before" was taken direct would not be a like-for-like comparison, and
the gateway has its own dependencies that could mask or add latency. The REST
check stays on `:3000` because that is the path a browser actually takes and the
path 108 verified.

---

## §1 — Reproduce all three defects on `develop` first

**Do this before applying the change.**

```bash
git worktree add ../server-6332-baseline caa1a0d33   # or: git stash
cd ../server-6332-baseline && pnpm install && pnpm start:dev
```

Baseline, everything healthy:

```bash
# D1 probe — a query that needs no authentication and sends no cookies
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' \
  -X POST http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ platform { id } }"}'
# expect: 200  ~0.02s
```

Kill Redis:

```bash
docker stop alkemio_dev_redis
```

**D1 — the cookie-less request must not be affected, and is.** Repeat the same
cookie-less query three times:

```bash
for i in 1 2 3; do
  curl -s -o /tmp/d1.json -w '%{http_code} %{time_total}s\n' \
    -X POST http://localhost:4000/graphql \
    -H 'Content-Type: application/json' \
    -d '{"query":"{ platform { id } }"}'
done
cat /tmp/d1.json
```

*Expected on `develop`*: `401` after **tens of seconds** each — the reference run
recorded `2.29 s`, `32.55 s`, `42.04 s` — with the body
`{"errors":[{"message":"session_store_unavailable","extensions":{"code":"UNAUTHENTICATED","numericCode":11101}}]}`.
The 42 s is not four sequential 10.5 s commands; it is one command waiting for the
next `maxRetriesPerRequest` flush boundary, whose period saturates at
`21 × 2000 ms` (research R1).

**D3 — a cookie-bearing GraphQL request must be 503, and is not.** With a session
cookie in a jar from an interactive login (`.claude/commands/interactive-login.md`):

```bash
curl -s -b /tmp/alkemio.jar -o /tmp/d3.json -D /tmp/d3.headers \
  -w '%{http_code} %{time_total}s\n' \
  -X POST http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ me { user { id } } }"}'
grep -i 'retry-after\|set-cookie' /tmp/d3.headers
```

*Expected on `develop`*: **HTTP 500**, not the 401 the issue measured and not the
503 FR-022b specifies — because `express-session` reads the store *before* any
authentication code runs, fails, and calls `next(err)` into a middleware chain with
no error handler (research R6, spec Clarification Q1). No `Retry-After`. This is the
third wrong answer, and it is the one nobody had measured.

**D2 — the raw console write.** The server terminal shows
`[ioredis] Unhandled error event: …` — unstructured, not Winston, not correlated,
one per reconnection attempt (research R4).

```bash
docker start alkemio_dev_redis
cd - && git worktree remove ../server-6332-baseline --force
```

→ **Records the "before" for SC-001, SC-002, SC-003, SC-007**

---

## §2 — SC-010 / FR-031: the new specs must fail against `develop`

The honest form of this check runs the *new* specs against the *old* code.

**Note the pathspec.** Every spec in this repository is co-located with the code
it covers, as `src/**/*.spec.ts`. A naive `git stash push -- src/` would therefore
stash the new specs along with the fix and prove nothing at all; the exclusion is
what makes this check mean what it says.

```bash
# from the story worktree, with the change applied
git stash push -- 'src/' ':(exclude)src/**/*.spec.ts'   # revert the fix, KEEP the specs
git status --short src/ | grep -c '\.spec\.ts'          # sanity: the specs are still here

pnpm test -- src/core/redis src/core/auth/oidc/session-id.resolver.spec.ts \
             src/core/auth/oidc/strategies/cookie-session.strategy.spec.ts \
             src/core/interceptors/auth.interceptor.spec.ts
```

*Expected*: failures in every group — the sid-resolution specs (module absent), the
strategy's "zero store calls when cookie-less" spec, the interceptor's 503 specs,
the factory specs. Record the count.

```bash
git stash pop
pnpm test -- src/core/redis src/core/auth/oidc src/core/interceptors
```

*Expected*: all green.

→ **SC-010 · FR-028, FR-029, FR-030, FR-031**

---

## §3 — SC-001: anonymous traffic is unaffected by the outage

Server running from the story branch, Redis healthy:

```bash
pnpm start:dev
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' \
  -X POST http://localhost:4000/graphql \
  -H 'Content-Type: application/json' -d '{"query":"{ platform { id } }"}'
# baseline: 200, ~0.02s
docker stop alkemio_dev_redis
```

Now the same request, ten times:

```bash
for i in $(seq 10); do
  curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' \
    -X POST http://localhost:4000/graphql \
    -H 'Content-Type: application/json' -d '{"query":"{ platform { id } }"}'
done
```

**Pass criteria**: every sample `200`, every `time_total` ≤ 0.25 s. Not one of them
may touch Redis — cross-check by confirming the server log shows **no** new session
warnings for these requests.

→ **US1 · FR-001 – FR-003 · SC-001**

---

## §4 — SC-002/SC-003/SC-004: a signed-in request gets a fast, honest 503

With Redis still stopped and the session cookie jar from §1:

```bash
curl -s -b /tmp/alkemio.jar -o /tmp/s4.json -D /tmp/s4.headers \
  -w '%{http_code} %{time_total}s\n' \
  -X POST http://localhost:4000/graphql \
  -H 'Content-Type: application/json' -d '{"query":"{ me { user { id } } }"}'

grep -i 'retry-after' /tmp/s4.headers            # expect: Retry-After: 5
grep -i 'set-cookie' /tmp/s4.headers             # expect: the SAME cookie value re-asserted,
                                                 #         with Secure/Domain/Max-Age; NO max-age=0
cat /tmp/s4.json
```

**Pass criteria**:

- status **503**, `time_total` **< 1 s** (against 42.04 s before);
- `Retry-After: 5` present;
- `Set-Cookie` re-asserts the presented value and does **not** expire it;
- no `UNAUTHENTICATED`, no `numericCode 11101`.

Repeat against a REST route to confirm the shipped path is unchanged:

```bash
curl -s -b /tmp/alkemio.jar -o /dev/null -D - -w '%{http_code}\n' \
  http://localhost:3000/api/auth/oidc/id-token-hint | grep -i 'retry-after\|^HTTP'
```

→ **US2 · FR-016 – FR-021 · SC-002, SC-003, SC-004**

---

## §5 — SC-005/SC-006/SC-007: sustained outage, then recovery

Note the PID before starting:

```bash
pgrep -f 'node.*dist/main' | tee /tmp/pid.before
```

Leave Redis down for **at least 3 minutes**, sampling every 10 s:

```bash
for i in $(seq 18); do
  printf '%s ' "$(date +%T)"
  curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' \
    -X POST http://localhost:4000/graphql \
    -H 'Content-Type: application/json' -d '{"query":"{ platform { id } }"}'
  sleep 10
done
```

Then recover:

```bash
docker start alkemio_dev_redis
sleep 5
curl -s -b /tmp/alkemio.jar -o /dev/null -w '%{http_code} %{time_total}s\n' \
  -X POST http://localhost:4000/graphql \
  -H 'Content-Type: application/json' -d '{"query":"{ me { user { id } } }"}'
pgrep -f 'node.*dist/main' | diff - /tmp/pid.before && echo 'SAME PID'
```

**Pass criteria**:

- every anonymous sample `200` for the whole window;
- **same PID** throughout — no restart, no crash;
- the signed-in request returns to `200` within one retry interval, with **no
  re-authentication** (the cookie survived §4);
- the server log contains **exactly two** session-connection records for the whole
  cycle — one loss, one recovery — **per client**, so at most four for two clients,
  and no per-attempt flood over ≥ 3 minutes;
- **zero** `[ioredis] Unhandled error event:` console writes.

→ **US2-5, US3 · FR-012, FR-023 – FR-027 · SC-005, SC-006, SC-007**

---

## §6 — SC-008/SC-009: nothing else moved

```bash
# SC-009 — no ioredis client outside the factory
grep -rn "new Redis(" src/ --include='*.ts' | grep -v 'redis.client.factory.ts'
# expect: no output

# SC-008 — 107-oidc-session-revocation's behaviour is untouched
pnpm test -- src/core/auth/oidc
```

**Pass criteria**: the grep is empty; the OIDC suite is green with no spec in it
rewritten to accommodate this change other than the two harnesses that must now
present a session cookie (`cookie-session.strategy.spec.ts`,
`cookie-session.strategy.index.spec.ts`) — which is the behaviour change itself,
not an accommodation of it.

→ **SC-008, SC-009**

---

## §7 — SC-011: close 108's failed criterion

Re-run `specs/108-redis-outage-resilience/quickstart.md` §2 against this branch.
That section's SC-009 clause — *"latency stays sane; nothing waits tens of seconds"*
— was recorded **FAILED** on 2026-08-03 because, although the cache degraded
exactly as designed, every request still returned `401 session_store_unavailable`.

**Pass criteria**: with this change, §2 of that quickstart passes in full: the
process survives, the cache emits its two records, requests are answered, and
nothing waits tens of seconds.

→ **SC-011**

---

## Results

| § | Criterion | Requirement | Result |
|---|---|---|---|
| 1 | All three defects reproduce on `develop` @ `caa1a0d33` | — | **PASSED** (statically, 2026-08-03/04) — every anchor re-verified present on `caa1a0d33`: the strategy resolves `req.sessionID` then unconditionally calls `sessionStore.get(sid)`; `oidc-core.module.ts:46` and `main.server.ts:105` are both bare `new Redis({host, port})` while `health.module.ts:37` already carried the four fail-fast options; the interceptor allow-list preserves only `BearerValidationError` and `CookieSessionInvalidError`. Live re-measurement not re-run — see the note below. |
| 2 | New specs fail before the fix, pass after | FR-031 · SC-010 | **PASSED** (2026-08-04) — see the FR-031 record below. |
| 3 | Anonymous traffic unaffected by the outage | US1 · FR-001 – FR-003 · SC-001 | **NOT RUN** — requires stopping the shared dev Redis. See note. |
| 4 | Signed-in request → fast 503 + `Retry-After`, cookie preserved | US2 · FR-016 – FR-021 · SC-002 – SC-004 | **PARTIAL** — the 503 wire shape is covered at unit level by U1–U4 and U9; the end-to-end HTTP walk is **NOT RUN** (see note). The *fail-fast* half of SC-002 was measured live against a disposable Redis on 2026-08-04 — see "Scoped live measurement" below. |
| 5 | 3-minute outage survived, one record per transition, automatic recovery | US2, US3 · FR-012, FR-023 – FR-027 · SC-005 – SC-007 | **NOT RUN** — same. Covered at unit level by F6–F8 and the reporter specs. |
| 6 | No client outside the factory; 107's behaviour intact | SC-008, SC-009 | **PASSED** — SC-009 is enforced *continuously* by the F10 structural guard in `redis.client.factory.spec.ts`, not merely checked once by hand. SC-008: the OIDC suite passes with no spec rewritten to accommodate this change beyond presenting a signed cookie — which is the behaviour change itself, not an accommodation of it. |
| 7 | 108 §2 SC-009 now passes | SC-011 | **NOT RUN** — requires the live outage. |
| — | Tests / build / lint green | — | **PASSED** (2026-08-04) — `pnpm test` 686 files / 7700+ tests; `pnpm run build`; `pnpm run lint` (typecheck:native + biome). |

### Why §3, §4, §5 and §7 were not run

They require `docker stop alkemio_dev_redis` for at least three minutes. On the
machine this was implemented on, that container is shared by ~20 running services
(Synapse, Kratos, Hydra, the OIDC service, the collaboration services), so
stopping it is not a scoped test action — it is an outage of a working
environment. These criteria are therefore recorded as **NOT RUN**, not as passed,
and the PR is opened as a draft naming them as the outstanding verification.

This is deliberate. The entire reason this feature exists is that
`108-redis-outage-resilience` recorded its SC-009 as **FAILED** rather than
rewording the criterion to match what happened. Recording "not run" as "passed"
would be the same failure of discipline, one step earlier.

To close them, run §3–§5 and §7 against a disposable stack.

### Scoped live measurement — SC-002's fail-fast half (2026-08-04)

The one claim that does **not** need the shared stack is the load-bearing one:
that the factory's option set turns a disconnected client from a multi-second
hang into an immediate rejection. That was measured directly, against a
throwaway `redis:7-alpine` on port **63799** — never `alkemio_dev_redis`, which
was left running untouched throughout.

Two clients were built against the same throwaway instance: one with the exact
option set from `src/core/redis/redis.client.factory.ts`, one with `develop`'s
bare `new Redis({ host, port })`. The container was then stopped and both were
asked for the same key.

| Client | Redis up | Redis down | Failure mode |
|---|---|---|---|
| factory-tuned | 0 ms `OK` | **1 ms** | `Stream isn't writeable and enableOfflineQueue options is false` |
| bare (`develop`) | 0 ms `OK` | **9015 ms** | `Reached the max retries per request limit (which is 20)` |

→ **SC-002 fail-fast: PASSED** (1 ms, budget < 1000 ms), and the bare client
reproduces the pre-fix hang at 9015 ms — confirming both that the defect is real
and that `enableOfflineQueue: false` is what removes it.

This does **not** close SC-002 in full: it measures the Redis client, not an
end-to-end HTTP request, so the request-level budget still needs the live walk.
It is recorded here as partial evidence, not as the criterion.

### FR-031 / SC-010 — the regression specs observed FAILING against `caa1a0d33`

Run 2026-08-04. Method: `git checkout caa1a0d33 -- src/ test/`, then **delete the
four new source modules** — a pathspec checkout restores tracked files but does
NOT remove files that did not exist at that commit, a trap worth naming because
without the deletion the factory survives and the check quietly passes for the
wrong reason — then restore the new spec files on top and run.

```
Test Files  6 failed (6)
     Tests  28 failed | 42 passed (70)
```

| Spec | Observed failure on `caa1a0d33` |
|---|---|
| `session-id.resolver.spec.ts` | `Cannot find module './session-id.resolver'` — the guard does not exist |
| `redis.client.factory.spec.ts` | `Cannot find module './redis.client.factory'` — no shared seam; this file also carries the F10 SC-009 guard |
| `redis.connection.reporter.spec.ts` | `Cannot find module './redis.connection.reporter'` — no transition reporting at all |
| `cookie-session.strategy.spec.ts` (**FR-028**) | all three "performs ZERO store operations" cases fail — the pre-fix strategy calls `sessionStore.get()` for cookie-less requests |
| `auth.interceptor.spec.ts` (**FR-030**) | U1, U2, U3, U9 and the cookie re-assertion all fail — the error is wrapped into `AuthenticationException` (401 / 11101) before the 503 arm is reachable |
| `cookie-session.exception-filter.spec.ts` | `applyStoreUnavailableResponse is not a function` — no shared wire-shape definition; the shipped `send503` re-asserted only 3 of the 6 cookie attributes |

The 42 that passed are the deliberate guards — U5, U6 and the pre-existing
behaviour they pin — which must pass on *both* sides of the fix, precisely
because they assert what must NOT change.

Record failures as **FAILED** with the observed values. Do not reword a criterion
to match what happened — that discipline is what produced this feature.
