# Phase 1 — Quickstart

**Feature**: 098-self-service-email-change
**Date**: 2026-05-18
**Foundational dependency**: 097 (admin spec) — its quickstart covers the admin-on-behalf flow, the audit query surface, the two-side commit, the rollback, the drift detection, and the drift-resolve mutation. This quickstart covers ONLY the new self-service surface.

End-to-end walkthrough of the verification-based self-service email-change flow against a local stack. Every step references the FRs / SCs it exercises.

---

## Prerequisites

```bash
# Local services running (PostgreSQL 17.5, Kratos, RabbitMQ, etc.)
pnpm run start:services

# Migrations applied (097's audit table AND this spec's email_change_pending table + enum extension)
pnpm run migration:run

# Server running with hot reload
pnpm start:dev

# Mail catcher at http://localhost:4436 — used to inspect the confirmation message AND the post-commit security-signal
```

| Name | Role | Email |
| --- | --- | --- |
| Alice | regular user | `alice@test.alkem.io` |
| Bob | regular user | `bob@test.alkem.io` (used in conflict scenarios) |

Alice is logged in for the self-service scenarios via the `interactive-login` skill (except where explicitly noted).

---

## Scenario 1 — Self-service happy path (SC-001)

**Goal**: Alice changes her own email from `alice@test.alkem.io` to `alice+v2@test.alkem.io` by clicking the confirmation link in the new mailbox.

### Step 1.1 — Alice initiates

```graphql
mutation {
  meUserEmailChangeBegin(meUserEmailChangeBeginData: {
    newEmail: "alice+v2@test.alkem.io"
  }) {
    state                       # INITIATED
    initiatorRole               # SELF
    newEmail                    # alice+v2@test.alkem.io
    issuedAt
    expiryAt                    # issuedAt + 1h (FR-007b)
    awaitingAdminReconciliation # false
  }
}
```

(FR-001, FR-003, FR-007b, FR-022)

### Step 1.2 — Verify the confirmation message at the NEW address

Open MailSlurper. A new message addressed to `alice+v2@test.alkem.io`:

- Contains a clickable confirmation link of the form `${endpoints.client_web}/identity/email-change/confirm?token=...` (FR-003a)
- Initiator role tag: `self` (FR-003b)
- Time-limited statement consistent with the 1-hour TTL (FR-003b, FR-007b)
- Recovery / disclaimer instructions (FR-003b)
- MUST NOT include the token outside the link, internal identifiers, or any locale-resolution traces (FR-003b)

### Step 1.3 — Alice queries her own pending change

```graphql
query {
  me {
    pendingEmailChange {
      state                       # INITIATED
      initiatorRole               # SELF
      newEmail
      issuedAt
      expiryAt
      awaitingAdminReconciliation # false
    }
  }
}
```

(FR-022)

### Step 1.4 — Alice confirms via the session-less root mutation

Extract the token from the confirmation link. Invoke the confirm mutation **without** a session cookie:

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

Under the hood: FR-004a confirm-time uniqueness re-check → pending row transitions INITIATED → CONFIRMED → 097's two-side commit runs (Kratos first, then Alkemio) → pending row transitions to COMMITTED → 097's session-invalidation + security-signal-to-old-address paths run.

### Step 1.5 — Verify login behaviour

