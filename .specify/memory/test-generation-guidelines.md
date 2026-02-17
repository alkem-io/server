# Unit Test Generation for Alkemio Server (NestJS GraphQL DDD)

## Context
You are writing unit tests for a NestJS 10 application that uses GraphQL (code-first with `@nestjs/graphql`), TypeORM 0.3, and follows Domain-Driven Design patterns. The codebase is organized into bounded contexts with clear separation between domain, application, and infrastructure layers.

## Architecture Layers & What to Test

### Domain Layer (HIGHEST PRIORITY - pure unit tests)
- **Entities & Aggregates**: Test invariant enforcement, state transitions, domain rules, and validation logic. These are the most valuable tests.
- **Value Objects**: Test equality, validation, and immutability.
- **Domain Services**: Test orchestration logic between multiple aggregates.
- **Domain Events**: Test event creation with correct payload.

### Application Layer (HIGH PRIORITY - unit tests with mocks)
- **Command Handlers / Use Cases**: Test orchestration logic. Mock repositories and domain services. Verify correct repository calls, event publishing, and error handling paths.
- **Query Handlers**: Test data retrieval orchestration. Mock read repositories.

### Infrastructure Layer (LOW PRIORITY for unit tests)
- **GraphQL Resolvers**: Only test argument mapping and delegation to services. Do NOT test GraphQL schema parsing — that belongs in integration tests.
- **Repository Implementations**: Skip — test via integration tests against a real DB.

## Rules

1. **Test behavior, not implementation.** Name tests as `should [expected behavior] when [condition]`. Never test private methods directly.

2. **One assertion concept per test.** A test can have multiple `expect()` calls only if they verify the same logical assertion.

3. **Meaningful tests only.** Do NOT generate tests that:
   - Simply verify a class can be instantiated (`should be defined`)
   - Test NestJS framework behavior (DI, module compilation)
   - Mirror the implementation line-by-line
   - Test getters/setters with no logic
   - Test TypeORM decorators

4. **Arrange-Act-Assert pattern.** Every test follows this structure clearly.

5. **Mock boundaries, not internals.** Mock at repository interfaces, external service ports, and event publishers. Never mock domain entities when testing use cases — use real domain objects.

6. **Cover the diamond, not the ice cream:**
   - Many domain unit tests (fast, no mocks)
   - Moderate application layer tests (mocked ports)
   - Few resolver-level unit tests (only mapping logic)

7. **Error paths matter.** Always test: domain rule violations, not-found scenarios, authorization failures, and invalid input rejection.

8. **Use test builders / factories** for creating domain objects in tests. Avoid raw constructor calls scattered across tests.

## Tech Stack

| Tool | Details |
|------|---------|
| **Test runner** | Vitest 4.x (`vitest.config.ts` at repo root) |
| **Globals** | Enabled — `describe`, `it`, `expect`, `beforeEach` available without import |
| **Mocking** | `vi.fn()`, `vi.spyOn()` from `'vitest'`; import `type Mock, type Mocked` for typing |
| **DI mocking** | `@golevelup/ts-vitest` via `createMock()` for auto-mocking class tokens |
| **Path aliases** | `@domain/*`, `@services/*`, `@common/*`, `@core/*`, `@test/*` etc. (resolved by `vite-tsconfig-paths`) |
| **SWC** | `unplugin-swc` for decorator metadata support |
| **Coverage** | v8 provider, output to `./coverage-ci` |
| **Timeout** | 90 seconds default |

## Project-Specific Mocking Infrastructure

### Standard Mock Providers (from `@test/mocks/`)
```typescript
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
```

### Repository Mock Factory (from `@test/utils/`)
```typescript
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';

// Usage in providers array:
repositoryProviderMockFactory(MyEntity)
```

### Default Mocker Factory (auto-mocks remaining dependencies)
```typescript
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

// Usage:
Test.createTestingModule({ providers: [...] })
  .useMocker(defaultMockerFactory)
  .compile();
```

