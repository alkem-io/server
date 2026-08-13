# Phase 0 Research — Session Revocation Cascade on Account Deletion

**Feature**: `specs/107-oidc-session-revocation`
**Date**: 2026-07-31
**Upstream research**: `agents-hq/docs/oidc-session-revocation-handover.md` (2026-07-31)

Every `file:line` below was **re-verified against this worktree** (`origin/develop`
@ `a4e30c667`) rather than taken on trust from the handover. Drift from the
handover's anchors is called out where found.

---

## R0 — Anchor re-verification

| Handover claim | Anchor | Status in this worktree |
|---|---|---|
| Session payload shape, `sub`, `request_context_cache` PII | `session-store.redis.ts:14-38` | ✅ exact |
| Key prefix `alkemio:sid:`; tombstone TTL 300 s | `session-store.redis.ts:4,12` | ✅ exact |
| `destroy` vs `markTerminated` | `session-store.redis.ts:152,155` | ✅ (handover said `:39-54`, which is now the `SessionStoreHandle` *type*; the implementations moved to `:145-190`) |
| Tombstone → `CookieSessionInvalidError` → 401 | `strategies/cookie-session.strategy.ts:89-101` | ✅ (handover said `:85-100`) |
| `sub` captured at callback | `oidc.controller.ts:246` | ✅ exact |
| Only production caller of `markTerminated` | `oidc.controller.ts:491` | ✅ exact — still exactly one |
| `end_session_endpoint` read from issuer metadata | `oidc.controller.ts:634-639` | ✅ exact |
| `deleteUser`, transaction, Kratos block | `user.service.ts:507, 543, 565-603` | ✅ exact |
| `deleteIdentity` gate | `user.service.ts:586` | ✅ exact |
| `invalidateAllIdentitySessions` exists, never called from `deleteUser` | `kratos.service.ts:359` | ✅ exact |
| `me` guards throw | `me.resolver.fields.ts:59, 108, 133, 159, 221` | ✅ exact — but the list is **incomplete**, see R9 |
| `me.id` → `` `me-${actorID}` `` | `me.resolver.fields.ts:75` | ✅ exact |
| `user.authenticationID` nullable | `user.entity.ts:53` | ✅ exact |
| No `sub → [sid]` index anywhere | grep | ✅ confirmed absent |
| RFC 7009 not implemented anywhere | grep `revocation_endpoint` | ✅ confirmed absent |

**Verdict**: every one of the handover's *behavioural* claims holds, and its line
anchors are accurate to the line with two exceptions, neither of which changes a
conclusion:

- `destroy` / `markTerminated` are cited at `session-store.redis.ts:39-54`; that
  range is now the `SessionStoreHandle` **type declaration**, with the
  implementations at `:145-190`. The semantics described are correct.
- The tombstone→401 branch is cited at `cookie-session.strategy.ts:85-100`;
  it is at `:89-101`.

The one materially incomplete claim is the `me` guard list — see **R9**. It names
five of the seven guards that must change.

---

## R1 — Teardown verb: tombstone, not delete

**Decision**: revocation uses `markTerminated`, never `destroy`.

**Rationale**: `CookieSessionStrategy.validate` reads the payload and branches
three ways (`cookie-session.strategy.ts:81, 89, 105`):

- **no key** → `return null` → anonymous fall-through, HTTP 200. This is what
  `destroy` produces.
- **key with `terminated_at`** → `CookieSessionInvalidError` → **401**.
- **key past its absolute ceiling** → 401.

`destroy` therefore reproduces the reported bug wearing a different hat: the
browser keeps rendering as signed-in because nothing told it otherwise. Only the
tombstone produces the 401 that flips `client-web`'s
`isAuthenticated = oidcActive` derivation to false.

The tombstone is also the **privacy** fix: `markTerminated` writes
`request_context_cache: null` and blanks all three token fields
(`session-store.redis.ts:164-181`), so the cached display name and email are
destroyed at revocation instead of lingering to the 30-day ceiling. One verb,
two defects. This is the strongest single argument in the PR.

**Alternatives rejected**:

