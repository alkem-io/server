# Feature Specification: Enable Memo as Valid Collection Contribution Type

**Feature Branch**: `001-memo-collection-contribution`
**Created**: 2025-11-06
**Status**: Draft
**Input**: User description: "Enable Memo as a valid contribution type inside Collections (response type). As a user, I want to be able to include and use memos inside collections (response type), similarly to posts and whiteboards."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create Memo Contribution in Collection (Priority: P1)

As a Space member, I want to create a memo as a response to a collection-type callout so that I can contribute structured, collaborative documents alongside posts and whiteboards.

**Why this priority**: This is the core functionality that enables memos to be used in collections. Without this, users cannot create memo contributions, making all other functionality moot.

**Independent Test**: Can be fully tested by creating a collection callout that allows memo contributions, then successfully creating a memo contribution through the GraphQL mutation, and verifying the memo appears in the collection's contributions list. Delivers the fundamental value of memo contributions.

**Acceptance Scenarios**:

1. **Given** a collection callout exists with memo contributions enabled in its settings, **When** a user creates a new memo contribution with valid data, **Then** the memo is successfully created and associated with the collection
2. **Given** a collection callout exists without memo in allowed contribution types, **When** a user attempts to create a memo contribution, **Then** the system rejects the request with a validation error
3. **Given** a user has appropriate permissions to contribute to a collection, **When** they submit a memo with markdown content, **Then** the memo is created with all metadata (title, createdBy, content, timestamps)

---

### User Story 2 - Query Memo Contributions from Collections (Priority: P2)

As a Space member, I want to retrieve and view memos from collection callouts so that I can see all contributions including memos in a unified response.

**Why this priority**: Essential for displaying memos in the UI alongside other contribution types. Required for users to see the memos they and others have created.

**Independent Test**: Can be tested by querying a collection callout's contributions and verifying that memo contributions are returned with complete metadata (title, author, preview, timestamps). Delivers the ability to display memos in collection views.

**Acceptance Scenarios**:

1. **Given** a collection contains multiple memo contributions, **When** a user queries the collection's contributions, **Then** all memo contributions are returned with complete metadata
2. **Given** a collection contains mixed contribution types (posts, whiteboards, memos), **When** a user queries with a filter for memo types only, **Then** only memo contributions are returned
3. **Given** a memo contribution exists in a collection, **When** queried, **Then** the response includes title, createdBy, updatedAt, and content preview fields

---

### User Story 3 - Update and Delete Memo Contributions (Priority: P3)

As a Space member, I want to update or delete my memo contributions in collections so that I can maintain accurate and relevant content.

**Why this priority**: Important for content maintenance but users can initially work around this by creating new memos. Lower priority than creation and viewing.

**Independent Test**: Can be tested by creating a memo contribution, then updating its content and metadata, and verifying the changes persist. Then deleting the memo and confirming it no longer appears in the collection.

**Acceptance Scenarios**:

1. **Given** a user created a memo contribution, **When** they update the memo's title or content, **Then** the changes are saved and the updatedAt timestamp is refreshed
2. **Given** a user has appropriate permissions, **When** they delete a memo contribution, **Then** the memo is removed from the collection and database
3. **Given** a memo contribution is updated, **When** querying the collection, **Then** the updated content and timestamp are reflected in the response

---

### User Story 4 - Configure Collection Settings for Memos (Priority: P2)

As a Space administrator, I want to configure collection callout settings to enable or disable memo contributions so that I can control what types of contributions are allowed.

**Why this priority**: Critical for administrators to have control over contribution types. Required before users can create memo contributions.

**Independent Test**: Can be tested by creating a collection callout with memo in the allowedTypes array, then verifying users can create memo contributions. Then removing memo from allowedTypes and confirming creation is blocked.

**Acceptance Scenarios**:

1. **Given** an administrator creates a collection callout, **When** they include memo in the allowedTypes setting, **Then** users can create memo contributions to that collection
2. **Given** a collection callout exists with memo contributions enabled, **When** an administrator removes memo from allowedTypes, **Then** new memo contributions are rejected but existing ones remain accessible
3. **Given** a collection callout is configured, **When** querying its settings, **Then** the allowedTypes array correctly reflects whether memo is enabled

