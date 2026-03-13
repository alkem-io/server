# Research: src/domain/actor Code Analysis

**Created**: 2026-03-12

## Directory Structure

```
src/domain/actor/
  actor.module.ts              -- Root module re-exporting sub-modules
  index.ts                     -- Barrel exports
  actor/
    actor.defaults.ts          -- Static reference data (linkedin, github, bsky)
    actor.entity.ts            -- TypeORM CTI base entity
    actor.full.resolver.fields.ts -- IActorFull field resolver (profile, auth, credentials)
    actor.interface.ts         -- IActor and IActorFull GraphQL types
    actor.module.ts            -- NestJS module
    actor.resolver.fields.ts   -- IActor field resolver (profile, auth, credentials)
    actor.resolver.mutations.ts -- grantCredentialToActor, revokeCredentialFromActor
    actor.resolver.queries.ts  -- actor(id) query
    actor.service.authorization.ts -- Applies parent authorization policy
    actor.service.ts           -- Core service: CRUD, credentials, caching
    dto/                       -- Filter, query args, index
  actor-lookup/
    actor.lookup.module.ts     -- NestJS module
    actor.lookup.service.cache.ts -- ActorType cache (get/set/delete)
    actor.lookup.service.ts    -- Full actor lookup: type resolution, auth, credentials
  credential/
    credential.definition.interface.ts
    credential.definition.ts   -- Simple CredentialDefinition class
    credential.entity.ts       -- TypeORM entity
    credential.interface.ts    -- ICredential GraphQL type
    credential.module.ts       -- NestJS module
    credential.resolver.fields.ts -- expires field resolver
    credential.service.ts      -- CRUD + search + batch operations
    dto/                       -- Create and search DTOs
    index.ts                   -- Barrel exports
```

## Key Dependencies

### ActorService depends on:
- ConfigService (cache TTL)
- CredentialService (credential operations)
- Repository<Actor> (TypeORM)
- LoggerService (Winston)
- Cache (cache-manager)
- ActorContextCacheService (context cache invalidation)
- ActorTypeCacheService (type cache invalidation)

### ActorLookupService depends on:
- EntityManager (TypeORM - queries Actor, User, Org, VC, Space, Account)
- ActorTypeCacheService (type cache)

### CredentialService depends on:
- Repository<Credential> (TypeORM)

### ActorAuthorizationService depends on:
- AuthorizationPolicyService

## Business Logic Summary

1. **ActorService**: Manages actor CRUD with credential grant/revoke. Uses 3-layer cache invalidation (entity cache, context cache, type cache). Cache-first reads for actor credentials.

2. **ActorLookupService**: Type-aware actor lookup using CTI pattern. Resolves actor type from cache/DB, then queries appropriate child table (User/Org/VC/Space/Account). Batch validation with cache-first pattern.

3. **ActorTypeCacheService**: Simple cache wrapper for ActorType keyed by actor ID. Supports batch get/set.

4. **CredentialService**: CRUD operations for credentials. Uses QueryBuilder for search with optional resourceID filtering. Batch counting with OR conditions.

5. **getActorType()**: Standalone function extracting ActorType from IActor, throwing if not set.
