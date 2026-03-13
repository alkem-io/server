# Research: Unit Tests for `src/domain/collaboration`

## Current State

- 16 existing test files covering services, resolvers
- Existing tests follow consistent NestJS Testing Module pattern
- `defaultMockerFactory` auto-mocks class-based DI tokens via `@golevelup/ts-vitest`
- Repository mocks provided via `repositoryProviderMockFactory`

## Key Patterns Observed

### Test Module Setup
```typescript
const module = await Test.createTestingModule({
  providers: [
    ServiceUnderTest,
    repositoryProviderMockFactory(Entity),
    MockCacheManager,
    MockWinstonProvider,
  ],
}).useMocker(defaultMockerFactory).compile();
```

### Mocking Dependencies
- `vi.mocked(service.method).mockResolvedValue(...)` for async
- `vi.mocked(service.method).mockReturnValue(...)` for sync
- Cast entities with `as any` or `as unknown as EntityType`

### Exception Testing
- `await expect(...).rejects.toThrow(ExceptionClass)`
- Structured details in exceptions (no dynamic data in messages)

## Authorization Service Patterns

All authorization services follow a similar flow:
1. Load entity with relations
2. Validate required relations exist (throw if missing)
3. Inherit parent authorization
4. Append credential/privilege rules
5. Propagate to child entities
6. Return array of updated authorization policies

Testing strategy: mock the entity load, verify rule creation calls, test error paths for missing relations.
