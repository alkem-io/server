# Feature Specification: Authorization Reset Performance Optimization

**Feature Branch**: `042-auth-reset-optimization`
**Created**: 2026-03-19
**Status**: Draft
**Input**: User description: "Optimize authorization reset: add missing indexes, split deep nested profile query, eliminate redundant saveAll cascades, batch RabbitMQ messages, and enable bulk UPDATE for authorization policies"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Batch Authorization Reset Messaging (Priority: P1)

When a platform administrator triggers a full authorization reset, the system consolidates entity identifiers into batch messages rather than emitting one message per entity. This dramatically reduces message queue overhead and allows handlers to process entities in groups, enabling database-level bulk operations within each batch.

**Why this priority**: The current per-entity messaging pattern generates ~4,400+ individual RabbitMQ messages for a typical deployment (2,184 users + 1,868 spaces + 385 organizations). Each message triggers an independent load-compute-save cycle. Batching is the single highest-impact change because it unlocks bulk database operations downstream.

**Independent Test**: Can be tested by triggering `publishAuthorizationResetAllUsers()` and verifying that the number of RabbitMQ messages emitted equals `ceil(totalUsers / batchSize)` instead of `totalUsers`. Handlers must produce identical authorization policy state as the current per-entity approach.

**Acceptance Scenarios**:

1. **Given** a platform with 2,184 users, **When** a full user authorization reset is triggered, **Then** the system emits batch messages (e.g., 50 entities per message) instead of 2,184 individual messages
2. **Given** a batch message containing 50 user IDs, **When** the handler processes the batch, **Then** all 50 users have their authorization policies recomputed and persisted correctly
3. **Given** a batch message where one entity fails authorization recomputation, **When** the handler processes the batch, **Then** the failing entity is logged and retried individually without blocking the remaining entities in the batch

---

### User Story 2 - Split Deep Nested Profile Query (Priority: P2)

When the system recomputes authorization for a profile, it loads the profile's child entities in separate focused queries rather than a single deeply nested LEFT JOIN that spans profile → references → tagsets → visuals → storageBucket → documents → document.tagset. This eliminates the cartesian product explosion that occurs when profiles have many child entities across multiple relation branches.

**Why this priority**: Profiles with thousands of documents produce massive intermediate result sets in a single query. Splitting into separate queries (profile + authorization, then references, then tagsets, then visuals, then storageBucket with documents) avoids the multiplicative row explosion and reduces memory pressure on both the database and application.

**Independent Test**: Can be tested by resetting authorization on a profile with 100+ references, 50+ tagsets, 20+ visuals, and 500+ documents, and verifying that the resulting authorization policies are identical to the current single-query approach while using less memory and completing faster.

**Acceptance Scenarios**:

1. **Given** a profile with many child entities across all relation types, **When** authorization is reset for that profile, **Then** the system executes separate focused queries instead of one deeply nested join
2. **Given** the split query approach, **When** authorization reset completes, **Then** all child entity authorization policies match the outcome produced by the original single-query approach
3. **Given** a profile with zero child entities in some relation types, **When** authorization is reset, **Then** unnecessary queries for empty relation types are skipped

---

### User Story 3 - Add Missing Database Indexes (Priority: P3)

The database includes indexes on foreign key columns that are used during authorization reset queries, ensuring that entity lookups during the reset cascade do not trigger full table scans.

**Why this priority**: Two foreign key columns used during profile authorization loading lack indexes: `visual.mediaGalleryId` (added in a migration but never indexed) and `document.tagsetId` (OneToOne FK, no index). While existing indexes on `reference.profileId`, `tagset.profileId`, and `visual.profileId` are already in place, these two missing indexes cause unnecessary scan overhead during the reset cascade. This is a low-risk, high-confidence improvement.

**Independent Test**: Can be tested by running an EXPLAIN ANALYZE on the profile authorization loading query before and after the migration, verifying that index scans replace sequential scans on the affected columns.

**Acceptance Scenarios**:

