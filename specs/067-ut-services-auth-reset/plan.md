# Plan: Unit Tests for `src/services/auth-reset`

## Approach

Use the project's standard Vitest + NestJS Testing Module approach with existing mock infrastructure.

### Publisher tests (`auth-reset.service.spec.ts`)

Replace the existing skeleton test with full coverage:

- Mock `ClientProxy` (emit), `EntityManager` (find), `TaskService` (create), and Winston logger
- Use existing `MockAuthResetService`, `MockEntityManagerProvider`, `MockTaskService`, `MockWinstonProvider`
- Test each public method for:
  - Correct entity queries
  - Correct event emission with proper payload
  - Task creation when no taskId is provided vs. using provided taskId
  - Error wrapping in `publishResetAll`

### Subscriber tests (`auth-reset.controller.spec.ts`)

Replace the existing skeleton test with full coverage:

- Use `defaultMockerFactory` for all domain service dependencies
- Create mock `RmqContext` with `getChannelRef()` and `getMessage()` stubs
- For each handler, test three paths:
  1. **Success**: entity found, policy applied, saved, channel.ack called
  2. **Retry**: error thrown with retryCount < MAX_RETRIES, message republished
  3. **Max retries**: error thrown with retryCount >= 5, channel.reject called

## Risk assessment

- Low risk: pure unit tests with no schema/data-model changes
- Dependencies are well-mockable via existing infrastructure

## Estimated LOC

~500 lines of test code total (agentic path, well under 400 LOC of production code)
