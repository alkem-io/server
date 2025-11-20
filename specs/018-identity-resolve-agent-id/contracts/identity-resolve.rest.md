# Contract: /rest/internal/identity/resolve

## Endpoint

- **Method**: POST (existing behaviour)
- **Path**: `/rest/internal/identity/resolve`
- **Description**: Resolves an internal identity and returns both `userId` and, when available, the corresponding `agentId`.

## Request

- **Body**: Uses the existing request format for `/rest/internal/identity/resolve` (no change introduced by this feature).

## Successful Response (200)

```json
{
  "userId": "<string>",
  "agentId": "<string>"
}
```

- `userId`: Platform-wide unique identifier for the resolved user.
- `agentId`: Agent identifier linked to the user; present only when an agent exists for the user.

## Error Responses

- Reuses existing error status codes and formats for `/rest/internal/identity/resolve` (e.g., authorization failures, unknown identity).
- **No agent exists for user**: the endpoint MUST return a non-success status code (for example, `404`) with an error body that clearly indicates `NO_AGENT_FOR_USER`, and MUST NOT include `userId` or `agentId` fields.
