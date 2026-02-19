# Feature Specification: Actor Transformation

**Feature Branch**: `026-actor-transformation-v2`
**Created**: 2025-12-27
**Status**: Implemented
**Input**: Unify credential-holding entities (User, Organization, VirtualContributor, Space, Account) under a single Actor abstraction, replacing the Agent pattern with shared identity and eliminating code duplication.

## Overview

This transformation introduces **Actor** as a first-class entity that unifies all entities capable of holding credentials. Currently, credentials are managed through a separate **Agent** entity with its own ID, creating indirection and code duplication. The Actor model collapses this into a single identity where the entity ID (e.g., User ID) IS the Actor ID.

### Current State Problems

1. **ID Duplication**: Each User/Org/VC has both its own ID and a separate Agent ID
2. **Credential Indirection**: Credentials reference Agent, not the entity directly
3. **Massive Code Duplication**: ~400 lines of nearly identical CRUD logic across User, Organization, and VirtualContributor services
4. **No Polymorphic Queries**: Cannot query "all credential holders" uniformly
5. **Weak References**: Some columns hold "might be any entity ID" without proper FK constraints

### Target State

1. **Single Identity**: Actor ID = Entity ID (userId IS actorId)
2. **Direct Credentials**: Credentials reference Actor directly
3. **Unified Logic**: Common operations extracted to ActorService
4. **Profile on Actor**: Actors optionally have profiles (null means no profile)
5. **GraphQL First-Class**: Actor exposed as interface for polymorphic queries

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Credential Management (Priority: P1)

Platform administrators and services need to grant, revoke, and query credentials for any credential-holding entity (User, Organization, VirtualContributor, Space, Account) through a single, consistent interface rather than going through the Agent indirection.

**Why this priority**: This is the core value proposition - credentials are the foundation of authorization. Simplifying this unlocks all other improvements.

**Independent Test**: Can be fully tested by granting a credential to a User and querying it back via the Actor abstraction. Delivers immediate value by simplifying credential operations.

**Acceptance Scenarios**:

1. **Given** a User with ID "user-123", **When** a credential is granted to actor "user-123", **Then** the credential is stored with actorId = "user-123" (no separate agentId)
2. **Given** a Space with license credentials, **When** querying credentials for actor "space-456", **Then** all license credentials are returned directly from the Actor
3. **Given** multiple credential holders of different types, **When** querying actors by credential type, **Then** a unified list of actors (User, Org, VC, Space, Account) is returned

---

### User Story 2 - Actor-Based GraphQL Queries (Priority: P2)

API consumers need to query any actor by ID and receive a polymorphic response that includes credentials, type information, and optional profile data, enabling uniform handling of all credential-holding entities.

**Why this priority**: Exposing Actor in GraphQL enables new query patterns and simplifies client code that currently handles User/Org/VC separately.

**Independent Test**: Can be tested by querying the `actor(id)` GraphQL query and receiving appropriate type resolution.

**Acceptance Scenarios**:

1. **Given** a User exists, **When** querying `actor(id: "user-123")`, **Then** returns IActor with type=USER, credentials populated, and profile non-null
2. **Given** a Space exists, **When** querying `actor(id: "space-456")`, **Then** returns IActor with type=SPACE, credentials populated, and profile null
3. **Given** actors with SPACE_ADMIN credential, **When** querying `actorsWithCredential(type: SPACE_ADMIN, resourceID: "space-789")`, **Then** returns all actors (regardless of type) holding that credential

---

### User Story 3 - Profile Association on Actor (Priority: P2)

The system needs to associate profiles directly with actors (for User, Organization, VirtualContributor) while allowing other actor types (Space, Account) to have no profile, using the presence/absence of profile_id as the indicator.

**Why this priority**: Moving profile to Actor prepares for future base_entity transformation where Profile will reference the subject rather than being owned by it.

**Independent Test**: Can be tested by creating actors of different types and verifying profile association behavior.

**Acceptance Scenarios**:

