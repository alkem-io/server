# Phase 1 — Quickstart

**Feature**: 097-change-user-email (Platform Admin, No Verification)
**Date**: 2026-05-13
**Last Updated**: 2026-05-18 (smaller MVP — confirmation-flow scenarios moved to 098)

End-to-end walkthrough of the synchronous admin-on-behalf email-change flow against a local stack. This is the script a reviewer should follow to convince themselves the feature works before approving. Every step references the FRs / SCs it exercises.

The verification-based self-service flow is walked through separately in `/specs/098-self-service-email-change/quickstart.md`.

---

## Prerequisites

```bash
# Local services running (PostgreSQL 17.5, Kratos, RabbitMQ, etc.)
pnpm run start:services

# Migrations applied (including the new platform_audit_entry table — the platform-wide audit-log foundation per FR-014a)
pnpm run migration:run

# Server running with hot reload
pnpm start:dev

# Mail catcher (the dev MailSlurper instance bundled with the Kratos stack)
# accessible at http://localhost:4436 — used to inspect the security-signal message
```

Two test users (the project provides `register-user` skill for this — see `.claude/skills/register-user`):

| Name | Role | Email |
| --- | --- | --- |
| Alice | regular user | `alice@test.alkem.io` |
| Polly | platform admin | `polly@admin.test.alkem.io` |

Both have valid Alkemio profiles and Kratos identities. Each step below assumes you have already obtained a session cookie for the caller via the `interactive-login` skill, except where explicitly noted.

---

## Scenario 1 — Synchronous admin email change (SC-001, SC-007, SC-008)

**Goal**: Polly (platform admin) changes Alice's email from `alice@test.alkem.io` to `alice+v2@test.alkem.io` in a single mutation. No confirmation step. Memberships and content survive; old email no longer logs in; old mailbox receives a security-signal notification.

### Step 1.1 — Polly invokes the mutation

GraphQL mutation, authenticated as Polly (PLATFORM_ADMIN):

```graphql
mutation {
  adminUserEmailChange(adminUserEmailChangeData: {
    userID: "<alice-user-id>"
    newEmail: "alice+v2@test.alkem.io"
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
    "adminUserEmailChange": {
      "success": true,
      "email": "alice+v2@test.alkem.io"
    }
  }
}
```

The mutation resolves synchronously — Kratos and Alkemio are updated, Alice's sessions are invalidated, and a security-signal notification is published — all before the response returns. (FR-002, FR-013, FR-018, FR-009, FR-010, FR-011, FR-017)

### Step 1.2 — Verify old email is rejected at login

Attempt to log in with `alice@test.alkem.io` via the normal Kratos login flow. It MUST be rejected. (FR-012, SC-007)

Attempt to log in with `alice+v2@test.alkem.io`. It MUST succeed. (FR-012, SC-007)

### Step 1.3 — Confirm security-signal email arrives at OLD address

Open MailSlurper at `http://localhost:4436`. A message MUST appear, addressed to `alice@test.alkem.io` (the OLD address). It contains:

- A statement that the user's login email was changed (FR-016)
- The commit timestamp (FR-016)
- The initiator role tag (`platform admin`) (FR-016)
- A partially masked rendering of the new address, e.g., `a***@t***.io` — the FULL new address MUST NOT be disclosed (FR-016, R11)
- Recovery instructions (FR-016)

Exactly one message at the old address; no messages at the old address for any rejected attempt. (FR-016, SC-008)

### Step 1.3a — Confirm acknowledgement notification arrives at NEW address

A second message MUST appear in MailSlurper, this one addressed to `alice+v2@test.alkem.io` (the NEW address). It contains:

- A statement that this address is now the user's login email on Alkemio (FR-016c)
- The commit timestamp (FR-016c)
- The initiator role tag (`platform admin`) (FR-016c)
- A login link / instruction (FR-016c)
- The full new address (NOT masked — the recipient is the legitimate new-mailbox holder) (FR-016c)
- A recovery / disclaimer line (FR-016c)