- `destroy` — silent anonymous fall-through (above).
- A new "revoked" verb distinct from `markTerminated` — a second tombstone
  shape to keep in sync with the strategy's branch, for zero behavioural gain.
  `markTerminated` already takes a free-form `reason` string, which is exactly
  the extension point needed.

---

## R2 — Index representation and TTL

**Decision**: a Redis **Set** at `alkemio:sub:<sub>` whose members are bare
session ids. `SADD` to add, `SREM` to prune, `SMEMBERS` to enumerate, `EXPIRE`
rolled forward on every add.

**Rationale**:

- `SADD` is idempotent, which is exactly the semantics FR-002/FR-002a need — the
  self-healing write can run on every request without accumulating duplicates.
- `SMEMBERS` on a set holding a handful of members is O(n) *in the account's own
  sessions*, satisfying FR-005/SC-007. No `SCAN`, no `KEYS`, no wildcard.
- The prefix `alkemio:sub:` deliberately mirrors the existing `alkemio:sid:`
  (`session-store.redis.ts:4`) so both live in one visible namespace.

**TTL (FR-004, trap 9)**: on every `SADD` the key's TTL is set to
`max(currentTtl, absolute_expires_at - now)` — i.e. rolled *forward* to the
latest member's absolute ceiling, never shortened. A `SADD` without an `EXPIRE`
leaks the key forever; an `EXPIRE` that only ever sets (rather than extends)
would let an early member's expiry evict a later member's entry. Both are
implemented in one Lua-free two-command pipeline: `SADD` then a `TTL`-aware
`EXPIRE`. Floor of 1 second so a computed non-positive TTL cannot mean
"delete immediately".

**Alternatives rejected**:

- **Redis hash `sid → absolute_expires_at`** — would allow per-member expiry
  reasoning, but Redis has no per-field TTL, so it buys nothing a set does not
  and costs a larger payload.
- **Sorted set scored by expiry** with lazy `ZREMRANGEBYSCORE` — genuinely
  tidier for garbage, but the set + key-level TTL already bounds growth, and
  stale members are already handled as the *already absent* outcome (R6). Extra
  machinery for a problem that resolves itself.
- **`SCAN` over `alkemio:sid:*` filtering by `sub`** — explicitly forbidden by
  FR-005; O(total sessions) per revocation and unbounded blast radius.

---

## R3 — RFC 7009 revocation call

**Decision**: a direct `POST` to the issuer's advertised `revocation_endpoint`
using Node's global `fetch` with `AbortSignal.timeout(3000)`. Body:
`token=<refresh_token>&token_type_hint=refresh_token&client_id=<web_client_id>`,
content type `application/x-www-form-urlencoded`.

**Rationale**:

- The endpoint is resolved from `OidcService.getIssuer().metadata` — the *same*
  discovery metadata the logout leg already reads for `end_session_endpoint`
  (`oidc.controller.ts:634`). One discovery source, one retry policy, no new
  configuration key.
- The RP is a **public** client (`token_endpoint_auth_method: 'none'`,
  `oidc.service.ts:78`), so RFC 7009 §2.1 client authentication is the
  `client_id` form parameter. No secret is involved, which is also why no
  credential can leak into a log.
- Node 22 ships `fetch` and `AbortSignal.timeout` — no new dependency, and the
  per-call timeout FR-012a demands is expressible directly.
- RFC 7009 §2.2: the endpoint returns 200 for an already-invalid token. Idempotency
  (FR-015) comes free from the protocol.

**Alternatives rejected**:

- **`openid-client`'s `client.revoke(token, 'refresh_token')`** (it exists —
  `openid-client@5.7.1` types `:361`). Rejected on the timeout: openid-client
  takes HTTP options from `client[custom.http_options]`, which is
  **client-global**. Setting a 3 s timeout there to satisfy FR-012a would
  silently impose it on the login callback and the token refresh too. Mutating
  shared state to configure one call is the wrong trade; a 12-line `fetch` is
  cheaper and local. *(If a future change needs several RFC 7009 call sites,
  revisit — a dedicated client instance for revocation would then be justified.)*
- **`@nestjs/axios` / `HttpService`** — the OIDC module has no HTTP client today
  and adding one to make a single form POST is unjustified module weight.
