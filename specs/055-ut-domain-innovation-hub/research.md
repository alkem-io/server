# Research: Unit Tests for `src/domain/innovation-hub`

## Existing Test Patterns

The existing `innovation.hub.service.spec.ts` demonstrates:
- NestJS `Test.createTestingModule` with `useMocker(defaultMockerFactory)`
- `repositoryProviderMockFactory(InnovationHub)` for TypeORM repository
- `MockWinstonProvider` and `MockCacheManager` as standard providers
- Direct property assignment on private service dependencies (e.g., `(service['namingService'] as any).method = vi.fn()`)
- `vi.spyOn` for repository methods
- AAA pattern with clear section comments

## Dependencies Map

### InnovationHubAuthorizationService
- `AuthorizationPolicyService` - cloneAuthorizationPolicy, appendCredentialRuleAnonymousRegisteredAccess, inheritParentAuthorization, createCredentialRuleUsingTypesOnly, appendCredentialAuthorizationRules
- `ProfileAuthorizationService` - applyAuthorizationPolicy
- `InnovationHubService` - getInnovationHubOrFail

### InnovationHubResolverFields
- `InnovationHubService` - getSpaceListFilterOrFail, getProvider
- `SpaceLookupService` - getSpacesById

### InnovationHubResolverMutations
- `AuthorizationService` - grantAccessOrFail
- `InnovationHubService` - getInnovationHubOrFail, updateOrFail, delete

## Coverage Baseline

- Statements: 68.42%
- Branches: 86.9%
- Functions: 48%
- Lines: 69.33%

Primary gap is in functions (48%) due to untested authorization service, field resolver, and mutation resolver.
