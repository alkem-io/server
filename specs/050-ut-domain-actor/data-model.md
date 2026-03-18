# Data Model: src/domain/actor

**Created**: 2026-03-12

## Entity Hierarchy (CTI - Class Table Inheritance)

```
Actor (base table: "actor")
  |-- type: ActorType (CTI discriminator)
  |-- credentials: Credential[] (OneToMany, cascade)
  |-- profile: IProfile (inherited from NameableEntity)
  |-- authorization: IAuthorizationPolicy (inherited from AuthorizableEntity)
  |-- nameID: string (inherited from NameableEntity)
  |
  |-- User (child table, type='user')
  |-- Organization (child table, type='organization')
  |-- VirtualContributor (child table, type='virtual-contributor')
  |-- Space (child table, type='space')
  |-- Account (child table, type='account')
```

## Credential Entity

```
Credential (table: "credential")
  |-- id: UUID (PK)
  |-- type: string (credential type enum)
  |-- resourceID: string (scoped resource)
  |-- actorID: UUID (FK -> actor.id, onDelete CASCADE)
  |-- issuer: UUID (nullable)
  |-- expires: Date (nullable)
```

## GraphQL Types

- **IActor** (ObjectType "Actor"): Lightweight - id, type, profile. No nameID, no credentials in schema.
- **IActorFull** (InterfaceType "ActorFull"): Full - id, type, nameID, authorization, credentials, profile, dates. Resolves to concrete types.
- **ICredential** (ObjectType "Credential"): resourceID, type, issuer, expires (as timestamp via resolver).

## Cache Keys

- Actor entity: `@actor:id:{actorID}`
- Actor type: `@actorType:{actorID}`
- Actor context: managed by ActorContextCacheService

## Service Class Map

| Class | Responsibilities |
|-------|-----------------|
| ActorService | Actor CRUD, credential grant/revoke, cache management |
| ActorLookupService | Type-aware lookup, batch validation, credential/auth retrieval |
| ActorTypeCacheService | Cache layer for actor type (immutable) |
| CredentialService | Credential CRUD, search, batch count |
| ActorAuthorizationService | Inherit parent authorization policy |
| ActorResolverMutations | GraphQL mutations with platform admin auth |
| ActorResolverQueries | GraphQL query with READ auth |
| ActorResolverFields | Field resolvers for IActor (profile, auth, credentials) |
| ActorFullResolverFields | Field resolvers for IActorFull |
| CredentialResolverFields | Expires timestamp conversion |
