# Unit Tests for src/services/api - Specification

## Objective
Achieve >= 80% unit test coverage for the `src/services/api/` area of the Alkemio Server codebase.

## Scope
The `src/services/api/` directory contains 10 modules with ~53 testable source files (services, resolvers, utilities). Currently 16 test files exist covering 32.54% of the area. This spec targets the gap files.

## Modules
1. **activity-log** - Activity log service, builder, resolver queries, resolver subscriptions
2. **conversion** - Space level conversion service, resolver mutations
3. **input-creator** - Input creator service, resolver queries/fields
4. **lookup** - Lookup service, resolver queries/fields
5. **lookup-by-name** - Lookup by name service, resolver queries/fields
6. **me** - Me service, resolver queries/fields, conversations resolver
7. **notification-recipients** - Notification recipients service, resolver queries/fields
8. **registration** - Registration service, resolver mutations
9. **roles** - Roles service, resolver queries/fields, utility functions (groupCredentialsByEntity, mapSpaceCredentialsToRoles, etc.)
10. **search** - Search service, extract service, ingest service, result service, resolver queries, utility functions (validateSearchParameters, calculateSearchCursor, tryParseSearchCursor, buildSearchQuery, buildMultiSearchRequestItems)
11. **url-resolver** - URL resolver service, resolver queries, utility functions (getPathElements, getPath, getMatchedResultAsString, etc.)

## Coverage Strategy
- Pure utility functions: exhaustive unit tests (high ROI, no mocking needed)
- Service classes: mock dependencies via NestJS Test module + defaultMockerFactory
- Resolver classes: instantiation + basic method delegation tests
- Skip: entity files, DTOs, interfaces, modules, enums, types, constants, index files

## Excluded Files
Files matching: *.entity.ts, *.interface.ts, *.module.ts, *.dto.ts, *.input.ts, *.enum.ts, *.type.ts, *.types.ts, *.constants.ts, index.ts, and all files under dto/ directories.
