# Plan: Unit Tests for src/domain/storage

## Approach
Incrementally add unit tests for uncovered services and resolvers within the storage domain. Tests follow existing patterns established in document.service.spec.ts, storage.aggregator.service.spec.ts, and storage.bucket.service.spec.ts.

## Phases

### Phase 1: Authorization Services
Create tests for the three authorization services that apply cascading auth policies:
1. `DocumentAuthorizationService` - Tests inheritance, credential rules for document creators
2. `StorageAggregatorAuthorizationService` - Tests reset, inheritance, anonymous access, delegation to bucket auth
3. `StorageBucketAuthorizationService` - Tests reset, inheritance, privilege rules, document cascade

### Phase 2: Resolver Fields
Create tests for field resolvers that delegate to services:
1. `DocumentResolverFields` - createdBy, uploadedDate, url
2. `StorageAggregatorResolverFields` - size, childStorageAggregators, directStorageBucket, storageBuckets, parentEntity
3. `StorageBucketResolverFields` - document, documents, size, parentEntity

### Phase 3: Resolver Mutations
Extend/create tests for mutation resolvers:
1. `DocumentResolverMutations` - deleteDocument, updateDocument (extend existing)
2. `StorageBucketResolverMutations` - uploadFileOnStorageBucket, deleteStorageBucket

## Risk Mitigation
- Authorization services involve chained mock calls; use explicit mock return values
- Resolver tests only verify delegation, not business logic (that is in service tests)
