# Quickstart: Identity Resolve Agent ID

## Purpose

Extend `/rest/internal/identity/resolve` so internal callers receive both `userId` and `agentId` for a given identity, while keeping the change backward-compatible.

## Steps

1. **Checkout feature branch**
   - `git checkout 018-identity-resolve-agent-id`

2. **Run server locally**
   - Ensure dependencies and services are running as per `docs/Running.md`.

3. **Call the endpoint**
   - Send a request to `/rest/internal/identity/resolve` using the existing request format.

4. **Verify response**
   - For users with an associated agent, confirm both `userId` and `agentId` are present in the JSON response, matching the contract example.
   - For users without an associated agent, confirm the endpoint returns a clear non-success error (for example, `404` with code `NO_AGENT_FOR_USER`) and does not include `userId` or `agentId` fields in the payload.

5. **Run tests**
   - Execute relevant tests (e.g., `pnpm test:ci path/to/identity/resolve/spec`) to validate behaviour.
