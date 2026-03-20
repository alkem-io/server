# Research: Unit Tests for src/domain/common

## Current State

- 25 existing test files covering services across domain/common
- Pattern: NestJS Test module + repository mocks + defaultMockerFactory
- 0 authorization service tests exist
- 0 factory tests exist
- Profile avatar service untested

## Test Infrastructure

| Component | Purpose |
|-----------|---------|
| `@test/mocks/winston.provider.mock` | Provides mock Winston logger |
| `@test/mocks/cache-manager.mock` | Provides mock cache manager |
| `@test/utils/default.mocker.factory` | Auto-mocks class-based DI tokens using `@golevelup/ts-vitest` |
| `@test/utils/repository.provider.mock.factory` | Creates mock TypeORM repository providers |
| `@golevelup/ts-vitest` | `createMock()` for auto-mocking classes |

## Authorization Service Pattern

All authorization services follow the same architectural pattern:
1. Load entity with relations via domain service's `getXOrFail`
2. Validate relations are loaded (throw `RelationshipNotFoundException` if not)
3. Inherit parent authorization via `AuthorizationPolicyService.inheritParentAuthorization`
4. Append credential rules (based on entity state like `createdBy`)
5. Append privilege rules (based on content update policy)
6. Recursively apply auth to child entities
7. Return array of all updated `IAuthorizationPolicy` objects

## Key Dependencies

- `AuthorizationPolicyService`: Core service for authorization policy manipulation
- Domain services (e.g., `MemoService`, `WhiteboardService`): Load entities
- Child authorization services (e.g., `ProfileAuthorizationService`, `StorageBucketAuthorizationService`): Apply auth to children
