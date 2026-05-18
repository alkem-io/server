# Phase 1 — GraphQL Contract

**Feature**: 097-change-user-email (Platform Admin, No Verification)
**Date**: 2026-05-13
**Last Updated**: 2026-05-18 (smaller MVP — verification surface moved to 098)
**Companion**: `/specs/098-self-service-email-change/contracts/graphql.md` adds the verification surface (the `userEmailChangeConfirm` root mutation, the `meUserEmailChangeBegin` mutation, the `me.pendingEmailChange` query, the `UserEmailChangePending` type, the additive audit-outcome enum values for the verification flow).

This file enumerates the GraphQL surface introduced by this feature. The SDL fragments below are the *contract* that the schema baseline diff (per `pnpm run schema:diff`) will validate. All additions are additive; there are no breaking changes to existing types.

The fragments are organised by GraphQL kind:
1. New enums
2. New object types (results / payloads)
3. New input types
4. New mutations (2)
5. New query fields (2)
6. Error code mapping

---

## 1. New enums

```graphql
"""Role of the actor who initiated a user-email-change audit event."""
enum UserEmailChangeInitiatorRole {
  SELF
  PLATFORM_ADMIN
}

"""Outcome recorded for a single audit entry. Spec 098 extends this enum (additively) with verification-flow outcomes."""
enum UserEmailChangeAuditOutcome {
  COMMITTED
  ROLLED_BACK
  DRIFT_DETECTED
  DRIFT_RESOLVED
  DRIFT_RESOLUTION_FAILED
  SECURITY_SIGNAL_FAILED
  SESSION_INVALIDATION_FAILED
  REJECTED_VALIDATION
  REJECTED_CONFLICT
}
```

(No `UserEmailChangeStateValue` enum in this spec — there is no multi-step lifecycle and no pending entity. Spec 098 introduces that enum natively.)

---

## 2. New object types

### `UserEmailChangeAuditEntry` — page items in the audit query

```graphql
"""
A single audit-trail entry. Append-only and retained indefinitely (FR-014a).
"""
type UserEmailChangeAuditEntry {
  id: UUID!

  """The user whose email is being changed."""
  subject: UserProfileSummary!

  """
  The user who initiated the change, as a minimal profile summary. Null only for entries
  whose initiator could not be resolved (early validation rejects) — initiatorRole is still
  always present. (FR-014b)
  """
  initiator: UserProfileSummary

  """Whether the change was admin-initiated (this spec) or self-initiated (spec 098 onward)."""
  initiatorRole: UserEmailChangeInitiatorRole!

  """Old email at the time of this audit entry. Null only for entries with no old-email context."""
  oldEmail: String

  """
  The address recorded for this entry. For commit/rollback entries this is the proposed/applied
  new address. For drift_detected entries this is the value observed on the Kratos side at the
  moment of drift. Null only for entries with no new-email context.
  """
  newEmail: String

  """Outcome recorded for this entry."""
  outcome: UserEmailChangeAuditOutcome!

  """Short non-leaky failure reason. Set on failure outcomes only."""
  failureReason: String

  """Timestamp at which this audit entry was recorded."""
  timestamp: DateTime!
}
```

### `UserEmailChangeAuditEntries` — paginated query result

```graphql
"""Cursor-paginated list of audit entries (per docs/Pagination.md)."""
type UserEmailChangeAuditEntries {
  auditEntries: [UserEmailChangeAuditEntry!]!
  pageInfo: PageInfo!
  total: Float!
}
```

### `UserEmailChangeResult` — returned by the admin-change and drift-resolve mutations

```graphql
"""
Result returned to the admin caller. Deliberately minimal — failure surfaces as a typed GraphQL
error per the error-code mapping. Returned by both adminUserEmailChange (the synchronous commit)
and adminUserEmailChangeDriftResolve (the reconciliation mutation).
"""
type UserEmailChangeResult {
  """Always true on success. (Failures throw typed GraphQL errors instead of returning false.)"""
  success: Boolean!

  """The committed (canonical) email. Present on success."""
  email: String
}
```

### `UserProfileSummary` — minimal user representation (may already exist)

