# Phase 1 — Quickstart

**Feature**: 097-change-user-email
**Date**: 2026-05-13

End-to-end walkthrough of the email-change flow against a local stack. This is the script a reviewer should follow to convince themselves the feature works before approving. Every step references the FRs / SCs it exercises.

---

## Prerequisites

```bash
# Local services running (PostgreSQL 17.5, Kratos, RabbitMQ, etc.)
pnpm run start:services

# Migrations applied (including the new email_change_pending / email_change_audit_entry tables)
pnpm run migration:run

# Server running with hot reload
pnpm start:dev

# Mail catcher (the dev MailSlurper instance bundled with the Kratos stack)
# accessible at http://localhost:4436 — used to inspect the confirmation message
```

Two test users (the project provides `register-user` skill for this — see `.claude/skills/register-user`):

| Name | Role | Email |
| --- | --- | --- |
| Alice | regular user | `alice@test.alkem.io` |
| Polly | platform admin | `polly@admin.test.alkem.io` |

Both have valid Alkemio profiles and Kratos identities. Each step below assumes you have already obtained a session cookie for the caller via the `interactive-login` skill, except where explicitly noted.

---

## Scenario 1 — Self-service happy path (SC-001, SC-008)

**Goal**: Alice changes her own email from `alice@test.alkem.io` to `alice+v2@test.alkem.io`. Memberships and content survive; old email no longer logs in.

### Step 1.1 — Alice initiates the change

GraphQL mutation, authenticated as Alice:

```graphql
mutation {
  meUserEmailChangeBegin(meUserEmailChangeBeginData: {
    newEmail: "alice+v2@test.alkem.io"
  }) {
    state
    initiatorRole
    newEmail
    issuedAt
    expiryAt
    awaitingAdminReconciliation
  }
}
```

Expected response:
```json
{
  "data": {
    "meUserEmailChangeBegin": {
      "state": "INITIATED",
      "initiatorRole": "SELF",
      "newEmail": "alice+v2@test.alkem.io",
      "issuedAt": "2026-05-13T10:00:00.000Z",
      "expiryAt": "2026-05-13T11:00:00.000Z",   // <-- issuedAt + 1h (FR-007b)
      "awaitingAdminReconciliation": false
    }
  }
}
```

**Exercises**: FR-001, FR-018, FR-003 (token issued + mail sent), FR-007b (1h TTL), FR-022.

### Step 1.2 — Check MailSlurper for the confirmation message

Open `http://localhost:4436`. You should see one new message addressed to `alice+v2@test.alkem.io` containing:
- A clickable link of the form `https://<client-web>/identity/email-change/confirm?token=<43-char-token>` (FR-003a)
- "This change was requested by you" (the SELF initiator-role tag — FR-003b)
- An explicit time-limit statement (FR-003b)
- Recovery / disclaimer ("if you did not request this, ignore...") (FR-003b)

NO admin name, NO internal identifiers, NO token outside the link. (FR-003b)

### Step 1.3 — Verify Alice can see her own pending change

```graphql
query {
  me {
    pendingEmailChange {
      state
      initiatorRole
      newEmail
      issuedAt
      expiryAt
      awaitingAdminReconciliation
    }
  }
}
```

Expected: the pending change with `state: INITIATED`, `initiatorRole: SELF`. (FR-022)

### Step 1.4 — Confirm with the token (session-less)

Extract the token from the MailSlurper URL. Call the confirm mutation **without** a session cookie:

```graphql
mutation {
  userEmailChangeConfirm(userEmailChangeConfirmData: {
    token: "<TOKEN-FROM-MAIL>"
  }) {
    success
    email
  }
}
```

Expected response:
```json
{
  "data": {
    "userEmailChangeConfirm": {
      "success": true,
      "email": "alice+v2@test.alkem.io"
    }
  }
}
```

**Exercises**: FR-008, FR-009 (two-side commit), FR-010 (same identity id), FR-011 (marked verified), FR-017 (sessions invalidated), FR-018a (session-less confirm).

### Step 1.5 — Verify old email is rejected at login

Try to log in via the Kratos flow with `alice@test.alkem.io`. The flow MUST fail (the identity no longer has that email trait). Try with `alice+v2@test.alkem.io` — succeeds.

**Exercises**: FR-012, SC-008.

### Step 1.6 — Confirm security-signal email arrives at OLD address

In MailSlurper, you should see one new message to `alice@test.alkem.io` containing:
- Statement that the login email was changed
- Commit timestamp
- "Changed by you" (initiator role SELF) — FR-016
- Partially-masked new address (e.g., `a***@t***.io`) — FR-016 (NOT the full new email)
- Recovery instructions

**Exercises**: FR-016, FR-016a (English), SC-010.

### Step 1.7 — Verify Alice's data survived

```graphql
query {
  me {
    user {
      id            # <-- MUST be the same id as before the change
      profile { id, displayName }
    }
    spaceMemberships { id }
    contributions { id }
  }
}
```

The `id`, profile, memberships, and contributions are unchanged. (FR-010, SC-001)

