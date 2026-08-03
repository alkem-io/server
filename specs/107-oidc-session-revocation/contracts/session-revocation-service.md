# Contract — `OidcSessionRevocationService`

**Location**: `src/core/auth/oidc/revocation/oidc-session-revocation.service.ts`
**Provided & exported by**: `OidcCoreModule`
**Status**: internal service contract (no GraphQL, no REST, no message surface)

This is the WS1 primitive. It is written **once** and consumed **unchanged** by
four call sites: this feature (`account_deleted`), client-web#10070
(`password_changed`), the unreported admin email-change defect
(`email_changed`), and server#6073 (`user_revoked` / `admin_revoked`). Trap 10 of
the design input: if these four cannot consume it as-is, it gets rewritten in
three months.

---

## Interface

```ts
@Injectable()
export class OidcSessionRevocationService {
  revokeAllForSub(
    sub: string | null | undefined,
    reason: SessionRevocationReason,
    opts?: RevokeAllForSubOptions
  ): Promise<SessionRevocationReport>;
}
```

Types are defined in `session-revocation.types.ts` and specified in
[`../data-model.md` §3](../data-model.md).

---

## Behavioural contract

### C1 — Null subject is a no-op success

```
GIVEN  sub is null, undefined or ''
THEN   returns { entries: [], revokedCount: 0, failedCount: 0, complete: true }
AND    performs no Redis command and no network call
AND    throws nothing
```

`user.authenticationID` is nullable (`user.entity.ts:53`); users never linked to
Kratos legitimately have none (FR-017, FR-028, trap 8).

### C2 — Enumeration is scoped, never global

```
GIVEN  any sub
WHEN   revokeAllForSub runs
THEN   exactly one read command is issued against exactly one key: SMEMBERS alkemio:sub:<sub>
AND    no KEYS, SCAN, or wildcard command is issued
```

FR-005, SC-007. A spec asserts the command list on the mocked client.

### C3 — Tombstone, never destroy

```
GIVEN  a live session sid belonging to sub
WHEN   revokeAllForSub runs
THEN   sessionStore.markTerminated(sid, reason, { sub, client_id }) is called
AND    sessionStore.destroy is NOT called
AND    the resulting payload has terminated_at set, id_token and access_token
       blanked (FR-010: that is where the session's PII lives), and a cookie
       field preserved (without it express-session throws before any strategy
       runs and the 401 becomes a 500)
```

FR-009, FR-010, trap 1. **This is the single most important assertion in the
feature.** `destroy` produces an anonymous fall-through with HTTP 200 —
i.e. the reported bug, in a new costume.

### C4 — Per-session teardown is complete

For each non-excepted member sid, in order:

1. `get(sid)` → capture `client_id` and `refresh_token` **before** any mutation
   (the tombstone blanks them).
2. `markTerminated(sid, reason, { sub, client_id })`.
3. `DEL alkemio:sid:<sid>:refresh-lock` (FR-011).
4. `SREM alkemio:sub:<sub> sid`.
5. RFC 7009 revoke of the captured refresh token (see C6).

Step ordering is load-bearing: the local teardown (2–4) completes before the
remote call (5), so a remote failure cannot leave the session alive (FR-013,
§5.6.5 of the design input — *prefer local certainty over remote completeness*).

### C5 — Idempotency and stale members

| Payload state at step 1 | Outcome | Tombstone written? | Pruned from index? |
|---|---|---|---|
| live | `revoked` | yes | yes |
| already has `terminated_at` | `already_terminated` | no | yes |
| key absent | `already_absent` | **no** | yes |

FR-015. Re-running the whole call is a success no-op. `already_absent` writes no
tombstone deliberately: there is nothing left to tombstone, and inventing one
would resurrect a 401 for a session that had already cleanly ended.

### C6 — Remote token revocation