---

### Edge Cases

- What happens when a memo contribution exists but the memo entity is deleted directly (orphaned contribution)?
- How does the system handle memo contributions when collection settings change to disallow memos after some exist?
- What happens when querying contributions and a memo's profile or authorization is missing?
- How are memo contributions counted when generating collection statistics?
- What happens when attempting to create a memo contribution with invalid content or missing required fields?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST recognize memo as a valid CalloutContributionType in the CalloutContribution entity and related enums
- **FR-002**: System MUST allow memo to be included in the allowedTypes array of CalloutSettingsContribution
- **FR-003**: Users MUST be able to create a memo contribution through the createCalloutContribution mutation when memo is in allowedTypes
- **FR-004**: System MUST persist the relationship between a CalloutContribution and its associated Memo entity
- **FR-005**: System MUST return memo contributions when querying a collection's contributions list
- **FR-006**: System MUST include memo metadata in GraphQL responses including: title (from Profile), createdBy (user ID), updatedAt timestamp, content preview
- **FR-007**: System MUST validate that only allowed contribution types can be created in a collection
- **FR-008**: System MUST support filtering contributions by type, including memo type
- **FR-009**: System MUST correctly count memo contributions in collection statistics (CalloutContributionsCountOutput)
- **FR-010**: System MUST apply appropriate authorization policies to memo contributions consistent with post and whiteboard policies
- **FR-011**: System MUST emit domain events for memo contribution lifecycle (created, updated, deleted) following existing contribution event patterns
- **FR-012**: System MUST expose memo contribution metadata through search indexes with the same structure as post contributions
- **FR-013**: System MUST support sorting and ordering of memo contributions within collections following existing contribution ordering patterns
- **FR-014**: System MUST handle memo contribution deletion including cleanup of associated authorization policies and profiles

### Key Entities

- **CalloutContribution**: The aggregate root representing a contribution to a collection. Already supports post, whiteboard, and link types. Must now support memo type with proper relationship mapping to Memo entity.
- **Memo**: The entity representing a collaborative document. Already exists with Profile, Authorization, and content management. Must be properly associated with CalloutContribution.
- **CalloutSettingsContribution**: Configuration entity defining allowed contribution types for a collection. Must include memo in its validation and allowed types enumeration.
- **CalloutContributionsCountOutput**: Output type for collection statistics. Already includes memo count field; must ensure proper counting logic.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can successfully create memo contributions in collections where memo type is enabled
- **SC-002**: Collection queries return memo contributions with complete metadata within 200ms for collections with up to 100 contributions
- **SC-003**: Memo contributions are correctly counted in collection statistics with 100% accuracy
- **SC-004**: Authorization checks for memo contributions complete in under 50ms per contribution
- **SC-005**: All existing automated tests for collection contributions pass with memo type included
- **SC-006**: Schema contract validation passes with no breaking changes to existing collection-related GraphQL types

### Assumptions

- Memo entity structure and lifecycle are stable and do not require changes for collection support
- Authorization patterns for memo contributions follow the same model as post and whiteboard contributions
- Collection UI components already handle dynamic contribution types and require no server-side rendering support
- Existing Profile and Authorization relationships on Memo entity are sufficient for collection requirements
- Search indexing for memos follows the same pattern established for posts and whiteboards
- No new metadata fields need to be added to Memo entity for collection support

### Dependencies

- Existing Memo entity, service, and resolver infrastructure
- CalloutContribution entity and service layer
- CalloutSettings configuration management
- Authorization policy framework for contributions
- GraphQL schema generation and contract validation tooling

### Constraints

- Must maintain backward compatibility with existing collection queries and mutations
- Cannot introduce breaking changes to GraphQL schema (CalloutContributionType enum already includes MEMO)
- Must follow existing domain event patterns for contribution lifecycle
- Must align with existing authorization policy patterns for collection contributions
- No database migrations required as memo support in contributions already exists at the entity level

- **SC-006**: Schema contract validation passes with no breaking changes to existing collection-related GraphQL types
