# Feature Specification: Redis outage must degrade authentication, not reject all traffic

**Feature Branch**: `story/6332-redis-session-store-resilience`

**Created**: 2026-08-03

**Status**: Clarified (3 clarification iterations)

**Input**: User description: alkem-io/server#6332 — "BUG: Redis outage makes the API reject every request (~42s hang, 401 session_store_unavailable) — untuned session ioredis clients + anonymous requests hitting the store"

## Context

This is the second half of a two-part resilience defect. server#6330 (spec
`108-redis-outage-resilience`, PR #6331, merged as `caa1a0d33`) fixed the **cache**
client, which used to kill the process outright during a Redis outage. Live
verification of that fix confirmed the cache layer now behaves exactly as designed
— and simultaneously demonstrated that the platform is *still* fully unavailable
during a Redis outage. It now fails **without** crashing instead of failing **by**
crashing. That verification recorded **SC-009 as FAILED** in
`specs/108-redis-outage-resilience/quickstart.md` rather than rewording the
criterion; the write-up is at
<https://github.com/alkem-io/server/pull/6331#issuecomment-5168134848>.

The residual fault is in the **OIDC session layer**, which uses `ioredis` (a
different client from the cache's `redis@3.1.2`), and is entirely pre-existing on
`develop`. Three independent defects combine:

| # | Defect | Site on `develop` @ `caa1a0d33` |
|---|---|---|
| D1 | Every request performs a session-store lookup, including requests that carry no session cookie, because the strategy trusts the `sessionID` express-session generates for *every* request | `src/core/auth/oidc/strategies/cookie-session.strategy.ts` |
| D2 | Both session `ioredis` clients are constructed bare — `new Redis({ host, port })` — inheriting defaults that queue commands for ~10.5 s each instead of failing fast | `src/core/auth/oidc/oidc-core.module.ts`, `src/main.server.ts` |
| D3 | Store-unreachable is wrapped into an authentication failure before its own exception filter can see it, so it surfaces as 401 rather than 503 | `src/core/interceptors/auth.interceptor.ts` |

The measured signature on `develop` @ `8a15aee5b` + #6331 (server PID 3038709):

```text
baseline (cookie-less { platform { id } })   200   0.025 s
docker stop alkemio_dev_redis
      401   2.29 s
      401  32.55 s
      401  42.04 s
docker start alkemio_dev_redis
      200   0.0089 s / 0.0024 s / 0.0038 s
```

The knowledge required to fix D2 already exists inside this repository twice over
— the health probe (`src/core/health/health.module.ts`) sets the exact options that
make a client fail fast, with a comment explaining why, and #6331 introduced
`src/core/cache/cache.store.factory.ts` as the single construction point for the
cache client. Neither was propagated to the two clients every request depends on.
This feature therefore closes the *class* of defect (per-site Redis client
construction with no shared seam) rather than this instance of it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An unauthenticated visitor keeps browsing during a Redis outage (Priority: P1)

A person who is not signed in — a search-engine crawler, a first-time visitor
reading a public space, an anonymous GraphQL client — sends a request that carries
no session cookie at all. Their request needs no session, so whether the session
store is reachable is none of their business. Today it is: their request is
delayed for tens of seconds and then rejected.

**Why this priority**: This is the difference between "signed-in users cannot
authenticate" (a degradation) and "the platform is down" (an outage). It is the
largest blast-radius reduction available and it is independent of the other two
stories: even if the store stayed slow and even if the status code stayed wrong,
fixing this alone restores the entire anonymous surface. It is also the cheapest
to verify — a `curl` with no cookie jar.

**Independent Test**: With the session store unreachable, issue a GraphQL query
that requires no authentication and no cookies (`{ platform { id } }`) and observe
a normal, prompt success. At the unit level, assert that the cookie-session
strategy performs zero session-store calls for a request bearing no session
cookie.

**Acceptance Scenarios**:

1. **Given** the session store is unreachable, **When** a client sends a request
   with no session cookie, **Then** the response is the same success the client
   would have received with the store healthy, in the same order of magnitude of
   time, and the session store is never consulted.
2. **Given** the session store is healthy, **When** a client sends a request with
   no session cookie, **Then** the request resolves as anonymous exactly as it does
   today and the session store is never consulted.
3. **Given** the session store is healthy, **When** a client sends a request
   carrying a valid session cookie, **Then** the session is resolved from the store
   and the actor is authenticated exactly as it is today.
4. **Given** a client sends a session cookie whose signature does not verify (or
   which is otherwise not the cookie the server's session middleware accepted),
   **When** the request is authenticated, **Then** the request resolves as anonymous
   and the session store is never consulted with an identifier the client supplied.

---

### User Story 2 - A signed-in user gets a fast, honest answer during a Redis outage (Priority: P1)

A signed-in user's browser sends its session cookie. The session store is
unreachable, so the server genuinely cannot tell whether that session is valid.
The user must learn this in well under a second, not after a 42-second hang, and
must learn it as "the service is briefly unavailable, retry" rather than "your
session is invalid, sign in again".

**Why this priority**: Equal-first with US1 because it is the correctness half of
the same incident. A 42-second hang holds a connection, a worker slot and the
user's attention; and a 401 tells a single-page application to tear down the
user's session, so a Redis blip presents as a forced logout — potentially a
redirect loop — instead of a five-second wobble. Cookie preservation is what makes
recovery automatic rather than requiring a fresh sign-in.

**Independent Test**: With the session store unreachable, issue a GraphQL request
carrying a session cookie and observe a sub-second 503 response with a
`Retry-After` header and no cookie clearance. Testable at the unit level against
the client-options contract (bounded latency, no offline queueing) and against the
authentication interceptor (error type preserved, transport-correct status).

**Acceptance Scenarios**:

1. **Given** the session store is unreachable, **When** a signed-in client sends a
   GraphQL request carrying its session cookie, **Then** the response arrives in
   under one second.
2. **Given** the session store is unreachable, **When** a signed-in client sends a
   GraphQL request carrying its session cookie, **Then** the response is HTTP 503
   carrying a `Retry-After` header, not HTTP 401.
3. **Given** the session store is unreachable, **When** a signed-in client sends a
   request carrying its session cookie, **Then** the response does not clear or
   expire the session cookie, and re-asserts it so the cookie jar stays warm.
4. **Given** the session store is unreachable, **When** a signed-in client sends a
   request to a non-GraphQL (REST) route, **Then** it receives the same 503 +
   `Retry-After` + cookie-preserving answer it receives today.
5. **Given** the session store becomes reachable again, **When** the same client
   retries, **Then** its session resolves normally with no re-authentication and no
   operator action.

---

### User Story 3 - An operator sees one clear signal per outage transition (Priority: P2)

An operator watching logs during a Redis outage needs to know the session layer
lost its store, and later that it recovered — once each, not once per reconnection
attempt and not as an unstructured console dump from inside a third-party library.

**Why this priority**: Lower than the two availability stories because it changes
no user-visible behaviour, but it is not optional: the constitution forbids silent
failure paths, and the session clients currently have no error listener at all, so
their failures are emitted by `ioredis` itself via a raw console write that
bypasses the platform's structured logging entirely. It also mirrors the signal
shape #6331 established for the cache, so an operator reads one incident rather
than two dialects of one.

**Independent Test**: Drive a client through loss and recovery and assert exactly
one structured "lost" record and exactly one structured "recovered" record, with no
per-attempt flood, and no credentials in either.

**Acceptance Scenarios**:

1. **Given** the session store connection is healthy, **When** it is lost, **Then**
   exactly one structured warning is recorded for that transition.
2. **Given** the session store connection has been reported lost, **When**
   reconnection attempts repeatedly fail, **Then** no further records are produced
   for those attempts.
3. **Given** the session store connection has been reported lost, **When** it is
   re-established, **Then** exactly one structured recovery record is produced and
   the reporter re-arms for the next outage.
4. **Given** any of the above, **When** the record is written, **Then** it contains
   no credentials, no connection options and no command arguments.

---

### User Story 4 - The next Redis client cannot be built wrong (Priority: P3)

An engineer adding a future `ioredis` client — a rate limiter, a lock, a queue —
gets the resilient options by default, because there is exactly one place a client
is constructed and it is the obvious one to reach for.

**Why this priority**: Lowest, because it delivers no behaviour on its own. It is
nevertheless the point of the exercise: #6330 was one unsafe bootstrap copy-pasted
into two modules and #6332 is one safe bootstrap that was never propagated to the
two clients that mattered — the same root cause pointing in opposite directions.
Fixing the two instances without the seam guarantees a third instance.

**Independent Test**: Assert that no `ioredis` client is constructed outside the
shared factory, and that the factory's defaults match the fail-fast contract.

**Acceptance Scenarios**:

1. **Given** the codebase after this change, **When** every `ioredis` construction
   site is enumerated, **Then** each one is the shared factory or a call to it.
2. **Given** a caller that passes only host and port, **When** a client is built,
   **Then** it carries the fail-fast options without the caller naming them.
3. **Given** a caller with a genuinely different need (a probe that must not
   connect eagerly), **When** it builds a client, **Then** it can express that
   difference through the factory rather than by bypassing it.

### Edge Cases

- **A request with no session cookie while the store is healthy.** Must resolve as
  anonymous with zero store calls — the same outcome as today, reached without the
  wasted round trip.
- **A request whose session cookie fails signature verification.** The session
  middleware rejects it and generates a fresh identifier. The strategy must not
  mistake that generated identifier for the client's, and must not fall back to
  using the raw cookie value as a lookup key — that would let a caller name any
  session identifier it liked and have it looked up, which is a session-forgery
  vector rather than a resilience improvement.
- **A WebSocket/subscription upgrade.** These bypass the Express pipeline; the
  server replays the cookie and session middleware onto the upgrade request. If that
  replay has not happened, no session cookie is visible, so the connection resolves
  as anonymous rather than erroring.
- **The very first request after process start, before the client's initial
  connection completes.** With offline queueing disabled, a command issued in that
  window fails immediately. Cookie-less requests are unaffected (they issue no
  command); a cookie-bearing request in that window receives the 503 answer, which
  is the truthful one.
- **The store is reachable but unresponsive** (accepting the connection, never
  answering). A latency ceiling must apply, otherwise fail-fast covers only the
  refused-connection case and the hang returns in a subtler form.
- **The store fails midway through an in-flight command.** Bounded retry, then
  fail — not the default twenty attempts.
- **An outage that outlives every retry budget.** The client must never permanently
  abandon the store; recovery must need no restart and no operator action.
- **A one-off, non-connection error** (a reply error, a parser fault) while the
  connection is up. Must not latch the connection signal into a permanently-down
  state, which would suppress reporting for the remainder of the process's life.
- **The absolute-TTL, tombstone, subject-revocation and self-healing-index
  behaviours** established by spec `107-oidc-session-revocation` for a session that
  *is* resolved. Unchanged; this feature only alters whether the lookup happens at
  all and how an unreachable store is reported.
- **Concurrent outage of cache and session store** (the realistic case — one Redis).
  Both layers degrade independently; neither may crash the process, and the union
  of their log output must remain two transitions per layer, not a flood.

## Requirements *(mandatory)*

### Functional Requirements

#### Anonymous requests must not touch the session store (D1)

- **FR-001**: The system MUST NOT issue any session-store operation for a request
  that does not carry a session cookie.
- **FR-002**: The system MUST determine "carries a session cookie" from the request
  as received, not from an identifier the server generated for that request.
- **FR-003**: The system MUST resolve a request with no session cookie to the
  anonymous actor, unchanged in every other respect from today's behaviour.
- **FR-004**: The system MUST NOT use a client-supplied cookie value as a
  session-store lookup key. Only an identifier the server's session middleware has
  itself accepted and unsigned may be used.
- **FR-005**: When a session cookie is present but was not accepted by the session
  middleware (bad signature, unrecognised format), the system MUST resolve the
  request as anonymous without consulting the session store.
- **FR-006**: For a request that does carry an accepted session cookie, the system
  MUST perform session resolution exactly as it does today, preserving every
  behaviour specified by `107-oidc-session-revocation` (tombstone → 401,
  subject-revocation marker → 401, absolute-TTL ceiling → 401, self-healing index
  write, request-scoped actor-context copy).

#### Session store clients must fail fast (D2)

- **FR-007**: Every `ioredis` client in the system MUST be constructed through a
  single shared factory.
- **FR-008**: A client MUST reject a command issued while the connection is known
  to be down, immediately, rather than queueing it for later delivery.
- **FR-009**: A command issued against a connection that is up but unresponsive
  MUST fail within a bounded ceiling well under one second.
- **FR-010**: A command interrupted by connection loss MUST be retried at most a
  small bounded number of times before failing.
- **FR-011**: Establishing a connection MUST be subject to a bounded timeout.
- **FR-012**: A client MUST continue attempting to reconnect for the entire
  duration of an outage and MUST NOT permanently abandon the store, so recovery
  requires no restart and no operator action.
- **FR-013**: Construction MUST NOT throw and MUST NOT block on a live connection,
  so a store that is unreachable at boot cannot abort process startup.
- **FR-014**: The factory MUST allow a caller with a genuinely different
  requirement to express it (for example, a probe that must not connect eagerly)
  through the factory rather than by bypassing it.
- **FR-015**: The change MUST introduce no new configuration key and MUST require
  no deployment, manifest or environment change.

#### Store-unreachable must surface as 503 on every transport (D3)

- **FR-016**: The system MUST preserve the store-unreachable error type through the
  authentication pipeline instead of converting it into an authentication failure.
- **FR-016a**: A store failure raised by the **session middleware itself** — which
  reads the store before any authentication code runs, and therefore fails first
  during a total outage — MUST produce the same 503 + `Retry-After` +
  cookie-preserving answer, not a generic server error. (See Clarification Q1: on
  `develop` this path produces an unhandled middleware error, i.e. HTTP 500 with a
  stack page, because no error-handling middleware follows the session middleware.)
- **FR-017**: On the GraphQL transport, a store-unreachable failure MUST produce a
  wire-level HTTP 503 with a `Retry-After` header.
- **FR-018**: On the GraphQL transport, the error envelope MUST carry a code that
  identifies the condition as a transient service-unavailability, distinct from the
  `UNAUTHENTICATED` code used for a genuine authentication failure.
- **FR-019**: On the REST transport, a store-unreachable failure MUST continue to
  produce the 503 + `Retry-After` + cookie-preserving response established by
  `107-oidc-session-revocation` FR-022b.
- **FR-020**: On every transport, the response to a store-unreachable failure MUST
  NOT clear or expire the session cookie, and MUST re-assert the cookie the client
  presented.
- **FR-021**: The wire shape of the store-unreachable response — HTTP status,
  `Retry-After` header and cookie treatment — MUST be produced from a single shared
  definition, so the layers that can answer this condition cannot drift apart. The
  response *body* is transport-specific by design (Clarification Q16).
- **FR-022**: The authentication routes that exist to establish or tear down a
  session MUST behave no worse than they do today when the store is unreachable.

#### Observability (D2 side-effect)

- **FR-023**: Loss of a session-store connection MUST be reported exactly once per
  outage through the platform's structured logger.
- **FR-024**: Recovery MUST be reported exactly once per outage, and the reporter
  MUST re-arm so a subsequent outage is reported again.
- **FR-025**: Repeated failed reconnection attempts within one outage MUST produce
  no further records.
- **FR-026**: No record may contain credentials, connection options or command
  arguments.
- **FR-027**: An `error` event on a client MUST always have a listener attached, so
  no failure path is silent and none escapes the platform's logger.

#### Regression coverage

- **FR-028**: The system MUST carry an automated test proving that a request with
  no session cookie performs zero session-store operations.
- **FR-029**: The system MUST carry an automated test proving that a store-
  unreachable failure is answered within the bounded latency ceiling rather than
  queued.
- **FR-030**: The system MUST carry an automated test proving that a store-
  unreachable failure on the GraphQL transport is answered 503, not 401, with the
  cookie preserved.
- **FR-031**: Each of FR-028 – FR-030 MUST fail against `develop` @ `caa1a0d33`.
  A regression test that passes before the fix documents nothing.

### Key Entities

- **Session cookie**: what the client presents. Signed; its raw wire value is not a
  store key. What authorises a store lookup is not its presence but its
  *acceptance*: the session middleware must have verified the signature and
  derived `req.sessionID` from this cookie. A presented-but-rejected cookie
  authorises nothing — FR-005 and User Story 1 scenario 4 require zero store calls
  for it, which a presence-only rule would permit.
- **Session identifier (sid)**: the unsigned identifier the session middleware
  derives from an accepted cookie. The only legitimate store-lookup key. Generated
  fresh for every request that has no accepted cookie, which is the entire cause of
  D1.
- **Session store client**: the `ioredis` connection over the `alkemio:sid:<sid>`
  keyspace and the `alkemio:sub:<sub>` subject index. Two instances exist (the
  express-session store's and the OIDC layer's); both are in scope.
- **Redis client factory**: the single construction seam introduced by this feature.
  The `ioredis` counterpart of the cache store factory added by #6331.
- **Connection reporter**: the transition-only signal that turns a stream of
  repeated connection failures into one loss record and one recovery record.
- **Store-unreachable condition**: the distinct error meaning "cannot tell whether
  this session is valid", as opposed to "this session is not valid". The entire
  401-vs-503 distinction rests on keeping these two apart end to end.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the session store stopped, a request carrying no session cookie
  succeeds, with a response time within the same order of magnitude as the
  store-healthy baseline (measured baseline ≈ 25 ms; ceiling 250 ms).
- **SC-002**: With the session store stopped, a request carrying a session cookie
  is answered in under 1 second. (Measured before: 2.29 s / 32.55 s / 42.04 s.)
- **SC-003**: With the session store stopped, a GraphQL request carrying a session
  cookie is answered HTTP 503 with a `Retry-After` header. (Measured before: HTTP
  401, `UNAUTHENTICATED`, numericCode 11101.)
- **SC-004**: No response produced during a store outage clears or expires the
  session cookie; the presented cookie is re-asserted.
- **SC-005**: When the store is restarted, requests return to normal within one
  retry interval, on the same process, with no restart and no operator action.
- **SC-006**: Across a store outage of at least three minutes, each client
  connection emits exactly two log records — one loss, one recovery — regardless of
  the number of reconnection attempts. Scoped per client because the session and
  OIDC clients carry independent reporters, so a shared outage correctly produces
  one pair each rather than one pair in total.
- **SC-007**: The process survives the entire outage on a single PID, with no
  unhandled `error` event and no raw console output from the Redis client.
- **SC-008**: Every session-resolution behaviour specified by
  `107-oidc-session-revocation` is unchanged: its test suite passes untouched.
- **SC-009**: Zero `ioredis` clients are constructed outside the shared factory.
- **SC-010**: The regression tests for FR-028 – FR-030 fail against `develop` @
  `caa1a0d33` and pass after the change.
- **SC-011**: `108-redis-outage-resilience` SC-009 — "a Redis outage degrades the
  platform rather than making it reject all traffic" — passes when re-run, closing
  the criterion that verification recorded as FAILED.

## Assumptions

- **The two session clients and the cache client stay separate connections.** They
  use different libraries against the same Redis, and merging them is a larger
  change than this defect justifies. The shared factory unifies *construction
  options*, not the connections themselves.
- **The health probe's client keeps its distinctive lazy-connect behaviour.** It is
  brought through the shared factory for the sake of FR-007/SC-009, but its
  requirements genuinely differ from a request-path client's, and the factory must
  accommodate that rather than flatten it.
- **`storage.redis` is read exactly as today.** No new key; the fail-fast options
  are behavioural constants of the factory, not deployment surface. Making them
  configurable would invite a deployment to reintroduce the 42-second hang.
- **The express-session middleware's own store calls are already conditional on a
  cookie being present**, so D1's fix is confined to the strategy; the middleware
  needs no change beyond receiving a fail-fast client.
- **A cookie-bearing request during an outage is genuinely unanswerable.** There is
  no "degrade to anonymous" option for it: the server cannot distinguish a valid
  session from an invalid one without the store, and silently downgrading a
  signed-in user to anonymous would present as data disappearing. 503 is the honest
  answer, and it is what `107-oidc-session-revocation` FR-022b already specified.
- **Bounded latency is preferred over correctness of the cached answer.** A command
  that overruns the ceiling is treated as a failure even if the store would have
  answered a moment later.
- **The dev-stack `:6379` route is a Traefik-published route to the same container**,
  so stopping that container is a total outage; verification therefore exercises the
  total-outage case, not a partial one.
- **No GraphQL schema change.** The error status vocabulary is not part of the
  published schema, so introducing a new error status is not a schema-contract event.
- **No database change.** No entity, no migration.

## Out of Scope

- **Merging the two session `ioredis` connections into one.** They have genuinely
  different lifecycles — the express-session store's client is built during the
  Express bootstrap in `main.server.ts`, before the Nest container is usable for
  that purpose, while `OIDC_REDIS_CLIENT` is a Nest provider. #6324 already halved
  the count (three clients → two) and the remaining pair is not what makes the
  outage fatal. Unifying *construction options* closes this defect; unifying the
  *connections* is a separate refactor. (Clarification Q12.)
- **Merging the `ioredis` factory with #6331's `redis@3.1.2` cache store factory.**
  Different libraries, different event vocabularies, different failure modes. A
  common abstraction over both would be an abstraction over an accident.
  (Clarification Q5.)
- **Client-web changes.** 503 + `Retry-After` is the standard transient-unavailability
  signal and needs no bespoke client contract; how the SPA presents a retry is its
  own concern, and today's behaviour (treating this as a 401 logout) is fixed at
  source by this change. (Clarification Q13.)
- **Making the fail-fast values configurable.** (Clarification Q8.)
- **`reset()` / `FLUSHDB` against the shared Redis database**, recorded as a
  follow-up by `108-redis-outage-resilience`. Untouched here.

## Clarifications

### Session 2026-08-03 — iteration 1

Every question below was resolved by decision, not escalation, per the operating
mode for this story. Rationale is recorded so a reviewer can disagree with the
reasoning rather than guess at it.

**Q1 — During a total outage, which layer fails first for a cookie-bearing
request, and what does it currently return?**
*Answer*: The **session middleware**, not the authentication strategy — and on
`develop` it returns HTTP 500, not the 401 the issue measured.
*Rationale*: `express-session` calls `store.get(req.sessionID, …)` for any request
that presents a session cookie, and on a store error calls `next(err)`
(`express-session/index.js:500-504`; `connect-redis@7` surfaces the client
rejection through the callback verbatim). `main.server.ts` registers no
error-handling middleware after the session middleware, so that error reaches
Express's default handler. The issue's measured evidence is all **cookie-less**,
where `express-session` never reads the store — which is precisely why the 401
from the strategy was what got observed. So the cookie-bearing path has a *third*
wrong answer nobody measured. Added as **FR-016a**. This also makes **FR-021**
(one shared definition of the wire shape) load-bearing rather than tidy-minded:
two different layers now answer the same condition, on different transports, and
they must not drift.

**Q2 — What exact latency ceilings?**
*Answer*: connect timeout 500 ms, per-command timeout 500 ms, at most 1 retry per
command, offline queueing disabled.
*Rationale*: The three numbers the health probe already uses (`connectTimeout: 500`,
`maxRetriesPerRequest: 1`, `enableOfflineQueue: false`) are adopted verbatim
because they are this repository's own answer to this exact question, already
carrying a comment explaining themselves. `commandTimeout` is added on top because
the other three only cover *refused* and *interrupted* connections; a store that
accepts the socket and never answers would otherwise hang unbounded. 500 rather
than 1000 ms because a single cookie-bearing request can issue two sequential
store reads (session middleware, then the strategy), and SC-002's budget is 1 s for
the whole request — two 1 s ceilings would spend the entire budget on the failure
path alone.

**Q3 — What error code identifies this on the GraphQL transport?**
*Answer*: A new `AlkemioErrorStatus.SESSION_STORE_UNAVAILABLE`, in
`ErrorCategory.SYSTEM` with specific code 119 (→ numeric code **14119**), carrying
`extensions.http.status = 503`.
*Rationale*: 119 is the one free slot in the SYSTEM band (116, 117, 118 and 120 are
taken). SYSTEM is correct: this is infrastructure unavailability, not an
authorization outcome — reusing the 11xxx band is exactly the conflation the whole
feature exists to undo. Reusing `STORAGE_SERVICE_UNAVAILABLE` was rejected: it
names a different subsystem and its user-facing message would mislead.
`AlkemioErrorStatus` is not part of the published GraphQL schema, so this is not a
schema-contract event.

**Q4 — Which cookie attributes are used when the cookie is re-asserted?**
*Answer*: The full set the session middleware itself issues — `httpOnly`,
`sameSite`, `path`, **`secure`**, **`domain`** and **`maxAge`**.
*Rationale*: The shipped re-assertion (`cookie-session.exception-filter.ts`) sets
only `httpOnly`, `sameSite` and `path`. In any deployment where the cookie is
`secure` and domain-scoped, that writes a *different, weaker* cookie rather than
re-asserting the existing one — and dropping `maxAge` silently downgrades a
persistent cookie to a browser-session cookie. Either outcome inverts the purpose
of FR-020, which is to keep the jar warm. Fixing it is in scope because FR-020
already demands the cookie be preserved, and a partial re-assertion does not
preserve it.

**Q5 — Where does the shared factory live, and does it reuse #6331's cache
reporter?**
*Answer*: New module `src/core/redis/`, containing the `ioredis` client factory and
its own transition reporter. `src/core/cache/` is left untouched.
*Rationale*: `src/core/*` is the constitution's home for cross-cutting core
concerns (§2, Architecture Standards §1). `CacheConnectionReporter` is written
against `redis@3.1.2`'s event semantics — its central argument is that a socket
failure arrives as `reconnecting` rather than `error` when a `retry_strategy` is
configured, which is a `redis@3.1.2` quirk that does not apply to `ioredis`.
Generalising it would mean editing a file merged hours earlier to serve a client it
was not written for, adding review surface for no behavioural gain (constitution
§10). The two reporters are ~40 lines each and honest about being siblings; a note
records the option of converging them later.

**Q6 — Does the health probe keep its lazy-connect behaviour once it goes through
the factory?**
*Answer*: Yes, expressed as an explicit factory option rather than by bypassing the
factory.
*Rationale*: SC-009 wants zero construction sites outside the factory; the probe's
requirement (never connect eagerly, so a boot-time outage cannot affect the probe
surface) is genuinely different from a request-path client's and must survive.
FR-014 exists for exactly this. Flattening the difference would change probe
behaviour as a side-effect of a resilience fix — the sort of collateral change
that makes a bug fix hard to review.

**Q7 — Is the strategy's `req.cookies[name]` fallback kept?**
*Answer*: Removed.
*Rationale*: It is already dead — the raw cookie value is the signed wire form
`s:<sid>.<sig>`, which never matches a Redis key, as the code's own comment says
two lines above the fallback that does it anyway. More importantly it is the wrong
shape to keep: any lookup key derived from client-supplied bytes rather than from
the middleware's verified unsigning is a session-forgery vector waiting for someone
to "fix" the prefix handling. FR-004 forbids the shape, not just this instance.

**Q8 — Are the fail-fast values configurable?**
*Answer*: No. They are behavioural constants of the factory.
*Rationale*: FR-015. A configurable timeout is a configurable way to reintroduce
the 42-second hang, and no deployment has a legitimate reason to want one. This
mirrors the cache factory's identical decision (contract G8), and its deliberate
refusal to accept the `storage.redis.timeout` field for the same reason.

**Q9 — One reporter shared by both session clients, or one each?**
*Answer*: One per client, each constructed with a label naming the client.
*Rationale*: The reporter's whole state is "has this connection's current outage
been reported". Sharing one across two independent connections would make the
second connection's outage invisible whenever the first had already reported, and
would report recovery when only one of the two had recovered. Two labelled records
per outage is the correct output for two connections; SC-006's "exactly two records"
is per connection.

**Q10 — What makes FR-031 ("must fail against `develop`") checkable rather than
aspirational?**
*Answer*: `quickstart.md` records the exact command to run the new specs against a
worktree pinned at `caa1a0d33`, and the expected failure of each.
*Rationale*: This is the discipline #6331 set when it recorded SC-009 as FAILED
instead of rewording it. A regression test that has never been observed failing is
an assertion about the test, not about the defect.

**Q11 — A command times out at the 500 ms ceiling but the store executes it
anyway. What is the contract?**
*Answer*: Treated as a failure; no compensation, no retry-on-timeout.
*Rationale*: Every store operation on this path is either a read (no effect) or an
idempotent write of a value the caller can reconstruct (the self-healing index
top-up, the tombstone). There is no operation whose double execution is harmful,
so at-least-once is safe and a compensation mechanism would be pure risk.

**Q12 — Should the two session clients be merged into one connection?**
*Answer*: No — recorded in Out of Scope with its reasoning.

**Q13 — Does `client-web` need a change to understand 503?**
*Answer*: No — recorded in Out of Scope with its reasoning.

### Session 2026-08-03 — iteration 2

Re-ran the ambiguity sweep across all taxonomy categories after iteration 1's
resolutions landed. Iteration 1's answers introduced three new open questions of
their own; they are resolved here. Categories re-swept with no new findings:
functional scope, data model (none — no persistence change), interaction/UX (none —
no user-facing surface beyond status codes), integration, terminology, assumptions,
testing.

**Q14 — Which component converts a raw client rejection into the
store-unreachable condition on the session-middleware path?** *(follows from Q1)*
*Answer*: The session store wrapper (`buildOidcSessionRedisStore`), so that
`express-session` hands an already-typed error to the error middleware that follows
it. The error-handling middleware registered after the session middleware is the
one already shipped for this purpose.
*Rationale*: The alternative — pattern-matching arbitrary errors inside the error
middleware — would require guessing `ioredis`'s error vocabulary, which is exactly
the guess the cache contract (G3) refused to make for `redis@3.1.2`. Typing the
error at the one place that knows a store call just failed is both narrower and
certain. It also means the shipped `cookieSessionStoreUnavailableMiddleware`, whose
comment says it exists for "the raw express path", finally has a production caller
instead of only a test one.

**Q15 — Does the interceptor fix (D3) still matter if the session middleware now
answers first during a total outage?** *(follows from Q1)*
*Answer*: Yes, and both are required.
*Rationale*: The two layers read through **different clients**. The middleware path
covers total outage. The interceptor path covers everything else: a command that
overruns the 500 ms ceiling on the second read after the first succeeded, a client
that has reconnected between the two reads, a partial or flapping outage, and the
subject-revocation-marker read that only the strategy performs. It is also the
path the issue names explicitly, and leaving it would leave `develop`'s comment
asserting a behaviour the code two frames earlier still prevents. FR-021's single
shared wire definition is what keeps the two answers identical.

**Q16 — Are the two 503-producing paths required to emit byte-identical responses?**
*Answer*: Identical status, identical `Retry-After`, identical cookie treatment.
The **body** differs by transport: a GraphQL request answered by the interceptor
carries the GraphQL error envelope (with the code from Q3); a request answered by
the express middleware carries the existing `{ "error": "session_store_unavailable" }`
JSON.
*Rationale*: Requiring byte-identical bodies would force a GraphQL envelope out of
a middleware that runs before GraphQL exists, or strip the envelope from responses
where clients rely on it. FR-021 is about the parts a client acts on — status,
retry hint and cookie — and those are shared. Restated in FR-021 so the requirement
cannot be read as demanding more than it means.

### Session 2026-08-03 — iteration 3

Third sweep across all taxonomy categories: **zero new ambiguities**. Every FR is
decidable, every SC measurable, no `[NEEDS CLARIFICATION]` marker remains, and the
questions raised by iterations 1 and 2 are closed with no downstream questions
opened. Clarification loop terminates here (3 iterations).
