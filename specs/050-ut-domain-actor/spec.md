# Feature Specification: Unit Test Coverage for src/domain/actor

**Feature Branch**: `ut-domain-actor`
**Created**: 2026-03-12
**Status**: Complete

## User Scenarios & Testing

### User Story 1 - Actor Domain Test Coverage (Priority: P1)

The `src/domain/actor` area contains the core Actor abstraction (unified entity for Users, Organizations, VirtualContributors, Spaces, and Accounts) along with credential management services. These services handle actor lookup, credential grant/revoke, caching, and authorization. Unit tests ensure correctness of business logic, cache invalidation, error handling, and credential matching without requiring a running database or external services.

**Acceptance Scenarios**:

1. Given an ActorService with mocked dependencies, When `getActorOrFail` is called with a valid ID, Then it returns the actor from the repository.
2. Given an ActorService with mocked dependencies, When `getActorOrFail` is called with a non-existent ID, Then it throws `EntityNotFoundException`.
3. Given an ActorService, When `deleteActorById` is called, Then it deletes the actor and invalidates all caches (entity, context, and type caches).
4. Given an ActorService, When `getActorCredentials` is called and cache misses, Then it loads from DB, populates cache, and returns credentials.
5. Given an ActorService, When `hasValidCredential` is called with matching criteria, Then it returns true.
6. Given an ActorService, When `grantCredentialOrFail` is called, Then it verifies actor existence, creates credential, and invalidates cache.
7. Given an ActorService, When `revokeCredential` is called, Then it verifies actor existence, deletes credential, and invalidates cache on success.
8. Given an ActorLookupService, When `getActorTypeById` is called with a cached type, Then it returns from cache without DB query.
9. Given an ActorLookupService, When `getActorTypeById` is called with an uncached type, Then it queries DB, caches the result, and returns it.
10. Given an ActorLookupService, When `validateActorsAndGetTypes` is called with invalid UUIDs, Then it throws `EntityNotFoundException`.
11. Given an ActorLookupService, When `getActorAuthorizationOrFail` is called and actor has no authorization, Then it throws `RelationshipNotFoundException`.
12. Given an ActorTypeCacheService, When `setActorTypes` is called with a map, Then all entries are cached individually.
13. Given a CredentialService, When `createCredential` is called, Then it creates and saves the credential entity.
14. Given a CredentialService, When `deleteCredential` is called with a valid ID, Then it removes the credential and returns it with the original ID.
15. Given a CredentialService, When `findMatchingCredentials` is called with resourceID, Then it filters by both type and resourceID.
16. Given an ActorAuthorizationService, When `applyAuthorizationPolicy` is called, Then it delegates to `AuthorizationPolicyService.inheritParentAuthorization`.
17. Given `getActorType` function, When called with an actor without a type, Then it throws `EntityNotInitializedException`.
18. Given a CredentialResolverFields, When `expires` is called with a credential with an expiry date, Then it returns the timestamp in milliseconds.

## Requirements

### Functional Requirements

- FR-001: All actor services MUST have >=80% line coverage
- FR-002: ActorService credential management methods MUST be tested for happy path and error cases
- FR-003: ActorLookupService cache-first lookup pattern MUST be tested
- FR-004: CredentialService CRUD operations MUST be tested
- FR-005: ActorTypeCacheService batch operations MUST be tested
- FR-006: ActorAuthorizationService delegation MUST be tested
- FR-007: Resolver fields MUST be tested for data loading delegation
- FR-008: The standalone `getActorType` function MUST be tested

## Success Criteria

- SC-001: Coverage report shows >=80% for src/domain/actor
- SC-002: All tests pass with `pnpm vitest run src/domain/actor`
- SC-003: No lint errors in test files
- SC-004: No TypeScript errors in test files
