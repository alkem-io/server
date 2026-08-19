# Quickstart / Validation: Bootstrap the virtual-assistant MCP API key

**Feature**: `105-bootstrap-assistant-mcp-key` | **Spec**: [spec.md](./spec.md)

How to validate the feature against its success criteria. Each scenario maps to a User Story.

## Prerequisites

- A server DB with migrations applied (so the `virtual-assistant` actor exists).
- `ASSISTANT_MCP_API_KEY` set to a real value (`mcp_<…>`) in the env both the server and asvc read
  (`alkemio-secrets`).

## Scenario A — Fresh deploy works (US1 / SC-001)

1. Start from an **empty** `mcp_api_key` table.
2. Start the server (bootstrap runs).
3. Assert the row exists and is correct:
   ```sql
   SELECT "actorId", "userId", "isActive", scopes
   FROM mcp_api_key
   WHERE "keyHash" = encode(digest(:assistant_mcp_api_key, 'sha256'), 'hex');
   -- expect: actorId = <virtual-assistant>, userId NULL, isActive true, scopes [{operations:[read,tools]}]
   ```
4. From the assistant-service (or a raw MCP client) open a **delegated** session with that same key
   as `Authorization: Bearer …` + `X-Alkemio-On-Behalf-Of: <user>` → the session authenticates and a
   tool call / budget read succeeds (no `capability_unavailable`).

✅ **Pass**: working delegated MCP with **zero** manual DB/secret steps.

## Scenario B — Idempotent restart (US2 / SC-002)

1. With the row already present, restart the server (bootstrap runs again).
2. Assert there is still exactly **one** active `virtual-assistant` key and its `id`/`createdDate`
   are unchanged (no insert, no churn).

✅ **Pass**: re-running bootstrap is a no-op.

## Scenario C — Rotation (US3 / SC-004)

1. Note the current active key's `id`.
2. Change `ASSISTANT_MCP_API_KEY` to a new value; restart the server.
3. Assert: the old `id` row is now `isActive = false`, and a new active row exists whose `keyHash =
   SHA-256(new value)`.
4. A bearer using the **old** secret no longer authenticates; the new one does.

✅ **Pass**: exactly one active key (the new one); the old credential is retired.

## Scenario D — Misconfiguration is non-fatal (Edge / FR-006)

1. Unset `ASSISTANT_MCP_API_KEY` and start the server.
2. Assert the server **still boots**; the log shows a warning that the virtual-assistant MCP key
   bootstrap was skipped; only delegated MCP is unavailable.

✅ **Pass**: bootstrap never fails on a missing secret/actor.

## Automated coverage

- `src/services/mcp-server/auth/mcp-api-key.service.spec.ts` — unit tests for the ensure logic
  (create / idempotent / reactivate / rotation) back Scenarios A–C.
- `src/core/bootstrap/bootstrap.service.spec.ts` — existing suite stays green (auto-mocks the two new
  deps), guarding the wiring (Scenario D's skip path is the warn-and-return branch).
