# Phase 1 Data Model — Session Revocation Cascade

**Feature**: `specs/107-oidc-session-revocation`
**Date**: 2026-07-31

**No relational entity is added, altered or removed. No TypeORM entity changes.
No migration.** The entire data model of this feature lives in Redis and in
TypeScript types.

---

## 1. Relational (PostgreSQL) — read-only participation

| Entity | Field | Role in this feature |
|---|---|---|
| `User` (`user.entity.ts`) | `authenticationID: string \| null` (`:53`) | **Read only.** The Kratos identity UUID; equals `session.sub` (research R10). `null` for users never linked to Kratos → revocation is skipped (FR-017, FR-028, trap 8) |

Nothing is written. No column, index, constraint or enum value is added.
Explicitly **not** touched: `platform_audit_entry` and its three Postgres enums
(`platform_audit_category`, `platform_audit_outcome`,
`platform_audit_initiator_role`) — see research R4 for the collision check
against `027-platform-role-redesign`.

---

## 2. Redis keyspace

### 2.1 Existing — `alkemio:sid:<sid>` (unchanged)

The session payload, owned by `express-session` + `connect-redis`
(`session-store.redis.ts:4`). This feature only *reads* it and *tombstones* it
through the existing `SessionStoreHandle`. Fields that matter here:

| Field | Use |
|---|---|
| `sub` | the subject — the index key, and the join to `User.authenticationID` |
| `client_id` | carried into the audit record |
| `refresh_token` | captured **before** tombstoning, passed to RFC 7009, never logged |
| `absolute_expires_at` | drives the index key's TTL roll-forward |
| `request_context_cache` | the cached PII the tombstone destroys (FR-010) |
| `terminated_at` / `terminated_reason` | the tombstone; `terminated_at` set ⇒ idempotent no-op |

### 2.2 Existing — `alkemio:sid:<sid>:refresh-lock` (unchanged shape)

`refresh-lock.ts:16`. Deleted as part of revocation (FR-011) so nothing keyed to
a dead session lingers.

### 2.3 NEW — `alkemio:sub:<sub>`

| Property | Value |
|---|---|
| Redis type | **Set** |
| Members | bare session ids (`sid`), the same values that suffix `alkemio:sid:` |
| Cardinality | one per active device; single digits in practice |
| TTL | rolled forward to `max(existing TTL, absolute_expires_at − now)`, floor 1 s |
| Written by | OIDC callback (FR-002); cookie-session strategy, self-healing (FR-002a) |
| Pruned by | logout, refresh-failure teardown, revocation (FR-003) |
| Read by | `revokeAllForSub` only |

**Invariants**

1. **I1 — no orphan key.** Every `SADD` is followed by an `EXPIRE`. A set without
   a TTL is a permanent leak (trap 9).
2. **I2 — TTL only grows.** The roll is `max(current, candidate)`. Setting rather
   than extending would let an early member's expiry evict a later member's
   entry.
3. **I3 — membership is advisory, never authoritative.** A member may name a sid
   whose payload is gone. That is the `already_absent` outcome, not an error
   (research R6). The payload — never the index — decides whether a session is
   alive.
4. **I4 — never enumerated globally.** Only ever `SMEMBERS alkemio:sub:<sub>` for
   one known subject. No `KEYS`, no `SCAN`, no wildcard (FR-005, SC-007).
5. **I5 — tombstones are never re-indexed.** The self-healing write runs strictly
   after the strategy's tombstone and absolute-TTL branches, so a dead session
   cannot be resurrected into the listing (research R7).
6. **I6 — empty set self-deletes.** Redis removes a set when its last member is
   `SREM`ed. No explicit cleanup needed, and `SMEMBERS` on a missing key returns
   `[]`, which is the correct "no sessions" answer.

---

## 3. TypeScript contracts

### 3.1 `SessionRevocationReason`

```ts
export type SessionRevocationReason =
  | 'account_deleted'    // server#6315 — this feature's only live consumer
  | 'password_changed'   // client-web#10070 — reserved
  | 'email_changed'      // the unreported admin email-change defect — reserved
  | 'admin_revoked'      // operator force-revoke — reserved
  | 'user_revoked';      // server#6073 self-service — reserved
```

All five ship now (research R5). This is a TypeScript union, **not** a database
enum — unused members cost nothing and their absence would cost three future PRs
a merge conflict on one line.

The value flows into `markTerminated(sid, reason, ctx)`'s existing free-form
`reason` parameter → the tombstone's `terminated_reason` → the 401's
`error_code` (`cookie-session.strategy.ts:90, 98`). Visible end-to-end, no new
plumbing.

### 3.2 Per-session outcome

```ts
export type SessionRevocationOutcome =
  | 'revoked'             // tombstone written — this session is dead
  | 'already_terminated'  // payload already had terminated_at (idempotent, FR-015)
  | 'already_absent'      // index named a sid with no payload; pruned, no tombstone
  | 'skipped_excepted'    // matched opts.exceptSid (FR-008)
  | 'failed';             // local teardown threw

export type TokenRevocationOutcome =
  | 'revoked'   // authorization server returned 2xx
  | 'failed'    // non-2xx, network error, timeout, or discovery incomplete
  | 'skipped';  // nothing to revoke (no refresh token, or session already dead)
```