### Step 1.8 — Verify previously-active sessions are dead

If you had a second browser open as Alice during step 1.1, refresh it now. The session MUST no longer be valid; Alice is required to log in again with `alice+v2@test.alkem.io`. (FR-017, SC-009)

---

## Scenario 2 — Admin-on-behalf happy path (SC-002)

**Goal**: Polly (platform admin) changes Alice's email from `alice+v2@test.alkem.io` to `alice+v3@test.alkem.io`. Alice confirms via the link.

### Step 2.1 — Polly initiates on Alice's behalf

```graphql
mutation {
  adminUserEmailChangeBegin(adminUserEmailChangeBeginData: {
    userID: "<alice-user-id>"
    newEmail: "alice+v3@test.alkem.io"
  }) {
    state
    initiatorRole
    newEmail
  }
}
```

Expected: `state: INITIATED`, `initiatorRole: PLATFORM_ADMIN`. (FR-002, FR-013)

### Step 2.2 — Alice sees the admin-initiated change in her `me` query

```graphql
query {
  me {
    pendingEmailChange {
      state
      initiatorRole         # PLATFORM_ADMIN
      initiatorAdmin {
        id
        displayName         # Polly's display name (FR-022)
      }
      newEmail
    }
  }
}
```

The admin's `id` + `displayName` are present; the admin's email and other PII are NOT. (FR-022)

### Step 2.3 — Alice confirms

Same as step 1.4, using the token from the message to `alice+v3@test.alkem.io`.

### Step 2.4 — Polly observes the outcome via `platformAdmin` status query

```graphql
query {
  platformAdmin {
    userEmailChangeState(userID: "<alice-user-id>") {
      state            # COMMITTED
      initiatorRole    # PLATFORM_ADMIN
      newEmail         # alice+v3@test.alkem.io
      committedAt
    }
  }
}
```

(FR-021, SC-002)

---

## Scenario 3 — Validation rejection (SC-007)

**Goal**: Validation errors surface BEFORE any mail is sent.

### Step 3.1 — Malformed email

```graphql
mutation {
  meUserEmailChangeBegin(meUserEmailChangeBeginData: {
    newEmail: "not-an-email"
  }) { state }
}
```

Expected: error with `extensions.code: EMAIL_CHANGE_VALIDATION`. MailSlurper: no new message. (FR-004, FR-015)

### Step 3.2 — Same as current

```graphql
mutation {
  meUserEmailChangeBegin(meUserEmailChangeBeginData: {
    newEmail: "alice+v3@test.alkem.io"   # Alice's current email
  }) { state }
}
```

Expected: error with `extensions.code: EMAIL_CHANGE_NO_CHANGE`. MailSlurper: no new message. (FR-005, FR-015)

### Step 3.3 — Conflict (another user already owns the address)

Bob exists with email `bob@test.alkem.io`. Alice tries to take it:

```graphql
mutation {
  meUserEmailChangeBegin(meUserEmailChangeBeginData: {
    newEmail: "bob@test.alkem.io"
  }) { state }
}
```

Expected: error with `extensions.code: EMAIL_CHANGE_CONFLICT`. The error MUST NOT reveal that Bob exists — the message is generic. MailSlurper: no new message. (FR-004, FR-014, FR-015, SC-007)

---

## Scenario 4 — Token lifecycle adversarial tests (SC-006)

### Step 4.1 — Token reuse

Run steps 1.1–1.4 to commit a change. Then re-submit the same token:

```graphql
mutation {
  userEmailChangeConfirm(userEmailChangeConfirmData: {
    token: "<ALREADY-USED-TOKEN>"
  }) { success }
}
```

Expected: error with `extensions.code: EMAIL_CHANGE_TOKEN_USED`. (FR-007(b), FR-015)

### Step 4.2 — Token expiry

Initiate. Wait > 1 hour (or fast-forward the DB clock for testing). Confirm.
Expected: error with `extensions.code: EMAIL_CHANGE_TOKEN_EXPIRED`. (FR-007(a), FR-007b, FR-015)

### Step 4.3 — Token supersession

