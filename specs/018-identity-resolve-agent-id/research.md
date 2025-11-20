# Research: Identity Resolve Agent ID

## Decisions

### Representation when no agent is associated
- **Decision**: Emit a `NO_AGENT_FOR_USER` error (HTTP 404) and omit identity identifiers when no agent exists.
- **Rationale**: Prevents partial responses, keeps consumers from acting on incomplete data, and matches the implemented guard clauses that guarantee `agentId` is present whenever `userId` is returned.
- **Alternatives considered**:
  - Returning a nullable `agentId` field (rejected because several consumers depend on the agent to proceed; the error provides an explicit contract).
  - Returning a sentinel string such as `"none"` (rejected because it conflates identifier semantics with control values).

### Backward compatibility for existing consumers
- **Decision**: Extend the existing response with an additional `agentId` field without changing or removing current fields or success status codes.
- **Rationale**: Adding a new field is backward-compatible for JSON clients that ignore unknown fields, minimizing risk to existing internal integrations.
- **Alternatives considered**:
  - Versioning the endpoint or introducing a new path (rejected as unnecessary for a non-breaking additive change).

### Authorization behaviour
- **Decision**: Reuse the current authorization checks for `/rest/internal/identity/resolve` and ensure `agentId` is only returned when the caller passes existing internal auth gates.
- **Rationale**: The endpoint is already restricted to trusted internal callers; no new role model is introduced by returning `agentId`.
- **Alternatives considered**:
  - Introducing additional dedicated roles or scopes for `agentId` access (deferred unless later security review requires stricter separation).
