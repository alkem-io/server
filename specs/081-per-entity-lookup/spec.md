# Feature Specification: Per-Entity Lookup (Server-Side)

**Feature Branch**: `081-per-entity-lookup`
**Created**: 2026-03-18
**Status**: Draft
**Input**: Server-side changes to support per-entity URL resolution on the client. Extend the `lookupByName` GraphQL API with missing entity fields, remove authorization checks from all `lookupByName` resolvers (pure nameId-to-ID translation), deprecate the `urlResolver` GraphQL field, and eventually remove the monolithic URL parsing service (~1,100 lines). Companion to client spec `023-per-entity-url-resolver`.

## Clarifications

### Relationship to Client Spec

This spec covers **server-side changes only**. The client-side spec (`023-per-entity-url-resolver`) covers the migration from the monolithic `UrlResolverProvider` to per-entity resolution hooks. This server spec enables that migration by:

1. Making `lookupByName` auth-free (pure nameId-to-ID translation)
2. Extending `lookupByName` with missing entity types (forum discussion, callout)
3. Deprecating and eventually removing the server's URL parsing service

The server's URL **generation** service (`url.generator.service.ts`, ~1,250 lines) is **not affected** and continues producing `profile.url` values for all entities.

### Session 2026-03-18

- Q: Do forum discussions have a `nameId` field for lookup? → A: Confirmed. Discussion extends `NameableEntity` which declares `nameID`. `ForumDiscussionLookupService.getForumDiscussionByNameIdOrFail()` already exists.
- Q: Do callouts have a `nameId` field for lookup? → A: Confirmed. Callout entity has an explicit `nameID` column. No dedicated lookup-by-nameId service exists yet — one will need to be created.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Auth-Free NameId-to-ID Translation (Priority: P1)

As a client application, I want to resolve any entity's nameId to its internal ID without authorization checks, so that page layouts can render immediately while entity-level permission checks happen separately on entity data queries.

**Why this priority**: This is the foundational change. Without auth-free lookups, the client cannot decouple nameId resolution from permission checking, and non-blocking page rendering is impossible. Currently, 6 of 7 `lookupByName` fields enforce authorization, which means the client must wait for auth evaluation before even knowing which entity ID to fetch.

**Independent Test**: Can be tested by calling any `lookupByName` field as an unauthenticated user and verifying that a valid entity ID is returned (or null if the nameId does not exist), without any authorization errors.

**Acceptance Scenarios**:

1. **Given** an unauthenticated request, **When** calling `lookupByName.space(NAMEID: "existing-space")`, **Then** the space ID is returned without an authorization error.
2. **Given** an authenticated user without read access to a space, **When** calling `lookupByName.space(NAMEID: "private-space")`, **Then** the space ID is returned (permission checks happen on the subsequent entity query, not on lookup).
3. **Given** a request with any valid nameId for any supported entity type (user, organization, virtualContributor, innovationHub, innovationPack, template), **When** calling the corresponding `lookupByName` field, **Then** the entity ID is returned without authorization checks.
4. **Given** a request with a nameId that does not correspond to any entity, **When** calling the `lookupByName` field, **Then** null is returned (the field is already nullable).

---

### User Story 2 - Extended lookupByName for Missing Entity Types (Priority: P1)

As a client application resolving forum discussion and callout URLs, I want `lookupByName` to support resolving discussions and callouts by nameId, so that these entity types can be resolved without the monolithic URL resolver.

**Why this priority**: The current `lookupByName` API lacks fields for forum discussions and callouts. Without these, the client cannot fully migrate away from the monolithic URL resolver for all route types.

**Independent Test**: Can be tested by calling the new `lookupByName.forumDiscussion` and `lookupByName.callout` fields with valid nameIds and verifying correct ID resolution.

**Acceptance Scenarios**:

1. **Given** a valid forum discussion nameId, **When** calling `lookupByName.forumDiscussion(NAMEID: "discussion-name")`, **Then** the discussion's internal ID is returned.
2. **Given** a valid callout nameId and its parent calloutsSetId, **When** calling `lookupByName.callout(calloutsSetID: "...", NAMEID: "callout-name")`, **Then** the callout's internal ID is returned.
3. **Given** a non-existent discussion nameId, **When** calling `lookupByName.forumDiscussion(NAMEID: "nonexistent")`, **Then** null is returned.

---

### User Story 3 - Space Field Returns ID Instead of Full Object (Priority: P2)

As a client application using `lookupByName` for nameId-to-ID translation, I want the `space` field to return a scalar ID (like all other `lookupByName` fields) instead of a full `ISpace` object, so that the API is consistent and lightweight.

**Why this priority**: Currently, `lookupByName.space` returns an `ISpace` object while all other fields return `String` (ID). This inconsistency complicates client usage and sends unnecessary data. The client only needs the ID from `lookupByName`; full space data comes from a separate entity query. However, this is a **breaking change** and must be coordinated with the client migration.

**Independent Test**: Can be tested by calling `lookupByName.space(NAMEID: "...")` and verifying the response is a scalar string ID, not a nested object.

**Acceptance Scenarios**:

1. **Given** a valid space nameId, **When** calling `lookupByName.space(NAMEID: "my-space")`, **Then** a scalar string ID is returned (not an `ISpace` object).
2. **Given** the existing `SpaceUrlResolverQuery` on the client still requests `lookupByName.space` with subfields, **When** the return type changes, **Then** the client query must be updated simultaneously (coordinated deployment).

---

### User Story 4 - Deprecate urlResolver GraphQL Field (Priority: P2)

As a platform maintainer, I want the `urlResolver` GraphQL query to be marked as deprecated, so that consumers are warned to migrate to `lookupByName` before the field is removed.

**Why this priority**: The deprecation is a prerequisite to eventually removing the ~1,100-line URL parsing service. Marking it deprecated signals intent and gives any external consumers time to migrate.

**Independent Test**: Can be tested by inspecting the GraphQL schema and verifying the `urlResolver` field has a deprecation directive with a target removal date.

**Acceptance Scenarios**:

1. **Given** the GraphQL schema, **When** inspecting the `urlResolver` query field, **Then** it carries a `@deprecated` directive with the format `REMOVE_AFTER=YYYY-MM-DD | replaced by lookupByName per-entity fields`.
2. **Given** the deprecated `urlResolver` field, **When** a client calls it, **Then** it still functions correctly (deprecation does not break existing functionality).

---

### User Story 5 - Remove URL Parsing Service (Priority: P3)

As a platform maintainer, I want to remove the monolithic URL parsing service (`url.resolver.service.ts`, `url.resolver.utils.ts`, and related files) after all clients have migrated to `lookupByName`, to reduce codebase complexity by ~1,100 lines and eliminate the server's dependency on client route patterns.

**Why this priority**: This is the final cleanup step. It depends on all clients having fully migrated to per-entity lookups. It has no user-facing impact but significantly reduces maintenance burden.

**Independent Test**: Can be tested by removing the URL resolver files and verifying that the server builds, all tests pass, and no GraphQL field references the removed code.

**Acceptance Scenarios**:

1. **Given** all clients have migrated to `lookupByName`, **When** the `urlResolver` query field and its backing service are removed, **Then** the server builds successfully and all tests pass.
2. **Given** the removal, **When** reviewing the codebase, **Then** `url.resolver.service.ts` (~1,100 lines), `url.resolver.utils.ts` (~75 lines), and related DTO/module files are deleted.
3. **Given** the removal, **When** checking the GraphQL schema, **Then** the `urlResolver` query field and `UrlResolverQueryResults` type no longer exist.

---

### Edge Cases

