# GraphQL Contract — Self-Service Email Change With Ownership Verification

**Feature**: 098-self-service-email-change
**Date**: 2026-05-18
**Foundational dependency**: `/specs/097-change-user-email/contracts/graphql.md` — owns the audit-entry types, audit queries, audit-outcome enum (extended additively here), initiator-role enum, error-code base set, and the admin mutations (admin synchronous change + drift-resolve).

This file enumerates the **additive** verification surface introduced by this spec on top of 097's baseline. All additions are additive; there are no breaking changes.

The fragments are organised by GraphQL kind:
1. New enum + additive enum extensions
2. New object types
3. New input types
4. New mutations (2)
5. New query fields (1)
6. New error codes (4)
7. Authorization summary (delta)
8. Schema-baseline diff expectations

---

## 1. New enum + additive enum extensions

```graphql
"""Lifecycle state of an in-flight pending email-change row (FR-021-EXT)."""
enum UserEmailChangeStateValue {
  INITIATED
  CONFIRMED
  COMMITTED
  ROLLED_BACK
  EXPIRED
  SUPERSEDED
  DRIFT_DETECTED
}
```

### Additive values on `UserEmailChangeAuditOutcome` (owned by 097)

```graphql
# These values are ADDED (additively) to the enum already owned by 097.
# 097's baseline (11 values) contains: COMMITTED, ROLLED_BACK, DRIFT_DETECTED,
# DRIFT_RESOLVED, DRIFT_RESOLUTION_FAILED, SECURITY_SIGNAL_FAILED,
# NEW_ADDRESS_NOTIFICATION_FAILED, GLOBAL_ADMIN_NOTIFICATION_FAILED,
# SESSION_INVALIDATION_FAILED, REJECTED_VALIDATION, REJECTED_CONFLICT.

extend enum UserEmailChangeAuditOutcome {
  INITIATED
  INITIATION_FAILED
  CONFIRMED
  EXPIRED
  SUPERSEDED
  REJECTED_USED_TOKEN
  REJECTED_EXPIRED_TOKEN
}
```

(Note: GraphQL SDL does not literally support `extend enum` in all tools — in implementation the new values are added to the existing enum declaration. The `extend enum` form above is documentary.)

---

## 2. New object types

### `UserEmailChangePending` — returned by the self-service initiate mutation + the me-query

```graphql
"""
A user's currently active self-initiated email-change request, as seen by the subject user
themselves. Never exposes the confirmation token. Always carries initiatorRole = SELF
(admin-initiated changes in spec 097 commit synchronously and do not have a pending row).
"""
type UserEmailChangePending {
  """Lifecycle state. Only INITIATED, CONFIRMED, and DRIFT_DETECTED are observable here (per FR-022 / FR-022a)."""
  state: UserEmailChangeStateValue!

  """Always SELF for rows persisted by this spec."""
  initiatorRole: UserEmailChangeInitiatorRole!

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

### `UserEmailChangeConfirmResult` — returned by the session-less confirm mutation

```graphql
"""
Result returned to the caller of userEmailChangeConfirm. Deliberately minimal — the caller
does not need to know which side(s) were written; only success / failure is meaningful for
them. Failure surfaces as a typed GraphQL error per the error-code mapping in §6.
"""
type UserEmailChangeConfirmResult {
  """Always true on success."""
  success: Boolean!

  """The committed (new) email. Present on success."""
  email: String
}
```

(`UserEmailChangeResult` from 097 is the analogous return type for the admin mutations; this spec introduces a separately-named result for the confirm path because the surfaces are intentionally distinct — admin returns minimal status to the admin caller; confirm returns minimal status to the new-mailbox holder. Implementations MAY collapse to a single shared type at the implementation layer if convenient, as long as the GraphQL schema continues to expose both names.)

---

## 3. New input types

```graphql
"""Input for meUserEmailChangeBegin. Self-service initiation; subject is always the caller (FR-001, FR-013-EXT)."""
input MeUserEmailChangeBeginInput {
  """The proposed new email address. Validated by 097's FR-004 / FR-005 / FR-006 inherited rules."""
  newEmail: String!
}

