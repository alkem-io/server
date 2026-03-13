# Research: Unit Tests for src/domain/community

## Current State

### Existing Tests (21 files, 163 tests)
- Services with thorough tests: user-lookup, user-settings, organization-lookup, organization-settings, organization-verification, community-guidelines, community-communication, virtual-contributor, virtual-contributor-lookup, virtual-contributor-defaults, virtual-contributor-settings, virtual-contributor-platform-settings
- Skeleton-only tests ("should be defined"): user.service, user.resolver, organization.service, organization.resolver, community.service, community.resolver.mutations, user-group.service, user-group.resolver

### Missing Tests (17 files)
- 1 service file: user.identity.service.ts (complex business logic, ~390 lines)
- 12 resolver files: fields, mutations, queries across organization, user, user-group, community, community-guidelines, virtual-contributor
- 1 model card resolver: virtual.contributor.model.card.resolver.fields.ts
- 1 subscription resolver: virtual.contributor.resolver.subscriptions.ts
- 1 lifecycle resolver: organization.verification.resolver.fields.lifecycle.ts (not in initial list but should be included)

## Test Infrastructure

### Available Mocks
- `MockWinstonProvider` - Logger mock (ValueProvider)
- `MockCacheManager` - Cache manager mock
- `MockNotificationsService` - RabbitMQ notifications mock
- `defaultMockerFactory` - Auto-mocks class-based and string tokens
- `repositoryProviderMockFactory` - Creates mock repository providers for entities

### Test Pattern (from existing tests)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';

describe('ServiceName', () => {
  let service: ServiceClass;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceClass,
        repositoryProviderMockFactory(EntityClass), // if service injects a repo
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    service = module.get<ServiceClass>(ServiceClass);
  });
  it('should be defined', () => { expect(service).toBeDefined(); });
});
```

## Key Observations
- Resolver tests follow the same pattern but instantiate the resolver class
- `defaultMockerFactory` handles most dependencies via `@golevelup/ts-vitest createMock`
- String-token dependencies (WINSTON_MODULE_NEST_PROVIDER, repository tokens) need explicit providers
- Existing "should be defined" tests confirm the module wiring pattern works