- What happens when a nameId exists but the entity is soft-deleted or archived? Should `lookupByName` return the ID or null?
- How does removing auth from `lookupByName` affect rate-limiting or abuse scenarios (e.g., enumeration of valid nameIds by unauthenticated users)?
- What happens if two entity types share the same nameId string (e.g., a space and an organization both named "acme")? Each `lookupByName` field queries a single entity type, so this is safe — but worth verifying.
- How does the `template` field behave when the `templatesSetID` is valid but the nameId does not exist within that set?
- What happens when the `space` return type changes from `ISpace` to `String` mid-deployment (server updated before client)?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: All `lookupByName` resolver fields MUST perform pure nameId-to-ID translation without any authorization checks. Authorization MUST remain the responsibility of entity-level data queries.
- **FR-002**: The `lookupByName` API MUST support the following entity types: space, user, organization, virtualContributor, innovationHub, innovationPack, template, forumDiscussion, and callout.
- **FR-003**: New `lookupByName.forumDiscussion` field MUST accept a `NAMEID` argument and return the discussion's internal ID as a nullable string.
- **FR-004**: New `lookupByName.callout` field MUST accept a `calloutsSetID` and `NAMEID` argument and return the callout's internal ID as a nullable string.
- **FR-005**: The `lookupByName.space` field MUST return a scalar string ID instead of an `ISpace` object, matching the pattern of all other `lookupByName` fields.
- **FR-006**: The `urlResolver` GraphQL query field MUST be marked as deprecated using the format `REMOVE_AFTER=YYYY-MM-DD | replaced by lookupByName per-entity fields`.
- **FR-007**: All `lookupByName` fields MUST return null (not throw) when a nameId does not match any entity.
- **FR-008**: The URL parsing service (`url.resolver.service.ts`, `url.resolver.utils.ts`) MUST be removable without affecting any other server functionality once the `urlResolver` field is removed.
- **FR-009**: The URL generation service (`url.generator.service.ts`) MUST NOT be affected by any changes in this feature. It continues to generate `profile.url` values for all entities.
- **FR-010**: The GraphQL schema changes MUST follow the project's schema contract process: regenerate, sort, diff, and review breaking changes with CODEOWNER approval.

### Key Entities

- **LookupByNameQueryResults**: The GraphQL object type that hosts all `lookupByName` resolver fields. Currently has 7 fields; this feature adds 2 (forumDiscussion, callout) and modifies 1 (space return type).
- **UrlResolverQueryResults**: The GraphQL object type returned by the `urlResolver` query. To be deprecated and eventually removed along with its backing service.
- **NameId**: A human-readable string identifier used in URLs. Unique within each entity type. The lookup key for all `lookupByName` translations.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Any unauthenticated client can resolve any entity nameId to its internal ID via `lookupByName` without receiving authorization errors.
- **SC-002**: All 9 entity types (space, user, organization, virtualContributor, innovationHub, innovationPack, template, forumDiscussion, callout) are resolvable via `lookupByName`.
- **SC-003**: The `urlResolver` GraphQL field is marked deprecated in the schema with a defined removal date.
- **SC-004**: After full removal of the URL parsing service, the server codebase is reduced by approximately 1,100+ lines.
- **SC-005**: All existing server tests pass after auth removal from `lookupByName` (tests that specifically assert auth behavior on `lookupByName` are updated).
- **SC-006**: The `lookupByName` response time for any entity remains under 50ms for a single field query (it is a simple database lookup by indexed nameId column).
- **SC-007**: The URL generation service and `profile.url` computed field continue to work identically after all changes.

## Assumptions

- **A-001**: ~~Forum discussions have a `nameId` field that can be used for lookup.~~ **Confirmed**: Discussion extends `NameableEntity` with `nameID`; `ForumDiscussionLookupService` already provides `getForumDiscussionByNameIdOrFail()`. Callouts also have `nameID` but need a new lookup method.
- **A-002**: The `lookupByName` API is only consumed by the Alkemio client application, not external integrations. This assumption affects the breaking change risk assessment for the `space` return type change.
- **A-003**: Rate limiting or abuse protection for unauthenticated lookups is handled at the infrastructure level (e.g., API gateway, Oathkeeper) and does not need to be implemented in the `lookupByName` resolvers.
- **A-004**: The deprecation period for `urlResolver` will be coordinated with the client migration timeline defined in spec `023-per-entity-url-resolver`.
