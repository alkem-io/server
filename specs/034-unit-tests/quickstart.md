# Quickstart: Unit Test Development

**Feature**: 034-unit-tests | **Date**: 2026-02-13

## Running Tests

```bash
# Run all unit tests with coverage
pnpm test:ci

# Run all unit tests without coverage (faster feedback)
pnpm test:ci:no:coverage

# Run a specific test file
pnpm test -- src/domain/collaboration/callout/callout.service.spec.ts

# Run tests matching a pattern
pnpm test -- --reporter=verbose "callout"

# Run tests in watch mode (development)
pnpm test -- --watch src/domain/collaboration/callout/callout.service.spec.ts
```

## Creating a New Test File

### Step 1: Identify the service layer

| Layer | Pattern to use | Mocking approach |
|-------|---------------|-----------------|
| Domain service | Pattern A (manual) or B (TestingModule) | Mock repos, external services at boundaries |
| Common utility | Pattern C (pure) | No mocks needed |
| Library service | Pattern A or B | Mock repos, external services |
| Application service | Pattern B (TestingModule) | Mock domain services, repos |
| Core service | Pattern B (TestingModule) | Mock repos, config |

### Step 2: Create the spec file co-located with the source

```
src/domain/collaboration/callout/callout.service.ts      ← source
src/domain/collaboration/callout/callout.service.spec.ts  ← test (create this)
```

### Step 3: Use the appropriate pattern

**Pattern A — Manual Construction (domain services):**
```typescript
import { type Mock, vi } from 'vitest';

describe('CalloutService.methodName', () => {
  const createService = () => {
    const depMock = { method: vi.fn() } as { method: Mock };
    const service = new CalloutService(depMock as any, /* ... */);
    return { service, depMock };
  };

  it('should [behavior] when [condition]', async () => {
    const { service, depMock } = createService();
    depMock.method.mockResolvedValue(expectedData);

    const result = await service.methodName(input);

    expect(result).toEqual(expected);
  });
});
```

**Pattern B — NestJS TestingModule:**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';

describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        repositoryProviderMockFactory(Entity),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ServiceName);
  });

  it('should [behavior] when [condition]', async () => { /* ... */ });
});
```

**Pattern C — Pure Utility:**
```typescript
import { utilFunction } from '@common/utils/util.name';

describe('utilFunction', () => {
  it('should [behavior] when [condition]', () => {
    expect(utilFunction(input)).toEqual(expected);
  });
});
```

### Step 4: Verify

```bash
pnpm test -- src/path/to/your.service.spec.ts
```

## Key Rules

1. **Behavioral names**: `should [expected behavior] when [condition]`
2. **No trivial tests**: Never write `should be defined` or instantiation-only tests
3. **One assertion concept per test**: Multiple `expect()` OK if verifying same logical thing
4. **Mock at boundaries only**: Repos, external services, event publishers — not domain entities
5. **Order tests**: happy path → domain violations → edge cases → error handling
6. **Error paths**: Verify exception types, never include dynamic data in assertion messages
7. **Arrange-Act-Assert**: Every test follows this structure

## Available Test Infrastructure

| Import | Purpose |
|--------|---------|
| `@test/mocks/winston.provider.mock` | Logger mock |
| `@test/mocks/cache-manager.mock` | Cache manager mock |
| `@test/utils/default.mocker.factory` | Auto-mock remaining DI tokens |
| `@test/utils/repository.provider.mock.factory` | TypeORM repository mock |
| `@test/utils/event-bus.mock.factory` | Event bus publisher/subscriber mocks |
| `@test/utils/mock.type` | `MockType<T>` helper type |
| `@test/data/*` | Entity test data builders |
