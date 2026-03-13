# Research: Unit Tests for src/domain/communication

## Current Coverage Analysis (47.12% overall)
| Module | Stmts | Branch | Funcs | Lines | Gap |
|--------|-------|--------|-------|-------|-----|
| communication | 17.56% | 0% | 15.78% | 17.8% | High |
| conversation | 57.56% | 56.94% | 56.52% | 56.28% | Medium |
| message | 11.11% | 0% | 33.33% | 11.11% | High |
| message.details | 94.73% | 100% | 66.66% | 94.73% | Low |
| message.reaction | 0% | 0% | 0% | 0% | Critical |
| messaging | 53.95% | 34.61% | 60% | 54.34% | Medium |
| room | 24.9% | 32.92% | 26.76% | 25.27% | High |
| room-lookup | 81.81% | 100% | 64.28% | 81.25% | Low |
| room-mentions | 98.07% | 87.5% | 100% | 98.07% | Minimal |
| virtual.contributor.message | 100% | 100% | 100% | 100% | None |

## Files Needing New/Enhanced Tests
1. `communication.service.ts` - 8.57% (needs full service test expansion)
2. `communication.service.authorization.ts` - 0% (needs new test file)
3. `communication.resolver.mutations.ts` - 36% (needs mutation test expansion)
4. `room.service.authorization.ts` - 0% (needs new test file)
5. `room.service.events.ts` - 0% (needs new test file)
6. `room.data.loader.ts` - 0% (needs new test file)
7. `room.resolver.mutations.ts` - 0% (needs new test file)
8. `room.resolver.fields.ts` - 5.55% (needs new test file)
9. `conversation.service.authorization.ts` - 0% (needs new test file)
10. `conversation.resolver.fields.ts` - 4% (needs new test file)
11. `conversation.resolver.mutations.ts` - 0% (needs new test file)
12. `messaging.resolver.mutations.ts` - 0% (needs new test file)
13. `messaging.service.ts` - 61.85% (needs test expansion)
14. `message.resolver.fields.ts` - 11.11% (needs new test file)
15. `message.reaction.resolver.fields.ts` - 0% (needs new test file)

## Existing Test Patterns
- NestJS Test.createTestingModule with explicit providers
- MockWinstonProvider for logger
- repositoryProviderMockFactory for TypeORM repositories
- defaultMockerFactory via .useMocker() for remaining DI tokens
- Vitest vi.fn(), vi.spyOn(), type Mocked<T>
- Tests co-located with source files as *.spec.ts