- **Skipping remote revocation entirely** — the refresh grant would survive at
  the authorization server, so a stolen refresh token could still mint access
  tokens after the account is gone. RFC 9700 names this explicitly.

**Failure handling**: any non-2xx, any network error, any timeout, and the
"discovery has not completed" case are all one outcome — the remote leg failed.
The local tombstone has already landed by then (FR-013, §5.6.5 of the handover:
*prefer local certainty over remote completeness*), so the access-control
property holds regardless; the failure is audited and logged, never swallowed.

---

## R4 — Where the audit trail goes (and the enum-collision check)

**Decision**: the revocation audit trail is written to the **existing structured
OIDC audit stream** (`core/auth/oidc/audit.ts` → `emitAudit`), extending its
`AuditEventType` union with three new values. **No** row is written to
`platform_audit_entry`, and **no** value is added to `PlatformAuditCategory`,
`PlatformAuditOutcome` or `PlatformAuditInitiatorRole`. **No migration.**

**Collision check performed** (handover trap 6), against
`agents-hq/specs/027-platform-role-redesign/` — whose slice A is code-complete
and in review, so the collision risk was live rather than hypothetical:

| Enum | 027 adds | Collides with `account_deleted`? |
|---|---|---|
| `PlatformAuditCategory` | `platform_role_assignment`, `platform_user_record`, `platform_configuration`, `platform_resource` (`contracts/graphql-contract.md:107`) | **No** |
| `PlatformAuditOutcome` | `role_granted`, `role_revoked`, `role_grant_rejected`, `service_profile_changed`, `configuration_changed`, `resource_moved`, `resource_deleted`, `visibility_changed`, `license_assigned`, `license_revoked`, `identity_deleted`, `account_reset` (`tasks/server.md:86`, migration `AddPlatformAuditOutcomes`) | **No** — but note the near-miss `identity_deleted` |
| `PlatformAuditInitiatorRole` | nothing | n/a |

**Result: no literal collision.** But the check surfaced something more useful
than a name clash: 027 **already owns the database-side audit record for user
deletion**. Its T062 re-gates `deleteUser` onto `PLATFORM_USERS_ADMIN` and writes
a `platform_user_record` / `identity_deleted` row for it. If this feature also
wrote a `platform_audit_entry` row for the same deletion we would ship two
different rows describing one event, from two branches that are both in flight,
and 027's residual-risk register already carries an open **high** finding
(`spec-server-27`) that `deleteUser`'s audit row is written on only one of its
branches. Adding a second writer into that is how you turn a fixable finding
into an unfixable one.

Staying on the OIDC audit stream also fits the data better: these events are
*session* events (`session.ended`, `auth.cookie.session_terminated` already live
there), they are per-session rather than per-mutation, and they carry `sub` /
`client_id` / `rp_id`, none of which `platform_audit_entry` has a column for.

**Net effect**: this feature ships **zero DDL and zero migrations**, and merges
with 027 in either order without a conflict in `src/migrations/`.

**Alternatives rejected**:

- New `PlatformAuditCategory.SESSION_REVOCATION` + outcomes + migration —
  duplicate authority over the deletion event (above), a migration racing 027's
  `ALTER TYPE`, and it would have to satisfy 027's `AUDIT_WRITER_COVERAGE`
  exhaustive-`Record` gate, which does not exist on this branch and would break
  their build on merge.
- Logger-only, no audit events — violates FR-018/FR-022 and A.8.15/A.8.16; a
  best-effort call that fails only into a log line is an unmonitored control.

**New event types** (`AuditEventType`, additive):
`session.revocation.initiated`, `session.revoked`, `session.revocation.completed`.
Existing `session.ended` is left alone — it means *the holder signed out*, and
overloading it would destroy the distinction an auditor needs.

---

## R5 — Reason vocabulary

**Decision**: a closed union `SessionRevocationReason` shipped with **all five**
values upfront: `account_deleted`, `password_changed`, `email_changed`,
`admin_revoked`, `user_revoked`.

