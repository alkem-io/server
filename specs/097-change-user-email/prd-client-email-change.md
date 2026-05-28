# PRD — Client: Platform-Admin Change User Login Email

**Component**: `alkemio/client-web`
**Parent feature**: server spec [097-change-user-email](./spec.md)
**Status**: Draft — ready for client-side scoping
**Depends on**: server spec 097 (merged — exposes the GraphQL surface below)

---

## 1. Problem & goal

A platform administrator currently has no way to change another user's **login
email** from the Alkemio UI. Support handles identity issues (a user lost access
to a mailbox, a typo at registration, a corporate-domain change) out-of-band, and
there is no in-product path to action them.

Server spec 097 shipped the backend: a synchronous, two-side-atomic
`adminUserEmailChange` mutation plus an audit trail. **This PRD covers the
client-web UI** that lets a platform admin drive that mutation from the global
administration area.

**Goal**: a platform admin can change any user's login email from the global
administration menu, see the result and any errors clearly, review the audit
history of email changes for a user, and reconcile the rare "drift" state.

Non-goal: self-service email change by the user themselves — that is a separate
feature (server spec 098) with its own client work.

---

## 2. Users & context

| Persona | Need |
| --- | --- |
| Platform administrator | Change a user's login email on their behalf after verifying the user's identity out-of-band (support call, ID check). |
| Platform administrator | Understand why a change was rejected (bad format, address already in use, etc.). |
| Platform administrator | Review the full history of email-change attempts for a user (forensic / support context). |
| Platform administrator | Recover from a rare half-committed "drift" state. |

Authorization: every screen and action in this PRD requires the
`PLATFORM_ADMIN` privilege. Non-admins must not see the entry points.

---

## 3. Scope

### In scope
1. An **entry point** in the global administration menu / users-management area to change a selected user's login email.
2. A **change-email dialog** with the new-email input, inline validation, a destructive-action confirmation, and typed error handling.
3. An **audit-history view** of email-change entries for a user.
4. A **drift-resolution** action for the rare drift state.

### Out of scope
- Self-service ("change my own email") — server spec 098.
- Editing any other identity fields (name, password) — unchanged.
- Localisation — English only, matching the server (FR-016a).

---

## 4. User stories & acceptance criteria

### US-C1 — Change a user's login email (P1)

**As** a platform admin, **I want** to change a user's login email from the
global admin users area **so that** I can resolve identity / access issues.

- The users-management surface (global administration → Users) exposes a
  "Change login email" action per user (e.g. row action or detail-page action).
- The action opens a dialog showing the user's **current** email (read-only) and
  a **new email** input.
- The dialog states plainly that this is an administrative change: the user's
  active sessions will be ended and the user must use the new email to log in.
- On submit, the client calls `adminUserEmailChange` (see §6).
- On success: show a success toast/confirmation with the new email; refresh any
  visible user data so the new email is reflected immediately.
- The submit button is disabled until the input is a syntactically valid email
  different from the current one.

### US-C2 — See why a change was rejected (P1)

**As** a platform admin, **I want** clear error messages **so that** I know how
to proceed.

- Each server error `extensions.code` (see §6) maps to a specific, human-readable
  message shown inline in the dialog (the dialog stays open so the admin can
  correct and retry).
- **Anti-enumeration**: for `EMAIL_CHANGE_CONFLICT` the message MUST be generic
  ("This email address is already in use.") — it MUST NOT reveal who holds it.
- `EMAIL_CHANGE_NO_CHANGE` / `EMAIL_CHANGE_VALIDATION` are surfaced as inline
  field validation, ideally caught client-side before submit.

### US-C3 — Review email-change audit history (P2)

**As** a platform admin, **I want** to see the history of email-change attempts
for a user **so that** I have support / forensic context.

- From the user's admin detail surface, an "Email change history" view lists
  entries (newest first) via `platformAdmin.userEmailChangeAuditEntries` (§6),
  paginated.
- Each row shows: timestamp, outcome, initiator (display name), old email, new
  email, failure reason (when present).
- Outcomes render as readable labels (e.g. `COMMITTED` → "Committed",
  `REJECTED_CONFLICT` → "Rejected — address in use").
- Optionally surface the most-recent entry inline via
  `latestUserEmailChangeAuditEntry` as a quick status.

### US-C4 — Resolve a drift state (P3)

**As** a platform admin, **I want** to reconcile a drifted email change **so
that** the user's account is consistent again.

- If the latest audit entry for a user is `DRIFT_DETECTED`, the UI surfaces a
  warning banner on that user with a "Resolve" action.
- The resolve dialog presents exactly two choices — the old email and the new
  email recorded on the drift entry — and the admin picks the canonical one.
- On submit, the client calls `adminUserEmailChangeDriftResolve` (§6).
- This flow is low-frequency; a minimal, functional UI is acceptable.

---

## 5. UX requirements

- **Destructive-action treatment**: changing a login email ends the user's
  sessions and changes how they authenticate. The confirmation step must make
  this explicit (not a silent inline edit).
- **Latency**: the mutation resolves synchronously; worst case ~5–10s under
  Kratos retry. Show a pending/spinner state and disable resubmit while in
  flight. Do not optimistically update before the mutation resolves.
- **Success state**: the new email is authoritative immediately on success —
  reflect it in any open user view.