Initiate change A to `alice+a@…`. Before confirming A, initiate change B to `alice+b@…`. Now attempt to confirm with A's token.
Expected: error with `extensions.code: EMAIL_CHANGE_TOKEN_INVALID` (A's pending row was transitioned to `SUPERSEDED`). Only B's token works. (FR-007(d), FR-019)

### Step 4.4 — Token wrong-user

Issue a token for Alice. Try to confirm it while logged in as Bob.
Expected: confirmation **succeeds** (the token, not the session, is the authority — FR-018a). The change applies to Alice, not Bob. (Confirming this is intentional behavior protects the "click the link on a different device" edge case from spec.md.)

---

## Scenario 5 — Two-side atomicity (SC-003, SC-005)

**Goal**: Fault-inject the second-side write; verify rollback restores both sides.

This scenario requires the integration-test harness (`*.it-spec.ts`) — not directly executable from the GraphQL playground. Run:

```bash
pnpm test -- test/functional/integration/user-email-change.it-spec.ts
```

The integration test:
1. Initiates a change.
2. Confirms.
3. **Mocks Kratos to fail on the email-trait write** (after 3 retry attempts).
4. Asserts: Alkemio `user.email` is unchanged; Kratos identity `email` trait is unchanged; the pending row is in state `ROLLED_BACK`; an audit entry with outcome `ROLLED_BACK` exists; the GraphQL error code is `EMAIL_CHANGE_KRATOS_WRITE_FAILED`.

A second permutation injects the failure on the Alkemio write (Kratos already succeeded, then we revert Kratos) — same expected end state: `ROLLED_BACK`.

**Exercises**: FR-009, SC-003, SC-005.

---

## Scenario 6 — Drift detection (FR-009a)

**Goal**: Fault-inject BOTH the forward Kratos write AND the rollback. Verify the system enters `DRIFT_DETECTED` and the admin can reconcile.

Also driven by the integration test:

```bash
pnpm test -- test/functional/integration/user-email-change-drift.it-spec.ts
```

The test:
1. Confirms a pending change.
2. Mocks Kratos to fail BOTH the forward write AND the rollback after retry budgets.
3. Asserts:
   - Pending row state = `DRIFT_DETECTED`
   - Audit entry written with outcome `DRIFT_DETECTED` (including observed values per side)
   - GraphQL error code `EMAIL_CHANGE_DRIFT_DETECTED`
   - Winston error log entry tagged `email_change_drift_detected`
   - APM `captureError` was called

Then, as a platform admin:

```graphql
mutation {
  adminUserEmailChangeDriftResolve(adminUserEmailChangeDriftResolveData: {
    userID: "<alice-user-id>"
    canonicalEmail: "alice+v2@test.alkem.io"   # admin chooses the OLD value — revert
  }) {
    success
    email
  }
}
```

Asserts:
- Kratos and Alkemio both reflect `alice+v2@test.alkem.io`
- Audit entry written with outcome `DRIFT_RESOLVED`
- The original `DRIFT_DETECTED` pending row is still in `DRIFT_DETECTED` (forensic evidence per FR-009b)
- Alice can read her `pendingEmailChange` and sees `awaitingAdminReconciliation: false` only after the 30-day window elapses (or by virtue of `DRIFT_DETECTED` being terminal, no further admin action needed). Per FR-022a, while the record is still within the 30-day window, the boolean indicator is `true` to signal the abnormal state was hit; this is a one-time forensic surface, not a re-actionable item.

**Exercises**: FR-009a, FR-009b.

---

## Scenario 7 — Auditing surface (SC-004)

After running scenarios 1–6, query the audit history for Alice as Polly (platform admin):

```graphql
query {
  platformAdmin {
    userEmailChangeAuditEntries(userID: "<alice-user-id>", first: 50) {
      auditEntries {
        timestamp
        outcome
        initiator { id, displayName }
        initiatorRole
        subject { id, displayName }
        oldEmail
        newEmail
        failureReason
      }
      pageInfo { hasNextPage, endCursor }
      total
    }
  }
}
```

Expected entries (descending by timestamp; sample):

| outcome | initiatorRole | failureReason |
| --- | --- | --- |
| `DRIFT_RESOLVED` | `PLATFORM_ADMIN` | null |
| `DRIFT_DETECTED` | `PLATFORM_ADMIN` | "kratos_unreachable" (short, non-leaky) |
| `COMMITTED` | `PLATFORM_ADMIN` | null |
| `CONFIRMED` | `PLATFORM_ADMIN` | null |
| `INITIATED` | `PLATFORM_ADMIN` | null |
| `REJECTED_CONFLICT` | `SELF` | "conflict" (NOT "owned by bob") |
| `COMMITTED` | `SELF` | null |
| `CONFIRMED` | `SELF` | null |
| `INITIATED` | `SELF` | null |

No `token` value appears in any entry. No PII beyond `{ id, displayName }` for `initiator` / `subject`. (FR-014, FR-014a, FR-014b, SC-004)

---

## What success looks like

After running all scenarios:

- [x] **SC-001** — Self-service end-to-end with memberships preserved
- [x] **SC-002** — Admin-on-behalf end-to-end with status query observability
- [x] **SC-003** — Zero divergence cases between Alkemio and Kratos
- [x] **SC-004** — Audit entry produced for every attempt
- [x] **SC-005** — Failed second-side commit produces zero residual changes
- [x] **SC-006** — Token reuse / wrong-user / expired all rejected
- [x] **SC-007** — Zero confirmation mails for rejected attempts
- [x] **SC-008** — Old email rejected, new email succeeds at login
- [x] **SC-009** — Existing sessions invalidated on commit
- [x] **SC-010** — Exactly one security-signal notification on commit; zero on rejection

If any checkbox fails, the feature is not yet shippable. The integration tests (`*.it-spec.ts`) under `test/functional/integration/` are the automated equivalent and MUST also be green.
