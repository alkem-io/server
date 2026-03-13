# Data Model: Unit Tests for `src/services/auth-reset`

## No data model changes

This is a test-only task. No entity, migration, or schema changes are required.

## Entities referenced (read-only, for mocking)

| Entity | Fields used | Source |
|--------|------------|--------|
| `Account` | `id` | `@domain/space/account/account.entity` |
| `User` | `id` | `@domain/community/user/user.entity` |
| `Organization` | `id` | `@domain/community/organization` |

## Event payload structure

```typescript
interface AuthResetEventPayload {
  type: RESET_EVENT_TYPE;
  id: string;
  task: string;
}
```

## RESET_EVENT_TYPE enum values

- `AUTHORIZATION_RESET_ACCOUNT`
- `AUTHORIZATION_RESET_USER`
- `AUTHORIZATION_RESET_ORGANIZATION`
- `AUTHORIZATION_RESET_PLATFORM`
- `AUTHORIZATION_RESET_AI_SERVER`
- `LICENSE_RESET_ACCOUNT`
- `LICENSE_RESET_ORGANIZATION`
- `LICENSE_RESET_PLATFORM`