The remote outcome is reported **separately** from the local one, deliberately:
FR-013 requires the local teardown to stand regardless of the remote leg, so
collapsing the two would make "locally dead, remotely unknown" indistinguishable
from "still alive" — the exact conflation this feature exists to remove.

### 3.3 Entry and report

```ts
export type SessionRevocationEntry = {
  sid: string;
  outcome: SessionRevocationOutcome;
  tokenRevocation: TokenRevocationOutcome;
  /** Redacted, non-leaking cause. Never contains token material. */
  failureReason?: string;
};

export type SessionRevocationReport = {
  sub: string;
  reason: SessionRevocationReason;
  correlationId: string;
  entries: SessionRevocationEntry[];
  revokedCount: number;
  failedCount: number;
  /** true iff no entry has outcome 'failed' and no tokenRevocation is 'failed' */
  complete: boolean;
};
```

**Validation rules**

- `entries.length === 0` is valid and successful — an account with no live
  sessions, or no `authenticationID` at all (FR-017).
- `revokedCount` counts only `outcome === 'revoked'`. `already_terminated` and
  `already_absent` are successes but not revocations; conflating them would
  inflate the audit trail with sessions this call did not end.
- `failureReason` is populated **only** for `failed`, and is produced by a
  redaction helper. FR-021 is absolute: no token, no cookie value, no
  `Authorization` header content, ever.
- `complete === false` does **not** make the call an error. Partial failure is a
  reportable result (FR-014).

### 3.4 Options

```ts
export type RevokeAllForSubOptions = {
  /** Leave this session alive — ASVS V3.3.2 / client-web#10070 / server#6073. */
  exceptSid?: string;
  /** Propagated into every audit record; generated if absent. */
  correlationId?: string;
};
```

---

## 4. State transitions

### 4.1 Session lifecycle (the new transition in **bold**)

```text
                    ┌──────────── absolute ceiling breached ──────────► 401
                    │
  (none) ──callback──► ACTIVE ──logout──────────────────────────────► (none) → anonymous
                    │     │
                    │     ├──3 refresh failures in 5 min────────────► TOMBSTONED → 401
                    │     │
                    │     └──**revokeAllForSub**──────────────────► TOMBSTONED → 401
                    │
                    └── indexed in alkemio:sub:<sub> at callback,
                        and self-healed on any authenticated request

  TOMBSTONED ──300 s TTL lapses──► (none) → anonymous          (FR-009a)
```

The tombstone → 401 edge already exists and is already wired
(`cookie-session.strategy.ts:89-101`). This feature adds a **second producer** of
that state; it invents no new state. That is why the change is small and why the
client needs no work (WS4 is empty).

### 4.2 Index lifecycle

```text
  callback           ──► SADD sid ; EXPIRE max(ttl, abs_exp − now)
  authenticated req  ──► SADD sid ; EXPIRE …            (idempotent, fire-and-forget)
  logout             ──► SREM sid
  refresh teardown   ──► SREM sid
  revokeAllForSub    ──► SMEMBERS → per-sid teardown → SREM each handled sid
  last SREM          ──► key auto-removed by Redis      (I6)
  no activity        ──► key expires at the latest member's ceiling  (I1, I2)
```

### 4.3 Deletion cascade ordering (FR-026, FR-026a)

```text
  authorize ─► load user ─► guard (account has no resources)
      │
      ├─► BEGIN TX ─ profile, authorization, storage, settings, actor ─ COMMIT
      │                                          │
      │                                   (rollback ⇒ STOP; nobody is signed out)
      ▼
  post-commit external calls, each individually try/caught:
      1. revokeAllForSub(authenticationID, 'account_deleted')   ← NEW, unconditional
      2. kratosService.invalidateAllIdentitySessions(…)         ← NEW, unconditional
      3. kratosService.clearIdentityActorMetadata(…)            ← existing
      4. kratosService.deleteIdentityById(…)                    ← existing, gated on deleteIdentity
      ▼
  return the deleted user
```

Steps 1 and 2 are first because platform access is what actually matters — if
the process dies partway through this block, the leg that ran is the one that
mattered (research R11). Step 4's `deleteIdentity` gate stays exactly where it
is and **must not** be allowed to reach steps 1–2 (FR-025, trap 2).

---

## 5. Audit record shape

Extends the existing `AuditEvent` (`core/auth/oidc/audit.ts:5`) with one optional
field; no field is removed or retyped.

| Field | Source | Notes |
|---|---|---|
| `event_type` | new: `session.revocation.initiated` \| `session.revoked` \| `session.revocation.completed` | additive union members |
| `outcome` | `'success' \| 'failure'` | existing union, unchanged |
| `sub` | the subject | |
| `client_id` | session payload | `null` when the payload was already gone |
| `correlation_id` / `request_id` | caller-supplied or generated | |
| `error_code` | redacted failure cause | on failures only |
| **`reason`** | `SessionRevocationReason` | **NEW optional field** |

Explicitly absent, and asserted absent by a test (FR-021, SC-006):
`access_token`, `id_token`, `refresh_token`, cookie values, and the contents of
`request_context_cache`.

---

## 6. What a reviewer should check this model against

- No `src/migrations/**` file appears in the diff.
- No `*.entity.ts` appears in the diff.
- `pnpm schema:diff` reports zero breaking changes.
- The only new Redis key family is `alkemio:sub:*`.
- Every `SADD` in the diff has an `EXPIRE` on the same path (I1).
