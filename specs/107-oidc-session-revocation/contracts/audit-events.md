# Contract — Audit events

**Feature**: `specs/107-oidc-session-revocation`
**Surface**: the existing structured OIDC audit stream,
`src/core/auth/oidc/audit.ts` → `emitAudit` (newline-delimited JSON on stdout)

These records are the **audit evidence** for ISO/IEC 27001:2022 A.5.18 (removal
of access rights), A.8.15 (logging), A.8.16 (monitoring), A.5.28 (collection of
evidence) and SOC 2 CC6.2 / CC7.2. They are not debug logging. "We called the
method" is not proof that access ended; this trail is.

---

## Why here and not `platform_audit_entry`

Checked for an enum collision with the in-flight `027-platform-role-redesign`
(design-input trap 6) — see research R4 for the full table. **No literal
collision**, but the check surfaced that 027 already owns the database-side audit
row for user deletion (`platform_user_record` / `identity_deleted`), and its
residual-risk register already carries an open **high** finding about that row
being written on only one branch. A second writer for the same event would make
that finding unfixable.

These are also *session* events, not *mutation* events: one per session, keyed by
`sub` / `client_id` / `rp_id`, none of which `platform_audit_entry` has a column
for. `session.ended` and `auth.cookie.session_terminated` already live on this
stream.

**Consequence: this feature ships zero DDL and zero migrations, and merges with
027 in either order without touching `src/migrations/`.**

---

## Type extension (additive only)

```ts
export type AuditEventType =
  | …existing 13 members, unchanged…
  | 'session.revocation.initiated'
  | 'session.revoked'
  | 'session.revocation.completed';

export type AuditEvent = {
  …existing fields, unchanged…
  /** NEW, optional — the closed-set cause of a revocation. */
  reason?: SessionRevocationReason | null;
};
```

`session.ended` is deliberately **not** reused. It means *the holder signed
themselves out*; overloading it would destroy the very distinction an auditor
needs — voluntary sign-out versus enforced revocation.

---

## The three events

### `session.revocation.initiated`

Emitted **once, before any teardown** (FR-018, trap 5) so the evidence survives a
process death mid-teardown.

| Field | Value |
|---|---|
| `outcome` | `success` |
| `sub` | the subject |
| `client_id` | `null` (not yet known — it is per-session) |
| `reason` | the `SessionRevocationReason` |
| `correlation_id` / `request_id` | caller-supplied or generated |
| `truncated_input` | the session count about to be processed, as a string |

### `session.revoked`

Emitted **once per session**.

| Field | Value |
|---|---|
| `outcome` | `success` for `revoked` / `already_terminated` / `already_absent` / `skipped_excepted`; `failure` for `failed` |
| `sub` | the subject |
| `client_id` | from the payload captured pre-teardown; `null` if it was already gone |
| `reason` | the `SessionRevocationReason` |
| `error_code` | the per-session outcome name; on failure, the redacted cause |

A `failed` **remote** leg (`tokenRevocation: 'failed'`) with a successful local
teardown emits `outcome: 'failure'` with `error_code: 'token_revocation_failed'`.
It is a genuine control failure — the refresh grant may survive upstream — and
FR-022 forbids swallowing it, even though platform access has already ended.

### `session.revocation.completed`

Emitted **once**, last.

| Field | Value |
|---|---|
| `outcome` | `success` if `complete`, else `failure` |
| `sub` | the subject |
| `reason` | the `SessionRevocationReason` |
| `truncated_input` | `"revoked=<n> failed=<m> total=<t>"` |

---

## Prohibited content (FR-021, SC-006)

No record emitted by this feature may contain, in any field:

- `access_token`, `id_token`, `refresh_token`, or any substring thereof
- a session cookie value or a signed cookie
- the contents of `request_context_cache` (display name, email)
- a raw exception message that has not passed through the redaction helper

**Enforced by test**, not by convention: a spec drives a forced-failure run with
recognisable fixture token values, captures everything written to the audit
stream and to the logger, and asserts none of the fixture values appears
anywhere in the serialised output.

---

## Worked example — one deletion, two devices, one remote failure

```json
{"event_type":"session.revocation.initiated","outcome":"success","sub":"a1b2…","client_id":null,"reason":"account_deleted","correlation_id":"c-1","request_id":"c-1","truncated_input":"2","timestamp":"2026-07-31T10:00:00.000Z"}
{"event_type":"session.revoked","outcome":"success","sub":"a1b2…","client_id":"alkemio-web","reason":"account_deleted","correlation_id":"c-1","request_id":"c-1","error_code":"revoked","timestamp":"2026-07-31T10:00:00.010Z"}
{"event_type":"session.revoked","outcome":"failure","sub":"a1b2…","client_id":"alkemio-web","reason":"account_deleted","correlation_id":"c-1","request_id":"c-1","error_code":"token_revocation_failed","timestamp":"2026-07-31T10:00:03.020Z"}
{"event_type":"session.revocation.completed","outcome":"failure","sub":"a1b2…","client_id":null,"reason":"account_deleted","correlation_id":"c-1","request_id":"c-1","truncated_input":"revoked=2 failed=1 total=2","timestamp":"2026-07-31T10:00:03.021Z"}
```

Both sessions are dead on the platform. The second device's refresh grant may
survive at the authorization server until its own expiry, and the trail says so
explicitly rather than reporting a clean success — which is the whole point of
reporting the remote leg separately.

---

## The trace an auditor asks for

> *deletion event → audit record → proof the session was terminated → proof the
> next request was rejected*

| Link | Evidence |
|---|---|
| deletion event | the `deleteUser` mutation's existing authorization + audit path (027 owns the DB row) |
| audit record | `session.revocation.initiated` (written before the side effect) |
| session terminated | `session.revoked` per session, plus the Redis payload's `terminated_at` |
| next request rejected | the integration-style spec asserting `CookieSessionStrategy.validate` throws `CookieSessionInvalidError` after revocation |

The last link is the one that is usually missing, and it is the one that is
actually load-bearing.