1. **Given** the new migration has been applied, **When** the system loads visuals by `mediaGalleryId`, **Then** the database uses an index scan instead of a sequential scan
2. **Given** the new migration has been applied, **When** the system loads documents with their tagsets via `tagsetId`, **Then** the database uses an index scan instead of a sequential scan
3. **Given** an existing database with data, **When** the migration runs, **Then** it completes without data loss and is reversible

---

### User Story 4 - Eliminate Redundant saveAll() Cascades (Priority: P4)

When authorization policies are recomputed through the entity hierarchy, each level collects updated policies and delegates persistence to its caller rather than saving independently at intermediate levels. This eliminates redundant database round-trips where the same authorization policies flow through multiple save batches.

**Why this priority**: Currently, `DocumentAuthorizationService` and `StorageBucketAuthorizationService` each call `saveAll()` internally and return empty arrays. The parent (`ProfileAuthorizationService`) then collects all authorizations and the ultimate caller (`AuthResetController`) calls `saveAll()` again. While no data is duplicated (the leaf services return `[]`), this creates unnecessary database round-trips — each leaf-level `saveAll()` is a separate transaction that could be deferred to a single batch save at the top level.

**Independent Test**: Can be tested by resetting authorization on a profile and verifying that `saveAll()` is called exactly once (at the controller level) rather than at multiple levels of the cascade.

**Acceptance Scenarios**:

1. **Given** authorization reset is triggered for a user, **When** the cascade processes profile → storageBucket → documents, **Then** authorization policies are persisted in a single batch save at the top level
2. **Given** the refactored cascade, **When** authorization reset completes, **Then** all authorization policies are identical to the previous multi-save approach
3. **Given** a large entity tree with 500+ authorization policies, **When** the single batch save executes, **Then** it uses the existing chunking mechanism (configurable chunk size) to avoid oversized transactions

---

### User Story 5 - Bulk UPDATE for Authorization Policies (Priority: P5)

When processing batched authorization resets, the system uses bulk UPDATE statements to persist authorization policy changes for multiple entities in a single database operation, rather than issuing individual UPDATE statements per policy row.

**Why this priority**: The `inheritParentAuthorization` pattern resets and recomputes JSON column values (`credentialRules`, `privilegeRules`) for each authorization policy individually. Since these are JSON column updates, a single `UPDATE authorization_policy SET ... WHERE id IN (...)` per batch could replace hundreds of individual saves. However, this is the most architecturally complex change and depends on the batching infrastructure from Story 1.

**Independent Test**: Can be tested by resetting authorization for a batch of 50 users and verifying that the number of UPDATE statements issued to the database is proportional to the number of batches (not the number of individual authorization policies).

**Acceptance Scenarios**:

1. **Given** a batch of authorization policies with recomputed rules, **When** they are persisted, **Then** the system issues a CASE-based bulk UPDATE statement that sets `credentialRules` and `privilegeRules` per policy ID in a single SQL operation, rather than individual UPDATE statements per policy
2. **Given** the bulk UPDATE approach, **When** persistence completes, **Then** all authorization policy rows match the expected state
3. **Given** a batch where some policies fail validation, **When** the bulk UPDATE is attempted, **Then** the system falls back to individual saves for the failing subset and logs the errors

---

### Edge Cases

- What happens when a batch message is partially processed and the handler crashes mid-batch? The unacknowledged message must be retried, and already-persisted policies from the partial batch must be safely overwritten (idempotency).
- How does the system handle concurrent authorization resets (e.g., admin triggers reset while another reset is still in progress)? Existing task-based tracking must prevent overlapping resets.
- What happens when an entity referenced in a batch message has been deleted between message emission and handler processing? The handler must skip deleted entities gracefully and log a warning.
- What happens when the profile query split returns inconsistent data due to concurrent modifications? Authorization resets are eventually consistent — the next reset cycle will correct any transient inconsistencies.

## Clarifications

### Session 2026-03-19