- Old email (`alice@test.alkem.io`) login → rejected (097's FR-012, SC-007).
- New email (`alice+v2@test.alkem.io`) login → succeeds.

### Step 1.6 — Verify the security-signal at the OLD address

MailSlurper now shows a second message at `alice@test.alkem.io` (the OLD address) with role tag `self`, the masked new address, and the recovery instructions (097's FR-016, this spec emits `self` as the role tag).

### Step 1.7 — Alice queries her own pending change again

After commit, `me.pendingEmailChange` returns null — the pending row is in COMMITTED state which is not in the observable set per FR-022 / FR-022a. The audit trail (097's `platformAdmin.userEmailChangeAuditEntries`) is the long-term forensic surface.

---

## Scenario 2 — Token lifecycle adversarial cases (SC-005, SC-006, SC-007, SC-008)

### Step 2.1 — Token reuse

After Scenario 1, re-submit the same token:

```graphql
mutation {
  userEmailChangeConfirm(userEmailChangeConfirmData: {
    token: "<ALREADY-USED-TOKEN>"
  }) { success }
}
```

Expected: error `EMAIL_CHANGE_TOKEN_USED`. Audit entry `rejected_used_token` written. (FR-007(b))

### Step 2.2 — Token expiry

Alice initiates. Wait > 1 hour (or fast-forward the DB clock). Confirm.

Expected: error `EMAIL_CHANGE_TOKEN_EXPIRED` — NOT `EMAIL_CHANGE_TOKEN_USED`, even if the lazy sweep has already transitioned the row to `EXPIRED`. Audit entry `expired` written. (FR-007(a), FR-007b)

### Step 2.3 — Token supersession

Alice initiates change A to `alice+a@…`. Before A is confirmed, Alice initiates change B to `alice+b@…`. Now attempt to confirm with A's token.

Expected: error `EMAIL_CHANGE_TOKEN_INVALID` (A's pending row was transitioned to `SUPERSEDED`). Only B's token works. (FR-007(d), FR-019)

### Step 2.4 — Confirm with no session (different device)

Alice initiates from her browser. She opens the confirmation link in an incognito window with no Alkemio session. Confirm succeeds — the token is the sole authority (FR-018a, SC-006).

### Step 2.5 — Mail-send failure (FR-019a)

Driven by the integration test harness: mock the NotificationAdapter to hard-fail. Alice's initiate call returns `EMAIL_CHANGE_MAIL_DELIVERY_FAILED`. No `email_change_pending` row remains. An `initiation_failed` audit entry is written. (FR-019a, SC-007)

---

## Scenario 3 — Confirm-time uniqueness re-check (FR-004a, SC-008)

**Goal**: Between Alice's initiate and confirm, Bob ends up with the address Alice wants. The confirm must fail cleanly.

This scenario requires the integration-test harness — see `test/functional/integration/user-email-change-self.it-spec.ts`.

1. Alice initiates a change to `target@test.alkem.io` (currently unused).
2. The test harness mutates the DB to give Bob the email `target@test.alkem.io`.
3. Alice clicks the confirmation link.
4. Expected: error `EMAIL_CHANGE_CONFLICT`. No Kratos write, no Alkemio write. `rejected_conflict` audit entry written. Alice's pending row stays in `INITIATED` (does NOT transition to `confirmed`). The `failure_reason` field is generic (`conflict`) — MUST NOT reveal Bob.

(FR-004a, 097's FR-014 anti-enumeration rule)

---

## Scenario 4 — Subject sees DRIFT_DETECTED state, admin reconciles (SC-004, FR-009b-EXT)

**Goal**: Inject a drift case on Alice's self-initiated change; verify the subject can see the abnormal state via `me.pendingEmailChange`; verify Polly's drift-resolve also transitions the pending row.

Driven by the integration test harness:

1. Alice initiates and confirms; the harness injects BOTH a forward Kratos failure AND a Kratos-revert failure (097's drift conditions).
2. Pending row transitions to `DRIFT_DETECTED`; 097's audit entry `drift_detected` is written; the confirm mutation throws `EMAIL_CHANGE_DRIFT_DETECTED`.
3. Alice queries `me.pendingEmailChange`:

```graphql
query {
  me {
    pendingEmailChange {
      state                         # DRIFT_DETECTED
      awaitingAdminReconciliation   # true
      newEmail                      # the proposed new address (admin-only diagnostic detail is NOT surfaced)
    }
  }
}
```

The response MUST NOT expose per-side observed email values or technical failure reasons. (FR-022a, SC-004)

4. Polly (admin) invokes 097's drift-resolve mutation with `canonicalEmail = new_email` (keep the change):

```graphql
mutation {
  adminUserEmailChangeDriftResolve(adminUserEmailChangeDriftResolveData: {
    userID: "<alice-user-id>"
    canonicalEmail: "<the new email>"
  }) {
    success
    email
  }
}
```

5. Expected: both sides align to the new email; `drift_resolved` audit entry written; Alice's pending row transitions from `DRIFT_DETECTED` to `COMMITTED` (FR-009b-EXT). The original `drift_detected` audit entry is NOT modified — it remains forensic evidence (097's FR-009b unchanged).

6. Alice queries `me.pendingEmailChange` again → null (COMMITTED is not in the observable set).

---

## What success looks like

After running all scenarios:

- [x] **SC-001** — Self-service end-to-end (initiate → confirm → log in with new email) without support intervention
- [x] **SC-002** — Audit entries written for every self-initiated transition with `initiator_role = self`
- [x] **SC-003** — `me.pendingEmailChange` is keyed to the caller; cannot return another user's row
- [x] **SC-004** — DRIFT_DETECTED state surfaces to the subject with `awaitingAdminReconciliation: true` and no diagnostic leakage
- [x] **SC-005** — Token reuse / expiry / supersession all rejected with the right typed errors and matching audit entries
- [x] **SC-006** — Confirmation succeeds regardless of session state (FR-018a)
- [x] **SC-007** — Mail-send failure during initiation rolls back the pending row + writes `initiation_failed` audit
- [x] **SC-008** — Confirm-time uniqueness re-check (FR-004a) catches benign conflict races without invoking 097's compensating rollback

If any checkbox fails, the feature is not yet shippable. The integration tests (`*.it-spec.ts`) under `test/functional/integration/` are the automated equivalent and MUST also be green.