### Helper Types
```typescript
import { MockType } from '@test/utils/mock.type';    // { [P in keyof T]?: Mock }
import { PublicPart } from '@test/utils/public-part'; // { [P in keyof T]?: unknown }
```

## Exception Handling Conventions

All custom exceptions extend `BaseException` (which extends `GraphQLError`). Never include dynamic data in exception messages — use the `details` parameter:

```typescript
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { LogContext } from '@common/enums/logging.context';

// Correct
throw new EntityNotFoundException(
  'User not found',
  LogContext.AUTH,
  { userId: id }  // ExceptionDetails — third parameter
);

// Test assertion
await expect(service.doSomething('bad-id'))
  .rejects.toThrow(EntityNotFoundException);
```

## Test File Structure

### Pattern A: Focused Unit Test (manual construction — preferred for domain/service logic)
```typescript
// user.service.spec.ts
import { type Mock, vi } from 'vitest';

describe('UserService.createOrLinkUser', () => {
  const createService = () => {
    const authLinkServiceMock = {
      resolveExistingUser: vi.fn(),
      ensureAuthenticationIdAvailable: vi.fn(),
    } as { resolveExistingUser: Mock; ensureAuthenticationIdAvailable: Mock };

    const loggerMock = {
      log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), verbose: vi.fn(),
    };

    const service = new UserService(
      {} as any, // irrelevant deps
      authLinkServiceMock as any,
      loggerMock as any
    );

    return { service, authLinkServiceMock };
  };

  it('should return existing user with isNew=false when authentication ID already linked', async () => {
    const { service, authLinkServiceMock } = createService();
    authLinkServiceMock.resolveExistingUser.mockResolvedValue(existingUser);

    const result = await service.createOrLinkUser(agentInfo);

    expect(result.user).toBe(existingUser);
    expect(result.isNew).toBe(false);
  });

  it('should throw EntityNotFoundException when user lookup fails', async () => {
    const { service, authLinkServiceMock } = createService();
    authLinkServiceMock.resolveExistingUser.mockRejectedValue(
      new EntityNotFoundException('Not found', LogContext.AUTH)
    );

    await expect(service.createOrLinkUser(agentInfo))
      .rejects.toThrow(EntityNotFoundException);
  });
});
```

### Pattern B: NestJS TestingModule (when DI wiring matters)
```typescript
// organization.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';

describe('OrganizationService', () => {
  let service: OrganizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        repositoryProviderMockFactory(Organization),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<OrganizationService>(OrganizationService);
  });

  it('should create organization with correct profile', async () => { ... });
  it('should throw when nameID is already taken', async () => { ... });
});
```

### Pattern C: Pure Utility Test (no NestJS, no mocks)
```typescript
// compression.util.spec.ts
import { compressText, decompressText } from '@common/utils/compression.util';

describe('Compression', () => {
  it('should restore original value after compress-decompress roundtrip', async () => {
    const original = 'TestTextCompression';
    const compressed = await compressText(original);
    expect(await decompressText(compressed)).toEqual(original);
  });
});
```

### Pattern D: Parameterized Tests
```typescript
// naming.service.spec.ts
describe('createNameIdAvoidingReservedNameIDs', () => {
  it.each([
    { base: 'mytest', reserved: [], expected: 'mytest' },
    { base: 'mytest', reserved: ['mytest'], expected: 'mytest-1' },
    { base: 'mytest', reserved: ['mytest', 'mytest-1'], expected: 'mytest-2' },
  ])('should return $expected for base=$base with reserved=$reserved', ({ base, reserved, expected }) => {
    expect(service.createNameIdAvoidingReservedNameIDs(base, reserved)).toEqual(expected);
  });
});
```

## Input
When given a source file, identify which layer it belongs to and generate only the meaningful test cases that verify actual business logic and behavioral contracts.

## Output
Produce a single `*.spec.ts` file with well-organized `describe/it` blocks, proper mocking setup, and tests ordered by importance (happy path → domain violations → edge cases → error handling). Place it alongside the source file in `src/`.