**Rationale**: FR-016 needs a closed set; shipping only `account_deleted` would
force server#6073, client-web#10070 and the §3 email-change defect each to widen
the union — three PRs touching the same line for no reason. This mirrors the
codebase's own precedent: `PlatformAuditInitiatorRole` ships `SYSTEM`/`SERVICE`
upfront "so future categories do not require an enum migration"
(`enums/platform.audit.initiator.role.ts`). It is a TypeScript union, not a
database enum, so unused members cost literally nothing.

The value flows into `markTerminated`'s existing free-form `reason` parameter and
onward into the tombstone's `terminated_reason`, which the strategy already
surfaces as the 401's `error_code` (`cookie-session.strategy.ts:90, 98`). So the
reason is visible end-to-end with no new plumbing.

---

## R6 — Per-session outcomes and partial failure

**Decision**: `revokeAllForSub` returns a report; it does not throw for
per-session problems. Outcome vocabulary:

| Outcome | Meaning |
|---|---|
| `revoked` | tombstone written; this session is dead |
| `already_terminated` | payload already carried `terminated_at` — idempotent no-op (FR-015) |
| `already_absent` | index named a sid whose key is gone (expired / signed out). Pruned from the index. **Not** an error, and **no** tombstone is written — there is nothing left to tombstone and inventing one would resurrect a 401 for a session that had cleanly ended |
| `skipped_excepted` | matched `opts.exceptSid` (FR-008) |
| `failed` | the local teardown itself threw. Carries a redacted cause |

The remote (RFC 7009) leg is reported **separately per session**
(`tokenRevocation: 'revoked' | 'failed' | 'skipped'`) precisely because FR-013
requires the local outcome to stand independently of it. Collapsing them into
one status would make "locally dead, remotely unknown" indistinguishable from
"still alive" — the exact conflation this whole feature exists to remove.

`revokeAllForSub` throws only when it cannot enumerate at all (the index read
itself fails). That is a genuinely different condition — "we do not know what to
revoke" — and the caller (`deleteUser`) traps it anyway.

---

## R7 — Pre-existing sessions (the deploy-day hole)

**Decision**: opportunistic self-healing from `CookieSessionStrategy.validate`,
fire-and-forget (FR-002a).

**Rationale**: the index is only written at callback, so on the day this ships
**every session already in flight is invisible to revocation**. That is the exact
population carrying the bug. Backfilling from the request path is O(1) (`SADD`
is idempotent, so steady state is a no-op write), needs no migration, and the
call is deliberately not awaited — `void`ed with a `.catch()` that logs — so it
can add no latency (SC-011b) and cannot fail a request (FR-006).

It is placed **after** the tombstone and absolute-TTL branches so a terminated or
expired session is never re-indexed. Re-indexing a tombstone would resurrect a
dead sid into the listing on every request from a stale tab — a small but real
leak, and it would corrupt the *already absent* accounting.

**Alternatives rejected**:

- **Boot-time `SCAN` of `alkemio:sid:*` to build the index** — the whole-keyspace
  scan FR-005 forbids; also racy against live writes and repeated on every pod.
- **Do nothing; wait for natural re-login** — leaves the anchor defect open for
  up to the 30-day absolute ceiling for precisely the affected population. Not
  acceptable for an A.5.18 control.
- **Backfill in the session-renewal middleware** — that middleware only fires in
  the back half of the idle window (`session-store.redis.ts:105-121`), i.e. up to
  7 days late. Too slow for a security control.

---

## R8 — Module wiring (resolving the Deferred planning item)

**Decision**: extract a new `OidcCoreModule`
(`src/core/auth/oidc/oidc-core.module.ts`) holding the dependency-light
foundation, imported by both `OidcModule` and `UserModule`:

```text
OidcCoreModule           imports: ConfigModule
  provides/exports:      OidcService                     (moved from OidcModule)
                         OIDC_REDIS_CLIENT               (new — one shared ioredis)
                         SESSION_STORE_HANDLE            (moved from OidcModule)
                         OidcSessionIndexService         (new)
                         OidcSessionRevocationService    (new)

OidcModule    imports OidcCoreModule; keeps controllers + strategies + bearer wiring
UserModule    imports OidcCoreModule; UserService injects OidcSessionRevocationService
```

