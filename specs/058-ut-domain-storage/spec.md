# Specification: Unit Tests for src/domain/storage

## Objective
Achieve >=80% test coverage for the `src/domain/storage` area by adding missing unit tests for authorization services, resolver fields, and resolver mutations.

## Scope
The storage domain contains three sub-modules:
- **document**: Document CRUD, authorization, and GraphQL resolvers
- **storage-aggregator**: Aggregation layer for storage buckets, authorization, and resolvers
- **storage-bucket**: Bucket management, file upload, authorization, and resolvers

## Files Requiring New Tests
| File | Current State | Action |
|------|--------------|--------|
| `document/document.service.authorization.ts` | No tests | Create new spec |
| `document/document.resolver.fields.ts` | No tests | Create new spec |
| `document/document.resolver.mutations.ts` | Minimal "defined" test | Extend with behavioral tests |
| `storage-aggregator/storage.aggregator.service.authorization.ts` | No tests | Create new spec |
| `storage-aggregator/storage.aggregator.resolver.fields.ts` | No tests | Create new spec |
| `storage-bucket/storage.bucket.service.authorization.ts` | No tests | Create new spec |
| `storage-bucket/storage.bucket.resolver.fields.ts` | No tests | Create new spec |
| `storage-bucket/storage.bucket.resolver.mutations.ts` | No tests | Create new spec |

## Files With Adequate Tests (No Changes)
- `document/document.service.ts` (document.service.spec.ts)
- `storage-aggregator/storage.aggregator.service.ts` (storage.aggregator.service.spec.ts)
- `storage-bucket/storage.bucket.service.ts` (storage.bucket.service.spec.ts)

## Constraints
- Test framework: Vitest 4.x with globals
- NestJS Test module for DI
- Mock utilities: MockWinstonProvider, MockCacheManager, defaultMockerFactory, repositoryProviderMockFactory
- Tests co-located with source files (*.spec.ts)
