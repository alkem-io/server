# Phase 1 — GraphQL Contract

**Feature**: 097-change-user-email
**Date**: 2026-05-13

This file enumerates the GraphQL surface introduced by this feature. The SDL fragments below are the *contract* that the schema baseline diff (per `pnpm run schema:diff`) will validate. All additions are additive; there are no breaking changes to existing types.

The fragments are organised by GraphQL kind:
1. New enums
2. New object types (results / payloads)
3. New input types
4. New mutations (4)
5. New query fields (3)
6. Error code mapping

---

## 1. New enums

```graphql
"""Lifecycle state of a user-email-change request as exposed to admin callers."""
enum UserEmailChangeStateValue {
  INITIATED
  CONFIRMED
  COMMITTED
  ROLLED_BACK
  EXPIRED
  SUPERSEDED
  DRIFT_DETECTED
}

"""Role of the actor who initiated a user-email-change request."""
enum UserEmailChangeInitiatorRole {
  SELF
  PLATFORM_ADMIN
}

"""Outcome recorded for a single audit entry in the email-change lifecycle."""
enum UserEmailChangeAuditOutcome {
  INITIATED
  INITIATION_FAILED
  CONFIRMED
  COMMITTED
  ROLLED_BACK
  EXPIRED
  SUPERSEDED
  DRIFT_DETECTED
  DRIFT_RESOLVED
  DRIFT_RESOLUTION_FAILED
  SECURITY_SIGNAL_FAILED
  SESSION_INVALIDATION_FAILED
  REJECTED_VALIDATION
  REJECTED_CONFLICT
  REJECTED_USED_TOKEN
  REJECTED_EXPIRED_TOKEN
}
```

---

## 2. New object types

### `UserEmailChangePending` — returned by initiate mutations + the `me` query

```graphql
"""
A user's currently active email-change request, as seen by the subject user themselves.
Never exposes the confirmation token. When the initiator is an admin, includes a
minimal admin profile summary so the subject can identify which admin acted.
"""
type UserEmailChangePending {
  """Lifecycle state. Only INITIATED, CONFIRMED, and DRIFT_DETECTED are observable here (per FR-022 / FR-022a)."""
  state: UserEmailChangeStateValue!

  """Whether the change was self-initiated or initiated by a platform admin."""
  initiatorRole: UserEmailChangeInitiatorRole!

  """
  Minimal profile summary of the initiating admin. Present iff initiatorRole = PLATFORM_ADMIN.
  Never includes the admin's email or any other PII beyond id + displayName. (FR-022)
  """
  initiatorAdmin: UserProfileSummary

  """The proposed new email address."""
  newEmail: String!

  """Timestamp at which the confirmation token was issued."""
  issuedAt: DateTime!

  """Timestamp at which the confirmation token expires (issuedAt + 1 hour per FR-007b)."""
  expiryAt: DateTime!

  """True iff state = DRIFT_DETECTED. When true, admin reconciliation is required (FR-022a)."""
  awaitingAdminReconciliation: Boolean!
}
```

### `UserEmailChangeState` — returned by the `platformAdmin` status query

```graphql
"""
Admin-facing view of a user's email-change state. Covers the active pending change (if any)
and any terminal-state pending-change record within the 30-day retention window (FR-021).
"""
type UserEmailChangeState {
  """Lifecycle state of the relevant pending-change record."""
  state: UserEmailChangeStateValue!

  """Whether the change was self-initiated or initiated by a platform admin."""
  initiatorRole: UserEmailChangeInitiatorRole!

  """The proposed new email address (or, for terminal states, the email that was proposed)."""
  newEmail: String!

  """Issue timestamp."""
  issuedAt: DateTime!

  """Expiry timestamp."""
  expiryAt: DateTime!

  """Set iff the record transitioned through CONFIRMED."""
  confirmedAt: DateTime

  """Set iff the record reached COMMITTED."""
  committedAt: DateTime

  """Short non-leaky failure reason. Set on terminal failure outcomes."""
  failureReason: String
}
```

### `UserEmailChangeAuditEntry` — page items in the audit query

