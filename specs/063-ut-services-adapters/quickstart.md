# Quickstart: Unit Tests for src/services/adapters

## Run Tests
```bash
# Run all adapter tests
pnpm vitest run src/services/adapters

# Run with coverage
pnpm vitest run --coverage src/services/adapters

# Run specific test file
pnpm vitest run src/services/adapters/notification-in-app-adapter/notification.in.app.adapter.spec.ts
```

## Verify
```bash
# Type check
pnpm exec tsc --noEmit

# Lint
pnpm lint
```

## Test Pattern
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('ServiceName', () => {
  let service: ServiceName;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceName],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    service = module.get<ServiceName>(ServiceName);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```