"""Input for userEmailChangeConfirm. The opaque token is the sole authority (FR-018a)."""
input UserEmailChangeConfirmInput {
  """The opaque token delivered to the proposed new mailbox."""
  token: String!
}
```

---

## 4. New mutations

```graphql
extend type Mutation {
  """
  Begin a self-service change of the calling user's login email. Sends a confirmation message
  to the proposed new address with initiator role tag `self`; the change is only committed
  after the caller confirms by invoking userEmailChangeConfirm with the token from that
  message. Authorization: the caller must be authenticated; the subject is always the caller
  (no userID argument). (FR-001, FR-001a, FR-001b, FR-013-EXT)
  """
  meUserEmailChangeBegin(
    meUserEmailChangeBeginData: MeUserEmailChangeBeginInput!
  ): UserEmailChangePending!

  """
  Confirm a pending email change by presenting the opaque token from the confirmation message.
  Callable without an Alkemio session — the token is the sole authority for the confirmation
  step. Re-validates uniqueness (FR-004a), performs the two-side commit (Kratos → Alkemio)
  with bounded retry (097's FR-009), invalidates all existing sessions for the subject user
  (097's FR-017), and sends the post-commit security-signal notification to the old address
  (097's FR-016). (FR-008, FR-018a)
  """
  userEmailChangeConfirm(
    userEmailChangeConfirmData: UserEmailChangeConfirmInput!
  ): UserEmailChangeConfirmResult!
}
```

---

## 5. New query fields

```graphql
extend type MeQueryResults {
  """
  The calling user's currently active pending email change, if any. Returns the record while
  it is in state INITIATED or CONFIRMED, AND while it is in DRIFT_DETECTED within the 30-day
  retention window. Returns null otherwise. Never exposes the confirmation token. Always returns
  initiatorRole = SELF when non-null. (FR-022, FR-022a)
  """
  pendingEmailChange: UserEmailChangePending
}
```

(No extensions to `PlatformAdminQueryResults` in this spec — the admin queries are owned by 097.)

---

## 6. New error codes

These codes are ADDED (additively) to the `EMAIL_CHANGE_*` family already owned by 097. Spec reference: 097's FR-015 (extended additively by this spec).

| Code | When raised | HTTP-equivalent | Source FR |
| --- | --- | --- | --- |
| `EMAIL_CHANGE_TOKEN_EXPIRED` | Token presented after `expiry_at` | 410 | FR-007(a), FR-018a |
| `EMAIL_CHANGE_TOKEN_USED` | Token presented twice (pending state ≠ INITIATED, e.g., COMMITTED/CONFIRMED/etc.) | 410 | FR-007(b), FR-018a |
| `EMAIL_CHANGE_TOKEN_INVALID` | Token not found (no matching pending row); also covers SUPERSEDED and DRIFT_DETECTED state presentations | 404 | FR-007(d), FR-018a |
| `EMAIL_CHANGE_MAIL_DELIVERY_FAILED` | Outbound mail provider hard-failed during initiation | 502 | FR-019a |

The existing error codes from 097 (`EMAIL_CHANGE_VALIDATION`, `EMAIL_CHANGE_NO_CHANGE`, `EMAIL_CHANGE_CONFLICT`, `EMAIL_CHANGE_SUBJECT_NOT_FOUND`, `EMAIL_CHANGE_KRATOS_*`, `EMAIL_CHANGE_ALKEMIO_WRITE_FAILED`, `EMAIL_CHANGE_DRIFT_*`, `EMAIL_CHANGE_UNAUTHORIZED`) apply unchanged to this spec's flows. In particular, the FR-004a confirm-time uniqueness re-check rejects with `EMAIL_CHANGE_CONFLICT` (097's code).

---

## 7. Authorization summary (delta on top of 097)

| Mutation / Query | Authentication required? | Authorization rule |
| --- | --- | --- |
| `meUserEmailChangeBegin` | Yes — Alkemio session | Subject is always the caller (no `userID` argument). |
| `userEmailChangeConfirm` | **No** — session-less per FR-018a | Token lookup is the sole authority. The resolver MUST NOT require `@CurrentUser` or any session guard. |
| `me.pendingEmailChange` | Yes — Alkemio session | Resolver always uses `currentUser.id` as the subject; cannot return another user's pending change. |

The admin mutations and queries (097) are unchanged.

---

## 8. Schema-baseline diff expectations

When `pnpm run schema:diff` runs against the post-097 baseline, the expected change-report.json content for **this PR alone** is:

- **Additions only**:
  - 1 new enum (`UserEmailChangeStateValue`, 7 values)
  - 7 additive values on the existing `UserEmailChangeAuditOutcome` enum
  - 2 new object types (`UserEmailChangePending`, `UserEmailChangeConfirmResult`)
  - 2 new input types (`MeUserEmailChangeBeginInput`, `UserEmailChangeConfirmInput`)
  - 2 new mutations (`meUserEmailChangeBegin`, `userEmailChangeConfirm`)
  - 1 new query field (`MeQueryResults.pendingEmailChange`)
- **No breaking changes**, no field removals, no field type changes, no nullability changes on existing fields.
- **No deprecations** introduced.

The PR opening this feature MUST regenerate `schema.graphql` via `pnpm run schema:print && pnpm run schema:sort` and commit the result.
