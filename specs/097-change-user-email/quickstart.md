# Phase 1 — Quickstart

**Feature**: 097-change-user-email (Platform Admin)
**Date**: 2026-05-13
**Last Updated**: 2026-05-18 (split from unified spec; self-service walkthrough moved to 098)

End-to-end walkthrough of the admin-on-behalf email-change flow against a local stack. This is the script a reviewer should follow to convince themselves the feature works before approving. Every step references the FRs / SCs it exercises.

The self-service flow is walked through separately in `/specs/098-self-service-email-change/quickstart.md`.

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

## Scenario 1 — Admin-on-behalf happy path (SC-001, SC-002, SC-007, SC-008, SC-009)

**Goal**: Polly (platform admin) changes Alice's email from `alice@test.alkem.io` to `alice+v2@test.alkem.io`. Alice confirms via the link delivered to the new mailbox. Memberships and content survive; old email no longer logs in; old mailbox receives a security-signal notification.

### Step 1.1 — Polly initiates on Alice's behalf

GraphQL mutation, authenticated as Polly (PLATFORM_ADMIN):

```graphql
mutation {
  adminUserEmailChangeBegin(adminUserEmailChangeBeginData: {
    userID: "<alice-user-id>"
    newEmail: "alice+v2@test.alkem.io"
  }) {
    state
    initiatorRole
    newEmail
    issuedAt
    expiryAt
  }
}
```

Expected response:
```json
{
  "data": {
    "adminUserEmailChangeBegin": {
      "state": "INITIATED",
      "initiatorRole": "PLATFORM_ADMIN",
      "newEmail": "alice+v2@test.alkem.io",
      "issuedAt": "2026-05-18T10:00:00.000Z",
      "expiryAt": "2026-05-18T11:00:00.000Z"
    }
  }
}
```

**Exercises**: FR-002, FR-013, FR-018, FR-003 (token issued + mail sent), FR-007b (1h TTL).

### Step 1.2 — Check MailSlurper for the confirmation message

Open `http://localhost:4436`. You should see one new message addressed to `alice+v2@test.alkem.io` containing:

- A clickable confirmation link of the form `${endpoints.client_web}/identity/email-change/confirm?token=…` (FR-003a)
- The initiator role tag indicating the change was initiated by a `platform admin` (FR-003b)
- An explicit statement that the link is time-limited consistent with the 1-hour TTL (FR-003b, FR-007b)
- Recovery / disclaimer instructions for unexpected changes (FR-003b)

The message MUST NOT contain Polly's name, user id, or any other admin PII; only the role tag is permitted. (FR-003b)

### Step 1.3 — Confirm with the token (session-less)

Extract the token from the confirmation link. Invoke the confirm mutation **without** a session cookie (e.g., in an incognito window, or via `curl` without authentication):

```graphql
mutation {
  userEmailChangeConfirm(userEmailChangeConfirmData: {
    token: "<TOKEN-FROM-LINK>"
  }) {
    success
    email
  }
}
```

Expected: `success: true`, `email: alice+v2@test.alkem.io`. (FR-008, FR-018a)

### Step 1.4 — Verify old email is rejected at login

Attempt to log in with `alice@test.alkem.io` via the normal Kratos login flow. It MUST be rejected. (FR-012, SC-007)

Attempt to log in with `alice+v2@test.alkem.io`. It MUST succeed. (FR-012, SC-007)

### Step 1.5 — Confirm security-signal email arrives at OLD address

Open MailSlurper. A second message MUST appear, addressed to `alice@test.alkem.io` (the OLD address). It contains:

- A statement that the user's login email was changed (FR-016)
- The commit timestamp (FR-016)
- The initiator role tag (`platform admin`) (FR-016)
- A partially masked rendering of the new address, e.g., `a***@t***.io` — the FULL new address MUST NOT be disclosed (FR-016, R11)
- Recovery instructions (FR-016)

Exactly one message at the old address; no messages at the old address for any abandoned or rejected attempt. (FR-016, SC-009)

### Step 1.6 — Verify Alice's data survived