**Rationale**: `UserModule` cannot import `OidcModule` — `OidcModule` pulls in
`AuthenticationModule`, `ActorContextModule`, `AuthorizationModule` and
`PlatformAuthorizationPolicyModule`, and `UserModule` sits underneath several of
those. That is a dependency cycle, forbidden outright by constitution principle
2. `OidcCoreModule`'s only import is `ConfigModule`, so it can be imported from
anywhere.

It also **removes** a latent problem rather than adding one: today
`SESSION_STORE_HANDLE`'s factory constructs its own `new Redis(...)`
(`oidc.module.ts:56`). Hoisting the client to its own token means the index and
the store share one connection instead of opening a second.

`OidcService` is exported by `OidcModule` today but has **no consumer outside
`src/core/auth/oidc/`** (verified by grep), so moving its provider is safe;
`OidcModule` re-exports `OidcCoreModule` to keep the public surface identical.

**Alternatives rejected**:

- **A second `OidcService` instance inside a standalone revocation module** —
  duplicates the background discovery loop, its retry timer and its error
  logging. Two pods' worth of discovery noise per process.
- **`forwardRef` between `UserModule` and `OidcModule`** — makes the cycle legal
  rather than absent. Constitution principle 2: *"Circular dependencies are
  forbidden — violations require redesign."*
- **Injecting the revocation service into `deleteUser` via an event** — the
  codebase's event bus is async fire-and-forget, which contradicts FR-026a's
  awaited-inline requirement and destroys the audit trace.

---

## R9 — `me` guard inventory (handover drift)

The handover lists the guards to relax as `me.resolver.fields.ts:59, 108, 133,
159, 221`. Those five anchors are exact — but the list is **two short**, and
following it literally would ship a fix that does not work:

| # | Field | Anchor | Today | Becomes |
|---|---|---|---|---|
| 1 | `notifications` | `me.resolver.fields.ts:37` | throws **`ForbiddenException`** | empty page (FR-029a) |
| 2 | `notificationsUnreadCount` | `me.resolver.fields.ts:59` | `ValidationException` | `0` |
| 3 | `communityInvitationsCount` | `me.resolver.fields.ts:108` | `ValidationException` | `0` |
| 4 | `communityInvitations` | `me.resolver.fields.ts:133` | `ValidationException` | `[]` |
| 5 | `communityApplications` | `me.resolver.fields.ts:159` | `ValidationException` | `[]` |
| 6 | `conversations` (container) | `me.resolver.fields.ts:221` | `ValidationException` | `{}` |
| 7 | `conversations` (list) | `me.conversations.resolver.fields.ts:23` | `ValidationException` | `[]` |

The two the handover misses:

1. **Guard 1 — `notifications` at `:37`.** It throws `ForbiddenException`, not
   `ValidationException`, which is presumably why a `ValidationException`-shaped
   sweep skipped it; and it is the *paginated, non-nullable* field, so it is the
   one whose empty value actually needed specifying (FR-029a). Left as-is, a
   client that selects `me { notifications { ... } }` still gets a hard error.
2. **Guard 7 — the conversations guard is duplicated across two files.**
   `me.resolver.fields.ts:221` only returns the empty container; the real thrower
   is `me.conversations.resolver.fields.ts:23`. Relaxing the container alone
   leaves `me { conversations { conversations } }` erroring exactly as before —
   a cosmetic fix that would pass a shallow test and fail the actual client query
   (`UserPendingMemberships` selects into it).

Both are in scope. Guard at `:87` (`user`) is deliberately **not** in the list —
it already returns `null` correctly.

Also worth stating plainly: these guards fire for **every anonymous visitor**
today, not just orphaned sessions — `ActorContextService.createAnonymous()` sets
`actorID = ''` (`actor.context.service.ts:35`). So `me { notificationsUnreadCount }`
from a logged-out browser is an error response *right now*. The degradation fixes
a live defect wider than the orphan case, which is a point worth making in the PR.

**`me.id` is deliberately untouched** (spec clarification pass 1): it already
renders `"me-"` for every anonymous caller for the same reason, so it is neither
new nor orphan-specific.

---

## R10 — Cross-repo subject contract (trap 7)

`oidc-service` sets the Hydra subject to the Kratos identity id
(`internal/challenge/service.go`, `login.SetSubject(kratosIdentityID)`), the BFF
reads it at `oidc.controller.ts:246`, and `user.authenticationID` stores the same
value. So `session.sub === user.authenticationID` — the join that makes
account-scoped revocation possible at all.

