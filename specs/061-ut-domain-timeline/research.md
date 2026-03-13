# Research: Unit Tests for src/domain/timeline

## Existing Test Patterns

### Module Setup Pattern
All existing tests use NestJS `Test.createTestingModule` with:
1. Explicit providers for the class under test
2. `MockCacheManager` and `MockWinstonProvider` as explicit providers
3. `repositoryProviderMockFactory(Entity)` for each TypeORM repository
4. `.useMocker(defaultMockerFactory)` to auto-mock remaining dependencies

### Mock Interaction Pattern
- Services are obtained via `module.get<ServiceType>(ServiceType)`
- Methods are mocked via `service.method = vi.fn().mockReturnValue(...)` or `vi.spyOn()`
- Repository methods are mocked via `vi.spyOn(repository, 'findOne').mockResolvedValue(...)`

### Test Structure
- AAA pattern (Arrange / Act / Assert) with comments
- Descriptive test names: "should [expected behavior] when [condition]"
- Group by method name in `describe` blocks

## Key Dependencies to Mock

### Authorization Services
- `AuthorizationPolicyService`: reset, inheritParentAuthorization, createCredentialRule, appendCredentialAuthorizationRules, cloneAuthorizationPolicy
- `CalendarEventAuthorizationService`: applyAuthorizationPolicy
- `CalendarAuthorizationService`: applyAuthorizationPolicy
- `ProfileAuthorizationService`: applyAuthorizationPolicy
- `RoomAuthorizationService`: applyAuthorizationPolicy, allowContributorsToCreateMessages, allowContributorsToReplyReactToMessages

### Resolver Dependencies
- Domain services (CalendarService, CalendarEventService, TimelineService)
- AuthorizationService: grantAccessOrFail, isAccessGranted
- Various adapter services (ActivityAdapter, NotificationSpaceAdapter)
- UrlGeneratorService, UserLookupService

## File Analysis

### Authorization Service Pattern
All three authorization services follow the same pattern:
1. Load entity with relations
2. Validate relations exist (throw RelationshipNotFoundException if not)
3. Reset/inherit parent authorization
4. Cascade to child entities
5. Return array of updated IAuthorizationPolicy objects

### Resolver Pattern
Field resolvers use `@ResolveField` decorators and delegate to domain services.
Mutation resolvers check authorization then delegate to domain services.
