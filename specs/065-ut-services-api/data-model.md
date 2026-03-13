# Unit Tests for src/services/api - Data Model

## No Data Model Changes
This is a test-only effort. No entities, migrations, or schema changes are required.

## Key Domain Types Referenced in Tests
- `ICredential` / `ICredentialDefinition` - used in roles utility functions
- `ISearchResult` - used in search cursor calculation
- `SearchInput` / `SearchFilterInput` - used in search validation
- `ActorContext` - used across all resolver tests
- `Space`, `Profile`, `Account` - entities referenced in role result mocks
- `AuthorizationCredential` - enum used in credential grouping