Query Alice's profile (as Alice, after logging in with the new email):

```graphql
query {
  me {
    user {
      id              # same as before the change
      email           # alice+v2@test.alkem.io
      profile { id, displayName }
      # ... memberships, contributions, etc.
    }
  }
}
```

The `user.id`, profile id, memberships, and historical references are unchanged. (FR-010, SC-001)

### Step 1.7 — Verify previously-active sessions are dead

If you had a second browser open as Alice during step 1.1, refresh it now. The session MUST no longer be valid; Alice is required to log in again with `alice+v2@test.alkem.io`. (FR-017, SC-008)

### Step 1.8 — Polly observes the outcome via `platformAdmin` status query

```graphql
query {
  platformAdmin {
    userEmailChangeState(userID: "<alice-user-id>") {
      state            # COMMITTED
      initiatorRole    # PLATFORM_ADMIN
      newEmail         # alice+v2@test.alkem.io
      committedAt
    }
  }
}
```

(FR-021, SC-001)

---

## Scenario 2 — Validation rejection (SC-006)

**Goal**: Validation errors surface BEFORE any mail is sent.

### Step 2.1 — Malformed email

Polly attempts an admin-init with a malformed address:

```graphql
mutation {
  adminUserEmailChangeBegin(adminUserEmailChangeBeginData: {
    userID: "<alice-user-id>"
    newEmail: "not-an-email"
  }) { state }
}
```

Expected: error with `extensions.code: EMAIL_CHANGE_VALIDATION`. MailSlurper: no new message. (FR-004, FR-015)

### Step 2.2 — Same as current

```graphql
mutation {
  adminUserEmailChangeBegin(adminUserEmailChangeBeginData: {
    userID: "<alice-user-id>"
    newEmail: "alice+v2@test.alkem.io"   # Alice's current email
  }) { state }
}
```

Expected: error with `extensions.code: EMAIL_CHANGE_NO_CHANGE`. MailSlurper: no new message. (FR-005, FR-015)

### Step 2.3 — Conflict (another user already owns the address)

Bob exists with email `bob@test.alkem.io`. Polly tries to assign that address to Alice:

```graphql
mutation {
  adminUserEmailChangeBegin(adminUserEmailChangeBeginData: {
    userID: "<alice-user-id>"
    newEmail: "bob@test.alkem.io"
  }) { state }
}
```

Expected: error with `extensions.code: EMAIL_CHANGE_CONFLICT`. The error MUST NOT reveal that Bob exists — the message is generic. MailSlurper: no new message. (FR-004, FR-014, FR-015, SC-006)

### Step 2.4 — Mail-delivery failure (FR-019a)

Driven by the integration test harness — see `test/functional/integration/user-email-change-validation.it-spec.ts`. Mocks the outbound mail provider to hard-fail after validation passes. Asserts: pending row was rolled back, no row remains, audit entry with outcome `INITIATION_FAILED`, GraphQL error `EMAIL_CHANGE_MAIL_DELIVERY_FAILED`. (FR-019a)

---

## Scenario 3 — Token lifecycle adversarial tests (SC-005)

### Step 3.1 — Token reuse

Run steps 1.1–1.3 to commit a change. Then re-submit the same token:

```graphql
mutation {
  userEmailChangeConfirm(userEmailChangeConfirmData: {
    token: "<ALREADY-USED-TOKEN>"
  }) { success }
}
```

Expected: error with `extensions.code: EMAIL_CHANGE_TOKEN_USED`. (FR-007(b), FR-015)

### Step 3.2 — Token expiry

Polly initiates. Wait > 1 hour (or fast-forward the DB clock for testing). Target user confirms.

Expected: error with `extensions.code: EMAIL_CHANGE_TOKEN_EXPIRED` — NOT `EMAIL_CHANGE_TOKEN_USED`, even if the lazy sweep has already transitioned the row to `EXPIRED`. (FR-007(a), FR-007b, FR-015)

### Step 3.3 — Token supersession

Polly initiates change A to `alice+a@…`. Before A is confirmed, Polly initiates change B to `alice+b@…` for the same subject. Now attempt to confirm with A's token.

