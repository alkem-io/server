# Research: Unit Tests for `src/services/auth-reset`

## Existing code analysis

### AuthResetService (publisher)

- **Dependencies**: `ClientProxy` (AUTH_RESET_SERVICE token), `EntityManager`, `TaskService`, Winston logger
- **Pattern**: Each publish method queries entities via `EntityManager.find()`, then calls `authResetQueue.emit()` for each entity
- `publishResetAll` is an orchestrator that calls all other methods in sequence; wraps errors in `BaseException`
- Platform and AI Server resets emit events without task IDs or entity queries

### AuthResetController (subscriber)

- **Dependencies**: 14 injected services (account, authorization, license, organization, user, platform, AI server, task)
- **Pattern**: Each `@EventPattern` handler follows retry-with-backoff:
  1. Extract channel + message from `RmqContext`
  2. Read `x-retry-count` header (default 0)
  3. Try: fetch entity -> apply policy -> save -> ack
  4. Catch: if retryCount >= MAX_RETRIES (5) -> reject; else -> republish with incremented retry header -> ack original
- Platform/AI server handlers have no payload (no entity ID), just context

### Existing mocks available

| Mock | Token | Methods |
|------|-------|---------|
| `MockAuthResetService` | AUTH_RESET_SERVICE | `send`, `emit` |
| `MockEntityManagerProvider` | EntityManager | `find` |
| `MockTaskService` | TaskService | `updateTaskErrors`, `create`, `get`, `getAll`, `getTaskList` |
| `MockWinstonProvider` | WINSTON_MODULE_NEST_PROVIDER | `error`, `warn`, `verbose` |
| `defaultMockerFactory` | any class token | `createMock()` auto-mock |

### Missing mock: `TaskService.updateTaskResults`

The `MockTaskService` mock does not include `updateTaskResults`. This needs to be added.

## Test infrastructure

- Vitest 4.x with globals enabled
- `@golevelup/ts-vitest` for `createMock`
- NestJS `Test.createTestingModule` for DI wiring
