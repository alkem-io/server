# Feature Specification: Redis outage must degrade the platform, not kill it

**Feature Branch**: `story/6330-redis-outage-crash`

**Created**: 2026-08-03

**Status**: Draft

**Input**: GitHub story [alkem-io/server#6330](https://github.com/alkem-io/server/issues/6330) — "BUG: Redis outage crashes the server process (unhandled error event from legacy redis@3.1.2 client)". Labels: `bug`, `server`, `Atlas Team`, `PF`.

## Problem Statement

When Redis becomes unreachable, the Node process **exits**. This is not a stream of
failed requests or a slow path — the API dies and does not recover on its own.
Both the API process and the auth-reset worker are affected, and a dev-mode
watcher parent exits with the child, so there is no auto-restart either.

The cache dependency is therefore behaving as a **hard availability dependency**:
any Redis blip takes the whole platform down and requires manual operator
intervention. That is the defect. Redis is a cache; losing it must cost
performance, never availability.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The platform keeps serving while Redis is gone (Priority: P1)

An end user is browsing spaces, reading callouts, and running mutations. Somewhere
in the platform's infrastructure Redis becomes unreachable — it is restarted, a
network partition occurs, or its pod is rescheduled. The user notices nothing
except, at most, marginally slower responses, because everything the cache was
answering is now answered by the database instead.

**Why this priority**: This is the entire point of the story. Today this scenario
ends with a dead API and a 502 at the proxy for every user on the platform. It is
the difference between a degradation and an outage, and no other story in this
spec matters if the process is not alive to run it.

**Independent Test**: Start the platform, confirm the API answers, stop Redis,
and keep issuing requests. The process must remain alive and requests must
continue to be answered from the source of truth. Fully testable on its own and
delivers the entire availability benefit by itself.

**Acceptance Scenarios**:

1. **Given** the API process is running and answering requests, **When** Redis
   becomes unreachable, **Then** the process remains alive and continues to
   accept and answer requests.
2. **Given** Redis is unreachable, **When** a request follows a code path that
   would normally read from the cache, **Then** the read is treated as a cache
   miss and the request is served from the source of truth, returning a normal
   successful response rather than an error.
3. **Given** Redis is unreachable, **When** a code path attempts to write to the
   cache, **Then** the write is abandoned without raising an error to the caller,
   and the surrounding operation completes successfully.
4. **Given** Redis is unreachable at process start, **When** the process boots,
   **Then** the boot completes and the process serves requests, rather than
   failing to start or exiting during startup.

---

### User Story 2 - The background worker survives the same outage (Priority: P1)

The auth-reset worker consumes the authorization/license reset queue as competing
consumers across pods. It shares the same Redis instance and the same cache
configuration as the API. When Redis disappears, the worker must keep consuming
its queue rather than dying and leaving reset work unprocessed.

**Why this priority**: Equal to Story 1 and deliberately separated because the
worker is a **second, independently bootstrapped process** with its own module
graph. A fix applied only to the API process leaves an identical crash in the
worker, and the worker's death is quieter and therefore worse — reset work backs
up invisibly. Shipping one without the other would be a half-fix.

**Independent Test**: Start the worker process, stop Redis, and observe that the
worker process stays alive and continues to consume queue messages.

**Acceptance Scenarios**:

1. **Given** the auth-reset worker is running and consuming its queue, **When**
   Redis becomes unreachable, **Then** the worker process remains alive and
   continues to consume messages.
2. **Given** Redis is unreachable, **When** the worker processes a reset item
   whose progress counters live in Redis, **Then** the item is still processed
   and the counter update is abandoned without terminating the worker.
3. **Given** the worker's restricted module graph, **When** the cache hardening
   is applied, **Then** the worker's deliberate omissions (no scheduler, no
   GraphQL, no seeding) remain unchanged.

---

### User Story 3 - Recovery is automatic (Priority: P2)

Redis comes back. Nobody restarts anything. Within a short period the platform is
using the cache again and the operational signal returns to healthy.

