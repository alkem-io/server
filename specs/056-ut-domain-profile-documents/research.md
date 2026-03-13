# Research: profile-documents Unit Tests

## File Inventory

| File | Type | Testable |
|---|---|---|
| `profile.documents.service.ts` | Service | Yes |
| `profile.documents.service.spec.ts` | Test | N/A (test file) |
| `profile.documents.module.ts` | Module | No (excluded by convention) |

## Dependencies

- `DocumentService` -- provides URL checking, document CRUD, and public URL generation
- `StorageBucketService` -- adds documents to storage buckets
- `DocumentAuthorizationService` -- applies authorization policies to documents

All dependencies are mocked via NestJS `Test.createTestingModule` with `vi.fn()` stubs.

## Existing Coverage (before changes)

| Metric | Value |
|---|---|
| Statements | 95% |
| Branches | 84.21% |
| Functions | 100% |
| Lines | 95% |
| Uncovered lines | 44, 58 |

## Gap Analysis

- Line 44: `EntityNotInitializedException` when `!storageBucket.documents` -- no test passes a bucket without documents array
- Line 58: `EntityNotFoundException` when `!docInContent` -- no test mocks `getDocumentFromURL` returning falsy
