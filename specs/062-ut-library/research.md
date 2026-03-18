# Research: src/library Test Coverage

## Current Coverage Analysis
- **4 test files** exist with **56 passing tests**
- `markdown.to.plaintext.spec.ts` - 31 tests (comprehensive)
- `library.service.spec.ts` - 20 tests (comprehensive)
- `innovation.pack.defaults.service.spec.ts` - 4 tests (comprehensive)
- `innovation.pack.service.spec.ts` - 1 test (skeleton only)

## Testable Source Files (after exclusions)
Total: 9 files with testable logic
- 3 files well-tested (markdown, library.service, defaults.service)
- 1 file under-tested (innovation.pack.service)
- 5 files untested (2 authorization services, 2 resolvers, 1 resolver mutations)

## Testing Patterns Observed
1. **NestJS Test Module** with `Test.createTestingModule` for DI setup
2. **defaultMockerFactory** auto-mocks unknown providers
3. **repositoryProviderMockFactory** creates TypeORM repository mocks
4. **MockWinstonProvider** / **MockCacheManager** for infrastructure mocks
5. `vi.mocked()` for type-safe mock assertions
6. Casting mock return types: `(repo.findOne as ReturnType<typeof vi.fn>)`
7. Exception testing: `rejects.toThrow(ExceptionClass)`

## Key Dependencies Per File
- **InnovationPackService**: ProfileService, TemplatesSetService, AccountLookupService, InnovationPackDefaultsService, Repository<InnovationPack>
- **InnovationPackAuthorizationService**: AuthorizationPolicyService, TemplatesSetAuthorizationService, ProfileAuthorizationService, InnovationPackService
- **InnovationPackResolverFields**: InnovationPackService (+ dataloader for profile)
- **InnovationPackResolverMutations**: AuthorizationService, InnovationPackService
- **LibraryAuthorizationService**: AuthorizationPolicyService
- **LibraryResolverFields**: LibraryService
