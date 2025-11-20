# Feature Specification: Identity Resolve Agent ID

**Feature Branch**: `018-identity-resolve-agent-id`
**Created**: 2025-11-20
**Status**: Implemented (2025-11-20)
**Summary**: `/rest/internal/identity/resolve` now returns both `userId` and `agentId` for users that have an agent linked. When no agent exists, the endpoint responds with a `NO_AGENT_FOR_USER` error and omits identity identifiers.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Resolve identity returns user and agent IDs (Priority: P1)

An internal service calls the `/rest/internal/identity/resolve` endpoint with a valid user token or identifier and receives both the platform `userId` and the corresponding `agentId` in the response.

**Why this priority**: Downstream internal services need a single call to obtain both identifiers in order to act on behalf of the same person in different contexts, reducing coupling and avoiding duplicate lookup logic.

**Independent Test**: Call `/rest/internal/identity/resolve` for a user that has an associated agent and verify that both `userId` and `agentId` are returned and refer to the same underlying person.

**Acceptance Scenarios**:

1. **Given** a user with an associated agent, **When** an authorized internal caller invokes `/rest/internal/identity/resolve`, **Then** the response includes both identifiers populated with consistent values.
2. **Given** an internal client that previously made multiple calls, **When** it consumes the updated response shape, **Then** it can obtain both identifiers in a single request without additional lookups.

---

### User Story 2 - Behaviour when agent is missing (Priority: P2)

An internal service calls `/rest/internal/identity/resolve` for a valid user that does not have an associated agent and receives a clear error indicating that no agent mapping exists.

**Why this priority**: Consumers of the endpoint need an explicit failure signal when they depend on `agentId` but the underlying data model does not provide one, so they can handle or surface this case appropriately.

**Independent Test**: Call `/rest/internal/identity/resolve` for a user without an agent and verify that the endpoint responds with the `NO_AGENT_FOR_USER` error (404) and does not return `userId` or `agentId`.

**Acceptance Scenarios**:

1. **Given** a valid user without an associated agent, **When** an authorized internal caller invokes `/rest/internal/identity/resolve`, **Then** the endpoint returns the `NO_AGENT_FOR_USER` error and omits identity identifiers from the payload.

---

---

[User Story 3 omitted: authorization enhancements are covered by a separate proposal.]

### Edge Cases

- Downstream agent lookup failure: any failure to resolve an agent, including post-registration lookups, MUST result in the `NO_AGENT_FOR_USER` error with no identifiers returned.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `/rest/internal/identity/resolve` MUST return both `userId` and `agentId` whenever an agent exists for the resolved user.
- **FR-002**: The endpoint MUST preserve its ability to return `userId` for valid identities and remain backward-compatible for existing consumers.
- **FR-003**: When a user has no agent, the endpoint MUST respond with `NO_AGENT_FOR_USER` (404) and omit identity identifiers from the payload.
- **FR-004**: The existing authorization model for `/rest/internal/identity/resolve` MUST remain unchanged.

### Key Entities _(include if feature involves data)_

- **User identity**: Represents a person in the platform context and is currently resolved by `/rest/internal/identity/resolve` via `userId`.
- **Agent identity**: Represents the corresponding agent identifier used by internal services to act on behalf of the same person and is returned as `agentId`.

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Internal callers can retrieve both identifiers from a single call without additional lookups.
- **SC-002**: For identities with an agent, ≥99% of successful calls return matching `userId`/`agentId` pairs.
- **SC-003**: For identities without an agent, 100% of calls return the `NO_AGENT_FOR_USER` error and omit identifiers.
- **SC-004**: Authorization or validation failure rates on `/rest/internal/identity/resolve` do not increase versus baseline.
