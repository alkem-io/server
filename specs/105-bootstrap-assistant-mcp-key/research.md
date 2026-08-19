# Phase 0 Research: Bootstrap the virtual-assistant MCP API key

**Feature**: `105-bootstrap-assistant-mcp-key` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

> Retroactive backfill — the decisions below are **observed from the shipped code** (PR #6203) and
> the analysis in issue #1937, recorded as the Phase 0 rationale.

## Unknowns from the spec → resolved

| Unknown | Resolution |
|---|---|
| How does the asvc's plaintext key reach the server without distributing a secret? | It doesn't need to — the **plaintext is the input**. Both sides read the same `ASSISTANT_MCP_API_KEY`; the server only derives `SHA-256(it)` (R1). |
| Where does the ensure step run? | The existing `BootstrapService`, which already runs idempotent `ensureX()` steps every startup, after migrations (R2). |
| How is the `virtual-assistant` actor resolved? | `VirtualAssistantService.getSingletonOrFail()` (by stable nameID) — the actor is migration-seeded (R2). |
| How to avoid duplicate / stale keys across restarts and rotation? | Key on `keyHash`: create-if-absent, no-op if present, reactivate-if-inactive, deactivate other active actor keys on rotation (R3). |

## R1 — Ensure-FROM-env, not server-generates

**Decision**: The server reads `ASSISTANT_MCP_API_KEY` and ensures a row with `keyHash = SHA-256(it)`.
It never generates a key.

**Alternatives considered**:
- **Server generates the key on bootstrap** → it holds a plaintext the asvc needs, so it must
  *write the plaintext into the secret store*. Needs secret-write privilege, is racy across replicas,
  and breaks the committed-secret model. **Rejected.**
- **GraphQL/REST mutation to create the key** → the existing `POST /api-keys` endpoint binds to the
  *authenticated caller's* actor and the `virtual-assistant` is a service actor with no login →
  cannot create a virtual-assistant-bound key, and still needs a manual caller. **Insufficient.**
- **Seed via DB migration** → migrations can't see the runtime secret and shouldn't carry
  credentials; the secret may differ per cluster and rotate. **Rejected.**

**Rationale**: ensure-from-env keeps the secret as the single source of truth, needs zero new
privilege, and is naturally idempotent.

## R2 — Run in `BootstrapService`, after migrations

**Decision**: Add `ensureAssistantMcpApiKey()` to `BootstrapService.bootstrap()`.

**Rationale**: bootstrap already does idempotent platform seeding on every startup and runs **after**
migrations — so the `virtual-assistant` actor (seeded by migration `1780483789227/228`) reliably
exists. A migration would run too early and can't read the secret.

## R3 — Idempotency & rotation keyed on `keyHash`

**Decision**: `ensureActorKeyFromPlaintext`: (a) deactivate any active actor-bound key whose hash ≠
current (rotation); (b) find by `keyHash` → reactivate/rebind if found, else create.

**Rationale**: deterministic and write-free in the steady state (the common restart case); a rotated
secret cleanly supersedes the old key without manual cleanup or leaving a stale valid credential.

## R4 — Best-effort within bootstrap (skip, don't fail)

**Decision**: missing secret or missing actor → log a warning and return; never throw.

**Rationale**: the platform must still boot if the assistant isn't configured in an env; only
delegated MCP is unavailable. Mirrors the asvc's own fail-soft posture (`capability_unavailable`).

## R5 — Lightweight DI (avoid `McpServerModule`)

**Decision**: `BootstrapModule` provides `McpApiKeyService` directly (+ `TypeOrmModule.forFeature([McpApiKey])`)
and imports `VirtualAssistantModule`.

**Rationale**: `McpApiKeyService` is stateless (repo + logger). Importing the full `McpServerModule`
into `BootstrapModule` risks a circular dependency and pulls in unneeded providers.

## Wiring confirmation (no infra change)

Confirmed the server deployment already does `envFrom: secretRef: alkemio-secrets`, and
`ASSISTANT_MCP_API_KEY` already exists in that secret (the asvc consumes it). ⇒ the server already
receives the value as an env var; no manifest/secret change is required.
