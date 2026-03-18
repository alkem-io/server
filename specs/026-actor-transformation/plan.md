# Implementation Plan: Actor Transformation

**Branch**: `026-actor-transformation-v2` | **Date**: 2025-12-27 | **Spec**: [spec.md](./spec.md)
**Implementation**: Complete (commit `a899ef55` on `026-actor-transformation`, follow-up bug fixes and renames on `026-actor-transformation-v2`)
**Input**: Feature specification from `/specs/026-actor-transformation/spec.md`

## Summary

Unify credential-holding entities (User, Organization, VirtualContributor, Space, Account) under a single **Actor** abstraction. This replaces the Agent pattern with a direct identity model where entity ID = actor ID, eliminates ~400 lines of duplicated CRUD logic, and enables proper FK constraints for actor references throughout the codebase.

## Technical Context

**Language/Version**: TypeScript 5.3
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo Server 4
**Storage**: PostgreSQL 17.5
**Testing**: Jest (pnpm test:ci)
**Target Platform**: Linux server (Node.js 22 LTS)
**Project Type**: Single NestJS application
**Performance Goals**: No degradation from current credential operations
**Constraints**: Zero downtime migration (single production instance)
**Scale/Scope**: ~3k TypeScript files, 5 actor types, ~15 tables with actor references

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Domain-Centric Design | ✅ PASS | Actor entity in `src/domain/actor/`, credential logic in domain services |
| 2. Modular NestJS Boundaries | ✅ PASS | New ActorModule with single purpose; removes ContributorBase reducing coupling |
| 3. GraphQL Schema as Stable Contract | ⚠️ REVIEW | Adding IActor interface (non-breaking), deprecating Agent-related types |
| 4. Explicit Data & Event Flow | ✅ PASS | Actor operations via domain services with event emission |
| 5. Observability & Operational Readiness | ✅ PASS | Structured logging for actor operations, migration validation |
| 6. Code Quality with Pragmatic Testing | ✅ PASS | Risk-based testing for migration and credential operations |
| 7. API Consistency & Evolution | ✅ PASS | IActor follows naming conventions, actor(id) query descriptive |
| 8. Secure-by-Design | ✅ PASS | Authorization policies transferred from Agent to Actor |
| 9. Container & Deployment Determinism | ✅ PASS | Migration is idempotent, no runtime env changes |
| 10. Simplicity & Incremental Hardening | ✅ PASS | Reduces complexity by eliminating Agent indirection |

**Schema Change Impact**: New IActor interface exposes existing entities uniformly. No breaking field removals. Agent-related types will be deprecated with removal date.

## Project Structure

### Documentation (this feature)

```text
specs/026-actor-transformation/
├── plan.md              # This file
├── research.md          # Phase 0 output (current state analysis)
├── data-model.md        # Phase 1 output (Actor entity design)
├── quickstart.md        # Phase 1 output (implementation guide)
├── contracts/           # Phase 1 output (GraphQL schema additions)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── actor/                    # NEW: Actor domain module
│   │   ├── actor/
│   │   │   ├── actor.entity.ts
│   │   │   ├── actor.service.ts
│   │   │   ├── actor.resolver.field.ts
│   │   │   └── actor.module.ts
│   │   └── credential/           # MOVED from agent/
│   │       ├── credential.entity.ts
│   │       ├── credential.service.ts
│   │       └── credential.module.ts
│   ├── agent/                    # DEPRECATED: Remove after migration
│   ├── community/
│   │   ├── user/                 # UPDATE: Remove agent relationship
│   │   ├── organization/         # UPDATE: Remove agent relationship
│   │   ├── virtual-contributor/  # UPDATE: Remove agent relationship
│   │   └── contributor/          # REMOVE: ContributorBase no longer needed
│   └── space/
│       ├── space/                # UPDATE: Remove agent relationship
│       └── account/              # UPDATE: Remove agent relationship
├── services/
│   └── api/                      # UPDATE: Actor resolvers
└── platform/
    └── in-app-notification/      # UPDATE: triggeredByID FK to Actor

test/
├── functional/
│   └── integration/
│       └── actor/                # NEW: Actor integration tests
└── unit/
    └── domain/
        └── actor/                # NEW: Actor unit tests
```