- Q: When a batch handler encounters individual entity failures (FR-003), what is the error handling strategy at the RabbitMQ message level? → A: Handler ACKs the message, retries failed entities internally (in-process), logs persistent failures
- Q: How should the optimization's effectiveness be measured in production? → A: No additional observability — rely on existing logs and manual EXPLAIN ANALYZE
- Q: Should the batch size be a single global value or configurable per entity type? → A: Single global batch size (default 50) applied uniformly to all entity types
- Q: Must batch handlers be formally idempotent? → A: Yes — handlers MUST be idempotent; re-processing overwrites with the same result, no side effects
- Q: What is the required deployment ordering for the stories? → A: Minimal ordering — Story 5 requires Story 1 deployed first; Stories 2, 3, 4 are independent of each other and of 1/5

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST support batch RabbitMQ messages for authorization reset, grouping entity IDs into configurable batch sizes (default: 50 entities per message)
- **FR-002**: System MUST process batch authorization reset messages, recomputing policies for all entities in the batch within a single handler invocation
- **FR-003**: System MUST handle individual entity failures within a batch without failing the entire batch — the handler ACKs the RabbitMQ message, retries failed entities internally (in-process) up to the configured retry limit, and logs persistent failures. No message-level NACK or redelivery is used for partial failures.
- **FR-004**: System MUST load profile child entities (references, tagsets, visuals, storageBucket with documents) in separate focused queries instead of a single deeply nested LEFT JOIN
- **FR-005**: System MUST add database indexes on `visual.mediaGalleryId` and `document.tagsetId` foreign key columns via a reversible migration
- **FR-006**: System MUST consolidate authorization policy persistence into a single `saveAll()` call at the top-level handler rather than at multiple cascade levels
- **FR-007**: System MUST support bulk UPDATE operations for authorization policy persistence when processing batched resets
- **FR-008**: System MUST maintain backward compatibility — the final authorization policy state for every entity must be identical to the current per-entity approach
- **FR-009**: Batch handlers MUST be idempotent — re-processing an entity whose authorization was already updated in the current or a previous reset cycle MUST produce the same result with no side effects
- **FR-010**: System MUST preserve per-entity error isolation within batch processing — each entity is retried in-process (up to 5 attempts) on failure without blocking remaining entities in the batch. The RabbitMQ message is always ACKed; persistent failures are logged via task error tracking.
- **FR-011**: System MUST make batch size configurable via application configuration (environment variable / config file) as a single global value (default: 50) applied uniformly to all entity types

### Key Entities

- **Authorization Policy**: The core entity being optimized — contains `credentialRules` and `privilegeRules` as JSON columns. Each entity in the domain model (profile, reference, tagset, visual, document, storageBucket, etc.) has an associated authorization policy.
- **Auth Reset Event Payload**: The message structure emitted to RabbitMQ — currently contains a single entity ID and type, to be extended to support an array of entity IDs.
- **Profile Authorization Tree**: The hierarchy of entities whose authorization is cascaded from a profile: profile → references, tagsets, visuals, storageBucket → documents → document tagsets.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Full platform authorization reset (all users, spaces, organizations) completes in at least 60% less wall-clock time compared to the current per-entity approach on the same dataset
- **SC-002**: Number of RabbitMQ messages emitted during a full reset is reduced by at least 95% (from ~4,400 individual messages to ~90 batch messages at default batch size of 50)
- **SC-003**: Number of database round-trips during a single user's authorization reset is reduced by at least 50% through consolidated saves and bulk operations
- **SC-004**: Peak memory consumption during profile authorization loading does not increase compared to the current approach (split queries should use equal or less memory than the cartesian product query)
- **SC-005**: Authorization policy correctness is preserved — after a full reset, every entity's authorization policy matches the expected state as validated by existing integration tests

### Assumptions

- The existing `saveAll()` chunking mechanism (configurable chunk size, default 1000) is sufficient for bulk operations and does not need fundamental redesign
- RabbitMQ message size limits are not a concern at the proposed batch size of 50 entity IDs per message (each ID is a UUID string)
- The authorization reset is not time-critical for end users — it is an administrative background operation, so eventual consistency within the reset cycle is acceptable
- Database indexes on the two identified columns will not materially impact write performance for the affected tables, as inserts/updates to `visual` and `document` tables are infrequent relative to reads during auth reset
- Stories can be implemented and deployed incrementally with minimal ordering: Story 5 (Bulk UPDATE) requires Story 1 (Batch Messaging) deployed first; Stories 2, 3, and 4 are fully independent of each other and of the 1→5 dependency chain