```graphql
"""
Minimal user-profile summary used wherever this feature needs to identify a user without
exposing PII beyond id and displayName. If a structurally equivalent type already exists
in the schema, that one is reused and this fragment is omitted from the additive surface.
"""
type UserProfileSummary {
  id: UUID!
  displayName: String!
}
```

> **Schema-bootstrap note**: If the project already has an `IUser` / `UserSummary` / `IProfile` shape with `id` + `displayName`, the implementation MUST reuse it rather than introducing `UserProfileSummary`. This is a non-load-bearing naming decision; the contract is the `{ id, displayName }` shape.

---

## 3. New input types

```graphql
"""Input for adminUserEmailChange. Synchronous admin-on-behalf email change; no platform-mediated verification (FR-002)."""
input AdminUserEmailChangeInput {
  """The subject user whose email is being changed."""
  userID: UUID!

  """The proposed new email address."""
  newEmail: String!
}

"""Input for adminUserEmailChangeDriftResolve. Reconciles an outstanding drift-detected audit entry (FR-009b)."""
input AdminUserEmailChangeDriftResolveInput {
  """The subject user whose latest audit entry is drift_detected."""
  userID: UUID!

  """
  The admin-chosen canonical email. MUST be one of the two values observed on the
  drift_detected audit entry (i.e., either the old or the new email). Force-aligns
  both sides to this value within the FR-009 retry budget.
  """
  canonicalEmail: String!
}
```

---

## 4. New mutations

```graphql
extend type Mutation {
  """
  Change a user's login email synchronously, acting as a platform administrator. The admin
  is responsible for verifying the subject user's identity out-of-band (the platform does
  NOT send a confirmation message to the new mailbox and does NOT require the new mailbox
  to prove ownership). Validates uniqueness, commits Kratos → Alkemio with bounded retry,
  invalidates the subject's existing sessions, and sends a security-signal notification to
  the old address. Authorization: caller must hold AuthorizationPrivilege.PLATFORM_ADMIN.
  (FR-002, FR-002a, FR-013, FR-018)
  """
  adminUserEmailChange(
    adminUserEmailChangeData: AdminUserEmailChangeInput!
  ): UserEmailChangeResult!

  """
  Reconcile an outstanding drift-detected state for a subject user by force-aligning Alkemio
  and Kratos to a canonical email chosen by the admin. The latest audit entry for the subject
  must have outcome drift_detected with no subsequent drift_resolved entry. Authorization:
  caller must hold AuthorizationPrivilege.PLATFORM_ADMIN. (FR-009b)
  """
  adminUserEmailChangeDriftResolve(
    adminUserEmailChangeDriftResolveData: AdminUserEmailChangeDriftResolveInput!
  ): UserEmailChangeResult!
}
```

---

## 5. New query fields

```graphql
extend type PlatformAdminQueryResults {
  """
  The most recent audit entry for the named subject user. Returns null if no audit entry
  exists. Useful for a quick drift-status check without paging through the full audit history.
  (FR-021)
  """
  latestUserEmailChangeAuditEntry(userID: UUID!): UserEmailChangeAuditEntry

  """
  Paginated audit-entry history for the named subject user, ordered by timestamp descending.
  Follows cursor pagination per docs/Pagination.md. (FR-014b)
  """
  userEmailChangeAuditEntries(
    """Subject user to query."""
    userID: UUID!
    """Pagination — items to return after the cursor."""
    after: String
    """Pagination — items to return."""
    first: Float
    """Pagination — items to return before the cursor."""
    before: String
    """Pagination — items to return."""
    last: Float
  ): UserEmailChangeAuditEntries!
}
```

---

## 6. Error-code mapping

All errors below surface via the existing typed-GraphQL-error path (`@common/exceptions/*`). The codes are stable identifiers in the GraphQL error payload's `extensions.code` field. Spec reference: FR-015.