```
GIVEN  a captured non-empty refresh_token
AND    issuer metadata advertising revocation_endpoint
WHEN   the remote leg runs
THEN   POST <revocation_endpoint>
         Content-Type: application/x-www-form-urlencoded
         body: token=<refresh_token>&token_type_hint=refresh_token&client_id=<web_client_id>
         signal: AbortSignal.timeout(3000)
AND    2xx  → tokenRevocation: 'revoked'
AND    else → tokenRevocation: 'failed'  (audited, logged, does NOT undo C4)
```

```
GIVEN  no refresh token, or discovery has not completed,
       or metadata advertises no revocation_endpoint
THEN   tokenRevocation: 'skipped' | 'failed' as appropriate
AND    the local teardown still stands
```

FR-012, FR-012a, FR-013. **No retry. No circuit breaker.** Rationale is recorded
in FR-012a and research R3 — required by constitution principle 8.

### C7 — `exceptSid`

```
GIVEN  opts.exceptSid === 'sid-keep'
AND    the index holds ['sid-keep', 'sid-drop']
THEN   'sid-keep' → outcome 'skipped_excepted', untouched in Redis, still in the index
AND    'sid-drop' → outcome 'revoked'
```

FR-008. This is the ASVS V3.3.2 requirement ("terminate all *other* sessions")
that client-web#10070 and server#6073 both need. Reserved and tested now so
neither has to change this file.

### C8 — Partial failure is a result, not an exception

```
GIVEN  three members where the middle one's markTerminated throws
THEN   entries has 3 rows: ['revoked', 'failed', 'revoked']
AND    failedCount === 1, complete === false
AND    the method RESOLVES — it does not reject
```

FR-014.

### C9 — The only throwing condition

`revokeAllForSub` rejects **only** when the index read itself fails (Redis
unreachable). That is categorically different — "we do not know what to revoke"
— and every caller must trap it. `deleteUser` does (FR-027).

### C10 — No token material escapes

```
GIVEN  any outcome, success or failure
THEN   no field of the returned report, no audit record, and no log line
       contains access_token, id_token, refresh_token, a cookie value,
       or the contents of request_context_cache
```

FR-021, SC-006. `failureReason` passes through a redaction helper. Asserted by a
dedicated spec that serialises everything emitted during a forced-failure run and
greps it for the fixture token values.

### C11 — Audit trail

Emitted through the existing `emitAudit`
([`audit-events.md`](./audit-events.md)):

1. `session.revocation.initiated` — once, **before** any teardown (FR-018).
2. `session.revoked` — once per session, `outcome: success | failure`.
3. `session.revocation.completed` — once, summarising.

Audit-before-side-effect keeps the evidence if the process dies mid-teardown
(A.5.28 / trap 5).

---

## Consumer compatibility matrix

| Consumer | Call | Needs beyond this contract |
|---|---|---|
| server#6315 (this) | `revokeAllForSub(user.authenticationID, 'account_deleted')` | — |
| client-web#10070 | `revokeAllForSub(sub, 'password_changed', { exceptSid })` | **nothing** — C7 |
| admin email change (§3 defect) | `revokeAllForSub(sub, 'email_changed')` | **nothing** |
| server#6073 `scope=others` | `revokeAllForSub(sub, 'user_revoked', { exceptSid })` | **nothing** — C7 |
| server#6073 `scope=all` | `revokeAllForSub(sub, 'user_revoked')` | **nothing** |
| server#6073 list-sessions UI | — | a separate read method; C10 already guarantees it can expose no tokens |

## Non-goals

- Enumerating sessions for display. server#6073 will add a read method; this
  contract only guarantees a read method can be added **without** it being able
  to leak token material.
- Revoking access tokens. They are short-lived (~10 min) and RFC 7009 revocation
  of the refresh token stops renewal, which is the property that matters.
- Cross-relying-party propagation. That is OIDC Back-Channel Logout — recorded as
  the target architecture, out of scope here.
