# Research Notes

## Current Coverage Baseline (src/services/infrastructure)
| File | % Stmts | % Branch | % Funcs | Status |
|------|---------|----------|---------|--------|
| naming/naming.service.ts | 17.46 | 0 | 10.71 | Needs tests |
| storage-aggregator-resolver/storage.aggregator.resolver.service.ts | 40.38 | 44.59 | 35 | Needs more tests |
| url-generator/url.generator.service.ts | 28.88 | 22.15 | 37.77 | Needs more tests |
| url-generator/url.generator.service.cache.ts | 0 | 0 | 0 | No tests |
| event-bus/handlers/* | 0 | 0 | 0 | No tests |
| event-bus/publisher.ts | 0 | 0 | 0 | No tests (mocking spec exists) |
| event-bus/subscriber.ts | 0 | 0 | 0 | No tests (mocking spec exists) |

## Test Patterns Observed
1. **NestJS TestingModule** with `.useMocker(defaultMockerFactory)` for auto-mocking
2. **EntityManager mocking** via `getEntityManagerToken('default')` with `findOne`/`find`/`connection.query` as `vi.fn()`
3. **Repository mocking** via `repositoryProviderMockFactory(EntityClass)`
4. **Winston logger** via `MockWinstonProvider`
5. **Cache manager** via `MockCacheManager`
6. Service tests access mocks via `module.get(...)` and cast to `any` for mock operations

## Key Dependencies per Service
- **NamingService**: InjectRepository(Discussion), InjectRepository(InnovationHub), InjectEntityManager
- **StorageAggregatorResolverService**: TimelineResolverService, InjectEntityManager, InjectRepository(StorageAggregator), Logger
- **UrlGeneratorService**: ConfigService, UrlGeneratorCacheService, InjectEntityManager, Logger
- **UrlGeneratorCacheService**: CACHE_MANAGER, Logger
- **Event handlers**: AiServerService, Logger
- **Publisher**: AmqpConnection
- **Subscriber**: AmqpConnection, HANDLE_EVENTS token, Logger