**Structure Decision**: Follows existing NestJS modular architecture. Actor module created under `src/domain/actor/` with credential subdomain. Existing entity files updated in place.

## Complexity Tracking

> No constitution violations requiring justification.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Class Table Inheritance | Used for Actor → User/Org/VC/Space/Account | Required by spec for ID = entityId pattern |
| Single Migration | Direct cutover | Single production instance; no phased rollout needed |
| FK Constraints | Added to createdBy/issuer columns | Resolves circular dependency issues documented in codebase |

---

## Phase 0: Research ✅ Complete

See [research.md](./research.md) for:
- Current Agent entity structure and relationships
- All 5 credential-holding entity types mapped
- Actor reference columns inventory (createdBy, issuer, triggeredBy)
- Notification table analysis
- Services requiring updates
- Migration complexity assessment

---

## Phase 1: Design ✅ Complete

### Deliverables

1. **data-model.md** ✅: Actor entity TypeORM definition with Class Table Inheritance,
   ActorType enum (USER, ORGANIZATION, VIRTUAL, SPACE, ACCOUNT), profile_id, credentials.

2. **contracts/actor.graphql** ✅: GraphQL schema — Actor ObjectType (lightweight),
   ActorFull InterfaceType (polymorphic), actor(id) query, grantCredentialToActor /
   revokeCredentialFromActor mutations.

3. **quickstart.md** ✅: Implementation guide for all phases.

---

## Phase 2: Tasks ✅ Complete

See [tasks.md](./tasks.md) — all phases implemented.

---

## Phase 3: Implementation ✅ Complete

661 files changed, 11161 insertions, 13977 deletions (commit `a899ef55`).

### Key implementation notes (divergences from original design)

| Aspect | Design | Actual |
|--------|--------|--------|
| GraphQL types | Single `IActor` interface | `Actor` ObjectType (lightweight) + `ActorFull` InterfaceType (polymorphic) |
| VIRTUAL type value | `VIRTUAL_CONTRIBUTOR = 'virtual-contributor'` | Initially `VIRTUAL = 'virtual'`; renamed back to `VIRTUAL_CONTRIBUTOR = 'virtual-contributor'` in migration 1771000020000 |
| `actorsWithCredential` | Public `Query` type | Admin query (AdminAuthorizationResolverQueries), gated by `READ_USERS` |
| `grantCredentialToActor` args | `GrantCredentialToActorInput` wrapper | Flat args: `actorID`, `credentialType`, `resourceID?` |
| `revokeCredentialFromActor` args | `RevokeCredentialFromActorInput` wrapper | Flat args: `actorID`, `credentialType`, `resourceID?` |
| TypeScript property name | `actorId` | `actorID` (DB column `actorId` preserved via `name:`) |
| Per-type credential mutations | Implied removal | Still exist alongside new unified mutations |

### Phase 4: Bug Fixes ✅ Complete (branch `026-actor-transformation-v2`)

Post-refactor issues identified and fixed:

1. `kratos.service.ts`: `authenticate()` was passing Kratos UUID instead of `alkemio_actor_id`
2. `createUserNewRegistration` mutation: removed (identity resolver already handles registration flow)
3. `buildForActor()`: was returning anonymous context for non-User types; fixed to query base Actor table
4. `graphql.guard.ts`: `createAnonymous()` was not setting `isAnonymous=true`; delegated to `ActorContextService`
5. DataLoader batch contract violation in `actor.loader.creator.ts`: fixed with Map-based ordering
6. `IActorFull.resolveType()`: `instanceof` checks replaced with discriminator field switch
7. Migration `1771000019000`: added missing FK `invitation.invitedActorId → actor(id) ON DELETE CASCADE`
8. Typo `priviilege` → `privilege` in `authorization.rule.actor.privilege.ts`
9. Wrong `LogContext.WHITEBOARD_INTEGRATION` → `LogContext.AUTH` in `actor.context.service.ts`
