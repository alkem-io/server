# Requirements Checklist: Unit Tests for src/domain/actor

**Created**: 2026-03-12

## Coverage Requirements

- [x] FR-001: All actor services have >=80% line coverage
- [x] FR-002: ActorService credential management tested (happy path + error cases)
- [x] FR-003: ActorLookupService cache-first pattern tested
- [x] FR-004: CredentialService CRUD operations tested
- [x] FR-005: ActorTypeCacheService batch operations tested
- [x] FR-006: ActorAuthorizationService delegation tested
- [x] FR-007: Resolver fields tested for delegation
- [x] FR-008: getActorType standalone function tested

## Quality Requirements

- [x] QR-001: Tests use Vitest 4.x with globals enabled
- [x] QR-002: Tests use project mock utilities (MockWinstonProvider, MockCacheManager, repositoryProviderMockFactory)
- [x] QR-003: Exception messages do not contain dynamic data
- [x] QR-004: Tests are co-located with source files
- [x] QR-005: No lint errors in test files
- [x] QR-006: No TypeScript errors in test files

## Success Criteria

- [x] SC-001: Coverage report shows >=80% for src/domain/actor
- [x] SC-002: All tests pass
- [x] SC-003: Lint passes
- [x] SC-004: Typecheck passes