Exactly one message at the new address. No messages at the new address for any rejected attempt. (FR-016c, SC-009)

### Step 1.3b — Confirm global-admin fan-out notification was published

The notifications-service receives one `USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION` event (observable via the RabbitMQ-binding test harness or by inspecting the notifications-service inbox in dev). The event payload contains: subject `{id, displayName}`, full old email, full new email, initiator `{id, displayName}`, initiator role `PLATFORM_ADMIN`, commit timestamp, `triggerOutcome: COMMITTED`. The notifications-service then fans this event out to ALL platform admins via the email + push (PWA) + in-app channels — mirroring the existing Global-Role-Change pattern. (FR-016d, SC-010)

Downstream per-recipient delivery is out of this spec's measurement scope (the notifications-service owns that), but a smoke check: a second platform admin (other than the initiator) receives the fan-out via her configured channels.

### Step 1.4 — Verify Alice's data survived

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

### Step 1.5 — Verify previously-active sessions are dead

If you had a second browser open as Alice during step 1.1, refresh it now. The session MUST no longer be valid; Alice is required to log in again with `alice+v2@test.alkem.io`. (FR-017, SC-007)

### Step 1.6 — Polly observes the audit trail

```graphql
query {
  platformAdmin {
    latestUserEmailChangeAuditEntry(userID: "<alice-user-id>") {
      outcome           # COMMITTED
      initiatorRole     # PLATFORM_ADMIN
      oldEmail          # alice@test.alkem.io
      newEmail          # alice+v2@test.alkem.io
      timestamp
    }
  }
}
```

(FR-021, SC-003)

---

## Scenario 2 — Validation rejection (SC-006)

**Goal**: Validation errors surface BEFORE any side-write is attempted; each rejection writes a matching audit entry.

### Step 2.1 — Malformed email

```graphql
mutation {
  adminUserEmailChange(adminUserEmailChangeData: {
    userID: "<alice-user-id>"
    newEmail: "not-an-email"
  }) { success }
}
```

Expected: error with `extensions.code: EMAIL_CHANGE_VALIDATION`. Audit entry written with outcome `REJECTED_VALIDATION`. No Kratos call made. (FR-004, FR-015)

### Step 2.2 — Same as current

```graphql
mutation {
  adminUserEmailChange(adminUserEmailChangeData: {
    userID: "<alice-user-id>"
    newEmail: "alice+v2@test.alkem.io"   # Alice's current email
  }) { success }
}
```

Expected: error with `extensions.code: EMAIL_CHANGE_NO_CHANGE`. Audit entry with outcome `REJECTED_VALIDATION` and `failureReason: no_change`. (FR-005, FR-015)

### Step 2.3 — Conflict (another user already owns the address)

Bob exists with email `bob@test.alkem.io`. Polly tries to assign that address to Alice:

```graphql
mutation {
  adminUserEmailChange(adminUserEmailChangeData: {
    userID: "<alice-user-id>"
    newEmail: "bob@test.alkem.io"
  }) { success }
}
```

Expected: error with `extensions.code: EMAIL_CHANGE_CONFLICT`. Audit entry with outcome `REJECTED_CONFLICT` and `failureReason: conflict` (generic — MUST NOT reveal that Bob exists). (FR-004, FR-014, FR-015, SC-006)

---

## Scenario 3 — Two-side atomicity (SC-002, SC-004)

**Goal**: Fault-inject the second-side write; verify rollback restores both sides.

This scenario requires the integration-test harness (`*.it-spec.ts`) — not directly executable from the GraphQL playground. Run:

```bash
pnpm test -- test/functional/integration/user-email-change-rollback.it-spec.ts
```

