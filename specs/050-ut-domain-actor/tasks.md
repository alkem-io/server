# Tasks: Unit Tests for src/domain/actor

**Created**: 2026-03-12
**Status**: Complete

## Task List

- [x] T1: Analyze all source files in src/domain/actor (identify testable files, dependencies, patterns)
- [x] T2: Create SDD spec artifacts (spec.md, plan.md, research.md, data-model.md, quickstart.md, tasks.md, checklists/requirements.md)
- [x] T3: Write `actor.service.spec.ts` - ActorService (getActorOrFail, getActorOrNull, saveActor, deleteActorById, getActorCredentials, findActorsWithMatchingCredentials, hasValidCredential, countActorsWithMatchingCredentials, grantCredentialOrFail, revokeCredential) + getActorType standalone function
- [x] T4: Write `actor.lookup.service.spec.ts` - ActorLookupService (getActorTypeById, isType, actorExists, getFullActorById, getFullActorByIdOrFail, getActorTypeByIdOrFail, validateActorsAndGetTypes, getActorAuthorizationOrFail, getActorById, getActorByIdOrFail, getActorCredentials, getActorCredentialsOrFail, actorsWithCredentials, getActorIDsWithCredential, countActorsWithCredentials, getActorsManagedByUser)
- [x] T5: Write `actor.lookup.service.cache.spec.ts` - ActorTypeCacheService (getActorType, setActorType, setActorTypes, getActorTypes, deleteActorType)
- [x] T6: Write `credential.service.spec.ts` - CredentialService (createCredential, save, getCredentialOrFail, deleteCredential, findMatchingCredentials, countMatchingCredentials, countMatchingCredentialsBatch, findCredentialsByActorID, createCredentialForActor, deleteCredentialByTypeAndResource)
- [x] T7: Write `actor.service.authorization.spec.ts` - ActorAuthorizationService (applyAuthorizationPolicy)
- [x] T8: Write `credential.resolver.fields.spec.ts` - CredentialResolverFields (expires)
- [x] T9: Write `actor.resolver.fields.spec.ts` - ActorResolverFields (credentials)
- [x] T10: Write `actor.full.resolver.fields.spec.ts` - ActorFullResolverFields (credentials)
- [x] T11: Write `actor.resolver.mutations.spec.ts` - ActorResolverMutations (grantCredentialToActor, revokeCredentialFromActor)
- [x] T12: Write `actor.resolver.queries.spec.ts` - ActorResolverQueries (actor)
- [x] T13: Run tests, fix failures, verify >=80% coverage
- [x] T14: Verify lint and typecheck pass
- [x] T15: Commit all changes