- **No PII leakage**: the audit view shows initiator/subject as
  `{ displayName }` only; never render internal IDs as primary content, and
  never cross-reference a conflict address to an account.

---

## 6. GraphQL contract (already live on the server)

The client consumes the surface shipped by spec 097. No server changes are
required for this PRD.

### Mutations

```graphql
mutation AdminUserEmailChange($data: AdminUserEmailChangeInput!) {
  adminUserEmailChange(adminUserEmailChangeData: $data) {
    success
    email
  }
}

mutation AdminUserEmailChangeDriftResolve($data: AdminUserEmailChangeDriftResolveInput!) {
  adminUserEmailChangeDriftResolve(adminUserEmailChangeDriftResolveData: $data) {
    success
    email
  }
}
```

Inputs:
- `AdminUserEmailChangeInput { userID: UUID!, newEmail: String! }`
- `AdminUserEmailChangeDriftResolveInput { userID: UUID!, canonicalEmail: String! }`
  — `canonicalEmail` MUST equal either the `oldEmail` or `newEmail` of the
  outstanding `DRIFT_DETECTED` audit entry.

### Queries (under `platformAdmin`)

```graphql
query UserEmailChangeAuditEntries($userID: UUID!, $first: Float, $after: String) {
  platformAdmin {
    userEmailChangeAuditEntries(userID: $userID, first: $first, after: $after) {
      auditEntries {
        id
        timestamp
        outcome
        initiatorRole
        initiator { id displayName }
        subject { id displayName }
        oldEmail
        newEmail
        failureReason
      }
      pageInfo { startCursor endCursor hasNextPage hasPreviousPage }
      total
    }
    latestUserEmailChangeAuditEntry(userID: $userID) {
      outcome
      oldEmail
      newEmail
      timestamp
    }
  }
}
```

### Error-code → UI-message mapping

Errors arrive as GraphQL errors with `extensions.code`. Suggested copy:

| `extensions.code` | HTTP-equiv | UI message |
| --- | --- | --- |
| `EMAIL_CHANGE_VALIDATION` | 400 | "Please enter a valid email address." |
| `EMAIL_CHANGE_NO_CHANGE` | 400 | "The new email is the same as the current one." |
| `EMAIL_CHANGE_CONFLICT` | 409 | "This email address is already in use." *(generic — no holder info)* |
| `EMAIL_CHANGE_SUBJECT_NOT_FOUND` | 404 | "This user has no usable login identity and cannot have their email changed." |
| `EMAIL_CHANGE_KRATOS_UNREACHABLE` | 502 | "The identity service is temporarily unavailable. Please try again shortly." |
| `EMAIL_CHANGE_KRATOS_WRITE_FAILED` | 502 | "The change could not be completed. No changes were made. Please try again." |
| `EMAIL_CHANGE_ALKEMIO_WRITE_FAILED` | 500 | "The change could not be completed. No changes were made. Please try again." |
| `EMAIL_CHANGE_DRIFT_DETECTED` | 500 | "The change partially applied and needs reconciliation. Use 'Resolve' to fix it." |
| `EMAIL_CHANGE_DRIFT_RESOLUTION_FAILED` | 500 | "Reconciliation could not complete. Please try again." |
| `EMAIL_CHANGE_DRIFT_NOT_FOUND` | 404 | "There is no outstanding drift to resolve for this user." |
| `EMAIL_CHANGE_UNAUTHORIZED` | 403 | "You do not have permission to perform this action." |

Audit outcome enum (`UserEmailChangeAuditOutcome`): `COMMITTED`, `ROLLED_BACK`,
`DRIFT_DETECTED`, `DRIFT_RESOLVED`, `DRIFT_RESOLUTION_FAILED`,
`SECURITY_SIGNAL_FAILED`, `NEW_ADDRESS_NOTIFICATION_FAILED`,
`GLOBAL_ADMIN_NOTIFICATION_FAILED`, `SPACE_ADMIN_NOTIFICATION_FAILED`,
`SESSION_INVALIDATION_FAILED`, `REJECTED_VALIDATION`, `REJECTED_CONFLICT`.
(The internal `commit_started` crash-window breadcrumb is **not** part of this
GraphQL enum — it never appears in the audit-history view.)

---

## 7. Definition of done

- [ ] A platform admin can change any user's login email from the global admin users area.
- [ ] The change dialog validates input client-side and disables submit until valid.
- [ ] The destructive nature (sessions ended, new login email) is clearly communicated before submit.
- [ ] Every server error code in §6 maps to a specific message; the conflict message leaks nothing.
- [ ] Email-change audit history is viewable and paginated for a user.
- [ ] A `DRIFT_DETECTED` state surfaces a warning + working resolve flow.
- [ ] All entry points are gated on `PLATFORM_ADMIN`.
- [ ] Manual walk-through against a dev stack: change succeeds; old email no longer logs in; new email does.

---

## 8. Open questions

- Exact placement of the entry point within the existing global-admin users IA (row action vs. user detail page) — to be decided with design.
- Whether the audit-history view is a dedicated route, a tab on the user detail page, or a modal.
- Whether to show a post-success reminder that the user has been notified by email (the server sends a security signal to the old address and an acknowledgement to the new one — see the notifications PRD).