The integration test:
1. Polly invokes the mutation.
2. **Mocks Kratos to fail on the email-trait write** (after 3 retry attempts).
3. Asserts: Alkemio `user.email` is unchanged; Kratos identity `email` trait is unchanged; an audit entry with outcome `ROLLED_BACK` exists; the GraphQL error code is `EMAIL_CHANGE_KRATOS_WRITE_FAILED`.

A second permutation injects the failure on the Alkemio write (Kratos already succeeded, then we revert Kratos) — same expected end state: audit entry `ROLLED_BACK`.

**Exercises**: FR-009, SC-002, SC-004.

---

## Scenario 4 — Drift detection and admin reconciliation (FR-009a, FR-009b, SC-005)

**Goal**: Fault-inject BOTH the forward Kratos write AND the rollback. Verify the system writes a `drift_detected` audit entry and the admin can reconcile.

Also driven by the integration test:

```bash
pnpm test -- test/functional/integration/user-email-change-drift.it-spec.ts
```

The test:
1. Polly invokes the mutation.
2. Mocks Kratos to fail BOTH the forward write AND the rollback after retry budgets.
3. Asserts:
   - Audit entry written with outcome `DRIFT_DETECTED` (including observed values per side)
   - GraphQL error code `EMAIL_CHANGE_DRIFT_DETECTED`
   - Winston error log entry tagged `email_change_drift_detected`
   - APM `captureError` was called with the same marker
   - One `USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION` event was published with `triggerOutcome: DRIFT_DETECTED` (so other admins can assist with reconciliation — FR-016d)

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
- The original `DRIFT_DETECTED` audit entry is unmodified (forensic evidence per FR-014a)

**Exercises**: FR-009a, FR-009b, SC-005.

---

## Scenario 5 — Auditing surface (SC-003)

After running scenarios 1–4, query the audit history for Alice as Polly (platform admin):

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

Expected entries (descending by timestamp; sample after all scenarios):

| outcome | initiatorRole | failureReason |
| --- | --- | --- |
| `DRIFT_RESOLVED` | `PLATFORM_ADMIN` | null |
| `DRIFT_DETECTED` | `PLATFORM_ADMIN` | "kratos_unreachable" (short, non-leaky) |
| `ROLLED_BACK` | `PLATFORM_ADMIN` | "kratos_unreachable" |
| `REJECTED_CONFLICT` | `PLATFORM_ADMIN` | "conflict" (NOT "owned by bob") |
| `REJECTED_VALIDATION` | `PLATFORM_ADMIN` | "no_change" |
| `REJECTED_VALIDATION` | `PLATFORM_ADMIN` | "malformed_email" |
| `COMMITTED` | `PLATFORM_ADMIN` | null |

No PII beyond `{ id, displayName }` for `initiator` / `subject`. (FR-014, FR-014a, FR-014b, SC-003)

---

## What success looks like

After running all scenarios:

- [x] **SC-001** — Admin-on-behalf end-to-end in a single synchronous mutation; audit observable
- [x] **SC-002** — Zero divergence cases between Alkemio and Kratos (excluding explicitly-recorded drift_detected)
- [x] **SC-003** — Audit entry produced for every attempt
- [x] **SC-004** — Failed second-side commit produces zero residual changes
- [x] **SC-005** — Double-failure produces drift_detected + Winston + APM signals
- [x] **SC-006** — Zero side-writes for rejected attempts
- [x] **SC-007** — Old email rejected at login, new email succeeds; existing sessions dead
- [x] **SC-008** — Exactly one security-signal notification at the OLD address on commit; zero on rejection
- [x] **SC-009** — Exactly one acknowledgement notification at the NEW address on commit; zero on rejection
- [x] **SC-010** — Exactly one global-admin fan-out event published on commit AND on drift_detected; zero on rejection or other failure outcomes

If any checkbox fails, the feature is not yet shippable. The integration tests (`*.it-spec.ts`) under `test/functional/integration/` are the automated equivalent and MUST also be green.
