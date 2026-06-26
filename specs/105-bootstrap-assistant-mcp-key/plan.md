# Implementation Plan: Bootstrap the virtual-assistant MCP API key

**Branch**: `feat/1937-bootstrap-assistant-mcp-key` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

> **⚠️ Retroactive backfill.** Observed from the shipped code (PR #6203), not designed ahead of it.

## Summary

A single idempotent step in the existing server `BootstrapService` ensures the `virtual-assistant`
actor's `mcp_api_key` exists, derived from the shared `ASSISTANT_MCP_API_KEY` secret. The plaintext
is the **input** (the asvc's bearer); the server stores only its SHA-256 hash. No key is generated,
no plaintext is written back, no manifest/secret is added.

## Technical Context

- **Language/stack**: TypeScript 5.3, NestJS 10, TypeORM 0.3, PostgreSQL 17.5.
- **Existing surfaces reused**: `BootstrapService` (`src/core/bootstrap`), `McpApiKeyService` +
  `mcp_api_key` entity (`src/services/mcp-server/auth`), `VirtualAssistantService.getSingletonOrFail()`
  (`src/domain/community/virtual-assistant`), the shared `ASSISTANT_MCP_API_KEY` secret.
- **No new**: table/migration, GraphQL type, queue, env var, or k8s manifest change.

## Wiring (the load-bearing fact)

The server deployment already does `envFrom: secretRef: alkemio-secrets`, and `ASSISTANT_MCP_API_KEY`
is already a key in that secret (the asvc consumes it as its bearer). ⇒ **the server already receives
the value as an env var** — it just never read it. So the only "wiring" is the server *reading*
`process.env.ASSISTANT_MCP_API_KEY`. Ops sets one value; both sides use it.

## Flow

```
alkemio-secrets: ASSISTANT_MCP_API_KEY = "mcp_<…>"   (one value, set once per cluster)
        ┌───────────────────────────────┴───────────────────────────────┐
        ▼                                                                ▼
assistant-service                                              server (envFrom)
sends Authorization: Bearer <plaintext>  ───────────▶  BootstrapService.ensureAssistantMcpApiKey():
                                                         • read ASSISTANT_MCP_API_KEY (skip+warn if unset)
                                                         • resolve virtual-assistant singleton (skip+warn if absent)
                                                         • McpApiKeyService.ensureActorKeyFromPlaintext(
                                                             actorId, plaintext, [{operations:[read,tools]}])
        │                                                        │  keyHash = SHA-256(plaintext)
        └──────────────▶  McpAuthGuard validates the bearer ◀────┘  bound to virtual-assistant, active
```

## Key decisions

- **D1 — ensure-from-env, not server-generates.** The plaintext is the input, so the server never
  holds a secret it must distribute. The alternative (server generates a key and writes the plaintext
  into the secret store) needs secret-write access and is racy across replicas — rejected.
- **D2 — idempotent + rotation-aware.** Keyed on `keyHash`: create-if-absent, no-op if present,
  reactivate a matching-but-inactive row, and deactivate other active actor-bound keys whose hash
  differs (so a rotated secret cleanly supersedes the old one).
- **D3 — best-effort within bootstrap.** Missing secret / missing actor → log + skip, never throw;
  the platform still boots, only delegated MCP is unavailable (mirrors the assistant's own
  fail-soft posture).
- **D4 — lightweight DI.** `McpApiKeyService` is stateless (repo + logger), so `BootstrapModule`
  **provides it directly** (+ `TypeOrmModule.forFeature([McpApiKey])`) rather than importing the
  heavy `McpServerModule` — avoids a circular-dependency risk.

## Files touched (PR #6203)

| File | Change |
|---|---|
| `src/services/mcp-server/auth/mcp-api-key.service.ts` | `+ ensureActorKeyFromPlaintext()` (idempotent, rotation-aware) |
| `src/core/bootstrap/bootstrap.service.ts` | `+ ensureAssistantMcpApiKey()` step in `bootstrap()` |
| `src/core/bootstrap/bootstrap.module.ts` | import `VirtualAssistantModule`; provide `McpApiKeyService` + register `McpApiKey` |
| `src/services/mcp-server/auth/mcp-api-key.service.spec.ts` | new unit tests (create / idempotent / reactivate / rotation) |

## Testing

- Unit: `mcp-api-key.service.spec.ts` covers create / idempotent no-op / reactivate / rotation.
- Regression: `bootstrap.service.spec.ts` auto-mocks the two new ctor deps (`useMocker`) — unchanged, green.
- The full server suite passes (run by the pre-commit hook).

## Follow-up (not in this PR — different repo)

Deploy-runbook line in the workspace `specs/004-web-ai-assistant/contracts/config-and-secrets.md`:
"set a real `ASSISTANT_MCP_API_KEY` per cluster; the server bootstraps the matching `mcp_api_key` row."
(Spec acceptance item AC-4 / SC docs.)
