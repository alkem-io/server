# Data Model: Identity Resolve Agent ID

## Entities

### User identity
- **Description**: Represents a person in the platform context, resolved by `/rest/internal/identity/resolve` as `userId`.
- **Key fields**:
  - `userId` (string, required): Platform-wide unique identifier for a user.

### Agent identity
- **Description**: Represents the corresponding agent identifier used by internal services to act on behalf of the same person.
- **Key fields**:
  - `agentId` (string): Unique identifier of the agent linked to a given `userId`.

## Relationships

- A `User identity` MAY have zero or one associated `Agent identity`.
- An `Agent identity` MUST correspond to exactly one `User identity` in this context.

## Validation Rules

- When an agent exists for a given user, both `userId` and `agentId` MUST be returned together for a successful resolution.
- When no agent exists for a given user, the service MUST emit the `NO_AGENT_FOR_USER` error and omit identity identifiers from the payload.
- Requests for identities that do not exist or are deactivated MUST continue to follow the existing error semantics of `/rest/internal/identity/resolve`.

## State Considerations

- This feature does not introduce new persistent state; it only exposes an additional identifier derived from existing identity mappings.