| Code | When raised | HTTP-equivalent | Source FR |
| --- | --- | --- | --- |
| `EMAIL_CHANGE_VALIDATION` | New email malformed | 400 | FR-004, FR-015 |
| `EMAIL_CHANGE_NO_CHANGE` | New email equals current (case-insensitive) | 400 | FR-005, FR-015 |
| `EMAIL_CHANGE_CONFLICT` | New email already belongs to another user/identity | 409 | FR-004, FR-015 |
| `EMAIL_CHANGE_SUBJECT_NOT_FOUND` | The named subject user does not exist or has no linked identity-provider identity | 404 | FR-002, FR-015 |
| `EMAIL_CHANGE_KRATOS_UNREACHABLE` | Kratos client raised a network/timeout error after retry budget | 502 | FR-009, FR-015 |
| `EMAIL_CHANGE_KRATOS_WRITE_FAILED` | Kratos returned a non-2xx after retry budget | 502 | FR-009, FR-015 |
| `EMAIL_CHANGE_ALKEMIO_WRITE_FAILED` | TypeORM write to `user` failed within the commit txn | 500 | FR-009, FR-015 |
| `EMAIL_CHANGE_DRIFT_DETECTED` | Commit failed AND Kratos revert failed — admin reconciliation required | 500 | FR-009a, FR-015 |
| `EMAIL_CHANGE_DRIFT_RESOLUTION_FAILED` | adminUserEmailChangeDriftResolve could not align both sides within retry budget | 500 | FR-009b, FR-015 |
| `EMAIL_CHANGE_DRIFT_NOT_FOUND` | Admin invoked the drift-resolve mutation for a subject whose latest audit entry is NOT drift_detected | 404 | FR-009b, FR-015 |
| `EMAIL_CHANGE_UNAUTHORIZED` | Caller lacks PLATFORM_ADMIN privilege | 403 | FR-013, FR-015 |

The `extensions.details` payload on these errors carries the structured context (subject user id, attempted email — for the caller's own benefit on `EMAIL_CHANGE_NO_CHANGE`; NEVER for `EMAIL_CHANGE_CONFLICT` per the anti-enumeration rule in FR-014).

---

## 7. Authorization summary

| Mutation / Query | Authentication required? | Authorization rule |
| --- | --- | --- |
| `adminUserEmailChange` | Yes — Alkemio session | `grantAccessOrFail(actor, platformPolicy, PLATFORM_ADMIN)` |
| `adminUserEmailChangeDriftResolve` | Yes — Alkemio session | `grantAccessOrFail(actor, platformPolicy, PLATFORM_ADMIN)` |
| `platformAdmin.latestUserEmailChangeAuditEntry` | Yes — Alkemio session | `grantAccessOrFail(actor, platformPolicy, PLATFORM_ADMIN)` |
| `platformAdmin.userEmailChangeAuditEntries` | Yes — Alkemio session | `grantAccessOrFail(actor, platformPolicy, PLATFORM_ADMIN)` |

(Spec 098 adds: `meUserEmailChangeBegin` and `me.pendingEmailChange` — `me`-shape; `userEmailChangeConfirm` — root, session-less, token = sole authority.)

---

## 8. Schema-baseline diff expectations

When `pnpm run schema:diff` runs against this PR, the expected change-report.json content is:
- **Additions only**: 2 new enums (`UserEmailChangeInitiatorRole`, `UserEmailChangeAuditOutcome`), 4 new object types (`UserEmailChangeAuditEntry`, `UserEmailChangeAuditEntries`, `UserEmailChangeResult`; `UserProfileSummary` only if no equivalent already exists), 2 new input types, 2 new mutations, 2 new query fields (both `extend` on `PlatformAdminQueryResults`).
- **No breaking changes**, no field removals, no field type changes, no nullability changes on existing fields.
- **No deprecations** introduced.

Schema baseline regeneration is handled by the post-merge `schema-baseline.yml` workflow per CLAUDE.md. The PR opening this feature MUST regenerate `schema.graphql` via `pnpm run schema:print && pnpm run schema:sort` and commit the result.

Spec 098's subsequent PR will add the verification surface: 1 new enum (`UserEmailChangeStateValue`), 7 additive values on the `UserEmailChangeAuditOutcome` enum (`INITIATED`, `INITIATION_FAILED`, `CONFIRMED`, `EXPIRED`, `SUPERSEDED`, `REJECTED_USED_TOKEN`, `REJECTED_EXPIRED_TOKEN`), 2 new object types (`UserEmailChangePending`, `UserEmailChangeConfirmResult`), 2 new input types, 2 new mutations (`meUserEmailChangeBegin`, `userEmailChangeConfirm`), 1 new query field (`MeQueryResults.pendingEmailChange`). All additive on top of this spec's baseline.
