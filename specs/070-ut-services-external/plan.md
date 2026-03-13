# Plan: Unit Tests for src/services/external

## Approach
Add co-located `.spec.ts` files for each untested source file, following the existing test conventions observed in the codebase:
- Vitest 4.x globals (describe, it, expect, vi)
- NestJS `Test.createTestingModule` for injectable services
- `MockWinstonProvider`, `MockConfigService`, `defaultMockerFactory` from `@test/mocks` and `@test/utils`

## Implementation Order

### Phase 1: Pure utility functions (no DI needed)
1. `is.elastic.error.spec.ts` - Type guard, ~4 test cases
2. `is.elastic.response.error.spec.ts` - Type guard, ~4 test cases
3. `handle.elastic.error.spec.ts` - Error handler, ~5 test cases
4. `is.limit.exceeded.spec.ts` - Rate limit check, ~3 test cases
5. `wingback.exception.spec.ts` - `isWingbackException` guard, ~3 test cases

### Phase 2: Factory functions (partial DI)
6. `elasticsearch.client.factory.spec.ts` - Mocks fs, ConfigService, logger

### Phase 3: Injectable services (full DI)
7. `wingback.manager.spec.ts` - Mocks HttpService, ConfigService, logger; tests all public methods

## Risk Assessment
- Low risk: All tests are additive, no production code changes
- WingbackManager tests require careful RxJS mock setup for `sendRequest` pipe chains