This is an **implicit cross-service contract with no compile-time enforcement**.
If a future change repoints the subject (e.g. server#5941, Microsoft OIDC subject
pinning) `revokeAllForSub` would keep returning cheerful empty reports while
revoking nothing — a security control failing open and silent.

**Decision**: pin it with an explicit unit test that constructs a session payload
and a user entity and asserts the two fields are the same value, named and
commented so its failure reads as *"the subject source changed; revocation is now
a no-op"* rather than as a broken fixture. Cheap insurance against the worst
failure mode this design has.

---

## R11 — Ordering inside `deleteUser`

**Decision**: revocation goes in the existing post-commit external-calls block
(`user.service.ts:565-603`), **before** the Kratos metadata/identity calls, and
runs unconditionally.

**Rationale**:

- **After commit** (FR-026): a rolled-back deletion must not sign anyone out.
  `user.service.ts` already puts its external calls after the transaction closes
  at `:563`; this follows that shape rather than inventing one. The residual
  sub-second window is accepted and documented (A-04).
- **Before the Kratos identity calls**: platform access is what actually matters
  (the BFF session gates the API; Kratos does not — server#6288). If the process
  dies partway through this block, the leg that ran is the one that mattered.
- **Unconditionally** (FR-025, trap 2): the existing `deleteIdentity` gate at
  `:585` guards *identity deletion*. Gating session revocation on it would leave
  a live Kratos identity with live sessions — precisely the orphan state.
- **Best-effort** (FR-027, trap 4): user deletion has broken against Kratos
  repeatedly (server#5350, #5678, #4762, #2137). Every call in this block is
  already individually `try/catch`ed with an error log; the new legs follow that
  exact pattern.

**Retry policy**: the existing calls in this block do not retry, and neither do
the new ones (FR-012a). `retryWithBackoff` exists
(`user-email-change/user.email.change.retry.util.ts:39`) but is scoped to that
feature; importing a sibling domain's retry helper into `user.service.ts` to
retry a best-effort call would add cross-domain coupling that constitution
principle 1 discourages, for no access-control gain.

---

## R12 — Testing approach

Repo convention (`.specify/memory/constitution.md` §6 + `test-generation-guidelines.md`):
Vitest 4, `@golevelup/ts-vitest` `createMock` for collaborators, unit tests
co-located as `*.spec.ts`. `ioredis-mock` is **not** a dependency and will not be
added — the Redis client is mocked at the `ioredis` interface, which is what the
existing `session-store.redis.spec.ts` already does.

The compliance-evidence tests (handover §5.2, §8) — *deletion → session ends →
next request refused* — are written as **service-level integration-style specs**
wiring the real `OidcSessionRevocationService` to a fake in-memory Redis and the
real `CookieSessionStrategy`, asserting a `CookieSessionInvalidError`. That is
the honest end of the trace: it proves *access ended*, not merely that a method
was called. A full HTTP-level e2e would need a live Redis, Hydra and Postgres and
belongs to `test-suites`, not to this repo's unit suite.

---

## R13 — What is deliberately not built

| Item | Why not here |
|---|---|
| `authenticationID` backfill migration | Distinct defect (issue #6315's root-cause section). Needs a Kratos email→identity lookup at migration time — an external call inside a migration, which the repo has no pattern for. Assessed in the PR body; listed as a follow-up. |
| Wiring `password_changed` into `password-changed.consumer.ts` | The reason value and `exceptSid` ship ready for it; connecting it is client-web#10070's change. |
| Wiring `email_changed` into `user.email.change.service.ts:519` | The unreported §3 defect. Deliberately left as a *filed follow-up* so it gets its own issue, review and test rather than riding in on a deletion PR. |
| Self-service device list | server#6073. Consumes this primitive unchanged (trap 10). |
| Back-channel logout | Target architecture for the epic, not a fix for this bug. |
| `prompt: 'login'` SSO lead | UNVERIFIED in the handover §4.4. Checked in passing while in `oidc.controller.ts` — finding recorded in the PR body, no change made. |
