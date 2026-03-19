# Contract: Batch Authorization Reset Message Payload

**Feature**: 042-auth-reset-optimization
**Date**: 2026-03-19
**Type**: Internal RabbitMQ message contract (not a GraphQL API contract)

## Queue

- **Name**: `alkemio-auth-reset` (`MessagingQueue.AUTH_RESET`)
- **Transport**: RabbitMQ via `@nestjs/microservices`
- **Durable**: Yes

## Event Patterns (unchanged)

All existing `RESET_EVENT_TYPE` patterns remain unchanged:

| Pattern | Handler |
|---------|---------|
| `auth-reset-account` | `authResetAccount()` |
| `auth-reset-user` | `authResetUser()` |
| `auth-reset-organization` | `authResetOrganization()` |
| `auth-reset-platform` | `authResetPlatform()` |
| `auth-reset-ai-server` | `authResetAiServer()` |
| `license-reset-account` | `licenseResetAccount()` |
| `license-reset-organization` | `licenseResetOrganization()` |
| `license-reset-platform` | `licenseResetPlatform()` |

## Payload Schema

### Before (current)

```typescript
interface AuthResetEventPayload {
  type: RESET_EVENT_TYPE;
  id: string;       // Single entity UUID
  task: string;      // Task tracking UUID
}
```

**Message count**: 1 message per entity (e.g., 2,184 messages for 2,184 users)

### After (batch-extended)

```typescript
interface AuthResetEventPayload {
  type: RESET_EVENT_TYPE;
  id: string;        // First entity UUID (backward compatibility)
  ids?: string[];    // Batch of entity UUIDs (preferred, up to batch_size)
  task: string;      // Task tracking UUID
}
```

**Message count**: `ceil(entityCount / batchSize)` messages (e.g., 44 messages for 2,184 users at batch size 50)

### Handler Resolution Logic

```typescript
const entityIds = payload.ids ?? [payload.id];
for (const entityId of entityIds) {
  try {
    // process entity
  } catch (error) {
    // log, retry in-process up to MAX_RETRIES, continue with next entity
  }
}
```

## Publisher Contract

### `publishAuthorizationResetAllAccounts(taskId)`

**Before**: Emits N messages (one per account)
**After**: Emits `ceil(N / batchSize)` messages, each containing up to `batchSize` account IDs

```typescript
// Pseudocode
const accounts = await this.manager.find(Account, { select: { id: true } });
const batches = chunk(accounts.map(a => a.id), batchSize);
for (const batch of batches) {
  this.authResetQueue.emit(RESET_EVENT_TYPE.AUTHORIZATION_RESET_ACCOUNT, {
    id: batch[0],           // backward compat
    ids: batch,             // batch payload
    type: RESET_EVENT_TYPE.AUTHORIZATION_RESET_ACCOUNT,
    task: taskId,
  });
}
```

Same pattern applies to all `publishAuthorizationResetAll*` and `publishLicenseResetAll*` methods.

## Error Handling Contract

| Scenario | Behavior |
|----------|----------|
| Single entity fails in batch | Log error, retry entity in-process (up to 5 times), continue with remaining entities |
| All entities in batch fail | ACK message, log all errors via `TaskService.updateTaskErrors()` |
| Handler crashes (unhandled) | RabbitMQ redelivers message (existing behavior via manual ACK pattern) |
| Entity deleted between publish and handle | Skip gracefully, log warning, continue |

## Backward Compatibility

During rolling deployment, both old and new consumers may be active:
- **Old consumer** (pre-batch): Reads `payload.id`, processes single entity — still works because `id` is always populated
- **New consumer** (batch-aware): Reads `payload.ids ?? [payload.id]`, processes batch — handles both old and new messages

No coordination or ordering required for deployment.
