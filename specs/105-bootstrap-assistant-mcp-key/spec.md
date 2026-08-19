# Feature Specification: Bootstrap the virtual-assistant MCP API key

**Feature Branch**: `feat/1937-bootstrap-assistant-mcp-key`

**Created**: 2026-06-26

**Status**: Backfilled (retroactive) — shipped, then spec'd (PR #6203, issue #1937)

**Input**: "Delegated MCP (the Web AI Assistant) authenticates with the `virtual-assistant` actor's
`mcp_api_key` as its trust anchor, but nothing creates that key — a fresh deploy leaves the
`mcp_api_key` table empty, so every delegated MCP session is refused (`capability_unavailable`)
until the key is provisioned by hand on every cluster."

> **⚠️ Retroactive backfill.** This spec was written **after** the fix shipped, to record the source
> of truth. It is single-repo (server only) — it ships as one PR, so it is **not** a workspace
> vertical spec. The implementation is PR #6203 (`bootstrap.service.ts`, `mcp-api-key.service.ts`,
> `bootstrap.module.ts`). Parent context: the `004-web-ai-assistant` epic (#1900), server T027/T040.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A fresh deploy yields a working delegated MCP session (Priority: P1)

An operator deploys the server + assistant-service to a new cluster with a real
`ASSISTANT_MCP_API_KEY` secret set. The assistant works immediately — it can call MCP tools and read
its budget — **without anyone touching the database or running manual key-provisioning steps**.

**Why this priority**: This is the entire point. Without it the assistant is dead on arrival in
every environment (the `mcp_api_key` table is empty on a fresh deploy), and the failure is silent —
it surfaces only as `capability_unavailable` in the assistant UI. acc/prod hit the same wall.

**Independent Test**: On a clean DB with `ASSISTANT_MCP_API_KEY` set, start the server (bootstrap
runs), then have the assistant-service open a delegated MCP session with that same key as its bearer
— the session authenticates and tools/budget resolve, with no manual DB or secret surgery.

**Acceptance Scenarios**:

1. **Given** an empty `mcp_api_key` table and `ASSISTANT_MCP_API_KEY` set, **When** the server
   bootstraps, **Then** an active `mcp_api_key` row exists whose `keyHash = SHA-256(ASSISTANT_MCP_API_KEY)`,
   bound to the `virtual-assistant` actor, scoped `[read, tools]`.
2. **Given** that row exists, **When** the assistant-service presents `ASSISTANT_MCP_API_KEY` as its
   delegation bearer, **Then** the MCP host validates it and the delegated session succeeds.

---

### User Story 2 - Re-running bootstrap is safe (idempotent) (Priority: P2)

The server restarts (or redeploys) repeatedly. Each bootstrap run leaves the key exactly as it was
— no duplicate rows, no unexpected rotation, no churn.

**Why this priority**: Bootstrap runs on **every** startup. A non-idempotent step would multiply
rows or rotate the live key on each restart, breaking the running assistant.

**Independent Test**: Run bootstrap twice against the same secret; assert the second run performs no
write and the single active row is unchanged.

**Acceptance Scenarios**:

1. **Given** the key row already matches the secret, **When** bootstrap runs again, **Then** it is a
   no-op (no insert, no update).
2. **Given** a matching row exists but is inactive, **When** bootstrap runs, **Then** it is
   reactivated (not duplicated).

---

### User Story 3 - A rotated secret cleanly supersedes the old key (Priority: P3)

An operator rotates `ASSISTANT_MCP_API_KEY` to a new value. After the next bootstrap, only the new
key authenticates; the old key no longer does.

**Why this priority**: Secret rotation must not leave a stale, still-valid credential active
(security), nor require manual cleanup.

**Independent Test**: With an existing active `virtual-assistant` key, bootstrap with a different
secret value; assert the old row is deactivated and a new active row (the new hash) exists.

**Acceptance Scenarios**:

1. **Given** an active `virtual-assistant` key with hash A, **When** bootstrap runs with a secret
   hashing to B (≠ A), **Then** the hash-A row is deactivated and a hash-B row is active.

---

### Edge Cases

- **Secret unset / placeholder-empty**: bootstrap logs a warning and **skips** — it does **not** fail
  the whole bootstrap (the rest of the platform still comes up; only delegated MCP is unavailable).
- **`virtual-assistant` actor absent** (e.g. migrations not yet run): log a warning and skip — never
  throw. (In practice the actor is created by migration `1780483789227/228`, which run before
  bootstrap.)
- **Pre-existing key bound to a *user*** with the same hash (shouldn't happen): the ensure re-asserts
  actor-binding (clearing `userId`) so the trust-anchor invariant holds.
- **Stale scopes on a reactivated key**: reactivation refreshes the row's `scopes` to the requested
  set, so a re-enabled key never returns with outdated permissions.
- **Multiple active keys for the actor** after a rotation: all whose hash ≠ current are deactivated.
- **Concurrent bootstraps (multi-replica)**: `keyHash` is unique, so two replicas racing to INSERT
  could collide. The duplicate-key error is caught and the row re-read + re-asserted — bootstrap
  never aborts on the race.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On startup the server MUST ensure an `mcp_api_key` row exists for the `virtual-assistant`
  actor whose `keyHash` is the SHA-256 of the configured `ASSISTANT_MCP_API_KEY`, active, scoped
  `[read, tools]` — created if absent, left unchanged if already correct.
- **FR-002**: The key MUST be **actor-bound** to `virtual-assistant` only (never user-bound),
  preserving the delegation trust-anchor invariant (server T040): a user-bound or unbound key must
  not be able to delegate.
- **FR-003**: The server MUST derive the row from the **shared secret** the assistant-service already
  uses as its bearer; it MUST **never generate** a key the asvc would then need delivered to it, and
  MUST **never** write a plaintext credential back to any store. The server only ever reads the
  secret to compute its hash.
- **FR-004**: The step MUST be **idempotent** — re-running bootstrap performs no write when the row
  already matches (binding, active, **and scopes**); a matching-but-inactive or stale-scoped row is
  reactivated/refreshed rather than duplicated; and a concurrent-insert race on the unique `keyHash`
  MUST be caught and re-asserted rather than aborting bootstrap.
- **FR-005**: On **secret rotation** (the configured value changes), the step MUST deactivate any
  other active key bound to the `virtual-assistant` actor, so a superseded secret stops
  authenticating.
- **FR-006**: The step MUST be **best-effort within bootstrap**: a missing secret or a missing
  `virtual-assistant` actor MUST be logged and skipped, and MUST NOT fail the overall bootstrap.

### Key Entities *(include if feature involves data)*

- **`mcp_api_key`** (existing table): the credential the MCP host validates. Stores `keyHash`
  (SHA-256, never the plaintext), an exclusive `userId` **xor** `actorId` binding, `scopes`,
  `isActive`. This feature ensures one **actor-bound** row for `virtual-assistant`.
- **`virtual-assistant` actor** (existing, migration-seeded singleton): the delegation trust anchor
  the key binds to; resolved by its stable `nameID`.
- **`ASSISTANT_MCP_API_KEY`** (existing shared secret): one value in `alkemio-secrets`, already
  injected into **both** the assistant-service (as its bearer) and the server (via
  `envFrom: alkemio-secrets`). The single source of truth — no new secret or manifest is introduced.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A fresh deploy of server + assistant-service yields a working delegated MCP session
  with **zero** manual DB or secret surgery.
- **SC-002**: Re-running bootstrap (every restart) produces **no** duplicate key rows and **no**
  unexpected rotation.
- **SC-003**: The provisioned key is bound to the `virtual-assistant` actor **only** (a user-bound or
  unbound key still cannot delegate).
- **SC-004**: Rotating `ASSISTANT_MCP_API_KEY` and redeploying leaves exactly **one** active
  `virtual-assistant` key — the new one; the old one no longer authenticates.

## Assumptions

- The `virtual-assistant` actor exists by bootstrap time (created by migration, which runs first).
- `ASSISTANT_MCP_API_KEY` is set to a real value per cluster by ops/CI (the committed value is a
  non-production placeholder); the asvc and server read the **same** secret.
- The server already receives the secret via `envFrom: alkemio-secrets` — confirmed, so no
  deployment/manifest change is required.
- SHA-256 of the plaintext is the validation hash (matches the existing `validateApiKey` path).