1. **Given** a new User is created, **When** the Actor is initialized, **Then** actor.profile_id is populated with a valid profile
2. **Given** a new Space is created, **When** the Actor is initialized, **Then** actor.profile_id is null
3. **Given** an existing actor, **When** checking if it has a profile, **Then** the check is simply `actor.profile_id IS NOT NULL` (no boolean flag needed)

---

### User Story 4 - Unified Actor Operations (Priority: P3)

Development teams need reduced code duplication when creating, updating, and deleting actors (User, Org, VC, Space, Account) by extracting common logic into shared services that operate on the Actor abstraction.

**Why this priority**: While valuable for maintainability, this is an internal improvement that doesn't change external behavior. Can be done incrementally after core Actor model is in place.

**Independent Test**: Can be tested by verifying that User/Org/VC creation all follow the same code path for common operations.

**Acceptance Scenarios**:

1. **Given** a request to create a User, **When** the creation completes, **Then** the Actor is created first, then User-specific initialization occurs
2. **Given** a request to delete an Organization, **When** the deletion completes, **Then** credentials are cleaned up via Actor, then Org-specific cleanup occurs
3. **Given** validation logic for nameID, **When** creating any actor with a nameID, **Then** the same validation service is used regardless of actor type

---

### User Story 5 - Migration of Existing Data (Priority: P1)

The system must migrate all existing Agent data to the Actor model without data loss, maintaining referential integrity and ensuring all existing credentials remain valid and accessible.

**Why this priority**: Without successful migration, the feature cannot be deployed. This is a prerequisite for all other stories.

**Independent Test**: Can be tested by running migration on a production clone and verifying credential counts match before and after.

**Acceptance Scenarios**:

1. **Given** a User with agentId "agent-456", **When** migration completes, **Then** an Actor exists with id = userId (not agentId), and credentials reference the Actor
2. **Given** credentials referencing agent.id, **When** migration completes, **Then** credentials reference actor.id (which equals the entity's original ID)
3. **Given** the Agent table with data, **When** migration completes successfully, **Then** the Agent table can be dropped with no orphaned references

---

### Edge Cases

- What happens when an entity is deleted while credentials still reference it? Credentials cascade delete with the Actor (see FR-009).
- How does the system handle queries for actors that don't exist? Returns null/empty, consistent with current entity lookup behavior.
- What happens if migration fails partway through? Transaction rollback ensures atomic migration; no partial state.
- How are notification-related tables handled? These require careful analysis as they may contain both generic actor references and specific entity type references. Each column must be evaluated individually to determine correct FK target (Actor vs specific entity table).

## Requirements *(mandatory)*

### Functional Requirements

#### Core Actor Model

- **FR-001**: System MUST create an Actor table with columns: id (UUID PK), type (PostgreSQL ENUM `actor_type_enum`), profile_id (UUID FK nullable), authorization_id (UUID FK), created_date, updated_date, version. Note: TypeORM entity uses camelCase (`profileId`, `authorizationId`); database columns use snake_case per PostgreSQL convention
- **FR-002**: System MUST support five ActorTypes: USER, ORGANIZATION, VIRTUAL, SPACE, ACCOUNT. *(Note: VIRTUAL_CONTRIBUTOR was shortened to VIRTUAL — DB enum value is `'virtual'`)*
- **FR-003**: Actor ID MUST be the same as the corresponding entity ID (User.id = Actor.id for that user's actor)
- **FR-004**: System MUST store credentials with a direct reference to Actor (actor_id column) instead of Agent
- **FR-005**: System MUST support nullable profile_id on Actor, where null indicates the actor type does not have a profile

#### Credential Operations

- **FR-006**: System MUST provide unified credential grant operation that takes actorId (not agentId)
- **FR-007**: System MUST provide unified credential revoke operation that takes actorId
- **FR-008**: System MUST support querying all actors with a specific credential type and optional resourceID
- **FR-009**: System MUST cascade delete credentials when an Actor is deleted

#### GraphQL Exposure

- **FR-010**: System MUST expose two GraphQL actor types: (1) `Actor` ObjectType — lightweight (id, type, profile only, no nameID or credentials) for display contexts; (2) `ActorFull` InterfaceType — full (id, type, nameID, authorization, credentials, profile, dates) for polymorphic queries resolving to User / Organization / VirtualContributor / Space / Account. *(Note: original design specified a single `IActor` interface; implementation uses a two-tier approach to avoid over-fetching in display contexts.)*
- **FR-011**: System MUST provide `actor(id)` query that returns the lightweight `Actor` type (nullable).
- **FR-012**: System MUST provide `actorsWithCredential` query for polymorphic credential lookups. This query returns `[ActorFull!]!` and is exposed as an **admin-only** query gated by `READ_USERS` platform privilege. *(Note: original design placed this in the public `Query` type.)*
- **FR-013**: User, Organization, VirtualContributor, Space, Account types MUST implement the `ActorFull` interface in GraphQL.

#### Entity Relationships

- **FR-014**: User, Organization, VirtualContributor, Space, Account entities MUST have their ID serve as FK to Actor table
- **FR-015**: System MUST maintain existing authorization policies on actors (transferred from Agent)
- **FR-016**: Profile entities associated with User/Org/VC MUST be referenced via Actor.profile_id
- **FR-017**: Existing columns that reference "any actor" generically (e.g., createdBy, issuer) MUST become proper FK constraints to Actor table. Columns that reference a specific actor type (e.g., Space.accountId → Account) MUST remain as FKs to that specific entity table, not Actor

#### Migration

- **FR-018**: System MUST migrate all existing Agent data to Actor table, preserving credentials and authorization
- **FR-019**: System MUST update credential.agent_id references to credential.actor_id during migration
- **FR-020**: System MUST populate Actor.id with the entity's ID (not the old Agent ID)
- **FR-021**: System MUST migrate existing FK constraints that reference Agent table to reference Actor table instead
- **FR-022**: System MUST carefully analyze notification-related tables to distinguish between generic actor references and specific entity type references before migration
- **FR-023**: System MUST remove Agent table and agent_id columns after successful migration

#### Contributor Removal

- **FR-024**: System MUST remove IContributor interface, replacing it with IActor
- **FR-025**: System MUST remove ContributorBase entity class, with Actor serving as the unifying abstraction

#### Authorization Continuity

- **FR-026**: System MUST maintain all existing authorization checks during and after migration

### Key Entities

- **Actor**: The unified identity for all credential-holding entities. Contains type discriminator, optional profile reference, authorization policy, and credentials collection. The Actor ID equals the corresponding entity ID (User.id = Actor.id).

- **Credential**: Permission or license token associated with an Actor. References Actor directly via actor_id foreign key. Types include authorization credentials (SPACE_ADMIN, ORGANIZATION_OWNER) and license credentials (SPACE_FREE, SPACE_PLUS).

- **Profile**: Display information (name, avatar, bio) optionally associated with an Actor. For User/Org/VC, profile_id is populated; for Space/Account, it is null.

- **User/Organization/VirtualContributor**: Actor types that have profiles and can participate in community memberships. Their ID serves as FK to Actor.

- **Space/Account**: Actor types that hold license credentials but don't have profiles (Space has SpaceAbout instead). Their ID serves as FK to Actor.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All credential operations complete using a single actor identifier instead of requiring separate entity ID and agent ID lookups
- **SC-002**: Code duplication across User, Organization, VirtualContributor, Space, and Account services reduced by at least 300 lines through shared Actor operations
- **SC-003**: All existing credentials remain valid and accessible after migration with zero data loss (credential count matches before and after)
- **SC-004**: GraphQL queries can retrieve any actor polymorphically using a single query endpoint
- **SC-005**: New actor creation requires only entity-specific initialization after common Actor setup (single code path for common operations)
- **SC-006**: System supports querying all credential holders of any type with a single query (no need for separate User/Org/VC/Space/Account queries)
- **SC-007**: Profile presence is determined solely by checking actor.profile_id nullability (no separate boolean flag)
- **SC-008**: Migration completes successfully on production-equivalent dataset with full rollback capability if errors occur
- **SC-009**: All columns referencing actors generically (createdBy, issuer, etc.) have proper FK constraints to Actor table; columns referencing specific entity types retain their specific FK constraints

## Assumptions

1. **Single Production Instance**: There is only one production instance (no blue-green or canary deployment), and server + client can be deployed simultaneously without backward compatibility concerns. Migration is a direct cutover with rollback via database restore if needed
2. **UUID Uniqueness**: No UUID collisions exist between User, Organization, VirtualContributor, Space, and Account tables (safe assumption with proper UUID generation)
3. **Profile Ownership**: Moving profile_id to Actor table does not break existing profile access patterns (profile is still loaded via relationship)
4. **Agent Cleanup**: Agent table has no other dependencies beyond what was analyzed (credentials, authorization)
5. **SpaceAbout Unchanged**: Space entities continue using SpaceAbout for their "profile-like" information; this is not unified with Profile
6. **Communication Adapter**: The communication adapter sync that currently uses agentId will work with actorId (same UUID value for existing entities)

## Dependencies

1. **Database Migration Infrastructure**: Requires TypeORM migration support for complex data transformation
2. **GraphQL Schema Generation**: Depends on schema regeneration after entity changes
3. **Authorization Service**: Must be updated to work with Actor instead of Agent for credential checks
4. **Existing Test Suite**: All tests referencing Agent must be updated
5. **Notification Table Analysis**: Notification-related tables require thorough code analysis to classify each reference column as generic-actor vs specific-entity before migration can proceed

## Clarifications

### Session 2025-12-27

- Q: How should FK references be handled during migration? → A: Distinguish between generic actor references (createdBy, issuer → Actor FK) and specific entity type references (Space.accountId → Account FK, not Actor). Each column must be evaluated individually.
- Q: Are there complex tables requiring special attention? → A: Notification-related tables require thorough analysis to classify each column before migration, as they may contain both reference types.
- Q: Can `contributorUserID`, `contributorOrganizationID`, `contributorVcID` in InAppNotification be consolidated? → A: Yes. Analysis of `extractCoreEntityIds()` confirms these are **mutually exclusive sparse columns** - only one is ever set based on `RoleSetContributorType`. Consolidate to single `contributorActorID` FK to Actor table.
- Q: Is `contributorType` in Invitation redundant with Actor? → A: Yes. With `invitedContributorID` becoming FK to Actor, the type is available via `Actor.type`. Remove `contributorType` column - all usages are runtime checks that can read from the joined Actor.
- Q: Are there other places with `contributorType`? → A: Found in 2 places, REMOVE both to avoid inconsistency: (1) **Invitation.contributorType column** - REMOVE, redundant with Actor.type; (2) **InAppNotification JSON payload** (`InAppNotificationPayloadSpaceCommunityContributor.contributorType`) - REMOVE, potential inconsistency point. Resolve type from Actor.type instead. Migration must strip `contributorType` from existing JSON payloads.
- Q: Should ActorType use PostgreSQL ENUM or VARCHAR? → A: Use **PostgreSQL ENUM** (`actor_type_enum`). Benefits: 4-byte storage (vs 5-20 byte VARCHAR), faster integer comparisons, DB-level validation. Follows `profile_type_enum` precedent in codebase. Actor types are stable, so ALTER TYPE overhead is acceptable.
- Q: How does Actor transformation affect entity creation flow? → A: **SIMPLIFIES** it significantly. Current: create User → create Agent → assign agent to user → save. New: create User (extends Actor) → save. Removes `agentService.createAgent()` calls from 5 services (User, Org, VC, Space, Account). Removes agent joins in queries. Communication adapter uses `user.id` directly (= actor.id). Estimated ~50-100 lines removed.

## Out of Scope

1. **Base Entity Transformation**: The broader base_entity abstraction (where all authorized entities share a base table) is a future phase, not part of this transformation
2. **Profile Subject Inversion**: Future change where Profile references the subject (base_entity) rather than being owned by entity is not included
3. **Space/Account Profile Addition**: Adding profiles to Space or Account is not part of this transformation
