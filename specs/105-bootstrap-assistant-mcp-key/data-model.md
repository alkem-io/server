# Phase 1 Data Model: Bootstrap the virtual-assistant MCP API key

**Feature**: `105-bootstrap-assistant-mcp-key` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

## No schema change

This feature introduces **no migration, no new table or column, and no new GraphQL type**. It only
**ensures one row** in the existing `mcp_api_key` table at bootstrap. The entities below already
exist; they are described for the invariants this feature relies on.

## Entities

### `mcp_api_key` (existing table — the credential validated by the MCP host)

| Field | Type | Notes (relevant to this feature) |
|---|---|---|
| `id` | uuid | PK |
| `keyHash` | string | **SHA-256 hex** of the plaintext. The server stores this; never the plaintext. Lookup key. |
| `userId` | uuid? | Exactly **one of** `userId` / `actorId`. This feature leaves it null. |
| `actorId` | uuid? | Bound to the **`virtual-assistant`** actor for the delegation trust anchor (T040). |
| `scopes` | jsonb | `[{ operations: string[] }]`. This feature sets `[{ operations: ['read', 'tools'] }]`. |
| `isActive` | boolean | Only active keys validate. Rotation deactivates superseded rows. |
| `expiresAt` | timestamptz? | Unused here (the bootstrap key does not expire). |
| `createdDate` | timestamptz | — |

**Invariant (T040)**: a key that can **delegate** MUST be `actorId`-bound to `virtual-assistant`
(`userId` null). A user-bound or unbound key cannot delegate. This feature only ever writes an
actor-bound row.

### `virtual_assistant` actor (existing — migration-seeded singleton)

The platform `virtual-assistant` actor (resolved by stable `nameID`, migrations
`1780483789227-AddVirtualAssistantActorType` / `1780483789228-VirtualAssistant`). The trust anchor
the key binds to. This feature reads it (`getSingletonOrFail`); it does not create or modify it.

## Non-persisted configuration

### `ASSISTANT_MCP_API_KEY` (shared secret — not a DB entity)

One value in `alkemio-secrets`, injected into **both** the assistant-service (its delegation bearer)
and the server (via `envFrom: alkemio-secrets`). The single source of truth. The server reads it at
bootstrap **only** to compute `SHA-256` — it is never persisted in plaintext.

## State transitions (the bootstrap ensure)

```
ASSISTANT_MCP_API_KEY (env)
   │  h = SHA-256(plaintext)
   ▼
[for each active key bound to virtual-assistant with keyHash ≠ h] → isActive = false   (rotation)
   │
   ▼
findOne(keyHash = h):
   ├─ found, active, actor-bound   → no-op
   ├─ found, inactive/mis-bound    → isActive = true, actorId = virtual-assistant
   └─ not found                    → INSERT { keyHash: h, actorId, scopes:[{operations:[read,tools]}], isActive }
```
