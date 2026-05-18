# GraphQL Contract — Self-Service Email Change

**Feature**: 098-self-service-email-change
**Date**: 2026-05-18
**Foundational dependency**: `/specs/097-change-user-email/contracts/graphql.md` — owns all enums, the `UserEmailChangePending` base shape, the `UserEmailChangeConfirmResult`, the `userEmailChangeConfirm` root mutation, the admin mutations, and the `platformAdmin.userEmailChangeState` / `platformAdmin.userEmailChangeAuditEntries` queries.

This file enumerates only the **additive** surface introduced by this spec on top of 097's baseline. All additions are additive; there are no breaking changes.

The fragments are organised by GraphQL kind:
1. Field additions to existing types
2. New input types
3. New mutations
4. New query fields
5. Authorization summary (delta)
6. Schema-baseline diff expectations

---

## 1. Field additions to existing types

### `UserEmailChangePending` — additive fields

097 contracts this type with `state`, `initiatorRole`, `newEmail`, `issuedAt`, `expiryAt`. This spec adds two fields:

```graphql
extend type UserEmailChangePending {
  """
  Minimal profile summary of the initiating admin. Present iff initiatorRole = PLATFORM_ADMIN.
  Never includes the admin's email or any other PII beyond id + displayName. Null for self-initiated
  changes. (098 FR-022)
  """
  initiatorAdmin: UserProfileSummary

  """
  True iff state = DRIFT_DETECTED (within 097's 30-day retention window). When true, admin
  reconciliation is required and the subject user should contact support. (098 FR-022a)
  """
  awaitingAdminReconciliation: Boolean!
}
```

(In implementation, the additions land on the existing object type definition in `src/domain/community/user-email-change/dto/user.email.change.pending.ts` rather than as a separate `extend type` SDL — the `extend type` form above is purely documentary.)

---

## 2. New input types

```graphql
"""Input for meUserEmailChangeBegin. Self-service initiation; the subject is always the caller."""
input MeUserEmailChangeBeginInput {
  """The proposed new email address. Validated by 097's FR-004 / FR-005 / FR-006."""
  newEmail: String!
}
```

---

## 3. New mutations

```graphql
extend type Mutation {
  """
  Begin a change of the calling user's login email. Sends a confirmation message to the
  proposed new address with initiator role tag `self`; the change is only committed after
  the caller confirms by invoking userEmailChangeConfirm (097's root mutation) with the
  token from that message. Authorization: the caller must be authenticated; the subject is
  always the caller (no userID argument). (098 FR-001, FR-001a, FR-001b, FR-013)
  """
  meUserEmailChangeBegin(
    meUserEmailChangeBeginData: MeUserEmailChangeBeginInput!
  ): UserEmailChangePending!
}
```

---

## 4. New query fields

```graphql
extend type MeQueryResults {
  """
  The calling user's currently active pending email change, if any. Returns the record while
  it is in state INITIATED or CONFIRMED, AND while it is in DRIFT_DETECTED within the 30-day
  retention window (097 FR-020). Returns null otherwise. Never exposes the confirmation token.
  When the initiator is a platform admin, the response includes a minimal admin profile summary
  (id + displayName) via the `initiatorAdmin` field on UserEmailChangePending. (098 FR-022, FR-022a)
  """
  pendingEmailChange: UserEmailChangePending
}
```

---

## 5. Authorization summary (delta)

| Mutation / Query | Authentication required? | Authorization rule |
| --- | --- | --- |
| `meUserEmailChangeBegin` | Yes — Alkemio session | Subject is always the caller (no `userID` argument). No additional authorization gate. |
| `me.pendingEmailChange` | Yes — Alkemio session | Resolver always uses `currentUser.id` as the subject; cannot return another user's pending change. |

All other mutations and queries (the `userEmailChangeConfirm` root mutation, the admin initiation, the admin drift-resolve, the admin status query, the admin audit query) are unchanged and continue to follow 097's authorization summary.

---

## 6. Schema-baseline diff expectations

When `pnpm run schema:diff` runs against the post-097 baseline, the expected change-report.json content for **this PR alone** is:

- **Additions only**: 2 new fields on the existing `UserEmailChangePending` object type (both additive — one optional `UserProfileSummary`, one required `Boolean!`), 1 new input type (`MeUserEmailChangeBeginInput`), 1 new mutation (`meUserEmailChangeBegin`), 1 new query field (`extend type MeQueryResults`).
- **No breaking changes**, no field removals, no field type changes, no nullability changes on existing fields.
- **No deprecations** introduced.
- **No new enums** (the existing `UserEmailChangeInitiatorRole` enum already carries both `SELF` and `PLATFORM_ADMIN` values per 097's contract).
- **No new error codes** (all error surfaces inherited from 097 — `EMAIL_CHANGE_VALIDATION`, `EMAIL_CHANGE_NO_CHANGE`, `EMAIL_CHANGE_CONFLICT`, `EMAIL_CHANGE_TOKEN_*`, `EMAIL_CHANGE_KRATOS_*`, `EMAIL_CHANGE_ALKEMIO_WRITE_FAILED`, `EMAIL_CHANGE_MAIL_DELIVERY_FAILED`, `EMAIL_CHANGE_DRIFT_DETECTED`, `EMAIL_CHANGE_DRIFT_RESOLUTION_FAILED`, `EMAIL_CHANGE_UNAUTHORIZED`, `EMAIL_CHANGE_NOT_FOUND`).

The PR opening this feature MUST regenerate `schema.graphql` via `pnpm run schema:print && pnpm run schema:sort` and commit the result.
