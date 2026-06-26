# Contract: Shared MCP-key secret ↔ ensured key row

**Parties**: ops/CI (sets the secret) · `server` (`BootstrapService.ensureAssistantMcpApiKey` →
`McpApiKeyService.ensureActorKeyFromPlaintext`) · `assistant-service` (sends the bearer).

## The shared value

`ASSISTANT_MCP_API_KEY` — a single secret in `alkemio-secrets`, format `mcp_<base64url(32 bytes)>`.

- **ops/CI** MUST set a real value per cluster (the committed value is a non-production placeholder).
- **server** receives it via `envFrom: secretRef: alkemio-secrets` (already wired — no manifest
  change) and reads it at bootstrap **only** to compute `SHA-256`.
- **assistant-service** receives the **same** secret and sends it verbatim as
  `Authorization: Bearer <ASSISTANT_MCP_API_KEY>` for delegated MCP (`X-Alkemio-On-Behalf-Of` carries
  the user). It is never logged or echoed to the browser.

## The ensured row (server side)

After bootstrap, the `mcp_api_key` table MUST contain exactly one **active** row satisfying:

| Field | Value |
|---|---|
| `keyHash` | `SHA-256(ASSISTANT_MCP_API_KEY)` (hex) |
| `actorId` | the `virtual-assistant` singleton actor |
| `userId` | `null` |
| `scopes` | `[{ operations: ['read', 'tools'] }]` |
| `isActive` | `true` |

## Ensure operation semantics (`ensureActorKeyFromPlaintext(actorId, plaintext, scopes)`)

- **Input**: an actor id, a **known plaintext** (not generated here), the scopes. Output: the active
  `McpApiKey`.
- **Idempotent**: the keyHash lookup makes a steady-state run a **no-op** (no insert/update).
- **Reactivate**: a matching-but-inactive row is reactivated and re-bound, never duplicated.
- **Rotation**: any *other* active key bound to the same actor (different hash) is deactivated, so a
  superseded secret stops authenticating.
- **Never** generates a key, **never** writes a plaintext back to any store.

## Failure modes (best-effort within bootstrap)

| Condition | Behavior |
|---|---|
| `ASSISTANT_MCP_API_KEY` unset/empty | log a warning, **skip** (bootstrap continues); delegated MCP unavailable until set |
| `virtual-assistant` actor not found | log a warning, **skip**; never throws |
| DB error during ensure | propagates to bootstrap's try/catch (a genuine infra failure — not silently swallowed) |

## Verification (server↔asvc end-to-end)

With the row ensured and the asvc presenting the same secret as bearer, the `McpAuthGuard` /
`mcp-delegation` strategy validates `SHA-256(bearer) == keyHash` for an active, actor-bound key →
delegated session authenticates; tools + the budget resource resolve.
