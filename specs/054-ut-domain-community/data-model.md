# Data Model: Unit Tests for src/domain/community

## No Data Model Changes

This is a test-only task. No entity, migration, or schema changes are involved.

## Key Entities Referenced in Tests

The following entities are referenced by the services and resolvers under test. They are mocked via `repositoryProviderMockFactory` or `defaultMockerFactory`:

| Entity | Used By |
|--------|---------|
| User | UserIdentityService, UserResolverFields/Mutations/Queries |
| Organization | OrganizationResolverFields/Mutations/Queries |
| Community | CommunityResolverFields |
| CommunityGuidelines | CommunityGuidelinesResolverMutations |
| UserGroup | UserGroupResolverFields/Mutations |
| VirtualContributor | VirtualContributorResolverFields/Mutations/Queries/Subscriptions |
| OrganizationVerification | OrganizationVerificationResolverMutations |

## Key Interfaces

| Interface | Purpose |
|-----------|---------|
| KratosSessionData | Input for user identity resolution |
| BuildKratosDataOptions | Options for building session data from Kratos identity |
| ResolveOrCreateUserOptions | Options for user resolution flow |
| UserIdentityResult | Output of user identity resolution |
| ActorContext | Authorization context for GraphQL resolvers |