**Why this priority**: P2 rather than P1 because a platform that survives the
outage but needs one restart afterwards has already converted an outage into a
scheduled, low-severity maintenance action — the bleeding has stopped. Automatic
recovery is what removes the operator from the loop entirely, and is worth
strictly less than not crashing.

**Independent Test**: With the process alive and Redis stopped, restart Redis and
verify that cache reads and writes resume without restarting the process.

**Acceptance Scenarios**:

1. **Given** the process has been running through a Redis outage, **When** Redis
   becomes reachable again, **Then** the connection is re-established
   automatically with no process restart and no operator action.
2. **Given** the connection has been re-established, **When** a cache write is
   attempted, **Then** the value is stored and a subsequent read returns it.
3. **Given** repeated outage/recovery cycles, **When** each cycle completes,
   **Then** behaviour is identical each time — recovery does not degrade after
   the first cycle and no connection or listener accumulation occurs.

---

### User Story 4 - Operators can see the outage without drowning in it (Priority: P2)

An operator investigating slow responses, or reviewing logs after the fact, can
determine when the cache went away and when it came back. They get one clear
signal per state change, not a per-retry flood that buries every other log line
and inflates log storage.

**Why this priority**: P2 because it does not affect end users. It is what makes
the degradation diagnosable rather than mysterious, and it is what prevents the
fix from replacing a crash with an equally disruptive log storm. A retrying
client can attempt reconnection many times per second; unthrottled that is a
second incident.

**Independent Test**: Trigger a connection loss and inspect the log output —
exactly one loss record, and on recovery exactly one recovery record, regardless
of how many reconnection attempts occurred in between.

**Acceptance Scenarios**:

1. **Given** a healthy cache connection, **When** the connection is lost,
   **Then** exactly one warning-level record is emitted describing the loss,
   attributed to a named log context.
2. **Given** the connection is already known to be lost, **When** further
   reconnection attempts fail, **Then** no additional per-attempt records are
   emitted.
3. **Given** the connection was lost, **When** it is re-established, **Then**
   exactly one record is emitted marking recovery, and the next loss is again
   reported once.
4. **Given** any of these records, **When** they are written, **Then** they go
   through the platform's structured logging facility and carry no credentials
   or connection secrets.

---

### User Story 5 - The blocked verification of server#6315 is unblocked (Priority: P3)

