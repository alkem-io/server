# Data Model: Unit Tests for src/common

## No Data Model Changes

This work involves test-only additions. No entity changes, no migrations, no schema modifications.

## Key Types Referenced in Tests

### ActorContext
Extracted from request by CurrentActor decorator. Contains actor identity, credentials, and auth state.

### IGraphQLContext
Global type defined in `src/types/graphql/graphql.context.ts`. Contains `req`, data loader context, and innovation hub token.

### InnovationHub (entity)
Injected into context by InnovationHubInterceptor via `INNOVATION_HUB_INJECT_TOKEN`.

### ValueProvider<string>
NestJS provider shape used by APP_ID_PROVIDER: `{ provide: token, useValue: string }`.
