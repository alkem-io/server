# Quickstart — Session Revocation Cascade

**Feature**: `specs/107-oidc-session-revocation`
**Branch**: `story/6315-oidc-session-revocation-cascade`

How to run, exercise and manually verify this change. Assumes the standard local
setup from the repo `CLAUDE.md`.

---

## 1. Fast loop (no services needed)

Everything security-critical in this feature is covered by unit and
service-level specs that mock Redis, Kratos and `fetch`. No Docker required.

```bash
cd <repository-root>
pnpm install

# The feature's own specs
pnpm test -- src/core/auth/oidc/session-index.redis.spec.ts
pnpm test -- src/core/auth/oidc/revocation/
pnpm test -- src/domain/community/user/user.service.delete.spec.ts
pnpm test -- src/services/api/me/

# Everything
pnpm test:ci:no:coverage
```

---

## 2. Exit gates (all must pass before the PR)

```bash
pnpm lint                  # tsc --noEmit + biome check src/
pnpm build                 # nest build
pnpm test:ci:no:coverage   # vitest run
pnpm run schema:print && pnpm run schema:sort && pnpm run schema:diff
```

`schema:diff` must report **zero** breaking changes. This feature is supposed to
have no schema delta at all; the gate is there to prove it rather than assume it.

---

## 3. Full local stack

```bash
pnpm run start:services    # Postgres 17.5, RabbitMQ, Redis, Kratos, Hydra, Oathkeeper
pnpm run migration:run     # no new migration in this feature — run for a clean baseline
pnpm start:dev
```

---

## 4. Manual verification — the #6315 reproduction

This is the acceptance walk from the issue. Two terminals: a browser and
`redis-cli`.

### 4.1 Sign in and locate the session

1. Sign in at the SPA as a disposable user.
2. Confirm the platform believes you: `GET /api/auth/oidc/id-token-hint` → **200**.
3. Find the Kratos identity UUID (this is both `user.authenticationID` and
   `session.sub`):

```bash
psql "$DATABASE_URL" -c \
  "select id, \"authenticationID\" from \"user\" where \"nameID\" = '<the-user>';"
```

4. Confirm the index exists — **this is the new key family**:

```bash
redis-cli SMEMBERS alkemio:sub:<authenticationID>
# → 1) "<sid>"
redis-cli TTL alkemio:sub:<authenticationID>
# → a positive number ≤ the absolute ceiling.  -1 here is a BUG (invariant I1).
```

> If the set is empty because the session predates this build, just reload the
> app once. The self-healing write (FR-002a) indexes it on the next
> authenticated request — which is itself worth verifying, since it is the whole
> deploy-day story.

### 4.2 Sign in on a second device

Use a private window. Confirm `SMEMBERS` now returns **two** members.

### 4.3 Delete the user

Via the admin UI, or:

```graphql
mutation { deleteUser(deleteData: { ID: "<user-uuid>" }) { id } }
```

Note: revocation is unconditional — FR-025 means it happens whatever
`deleteIdentity` says, so either value exercises the cascade.

Beware the default: the schema declares `deleteIdentity: Boolean = true`, so
**omitting** it deletes the Kratos identity too. To keep the identity alive —
which you need for the "not a permanent ban" check in §4.6 — pass it explicitly:

```graphql
mutation { deleteUser(deleteData: { ID: "<user-uuid>", deleteIdentity: false }) { id } }
```

### 4.4 Assert — this is the actual test

```bash
# a) The index is gone (or empty)
redis-cli SMEMBERS alkemio:sub:<authenticationID>
# → (empty array)

# b) Each session is a tombstone, not a live payload, and not deleted
redis-cli GET alkemio:sid:<sid> | jq '{terminated_at, terminated_reason, cookie, refresh_token}'
# → terminated_at: <epoch ms>
#    terminated_reason: "account_deleted"
#    refresh_token: ""
#    cookie: {...}                    ← MUST be present, see below

# `cookie` is not decoration. express-session inflates this payload on every
# request BEFORE any strategy runs, and dereferences `cookie.expires`. A
# tombstone without it throws inside the middleware — every route 500s
# (including /login and /logout) instead of returning the 401 below.
#
# `request_context_cache` is NOT a useful assertion here: nothing in the code
# ever populates it, so it reads `null` on live sessions too. Erasure of the
# display name and email comes from deleting the DB row, not from the tombstone.

# c) The refresh mutex is gone
redis-cli EXISTS alkemio:sid:<sid>:refresh-lock
# → 0
```

In the browser, on **both** devices, reload:

- Any `/api/private/graphql` call → **401 UNAUTHENTICATED**, not an anonymous 200.
  This is the *only* probe that proves the fix — see the warning below.
- The SPA renders **signed-out**, not "signed in with no account".

> Do **not** use `GET /api/auth/oidc/id-token-hint` as the pass signal. It
> returns 401 for an anonymous caller as well, so it cannot tell a revoked
> session (the fix) from a destroyed one (the bug). Compare instead:
> a live session answers `me { id }` with `me-<actorId>`, a destroyed/expired one
> answers **200** with `me-`, and a revoked one **401 UNAUTHENTICATED**.

The 401 rather than a silent anonymous 200 is the entire behavioural difference
between `markTerminated` and `destroy`, and it is what makes the client flip
without any client change (WS4 is empty).

### 4.5 Audit trail

```bash
# tail the server's stdout
… | jq -c 'select(.event_type | startswith("session.revocation") or . == "session.revoked")'
```

Expect `session.revocation.initiated` → two × `session.revoked` →
`session.revocation.completed`. Confirm no field of any record contains a token
value.

### 4.6 The marker is not a permanent ban on the subject

Only meaningful if you deleted with `deleteIdentity: false` (§4.3), so the Kratos
identity is still there to log in with. Sign in again as the same person.

Expect the login to **succeed**. The marker is still in Redis, but it stores a
`revoked_at` rather than a flag, and this session's `created_at` is later — so it
is unaffected:

```bash
redis-cli GET alkemio:subrevoked:<authenticationID>   # still set
redis-cli GET alkemio:sid:<new-sid> | jq .created_at  # > the value above
```

A 401 loop here would mean the comparison is inverted, locking every
deleted-then-recreated subject out for the marker's full 30-day TTL.

---

## 5. Manual verification — graceful degradation (US2)

Simulate the orphaned state **without** deleting anyone: sign in, then delete
just the user row's actor while holding the session — or simply issue the query
below while signed out, since the same guards fire for anonymous callers today.

```graphql
query { me { id
             notificationsUnreadCount
             communityInvitationsCount
             communityInvitations(states: []) { id }
             communityApplications(states: []) { id }
             notifications { total inAppNotifications { id } pageInfo { hasNextPage } }
             conversations { conversations { id } } } }
```

**Before**: `BAD_USER_INPUT` — "Unable to retrieve applications as no userID
provided", plus a nulled-out `me`.

**After**: no `errors` key at all; `me.id === "me-"`; every count `0`; every list
`[]`; `notifications.total` `0`. Seven warn lines in the server log.

---

## 6. Failure-path checks worth doing by hand

| Scenario | How | Expected |
|---|---|---|
| Redis down at deletion — **BLOCKED**, see below | `docker stop <redis>` then delete a user | Deletion **succeeds**; `session.revoked`/`completed` audited `failure`; error log |
| Hydra down | stop Hydra, keep Redis | Deletion succeeds; tombstone **still written**; `error_code: token_revocation_failed` |
| User never linked to Kratos | delete a user with `authenticationID IS NULL` | Deletion succeeds; **no** audit record, **no** error |
| Repeat revocation | delete, then re-run revocation for the same sub | All entries `already_absent` / `already_terminated`; `complete: true` |

Together these are FR-013, FR-015, FR-017, FR-027 and SC-004 — the properties
that stop a security control from becoming an availability incident.

> **The Redis-down row cannot be run today** (server#6330). Stopping Redis kills
> the whole Node process — an unhandled `error` event from the legacy
> `redis@3.1.2` client behind `cache-manager-redis-store`, unrelated to this
> feature's `ioredis` client. There is no surviving process for the deletion to
> succeed in. FR-013's local guarantee is still covered at unit level in
> `user.service.delete.spec.ts`; re-run this row by hand once #6330 lands.

---

## 7. Where things live

| Concern | File |
|---|---|
| Index primitives | `src/core/auth/oidc/session-index.redis.ts` |
| The revocation capability | `src/core/auth/oidc/revocation/oidc-session-revocation.service.ts` |
| Type vocabulary | `src/core/auth/oidc/revocation/session-revocation.types.ts` |
| DI foundation | `src/core/auth/oidc/oidc-core.module.ts` |
| Index population / pruning | `src/core/auth/oidc/oidc.controller.ts`, `strategies/cookie-session.strategy.ts` |
| The deletion cascade | `src/domain/community/user/user.service.ts` (`deleteUser`) |
| Degradation | `src/services/api/me/me.resolver.fields.ts`, `me.conversations.resolver.fields.ts` |
| Audit types | `src/core/auth/oidc/audit.ts` |