The OIDC session revocation cascade (server#6315) guarantees that deleting a user
still succeeds when Redis is down — revocation is best-effort. That guarantee has
unit coverage but **cannot be verified end to end**, because the process dies
before the mutation can complete. Once the platform survives the outage, the
manual check becomes runnable as written.

**Why this priority**: P3 because it is a consequence of Stories 1–3 rather than
additional work. It is recorded as its own story because it is the concrete,
externally-visible proof that the fix achieved what it claims, and because it
closes a known gap in another feature's verification record.

**Independent Test**: With Redis stopped, execute the user-deletion flow and
confirm it completes successfully — which is exactly step §6 of the referenced
manual quickstart.

**Acceptance Scenarios**:

1. **Given** Redis is unreachable, **When** a user deletion is performed,
   **Then** the deletion completes successfully and the process remains alive.
2. **Given** the deletion completed while Redis was unreachable, **When** the
   outcome is inspected, **Then** the best-effort session revocation was skipped
   or failed silently without failing the deletion.

---

### Edge Cases

- **Redis unreachable at boot.** The process must start and serve. Cache
  construction must not require a live connection, and must not throw
  synchronously into the module bootstrap.
- **Redis reachable at boot, then permanently gone.** The process must not
  accumulate unbounded reconnection state, unbounded pending commands, or
  unbounded log volume over hours of outage.
- **Redis flapping.** Rapid up/down/up cycles must produce one record per
  transition and must not leave stale duplicate connections behind.
- **Commands issued while disconnected.** They must fail fast and be treated as a
  cache miss. They must not queue indefinitely, and must not hold a request open
  waiting for a server that is not there.
- **Slow Redis rather than absent Redis.** A connection that accepts TCP but
  never answers must eventually time out and be treated as a miss, not hang the
  request.
- **Values that the cache layer refuses to store** (for example unsupported
  value shapes). These raise errors from the cache path unrelated to
  connectivity; they must also not escape as request failures.
- **Atomic counter operations that intentionally bypass the generic cache
  interface.** Some progress counters require server-side atomicity and reach the
  cache server directly. These already have a documented non-Redis fallback for
  environments where no client is available; that fallback must also cover the
  case where a client exists but its connection is down. **Accepted limitation
  (Q3):** while the cache is unavailable *and* several worker replicas are
  running, those counters revert to process-local counting and can undercount, so
  a long-running reset task may not reach a terminal state until it is re-run.
  This is strictly better than today's behaviour, where the same task also never
  completes *and* the platform is down; and it is the degraded mode the counter
  code already documents for cache-less environments, not a new one.
- **Two processes, one Redis.** Both the API and the worker observe the same
  outage simultaneously. Neither may exit, and neither may interfere with the
  other's recovery.
- **Redundant cache configuration.** Any module that declares its own cache
  instance independently of the platform-wide one is a second construction site
  and must be accounted for: either hardened, or shown to be inert and recorded
  as such.

## Requirements *(mandatory)*

### Functional Requirements

#### Process survival

- **FR-001**: The system MUST NOT terminate the API process as a result of a
  cache-connectivity failure, at any point in the process lifetime, including
  during startup.
- **FR-002**: The system MUST NOT terminate the background worker process as a
  result of a cache-connectivity failure, at any point in the process lifetime,
  including during startup.
- **FR-003**: Every cache client the system creates MUST have a failure handler
  attached at creation time, before any connection attempt can produce a failure,
  so that no connection failure can reach the process-level unhandled-error path.
- **FR-004**: The system MUST treat "a cache client exists but is not connected"
  as a normal, expected runtime state rather than an error state.

#### Fail-soft behaviour

- **FR-005**: When a cache read cannot be served because the cache is
  unavailable, the system MUST report the outcome as a cache miss to the caller
  rather than raising an error.
- **FR-006**: When a cache write cannot be performed because the cache is
  unavailable, the system MUST abandon the write and return control to the caller
  without raising an error.
- **FR-007**: When a cache deletion or cache reset cannot be performed because
  the cache is unavailable, the system MUST abandon it without raising an error.
- **FR-008**: Fail-soft behaviour MUST apply to failures originating from the
  cache layer generally, not only to a specific enumerated set of connectivity
  error identifiers, because the underlying failure vocabulary is not a stable
  contract.
- **FR-009**: A cache operation issued while the connection is **known to be
  unavailable** MUST return immediately as a miss / no-op. It MUST NOT wait, MUST
  NOT be queued for later delivery, and MUST NOT be charged the connection-
  establishment timeout. (Clarified — see Q1.)
- **FR-009a**: A cache operation issued while the connection is *believed*
  available but the cache server does not respond MUST be abandoned as a miss /
  no-op after a bounded wait of **at most 1 second**. This ceiling is a fixed
  behavioural constant of the cache layer and is deliberately independent of the
  existing connection-establishment timeout setting, which is measured in tens of
  seconds and is far too long to charge to a request. (Clarified — see Q1.)
- **FR-010**: Code paths that access the cache server directly for server-side
  atomic operations MUST fall back to their existing non-atomic local behaviour
  when the connection is unavailable, and MUST NOT raise as a result.
- **FR-010a**: Those direct-access code paths MUST NOT emit a record per failed
  operation while the connection is known to be unavailable; they MUST observe the
  same once-per-transition reporting discipline as the cache layer itself.
  (Clarified — see Q3.)

#### Recovery

- **FR-011**: The system MUST attempt to re-establish a lost cache connection
  automatically, without operator action and without a process restart.
- **FR-012**: Reconnection attempts MUST be spaced by a growing backoff whose
  **first** attempt occurs within 1 second of the loss and whose interval is
  **capped at 5 seconds**. The cap is set below the 60-second recovery target of
  SC-003 so that the target is met by construction rather than by luck.
  (Clarified — see Q2.)
- **FR-013**: Reconnection MUST continue indefinitely for as long as the process
  lives; the system MUST NOT give up permanently on the cache after a fixed
  number of attempts, and MUST NOT signal permanent failure in a way that
  produces an unobserved terminal error. (Clarified — see Q2.)
- **FR-014**: Once the connection is re-established, cache reads and writes MUST
  resume normally with no further intervention.

#### Observability

- **FR-015**: The system MUST emit exactly one record when the cache connection
  transitions from available to unavailable.
- **FR-016**: The system MUST emit exactly one record when the cache connection
  transitions from unavailable to available.
- **FR-017**: The system MUST NOT emit a record per reconnection attempt or per
  failed cache operation while in a known-unavailable state.
- **FR-018**: All such records MUST be emitted through the platform's structured
  logging facility with an explicit log context, and MUST NOT be written to the
  process console directly.
- **FR-019**: These records MUST NOT contain credentials or secrets.

#### Configuration integrity

- **FR-020**: All cache construction sites in the system MUST obtain identical
  resilience behaviour from a single shared definition, so that adding a future
  construction site cannot silently reintroduce the defect.
- **FR-021**: The resilience behaviour MUST be derived from existing
  configuration; the change MUST NOT require new mandatory configuration to be
  supplied before the system can start.
- **FR-022**: The one module that declares a cache instance separate from the
  platform-wide one has been demonstrated to be **unused** — nothing within its
  injection scope consumes a cache, and the one collaborator that does resolves
  the platform-wide instance from its own declaring module. It MUST therefore be
  **removed**, not hardened, so that the count of construction sites in SC-005 is
  honest rather than padded with an inert one. (Clarified — see Q4.)
- **FR-023**: The behaviour of every non-cache subsystem MUST be unchanged. In
  particular, subsystems that maintain their own independent connections to the
  cache server for other purposes are outside this change's blast radius and MUST
  NOT be modified.

#### Regression protection

- **FR-024**: The system MUST carry automated coverage proving that a cache
  client failure event does not propagate to the process-level unhandled-error
  path.
- **FR-025**: The system MUST carry automated coverage proving that a failing
  cache read is observed by the caller as a miss, and a failing cache write is
  observed by the caller as a no-op, in both cases without raising.
- **FR-026**: The system MUST carry automated coverage proving that the
  loss/recovery records are emitted once per transition rather than once per
  attempt.
- **FR-027**: The regression coverage MUST be constructed so that it exercises
  the shared resilience definition **directly**, driving it with a substitute
  cache client that fails on demand. Coverage that only asserts on already-safe
  consumer behaviour does not satisfy FR-024 – FR-026, because such a test passes
  against the defective code and therefore proves nothing. (Clarified — see Q5.)
- **FR-028**: The manual, end-to-end outage walk MUST be written down as a
  repeatable procedure alongside the specification, so that the behaviour which
  cannot be asserted in an automated unit test — an actual process surviving an
  actual outage — has a defined verification path. (Clarified — see Q5.)

### Key Entities

- **Cache client**: The connection to the cache server used by the general-purpose
  cache. Emits asynchronous failure notifications independently of any request.
  Today, an unobserved failure notification from this entity is what terminates
  the process.
- **Cache store**: The adapter presenting the cache client as read/write/delete
  operations to the application. The layer at which "unavailable" must be
  translated into "miss".
- **Cache construction site**: A place in the system where a cache instance is
  built during process bootstrap. There is currently more than one, and they are
  configured by copy.
- **Connection state**: The available/unavailable status inferred from the client's
  notifications. Its *transitions*, not its instantaneous value, are what deserve
  a log record.
- **Cache consumer**: Any component that reads or writes the cache. Consumers must
  be able to remain unaware of connection state; the two exceptions are consumers
  that reach the client directly for server-side atomic operations.
- **Health signal**: The existing externally-consumed readiness surface, which
  already reports cache reachability. Relevant here because its correctness
  depends on the process being alive to answer it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the cache server stopped, the platform serves **100%** of the
  requests it served before the stop, with zero process exits, over a continuous
  10-minute observation window.
- **SC-002**: The number of operator restarts required to recover from a complete
  cache outage is **zero**, down from one per affected process today.
- **SC-003**: After the cache server returns, cached reads are being served again
  within **60 seconds**, with no human action.
- **SC-004**: A full outage-and-recovery cycle produces **exactly 2** cache-state
  log records — one for loss, one for recovery — regardless of outage duration.
- **SC-005**: **100%** of cache construction sites in the system obtain their
  resilience behaviour from one shared definition (currently 0%; the sites are
  duplicated by copy).
- **SC-006**: The previously unrunnable manual verification of the user-deletion
  guarantee under cache outage completes successfully, taking that check from
  **blocked** to **passing**.
- **SC-007**: Automated coverage exists that fails if the defect is reintroduced —
  verified by confirming the new tests fail against the unfixed behaviour.
- **SC-008**: No change in behaviour is observable for any request path while the
  cache server is healthy.
- **SC-009**: While the cache server is unreachable, no single request is delayed
  by more than **1 second** on account of the cache, and requests issued after the
  outage is detected are delayed by **0 seconds** — down from the tens of seconds
  that the connection-establishment setting would otherwise impose.

## Assumptions

- **The cache is a cache.** Every value held in it is reconstructible from the
  source of truth. Losing it costs latency and database load, never correctness.
  This is what makes "treat unavailable as a miss" safe, and it is the load-bearing
  assumption of the whole story.
- **Increased database load during an outage is acceptable.** The platform is
  expected to absorb the traffic that the cache was previously absorbing. Capacity
  planning for a cache-less peak is out of scope.
- **Server-side atomic counter operations already have a documented degraded
  mode.** Those call sites already handle "no client available" by falling back to
  process-local counting, and that degraded mode is already accepted as correct for
  single-process environments. Extending it to cover "client present but
  disconnected" is consistent with the existing decision, not a new one.
- **The auth-reset worker's restricted module graph is intentional and must be
  preserved**, including its deliberate omissions. Cache hardening is infrastructure
  and applies to both processes; nothing else about the worker changes.
- **The existing readiness surface is sufficient for the health signal.** It
  already reports cache reachability via an independent connection. Adding a
  distinct "degraded" state to it is **out of scope** for this story — see
  Out of Scope below.
- **Existing consumers do not need to change.** Fail-soft is applied at the cache
  layer so that every consumer inherits it. Consumers already treat a cache miss
  as normal, because a cold cache is normal.
- **Configuration is unchanged.** Host, port and timeout continue to come from the
  existing settings. No new required configuration is introduced, so no environment
  or deployment manifest must change for this fix to take effect.

## Out of Scope

Recorded explicitly, with reasons, rather than left implicit:

- **A distinct "cache degraded" readiness state.** The story lists this as
  optional. A readiness surface already exists and already reports cache
  reachability through its own connection, so the operator signal is present. Its
  real problem today is that the process is dead when it matters — which this story
  fixes. Changing readiness semantics means deciding whether a cache-degraded
  instance should keep receiving traffic; the answer is yes (that is the entire
  point of degrading), so reporting it as not-ready would be actively harmful and
  would take instances out of rotation during exactly the incident this story is
  meant to survive. Deferred as a separate concern with its own operational
  decision to make.
- **Retiring the legacy cache client library entirely.** Consolidating onto the
  client already used elsewhere in the platform is attractive for maintenance, but
  it changes the interface that direct-atomic-operation call sites depend on and
  therefore widens a resilience fix into a dependency migration. Evaluated in
  planning as a candidate option; if not chosen, the rationale is recorded there.
- **Capacity work to make the platform comfortable without the cache.** Out of
  scope; this story is about surviving, not about surviving at full speed.
- **Any change to independent connections to the cache server owned by other
  subsystems** (session storage, health probing). They already handle their own
  failures and are explicitly not the cause of this defect.
- **Automatic restart supervision** of the development-mode watcher. The correct
  fix is not crashing.

## Dependencies

- The change is confined to a single repository and requires no coordinated
  release with any other service.
- No database schema change, no data migration, and no public API contract change.
- Verification of the P3 story depends on the existing manual quickstart for the
  OIDC session revocation cascade — `specs/107-oidc-session-revocation/quickstart.md`
  §6, **in this repository**, currently on the unmerged
  `story/6315-oidc-session-revocation-cascade` branch. (The story text cites it as
  a workspace path; it is not there. Corrected during `/speckit-analyze`.) This
  story unblocks that check.

## Traceability

| Story acceptance criterion (from #6330) | Covered by |
|---|---|
| AC1 — API process stays alive and keeps serving with Redis stopped | US1 · FR-001, FR-003, FR-005, FR-006 · SC-001 |
| AC2 — auth-reset worker survives a Redis outage | US2 · FR-002, FR-003, FR-010 · SC-001 |
| AC3 — connection loss logged once per transition, via the repo logger | US4 · FR-015 – FR-019 · SC-004 |
| AC4 — reconnects with no process restart, cache writes resume | US3 · FR-011 – FR-014 · SC-002, SC-003 |
| AC5 — server#6315's deletion-under-outage guarantee becomes verifiable | US5 · FR-001, FR-005, FR-006 · SC-006 |
| Optional — readiness reports cache-degraded | **Out of scope**, with reason recorded above |

## Clarifications

### Session 2026-08-03

Run in autonomous mode: each question was resolved by selecting the option most
consistent with this repository's existing conventions and prevailing practice,
and the rationale is recorded alongside the answer. The loop was re-run until a
pass produced no new ambiguities.

#### Pass 1 — 5 questions asked, 5 resolved

- **Q1**: How long may a single cache operation block a request while the cache
  server is unreachable?
  **→ A: Immediate miss when known-disconnected; ≤1 s bounded wait otherwise.**
  *Rationale*: the only timeout currently configured for the cache is the
  connection-establishment timeout, and it is set in *tens of seconds*. Reusing
  it as the per-operation ceiling would replace a crash with something arguably
  worse — every request hanging for the better part of a minute on a path whose
  entire purpose is to be fast. The connection state is already known to the
  client, so the disconnected case needs no timer at all: refuse to queue the
  command and it fails instantly. The 1-second ceiling exists only for the
  nastier case of a server that accepts the connection and then goes silent.
  → FR-009 rewritten, FR-009a added.

- **Q2**: What reconnection cadence should a lost connection use?
  **→ A: Growing backoff, first retry <1 s, interval capped at 5 s, retry forever.**
  *Rationale*: SC-003 promises cached reads are back within 60 seconds of the
  server returning. An uncapped exponential backoff cannot promise that — after a
  multi-hour outage the next attempt could be scheduled well beyond the window.
  Capping at 5 s makes SC-003 true by construction with an order of magnitude of
  headroom, and 5 s of polling against an absent server is negligible load.
  "Retry forever" matters more than it looks: a retry policy that *gives up*
  typically signals that by raising a terminal error, which is the exact failure
  mode this story exists to eliminate.
  → FR-012, FR-013 tightened.

- **Q3**: What happens to the multi-replica atomic progress counters while the
  cache is unreachable?
  **→ A: Accept the documented process-local fallback; add log throttling.**
  *Rationale*: three options were considered. (a) Fall back to process-local
  counting — counters may undercount across replicas, so a reset task may not
  reach a terminal state during the outage. (b) Fail the queue item so it is
  redelivered — turns a cache outage into a redelivery storm and risks a poison
  loop for as long as the outage lasts. (c) Hold tasks non-terminal and reconcile
  on recovery — a real distributed-state feature, entirely disproportionate to a
  resilience bugfix. (a) wins: it is what the code already does when no client is
  reachable, it is already documented as correct for single-process environments,
  and its worst case is a task needing a re-run — against a current worst case of
  the whole platform being down, in which that task also never completes. The one
  genuine defect found on this path is that it logs at error level *per failed
  operation*, which during an outage is a log flood; that is fixed.
  → Edge Cases amended with the accepted limitation; FR-010a added.

- **Q4**: A module declares its own cache instance, separate from the
  platform-wide one. Harden it or remove it?
  **→ A: Remove it — verified inert.**
  *Rationale*: verification showed nothing in that module's injection scope
  consumes a cache. The one collaborator that does is declared in a *different*
  module which does not declare a cache, so it resolves the platform-wide
  instance regardless. The declaration therefore has no effect today. Hardening
  it would mean maintaining resilience code for a construction site that builds
  nothing anybody uses, and would let SC-005 report "100% of sites hardened"
  while one of those sites is decorative. Deleting dead configuration is the
  simpler viable implementation.
  → FR-022 rewritten.

- **Q5**: How is SC-007 — "coverage that would actually have caught this" —
  demonstrated rather than asserted?
  **→ A: Drive the shared resilience definition directly with a failing fake client.**
  *Rationale*: the trap here is writing a test that passes against the *broken*
  code and calling it regression coverage. Consumers of the cache are already
  written to tolerate a miss, so testing a consumer proves nothing about the
  defect. The test must instantiate the shared resilience definition itself,
  hand it a substitute client that emits a failure on demand, and assert the
  three properties that are false today: the failure is consumed rather than
  escaping, a failing read surfaces as a miss, and the records are counted per
  transition. The remaining property — that a real process survives a real
  outage — is not unit-testable and gets a written manual procedure instead.
  → FR-027, FR-028 added.

#### Pass 2 — 0 questions asked

Full taxonomy re-scan after applying Pass 1. Result: **no new ambiguities.**

| Category | Status | Note |
|---|---|---|
| Functional scope & behaviour | Clear | Goals, out-of-scope and personas (end user, operator) all explicit |
| Domain & data model | Clear | No persisted state; Key Entities enumerated |
| Interaction & UX flow | Clear | No user-interface surface; degraded behaviour is defined as indistinguishable from a cold cache |
| Performance | Clear | Resolved by Q1 (FR-009, FR-009a) |
| Scalability | Clear | Bounded by the "increased database load is acceptable" assumption; capacity work explicitly out of scope |
| Reliability & availability | Clear | Resolved by Q2 (FR-012, FR-013); SC-001 – SC-003 quantify it |
| Observability | Clear | FR-015 – FR-019 plus Q3's throttle extension (FR-010a); SC-004 counts it |
| Security & privacy | Clear | FR-019; no credential or secret may appear in the new records |
| Compliance | Clear | No regulated data involved; cache holds only reconstructible derived state |
| Integration & external dependencies | Clear | Resolved by Q3; FR-023 fences off the subsystems that own their own connections |
| Edge cases & failure handling | Clear | Nine cases enumerated, including boot-time absence, flapping, and slow-but-alive |
| Constraints & tradeoffs | Clear | Remediation-strategy choice is a HOW; deferred to `plan.md` Decision D1 by design, with rejected alternatives recorded there |
| Terminology & consistency | Clear | "cache client / cache store / construction site / connection state" used consistently |
| Completion signals | Clear | Resolved by Q5 (FR-027, FR-028); every SC is a count, a percentage or a duration |
| Misc / placeholders | Clear | No TODO markers; no unquantified adjectives remain |

**Loop terminated on a clean pass: 2 iterations.**