Expected: error with `extensions.code: EMAIL_CHANGE_TOKEN_INVALID` (A's pending row was transitioned to `SUPERSEDED`). Only B's token works. (FR-007(d), FR-019)

### Step 3.4 — Token wrong-user

Polly issues a token for Alice. Try to confirm it while logged in as Bob (or in an incognito window with no session).

Expected: confirmation **succeeds** (the token, not the session, is the authority — FR-018a). The change applies to Alice, not Bob. This intentional behavior supports the "click the link on a different device" edge case from spec.md.

---

## Scenario 4 — Two-side atomicity (SC-002, SC-004)

**Goal**: Fault-inject the second-side write; verify rollback restores both sides.

This scenario requires the integration-test harness (`*.it-spec.ts`) — not directly executable from the GraphQL playground. Run:

```bash
pnpm test -- test/functional/integration/user-email-change-rollback.it-spec.ts
```

The integration test:
1. Polly initiates an admin change.
2. Alice confirms.
3. **Mocks Kratos to fail on the email-trait write** (after 3 retry attempts).
4. Asserts: Alkemio `user.email` is unchanged; Kratos identity `email` trait is unchanged; the pending row is in state `ROLLED_BACK`; an audit entry with outcome `ROLLED_BACK` exists; the GraphQL error code is `EMAIL_CHANGE_KRATOS_WRITE_FAILED`.

A second permutation injects the failure on the Alkemio write (Kratos already succeeded, then we revert Kratos) — same expected end state: `ROLLED_BACK`.

**Exercises**: FR-009, SC-002, SC-004.

---

## Scenario 5 — Drift detection (FR-009a)

**Goal**: Fault-inject BOTH the forward Kratos write AND the rollback. Verify the system enters `DRIFT_DETECTED` and the admin can reconcile.

Also driven by the integration test:

```bash
pnpm test -- test/functional/integration/user-email-change-drift.it-spec.ts
```

The test:
1. Polly initiates and Alice confirms.
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
    canonicalEmail: "alice@test.alkem.io"   # admin chooses the OLD value — revert
  }) {
    success
    email
  }
}
```

Asserts:
- Kratos and Alkemio both reflect `alice@test.alkem.io`
- Audit entry written with outcome `DRIFT_RESOLVED`
- The original `DRIFT_DETECTED` pending row is still in `DRIFT_DETECTED` (forensic evidence per FR-009b)

**Exercises**: FR-009a, FR-009b.

---

## Scenario 6 — Auditing surface (SC-003)

After running scenarios 1–5, query the audit history for Alice as Polly (platform admin):

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
| `ROLLED_BACK` | `PLATFORM_ADMIN` | "kratos_unreachable" |
| `COMMITTED` | `PLATFORM_ADMIN` | null |
| `CONFIRMED` | `PLATFORM_ADMIN` | null |
| `INITIATED` | `PLATFORM_ADMIN` | null |
| `REJECTED_CONFLICT` | `PLATFORM_ADMIN` | "conflict" (NOT "owned by bob") |

No `token` value appears in any entry. No PII beyond `{ id, displayName }` for `initiator` / `subject`. (FR-014, FR-014a, FR-014b, SC-003)

---

## What success looks like

After running all scenarios:

- [x] **SC-001** — Admin-on-behalf end-to-end with status query observability
- [x] **SC-002** — Zero divergence cases between Alkemio and Kratos
- [x] **SC-003** — Audit entry produced for every attempt
- [x] **SC-004** — Failed second-side commit produces zero residual changes
- [x] **SC-005** — Token reuse / wrong-user / expired all rejected
- [x] **SC-006** — Zero confirmation mails for rejected attempts
- [x] **SC-007** — Old email rejected, new email succeeds at login
- [x] **SC-008** — Existing sessions invalidated on commit
- [x] **SC-009** — Exactly one security-signal notification on commit; zero on rejection

If any checkbox fails, the feature is not yet shippable. The integration tests (`*.it-spec.ts`) under `test/functional/integration/` are the automated equivalent and MUST also be green.
