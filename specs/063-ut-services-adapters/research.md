# Research: Unit Tests for src/services/adapters

## Current State
- 3 existing test files, ~81 source files total
- `communication.adapter.spec.ts` - Comprehensive test (518 lines) covering CommunicationAdapter
- `notification.in.app.adapter.spec.ts` - Skeleton test (only `should be defined`)
- `ai.server.adapter.dto.update.ai.persona.service.spec.ts` - Skipped (DTO, no logic)

## Test Infrastructure
- **Vitest 4.x** with globals enabled
- **NestJS Test module** for DI container setup
- **defaultMockerFactory** from `@test/utils/default.mocker.factory` for auto-mocking
- **@golevelup/ts-vitest** `createMock` for class-based token mocking
- **MockWinstonProvider** for logger

## Key Patterns from Existing Tests
1. Use `Test.createTestingModule({ providers: [...] }).useMocker(defaultMockerFactory).compile()`
2. For explicit mocks: provide `{ provide: Token, useValue: mockObj }` in providers array
3. Use `vi.fn()` for mock functions, `vi.mocked()` for type-safe mock access
4. Test both happy path and error paths

## Dependencies to Mock
- TypeORM repositories (via `repositoryMockFactory`)
- Winston logger (via `MockWinstonProvider`)
- Various domain services (auto-mocked via `defaultMockerFactory`)
- RabbitMQ `AmqpConnection` (manual mock)
- NestJS `ConfigService` (manual mock)
- `EventEmitter2` (auto-mocked)
- `ClientProxy` (manual mock for NOTIFICATIONS_SERVICE)

## File Analysis Summary
| File | Lines | Complexity | Testability |
|------|-------|-----------|-------------|
| activity.adapter.ts | 686 | High (many DB queries) | Medium - many entity manager mocks |
| ai.server.adapter.ts | 80 | Low | High - thin delegation |
| communication.adapter.event.service.ts | 441 | Medium | High - event translation |
| notification.adapter.ts | 50 | Low | High |
| notification.organization.adapter.ts | 182 | Medium | High |
| notification.platform.adapter.ts | 357 | Medium-High | High |
| notification.space.adapter.ts | 893 | High | Medium |
| notification.user.adapter.ts | 414 | Medium | High |
| notification.virtual.contributor.adapter.ts | 88 | Low | High |
| notification.external.adapter.ts | 1155 | High | Medium |
| notification.in.app.adapter.ts | 113 | Medium | High |
| local.storage.adapter.ts | 156 | Medium | High |
