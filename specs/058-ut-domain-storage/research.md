# Research: Unit Tests for src/domain/storage

## Existing Test Patterns
Analyzed 4 existing test files in the storage domain:
- `document.service.spec.ts` (431 lines) - Comprehensive service tests with mock repository, tagset service, auth policy service, storage service
- `document.resolver.spec.ts` (28 lines) - Minimal "should be defined" test
- `storage.aggregator.service.spec.ts` (522 lines) - Full service tests including create, delete, size calculations, parent entity resolution
- `storage.bucket.service.spec.ts` (747 lines) - Extensive tests for CRUD, upload, filtering, validation

## Test Infrastructure
- `@test/mocks/winston.provider.mock` - Provides MockWinstonProvider for logger injection
- `@test/mocks/cache-manager.mock` - Provides MockCacheManager
- `@test/utils/default.mocker.factory` - Auto-mocks any unregistered provider with vi.fn()
- `@test/utils/repository.provider.mock.factory` - Creates mock TypeORM repository providers

## Key Dependencies to Mock
| Service | Key Methods |
|---------|-------------|
| AuthorizationPolicyService | inheritParentAuthorization, reset, createCredentialRule, appendCredentialAuthorizationRules, appendPrivilegeAuthorizationRules, appendCredentialRuleAnonymousRegisteredAccess, saveAll, delete |
| AuthorizationService | grantAccessOrFail, isAccessGranted |
| DocumentService | getDocumentOrFail, createDocument, deleteDocument, updateDocument, getPubliclyAccessibleURL, getUploadedDate, saveDocument, uploadFile |
| StorageBucketService | createStorageBucket, save, deleteStorageBucket, size, getStorageBucketsForAggregator |
| StorageAggregatorService | getStorageAggregatorOrFail, size, getChildStorageAggregators, getDirectStorageBucket, getStorageBuckets, getParentEntity |
| UserLookupService | getUserById |

## Coverage Gap Analysis
Authorization services (3 files, ~240 lines) have zero coverage. Resolver fields (3 files, ~210 lines) have zero coverage. Resolver mutations (2 files, ~150 lines) have near-zero coverage. Total uncovered: ~600 lines of production code.
