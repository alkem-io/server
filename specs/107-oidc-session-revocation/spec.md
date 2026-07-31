# Feature Specification: Session Revocation Cascade on Account Deletion

**Feature Branch**: `story/6315-oidc-session-revocation-cascade`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "OIDC/BFF session revocation cascade on user deletion (server#6315): add a per-user Redis session index and an OidcSessionRevocationService, wire it into deleteUser alongside the existing Kratos identity-session invalidation, and make the `me` sub-resolvers degrade gracefully on an empty actorID."

**Anchor story**: [alkem-io/server#6315](https://github.com/alkem-io/server/issues/6315)
**Design input**: `agents-hq/docs/oidc-session-revocation-handover.md` (research pass, 2026-07-31)

## Clarifications

Resolved by decision under the hands-free delivery contract — no question was
escalated. Each entry records the question, the chosen answer, and why.

### Session 2026-07-31 (pass 1)

- **Q: Sessions that already exist when this ships have no entry in the
  per-account listing. Are they revocable?** → **A: Yes — self-healing lazy
  backfill.** The listing is populated both when a session is established *and*
  opportunistically on any authenticated request that resolves a live session,
  as a non-blocking best-effort write. *Rationale*: without this, every session
  alive on deploy day is permanently invisible to revocation until its holder
  next signs in — i.e. the anchor defect stays open for up to the absolute
  ceiling for exactly the population that has it. The alternatives are worse: a
  one-off enumeration of the whole session store on start-up is precisely the
  whole-keyspace scan FR-005 forbids, and doing nothing leaves a known hole.
  Backfilling from the request path is O(1), rides the round trip the request
  already makes to read the session, and is fire-and-forget so it adds no
  latency and cannot fail a request.
- **Q: Does the deletion wait for revocation to finish, or is revocation
  dispatched and forgotten?** → **A: Awaited, in-line, inside the existing
  post-commit external-call block, with each leg individually error-trapped and
  the remote leg time-bounded.** *Rationale*: SC-002 promises sub-second
  effect, and the audit evidence a compliance auditor needs is
  *deletion → audit record → proof the session ended*; a fire-and-forget
  dispatch cannot produce that trace and would make the failure audit race the
  response. Awaiting is safe because FR-027 already forbids either leg from
  failing the deletion, and deletion is a privileged, infrequent operation
  (A-05) where a few hundred milliseconds is irrelevant.
- **Q: What timeout / retry / circuit-breaker policy applies to the new remote
  token-revocation call?** → **A: A 3-second timeout per request, zero retries,
  no circuit breaker.** *Rationale*: the platform's engineering constitution
  requires every new external integration to state these three. The local
  teardown already delivers the security outcome on its own (FR-013), so a retry
  buys no additional access-control guarantee while lengthening a
  user-facing mutation; and a circuit breaker is unjustifiable at deletion
  frequency — it would spend its whole life in the closed state. The neighbouring
  identity-provider calls on this same deletion path are likewise
  single-attempt, so this matches local convention rather than inventing one.
- **Q: What should the "about me" identifier be when the session resolves to no
  account?** → **A: Unchanged.** *Rationale*: it already renders as the bare
  prefix for *every* anonymous visitor today (an anonymous actor context carries
  an empty account identifier), so it is neither new nor specific to the orphaned
  state. Changing it is a client cache-key change with no security benefit and a
  real risk of colliding cached anonymous and formerly-authenticated states. Out
  of scope; recorded so a reviewer does not re-open it.
- **Q: What exactly is the "empty page" the paginated field returns when
  degrading?** → **A: A zero total, an empty item list, and page metadata
  declaring no next and no previous page, with both cursors omitted.**
  *Rationale*: cursors are already nullable in the published contract, and this
  is the shape the platform's own pagination helper produces for an empty result
  set — so the degraded response is indistinguishable from a legitimately empty
  one and needs no client change.

### Session 2026-07-31 (pass 2)

Re-ran the full taxonomy scan against the amended specification. **One** new
ambiguity found under *Domain & Data Model → lifecycle/state transitions*.

- **Q: The ended-session marker expires on its own. What happens to a request
  carrying that session after the marker is gone?** → **A: It resolves as an
  ordinary anonymous visitor, and that is correct — the requirement is that the
  session never again authenticates, not that it refuses forever.** The marker's
  job is only to cover the window in which a client might still believe it is
  signed in; once it expires there is nothing left to believe in, and the
  client's own session probe reports signed-out either way because the session
  record no longer holds anything to probe. *Rationale for calling this out
  rather than leaving it implicit*: a reviewer reading FR-009 in isolation could
  reasonably conclude the refusal must be permanent and reach for a
  permanent tombstone — which would grow the session store without bound for no
  security gain. Encoded as FR-009a.

### Session 2026-07-31 (pass 3)

Re-ran the full taxonomy scan a third time against the amended specification.
**Zero new ambiguities.** Every category resolves to Clear. The two remaining
Deferred items (module wiring to avoid a circular dependency; whether the store
connection is shared or a second one opened) are implementation decisions for
`plan.md`, not specification gaps.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deleting an account ends that account's access immediately (Priority: P1)

An operator (platform administrator, or the account holder exercising a
right-to-erasure request) deletes a person's account. From that moment the
person's browser — and any other device where they were signed in — must no
longer be able to reach the platform as an authenticated caller. The next
request from any of those devices is refused as *unauthenticated*, and the
application renders a clean signed-out state rather than a "signed in with no
account" half-state.

**Why this priority**: This is the anchor defect and it is an access-control
failure, not a cosmetic one. Today an account can be deleted while its holder
keeps working, authenticated, for up to the absolute session ceiling. It is the
canonical failure of "remove access rights on termination" and of "remove access
when no longer required"; it is also an incomplete erasure, because the cached
personal data inside the surviving session record outlives the deletion. Nothing
else in this feature matters if this does not hold.

**Independent Test**: Sign in as a disposable account, capture the resulting
session, delete the account, then replay a request with that captured session.
The request is refused with an unauthenticated result. Delivers the entire
security value on its own.

**Acceptance Scenarios**:

1. **Given** an account with one active signed-in session, **When** the account
   is deleted, **Then** the next request carrying that session is refused as
   unauthenticated (not silently downgraded to an anonymous visitor).
2. **Given** an account signed in on three devices, **When** the account is
   deleted, **Then** all three sessions are ended — none survives.
3. **Given** an account with an active session, **When** the account is deleted,
   **Then** the personal data that had been cached inside the session record
   (display name, email address) is no longer present in the session store.
4. **Given** an account with an active session, **When** the account is deleted,
   **Then** the account's single-sign-on sessions at the identity provider are
   also ended, **regardless** of whether the caller asked for the underlying
   identity record to be deleted.
5. **Given** an account with an active session, **When** the account is deleted
   and the session teardown fails for every session, **Then** the deletion still
   succeeds and the failure is recorded as an audited failure outcome.
6. **Given** an account that was never linked to the identity provider (it has
   no identity reference), **When** it is deleted, **Then** the deletion
   succeeds and no revocation is attempted, with no error raised.
7. **Given** an account deletion that has already run its revocation, **When**
   the same deletion is retried, **Then** the second run is a no-op success —
   not an error.
8. **Given** an account deletion whose database transaction fails and rolls
   back, **When** the operation returns, **Then** no session was ended — the
   account still exists and its holder is still signed in.

---

### User Story 2 - A stale session degrades instead of breaking the app (Priority: P2)

If a session ever does outlive its account — the deletion happened before this
feature shipped, a database was restored underneath live sessions, or the
teardown genuinely failed — the person's application must render an empty,
harmless state rather than a wall of errors. Every "about me" query returns its
natural empty value so the client can complete its render and route the person
to signing in again.

**Why this priority**: Defence in depth. It does not fix the access-control
defect (Story 1 does) but it removes the user-visible breakage and the support
load, and it protects against every future source of an orphaned session. It is
independently valuable and independently shippable, and this codebase already
accepts resolver-level graceful degradation as a pattern.

**Independent Test**: Issue the "about me" query with a session that carries no
resolved account. Every field resolves to its empty value and the query returns
no errors.

**Acceptance Scenarios**:

1. **Given** a request whose session resolves to no account, **When** the
   unread-notification count is requested, **Then** it returns `0` and no error.
2. **Given** a request whose session resolves to no account, **When** the
   invitations, applications or notification list is requested, **Then** each
   returns an empty list (and an empty page for the paginated one) and no error.
3. **Given** a request whose session resolves to no account, **When** the
   conversations collection is requested, **Then** it returns an empty
   collection and no error.
4. **Given** a request whose session resolves to no account, **When** any of the
   above is requested, **Then** the platform emits one warning-level log line
   per degraded field, carrying enough context to locate the orphaned session.
5. **Given** a request from a fully signed-in account, **When** any of the above
   is requested, **Then** behaviour is unchanged from today.

---

### User Story 3 - The revocation capability is reusable by other account events (Priority: P3)

The same capability is needed by at least three other pending changes: ending
other sessions after a password change, letting a person end their own sessions
from a device list, and the already-shipped administrative email change (which
today ends only the single-sign-on session and leaves platform access alive).
The capability must serve all of them without being rewritten: it must accept an
"except this one session" instruction, report an outcome per session, and
tolerate some sessions failing while others succeed.

**Why this priority**: It costs almost nothing to design in now and is very
expensive to retrofit. It is the difference between fixing one bug and closing a
recurring defect class. It is P3 only because the anchor story ships without it
being exercised by a second caller in this change.

**Independent Test**: Invoke the capability for an account with two active
sessions while naming one of them as the exception. The named session survives
and stays usable; the other is ended. The returned report names both sessions
with their individual outcomes.

**Acceptance Scenarios**:

1. **Given** an account with two active sessions, **When** revocation is
   requested with one session named as the exception, **Then** the excepted
   session still authenticates afterwards and the other does not.
2. **Given** an account with three active sessions where the second cannot be
   torn down, **When** revocation is requested, **Then** sessions one and three
   are ended, the report marks session two as failed, and the caller receives a
   result rather than an exception.
3. **Given** any revocation, **When** the report is produced, **Then** it names
   a reason drawn from a closed set of reasons and contains no credential or
   token material of any kind.

---

### Edge Cases

- **Account never linked to the identity provider.** The account has no identity
  reference. Revocation is skipped entirely; the deletion succeeds; no error and
  no audit failure is raised (this is a legitimate state, not a fault).
- **Session store unreachable at deletion time.** The deletion still succeeds.
  The failure is audited with a failure outcome and logged at error level. No
  partial mutation is left behind.
- **Token revocation at the authorization server fails while the local teardown
  succeeds.** The local teardown stands — local certainty is preferred over
  remote completeness. The remote failure is audited separately with a failure
  outcome. The person is locked out of the platform either way; only the
  upstream refresh grant may linger until its own expiry.
- **Authorization-server metadata not yet discovered** (the platform boots
  without the identity chain being reachable). Remote token revocation is
  skipped and audited as a failure; the local teardown still happens.
- **Repeat deletion / repeat revocation.** Ending an already-ended session is a
  success no-op, never an error. The whole operation is idempotent.
- **The per-account session listing contains a session that no longer exists**
  (it expired or was signed out normally). That entry is reported as
  "already absent" and removed from the listing; it is not an error and no
  end-of-session marker is written for it.
- **Concurrent revocation and token refresh on the same session.** The session
  ends. A refresh that was mid-flight cannot resurrect an ended session.
- **The account holds an active session on a device that is offline.** The
  session is ended server-side; the device discovers it on its next request.
  Nothing depends on the device cooperating.
- **A person is deleted while another person's request is in flight.** Only the
  deleted account's sessions are affected — revocation is scoped to one subject
  and never scans the whole session store.
- **An account whose sessions all expired already.** Revocation completes with
  zero sessions ended and reports success.
- **The per-account listing is abandoned** (its last session expires and nothing
  ever revokes it). The listing must expire by itself no later than the last
  session it names, so it cannot accumulate forever.
- **A session established before this capability shipped.** It is absent from
  its account's listing and therefore initially unrevocable. Its holder's next
  authenticated request self-heals the listing (FR-002a), after which the
  session is revocable normally. Until that request happens the session remains
  unrevocable — a bounded, documented residual exposure, not a silent one.
- **The self-healing write itself fails** (store briefly unreachable). The
  request is unaffected — it is never awaited. The next request retries it.
- **A revoked session's holder returns after the refusal marker has lapsed.**
  They resolve as an anonymous visitor and the client renders signed-out. No
  authenticated access at any point (FR-009a).

## Requirements *(mandatory)*

### Functional Requirements

#### Per-account session listing

- **FR-001**: The platform MUST maintain, for every signed-in account, a listing
  of that account's currently active sessions, keyed by the account's identity
  reference.
- **FR-002**: The listing MUST be updated when a new session is established.
- **FR-002a**: The listing MUST additionally self-heal: any authenticated
  request that resolves a live, non-ended session MUST opportunistically ensure
  that session is present in its account's listing. This write MUST be
  best-effort and MUST NOT be awaited on the request path, so it can neither add
  latency to nor fail the request. It exists so that sessions established before
  this capability shipped become revocable on their holder's next request rather
  than never.
- **FR-003**: The listing MUST be pruned when a session ends by any route:
  normal sign-out, system teardown after repeated token-refresh failure, and
  revocation itself.
- **FR-004**: The listing MUST expire no later than the latest expiry of the
  sessions it names, so an abandoned listing cannot outlive its members.
- **FR-005**: Locating an account's sessions MUST NOT require scanning the
  session store as a whole. The blast radius of any revocation is exactly one
  account.
- **FR-006**: Failure to update or prune the listing MUST NOT fail the operation
  that triggered it (sign-in, sign-out, teardown). Such failures MUST be logged.

#### The revocation capability

- **FR-007**: The platform MUST expose a single named capability that ends every
  active session belonging to one account, given that account's identity
  reference and a reason.
- **FR-008**: The capability MUST accept an optional instruction naming one
  session to leave alive.
- **FR-009**: Every session it ends MUST be left in a state that causes the next
  request carrying that session to be refused as **unauthenticated** — it MUST
  NOT be left in a state that is indistinguishable from "never had a session",
  because that produces a silent downgrade to anonymous instead of a signal the
  client can act on.
- **FR-009a**: That refusal state is **time-bounded, not permanent**. It only has
  to outlive the window in which a client might still believe it is signed in.
  Once it lapses, a request carrying the session resolves as an ordinary
  anonymous visitor — which is the correct end state, because by then the session
  record holds nothing and the client's own session probe reports signed-out.
  The requirement is that the session never again *authenticates*, not that it
  refuses forever; a permanent marker would grow the session store without bound
  for no security gain.
- **FR-010**: Ending a session MUST discard the personal data cached inside that
  session record.
- **FR-011**: The capability MUST release any auxiliary state held against an
  ended session (for example a token-refresh lock) so nothing keyed to a dead
  session lingers.
- **FR-012**: The capability MUST request revocation of the ended session's
  refresh grant at the authorization server.
- **FR-012a**: That remote request MUST be bounded by a **3-second timeout**,
  MUST NOT be retried, and MUST NOT be placed behind a circuit breaker. The
  local teardown alone already delivers the access-control outcome (FR-013), so
  retrying buys no additional guarantee at the cost of a longer-running
  privileged mutation; and a circuit breaker cannot earn its keep at deletion
  frequency. Recorded explicitly because the engineering constitution requires
  every new external integration to declare all three.
- **FR-013**: If the authorization-server revocation fails or is unavailable,
  the local teardown MUST still stand, and the remote failure MUST be recorded
  with a failure outcome.
- **FR-014**: The capability MUST return a per-session outcome report and MUST
  tolerate partial failure — some sessions ending while others fail is a
  reportable result, not an exception.
- **FR-015**: The capability MUST be idempotent: re-running it for the same
  account is a success no-op.
- **FR-016**: The reason accompanying a revocation MUST be drawn from a closed,
  named set so that every consumer records a comparable value.
- **FR-017**: If the account has no identity reference, the capability MUST
  return an empty successful report without attempting anything.

#### Audit and observability

- **FR-018**: The platform MUST record an audit event **before** performing the
  teardown, so the evidence survives a process death mid-teardown.
- **FR-019**: The platform MUST record an audit event per session with an
  outcome of success or failure, carrying the account's identity reference, the
  relying party, the reason, and a correlation identifier.
- **FR-020**: The platform MUST record a terminating audit event summarising the
  whole revocation.
- **FR-021**: No audit event and no log line may contain any credential or token
  material.
- **FR-022**: A revocation failure MUST NOT be swallowed silently. Every failure
  is both audited with a failure outcome and logged at error level.

#### Account deletion cascade

- **FR-023**: Deleting an account MUST revoke every one of that account's
  platform sessions.
- **FR-024**: Deleting an account MUST also end that account's sessions at the
  identity provider.
- **FR-025**: Both of the above MUST run unconditionally — in particular they
  MUST NOT be conditional on the caller asking for the underlying identity
  record to be deleted, because a surviving identity with live sessions is
  precisely the orphan state being fixed.
- **FR-026**: Both MUST run **after** the deletion's database transaction has
  committed, and MUST NOT be moved inside it. A rolled-back deletion must not
  sign anybody out.
- **FR-026a**: Both MUST be **awaited in-line** within that post-commit block —
  not dispatched and forgotten — so the deletion's response is not returned
  before the audit trail proving the sessions ended has been written. Each leg
  is independently error-trapped so one failing cannot prevent the other from
  running (FR-027).
- **FR-027**: Neither MUST be able to fail the deletion. A revocation failure is
  audited and logged; the deletion result is unchanged.
- **FR-028**: An account with no identity reference MUST be deletable exactly as
  it is today, with revocation skipped.

#### Graceful degradation of the "about me" surface

- **FR-029**: When a request's session resolves to no account, each "about me"
  field that today raises an input error MUST instead return its natural empty
  value: `0` for counts, an empty list for collections, an empty page for the
  paginated collection, and an empty container for the conversations node.
- **FR-029a**: The "empty page" of FR-029 MUST be a zero total, an empty item
  list, and page metadata declaring neither a next nor a previous page, with both
  cursors omitted. Cursors are already optional in the published contract, so
  this is byte-for-byte the shape a legitimately empty result set produces and
  needs no client change to consume.
- **FR-030**: Each degraded field MUST emit one warning-level log line naming
  the field and enough context to locate the orphaned session.
- **FR-031**: Behaviour for a fully signed-in account MUST be unchanged, and the
  published API contract (field names, nullability, types) MUST NOT change. In
  particular the "about me" identifier field keeps its current value for a
  request with no resolved account — it already renders that way for every
  anonymous visitor, so changing it would be a client cache-key change with no
  security benefit.

### Key Entities

- **Account identity reference**: The stable identifier that ties a platform
  account to its identity at the identity provider, and equally to the subject
  recorded on every session. It is optional on an account — accounts that never
  signed in through the identity provider do not have one. It is the only key by
  which sessions can be grouped per account.
- **Session record**: One signed-in device's state. Carries its subject
  (the account identity reference), the relying party it was minted for, its
  expiry ceiling, cached personal data, and — once ended — an end marker with a
  reason.
- **Ended-session marker**: The state a session record is left in after
  revocation. It exists precisely to distinguish "this session was ended" from
  "this session never existed"; the former must produce a refusal, the latter an
  anonymous visitor. It carries no personal data and no credentials, and it
  expires on its own shortly after being written.
- **Per-account session listing**: The grouping that makes revocation possible
  at all. Maps one account identity reference to the set of that account's live
  session identifiers. Expires no later than its longest-lived member.
- **Revocation reason**: A closed set of named causes — account deleted,
  password changed, email changed, revoked by an administrator, revoked by the
  account holder. Recorded on the ended-session marker and in the audit trail.
- **Revocation report**: The per-session outcome list returned by one revocation
  — each entry naming a session, its outcome (ended / already ended / already
  absent / skipped / failed) and, on failure, a non-leaking cause.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After an account is deleted, **100%** of that account's sessions
  are refused on their next request. Zero sessions survive. Verified by an
  automated test that replays a captured session after deletion.
- **SC-002**: The time between an account's deletion committing and its sessions
  becoming unusable is **under one second** in the normal path; there is no
  window measured in days.
- **SC-003**: **Zero** occurrences of cached personal data (display name, email
  address) remain in the session store for a deleted account, measured
  immediately after deletion.
- **SC-004**: Account deletion succeeds in **100%** of cases where revocation
  fails entirely, verified by an automated test that forces every revocation
  path to fail.
- **SC-005**: **Every** revocation failure produces exactly one audit record with
  a failure outcome. No failure path is silent.
- **SC-006**: **Zero** audit records and **zero** log lines emitted by this
  feature contain credential or token material, verified by an automated
  assertion over the emitted records.
- **SC-007**: Locating one account's sessions touches a number of stored entries
  proportional to that account's own session count — **never** to the total
  number of sessions on the platform.
- **SC-008**: An "about me" query issued with an orphaned session returns
  **zero** errors and a fully populated empty response, verified by an automated
  test.
- **SC-009**: Re-running a revocation for the same account produces the same
  successful result and causes **zero** additional state changes.
- **SC-010**: The published API contract is **unchanged** — zero breaking schema
  differences — and the platform's existing test suite passes unmodified except
  where it asserted the old error-raising behaviour.
- **SC-011a**: A session established **before** this capability shipped becomes
  revocable after **one** authenticated request from its holder, verified by an
  automated test that revokes a session which was never registered at sign-in.
- **SC-011b**: The self-healing listing write adds **zero** measurable latency to
  an authenticated request, because it is never awaited — verified by an
  automated test asserting the request completes without waiting on it.
- **SC-011**: The capability is consumable by the three known future callers
  (password change, self-service revocation, administrative email change)
  **without modification to its interface**, demonstrated by an automated test
  exercising the "leave this session alive" instruction and the partial-failure
  report.

## Assumptions

- **A-01**: The subject recorded on a session equals the account's identity
  reference. This is an implicit cross-service contract with the identity
  service; it holds today. It is asserted by an automated test so a future
  change of subject source fails loudly rather than silently revoking nothing.
- **A-02**: Ending the identity provider's own single-sign-on sessions does not
  by itself end platform access — the platform session is the gate. Both must
  therefore be ended.
- **A-03**: The correct end state for a revoked session is an explicit
  *ended* marker producing a refusal, not deletion of the session record. A
  deleted record reproduces the reported defect in a new form: the request falls
  through as an anonymous visitor, the client sees a success, and nothing tells
  it to sign out.
- **A-04**: Revocation runs after the deletion transaction commits. The
  resulting sub-second window in which the account row is gone but the session
  is not yet ended is accepted; it is closed on the next request either way.
- **A-05**: Deletion is a privileged, infrequent operation. The revocation path
  is not on any hot path and does not need to be optimised for throughput.
- **A-06**: The identity reference is nullable on an account. Accounts without
  one are a legitimate, expected state, not an error.
- **A-07**: This change writes **no** database migration and adds **no**
  database audit rows. The revocation audit trail belongs to the existing
  structured authentication audit stream. This deliberately avoids a collision
  with the audit categories and outcomes being introduced concurrently by the
  workspace platform-role redesign, which already owns the database-side audit
  record for account deletion.
- **A-08**: The story branch already existed when specification began, created
  by the delivery contract as `story/6315-oidc-session-revocation-cascade` off
  the integration branch. The specification step's branch-creation hook was
  therefore treated as already satisfied rather than re-run, which would have
  cut a second branch.
- **A-09**: Client-side work is out of scope. Once a revoked session produces a
  refusal, the client's existing session-status probe flips it to signed-out on
  its own.
- **A-10**: Backfilling the missing identity reference for accounts that predate
  the identity-key migration is a real and distinct defect, described in the
  anchor story's root-cause analysis. It requires an email-to-identity lookup at
  migration time and is **out of scope here**; it is assessed and recorded as a
  follow-up.

## Out of Scope

- Client-side changes of any kind.
- Backfilling the account identity reference for accounts migrated before the
  identity-key change (a data migration requiring an identity-provider lookup).
- Wiring the new capability into the password-change observer, the
  administrative email-change flow, or a self-service device list. The capability
  is designed for them; connecting them is their own change.
- Standards-track back-channel sign-out across multiple relying parties. Recorded
  as the target architecture, not built here.
- Filing the follow-up issues this work identifies. They are enumerated for a
  human to action.