```graphql
"""
A single audit-trail entry. Append-only and retained indefinitely (FR-014a).
Token values are never exposed.
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

  """Whether the change was self-initiated or admin-initiated."""
  initiatorRole: UserEmailChangeInitiatorRole!

  """Old email at the time of this audit entry. Null only for entries with no old-email context."""
  oldEmail: String

  """Proposed new email. Null only for entries with no new-email context."""
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

### `UserEmailChangeConfirmResult` — returned by `userEmailChangeConfirm` and the admin drift-resolve mutation

```graphql
"""
Result returned to the caller of the confirm and drift-resolve mutations. Deliberately
minimal — the caller does not need to know which side(s) were written; only success / failure
is meaningful for them. Failure surfaces as a typed GraphQL error per the error-code mapping.
"""
type UserEmailChangeConfirmResult {
  """Always true on success. (Failures throw typed GraphQL errors instead of returning false.)"""
  success: Boolean!

  """The committed (new) email. Present on success."""
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
"""Input for meUserEmailChangeBegin. Self-service initiation."""
input MeUserEmailChangeBeginInput {
  """The proposed new email address. Validated by FR-004 / FR-005 / FR-006."""
  newEmail: String!
}

"""Input for adminUserEmailChangeBegin. Platform-admin-on-behalf initiation."""
input AdminUserEmailChangeBeginInput {
  """The subject user whose email is being changed."""
  userID: UUID!

  """The proposed new email address."""
  newEmail: String!
}

"""Input for userEmailChangeConfirm. The opaque token is the sole authority (FR-018a)."""
input UserEmailChangeConfirmInput {
  """The opaque token delivered to the proposed new mailbox."""
  token: String!
}

"""Input for adminUserEmailChangeDriftResolve. Reconciles a DRIFT_DETECTED record (FR-009b)."""
input AdminUserEmailChangeDriftResolveInput {
  """The subject user whose pending change is in DRIFT_DETECTED."""
  userID: UUID!

  """
  The admin-chosen canonical email. MUST be one of the two values observed on the
  DRIFT_DETECTED record (i.e., either the new email or the old email). Force-aligns
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
  Begin a change of the calling user's login email. Sends a confirmation message to the
  proposed new address; the change is only committed after the recipient confirms by
  invoking userEmailChangeConfirm with the token from that message. Authorization: the
  caller must be authenticated. (FR-001, FR-002a, FR-018)
  """
  meUserEmailChangeBegin(
    meUserEmailChangeBeginData: MeUserEmailChangeBeginInput!
  ): UserEmailChangePending!

  """
  Begin a change of another user's login email, acting as a platform administrator.
  Sends the confirmation to the proposed new address; the target user must confirm.
  Authorization: caller must hold AuthorizationPrivilege.PLATFORM_ADMIN. (FR-002, FR-002a, FR-013, FR-018)
  """
  adminUserEmailChangeBegin(
    adminUserEmailChangeBeginData: AdminUserEmailChangeBeginInput!
  ): UserEmailChangePending!

  """
  Confirm a pending email change by presenting the opaque token from the confirmation message.
  Callable without an Alkemio session — the token is the sole authority for the confirmation
  step. Re-validates uniqueness, performs the two-side commit (Kratos → Alkemio) with bounded
  retry, invalidates all existing sessions for the subject user, and sends the post-commit
  security-signal notification to the old address. (FR-008, FR-018a)
  """
  userEmailChangeConfirm(
    userEmailChangeConfirmData: UserEmailChangeConfirmInput!
  ): UserEmailChangeConfirmResult!

  """
  Reconcile a DRIFT_DETECTED pending email change by force-aligning Alkemio and Kratos to a
  canonical email selected by the admin. Authorization: caller must hold
  AuthorizationPrivilege.PLATFORM_ADMIN. (FR-009b)
  """
  adminUserEmailChangeDriftResolve(
    adminUserEmailChangeDriftResolveData: AdminUserEmailChangeDriftResolveInput!
  ): UserEmailChangeConfirmResult!
}
```

---

## 5. New query fields

The three new queries are added as resolver fields on existing root-shaped types (`MeQueryResults` and `PlatformAdminQueryResults`).

```graphql
extend type MeQueryResults {
  """
  The calling user's currently active pending email change, if any. Returns the record while
  it is in state INITIATED or CONFIRMED, AND while it is in DRIFT_DETECTED within the 30-day
  retention window. Returns null otherwise. Never exposes the confirmation token. (FR-022, FR-022a)
  """
  pendingEmailChange: UserEmailChangePending
}

extend type PlatformAdminQueryResults {
  """
  Lifecycle state of an email change for the named subject user. Covers the active pending
  change (if any) and any terminal-state pending-change record within the 30-day retention
  window (FR-021). Returns null if no record exists in that window. (FR-021)
  """
  userEmailChangeState(userID: UUID!): UserEmailChangeState

  """
  Paginated audit-entry history for the named subject user, ordered by timestamp descending.
  Follows cursor pagination per docs/Pagination.md. Returned entries reflect all events in
  the email-change lifecycle for that subject. (FR-014b)
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

All errors below surface via the existing typed-GraphQL-error path (`@common/exceptions/*`). The codes are stable identifiers in the GraphQL error payload's `extensions.code` field — client-web uses these to render localised error messages. Spec reference: FR-015.

| Code | When raised | HTTP-equivalent | Source FR |
| --- | --- | --- | --- |
| `EMAIL_CHANGE_VALIDATION` | New email malformed | 400 | FR-004, FR-015 |
| `EMAIL_CHANGE_NO_CHANGE` | New email equals current (case-insensitive) | 400 | FR-005, FR-015 |
| `EMAIL_CHANGE_CONFLICT` | New email already belongs to another user/identity (at initiate or at confirm) | 409 | FR-004, FR-004a, FR-015 |
| `EMAIL_CHANGE_TOKEN_EXPIRED` | Token presented after `expiry_at` | 410 | FR-007(a), FR-015 |
| `EMAIL_CHANGE_TOKEN_USED` | Token presented twice (state ≠ initiated) | 410 | FR-007(b), FR-015 |
| `EMAIL_CHANGE_TOKEN_INVALID` | Token not found (also covers superseded) | 404 | FR-007(d), FR-015 |
| `EMAIL_CHANGE_KRATOS_UNREACHABLE` | Kratos client raised a network/timeout error after retry budget | 502 | FR-009, FR-015 |
| `EMAIL_CHANGE_KRATOS_WRITE_FAILED` | Kratos returned a non-2xx after retry budget | 502 | FR-009, FR-015 |
| `EMAIL_CHANGE_ALKEMIO_WRITE_FAILED` | TypeORM write to `user` failed within the commit txn | 500 | FR-009, FR-015 |
| `EMAIL_CHANGE_MAIL_DELIVERY_FAILED` | Outbound mail provider hard-failed during initiate (FR-019a) | 502 | FR-019a, FR-015 |
| `EMAIL_CHANGE_DRIFT_DETECTED` | Commit failed AND rollback failed — admin reconciliation required | 500 | FR-009a, FR-015 |
| `EMAIL_CHANGE_DRIFT_RESOLUTION_FAILED` | adminUserEmailChangeDriftResolve could not align both sides within retry budget | 500 | FR-009b, FR-015 |
| `EMAIL_CHANGE_UNAUTHORIZED` | Caller lacks PLATFORM_ADMIN privilege for an admin-on-behalf mutation, or attempts to initiate for someone other than themselves on the self-service mutation | 403 | FR-013, FR-015 |
| `EMAIL_CHANGE_NOT_FOUND` | Admin queries a drift-resolve for a user with no DRIFT_DETECTED record | 404 | FR-009b, FR-015 |

The `extensions.details` payload on these errors carries the structured context (user id, attempted email — for the caller's own benefit on `EMAIL_CHANGE_NO_CHANGE`; NEVER for `EMAIL_CHANGE_CONFLICT` per the anti-enumeration rule in FR-005 / FR-014).

---

## 7. Authorization summary

| Mutation / Query | Authentication required? | Authorization rule |
| --- | --- | --- |
| `meUserEmailChangeBegin` | Yes — Alkemio session | Caller is the subject (always — no `userID` argument) |
| `adminUserEmailChangeBegin` | Yes — Alkemio session | `grantAccessOrFail(actor, platformPolicy, PLATFORM_ADMIN)` |
| `userEmailChangeConfirm` | **No** — session-less per FR-018a | Token lookup is the sole authority |
| `adminUserEmailChangeDriftResolve` | Yes — Alkemio session | `grantAccessOrFail(actor, platformPolicy, PLATFORM_ADMIN)` |
| `me.pendingEmailChange` | Yes — Alkemio session | Caller reads their own row only |
| `platformAdmin.userEmailChangeState` | Yes — Alkemio session | `grantAccessOrFail(actor, platformPolicy, PLATFORM_ADMIN)` |
| `platformAdmin.userEmailChangeAuditEntries` | Yes — Alkemio session | `grantAccessOrFail(actor, platformPolicy, PLATFORM_ADMIN)` |

---

## 8. Schema-baseline diff expectations

When `pnpm run schema:diff` runs against this PR, the expected change-report.json content is:
- **Additions only**: 3 new enums, 6 new object types, 4 new input types, 4 new mutations, 3 new query fields (all `extend` on `MeQueryResults` / `PlatformAdminQueryResults`).
- **No breaking changes**, no field removals, no field type changes, no nullability changes on existing fields.
- **No deprecations** introduced.

Schema baseline regeneration is handled by the post-merge `schema-baseline.yml` workflow per CLAUDE.md. The PR opening this feature MUST regenerate `schema.graphql` via `pnpm run schema:print && pnpm run schema:sort` and commit the result.
