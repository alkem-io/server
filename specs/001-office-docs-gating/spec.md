# Feature Specification: Office Documents Feature Gating

**Feature Branch**: `001-office-docs-gating`  
**Created**: 2026-04-21  
**Status**: Draft  
**Input**: User description: "Server-side business logic specification for gating and implementation of the `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement on the collaborative office documents feature, covering view, create, edit, and delete operations."

## Problem Statement

The Alkemio platform offers collaborative office document editing as a premium feature. The licensing plumbing (`SPACE_FLAG_OFFICE_DOCUMENTS` entitlement and `SPACE_FEATURE_OFFICE_DOCUMENTS` plan) was established in a prior change, but the server-side business logic that enforces this gate — controlling who can view, create, edit, and delete office documents based on the entitlement — has not yet been implemented.

Without this logic, all spaces can perform write operations on documents regardless of whether they hold the required entitlement, making the feature commercially ungated and inconsistent with how memo and whiteboard multi-user capabilities are gated elsewhere in the platform.

## Goals

- Implement consistent entitlement-based gating for office document write operations (create, edit, delete) across all Collaborations.
- Preserve read access regardless of entitlement status, allowing unlicensed spaces to observe a locked/preview state.
- Expose entitlement status to clients through the GraphQL API so UI can render appropriately without performing its own license traversal.
- Follow the exact patterns established by `SPACE_FLAG_MEMO_MULTI_USER` and `SPACE_FLAG_WHITEBOARD_MULTI_USER` to ensure consistency.

## Non-Goals

- Client/UI rendering of the locked state.
- Storage, file format, or MIME type validation for document content.
- Changes to the `Document` domain entity or the existing file-storage subsystem.
- Changes to `SPACE_FLAG_MEMO_MULTI_USER` or `SPACE_FLAG_WHITEBOARD_MULTI_USER` behavior.
- New license plans or credential rules beyond those already seeded by the prerequisite PR #5967.

## Assumptions

- The `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement is already seeded in the database and propagated to Collaboration licenses via the existing license cascade (PR #5967). No migration or seeding work is needed here.
- The `OfficeDocument` entity is traversable via the path: `OfficeDocument → CalloutContribution → Callout → CalloutsSet → Collaboration → License`.
- The gating pattern established for `SPACE_FLAG_MEMO_MULTI_USER` (via `collaborative-document-integration.service.ts` and `CommunityResolverService.getCollaborationLicenseFromMemoOrFail`) is the authoritative reference implementation.
- Platform admin and Space admin roles receive no bypass — entitlement gates capability regardless of role, matching memo/whiteboard multi-user behavior.
- The entitlement signal uses `LicenseService.isEntitlementEnabled()` (the `enabled` boolean on the `FLAG`-type entitlement), consistent with all other `SPACE_FLAG_*` entitlements including memo and whiteboard multi-user. The `limit ≥ 1` language in earlier drafts described commercial intent only — it is not the code path used by `FLAG`-type entitlements.

---

## Clarifications

### Session 2026-04-21

- Q: What should the server return for read queries on office documents in unlicensed Collaborations? → A: Return existing documents in read-only mode; unlicensed users can view all documents but write operations (create, edit, delete) are blocked by the entitlement gate.
- Q: What does "view" mean for unlicensed users in the context of the collaborative editing session? → A: Full read-only access — unlicensed users can open a document in the collaborative editor in read-only mode (single-viewer session, no edits permitted).
- Q: Should metadata mutations (e.g., rename, description update) also be gated by the entitlement? → A: Yes — all write mutations, including metadata updates, require the entitlement. Unlicensed users are strictly read-only.
- Q: Should entitlement-gate rejections be logged server-side? → A: Yes — log at warning level with structured Collaboration context (no document IDs in the message).
- Q: How should the server handle an active collaborative editing session when the entitlement is revoked mid-session? → A: Graceful degradation — no immediate push termination; the next `info` poll from the collaborative editor returns `{ read: true, update: false, isMultiUser: false, maxCollaborators: 1 }`, naturally ending the edit session on the client's next reconnect or poll cycle.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Unlicensed Space: Read-Only Document Access (Priority: P1)

A Space operator without the `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement visits the collaboration area. They can see the full list of existing office documents in read-only mode. The server returns the documents without error, and each document's `isEntitlementEnabled` field signals `false` so the client can render locked/upgrade controls. No write operations (create, edit, delete) are permitted.

**Why this priority**: Foundational — the read path is always exercised regardless of license status. Returning the real document list (not an empty one) ensures unlicensed users have a meaningful preview rather than a blank screen that looks like a bug.

**Independent Test**: Can be tested in isolation by sending a read (list/query) request for office documents on a Collaboration whose license has `SPACE_FLAG_OFFICE_DOCUMENTS` with `enabled = false`, verifying the full document list is returned with no license error, and each document's `isEntitlementEnabled` is `false`.

**Acceptance Scenarios**:

1. **Given** a Collaboration whose license has `SPACE_FLAG_OFFICE_DOCUMENTS.enabled = false`, **When** a user queries the office documents list, **Then** the server returns all existing documents and no license error.
2. **Given** a Collaboration whose license has no `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement, **When** a user queries the office documents list, **Then** the server returns all existing documents and no license error.
3. **Given** a Collaboration without the entitlement, **When** any user (including platform admin) queries documents, **Then** the response contains no license-error and each returned document has `isEntitlementEnabled = false`.

---

### User Story 2 — Licensed Space: Full Collaborative Editing (Priority: P1)

A Space operator whose Space holds the `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement (`enabled = true`) can create, edit collaboratively, and delete office documents within any Collaboration in that Space.

**Why this priority**: Core value delivery — without the ability to create and edit documents for licensed spaces, the feature provides no value.

**Independent Test**: Can be tested by sending create and delete mutations on a Collaboration whose license has `SPACE_FLAG_OFFICE_DOCUMENTS.enabled = true`, verifying mutations succeed (subject to existing authorization privileges), and confirming the collaborative editing session returns `update: true`.

**Acceptance Scenarios**:

1. **Given** a Collaboration with `SPACE_FLAG_OFFICE_DOCUMENTS.enabled = true`, **When** a user with CREATE privilege sends a create-document mutation, **Then** the document is created successfully.
2. **Given** a Collaboration with the entitlement, **When** the collaborative editing service is queried for a document, **Then** it returns `{ read: true, update: <auth result>, isMultiUser: true, maxCollaborators: N }` where N > 1.
3. **Given** a Collaboration with the entitlement, **When** a user with DELETE privilege sends a delete-document mutation, **Then** the document is deleted successfully.
4. **Given** a Collaboration with the entitlement, **When** a user without UPDATE_CONTENT privilege queries the editing service, **Then** the response returns `{ read: true, update: false, maxCollaborators: N }`.

---

### User Story 3 — Unlicensed Space: Write Operations Rejected (Priority: P1)

A user in a Space without the `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement attempts to create, update (metadata or content), or delete an office document. The server rejects all write operations with a clear license-entitlement error before any authorization check is performed. Unlicensed users are strictly read-only.

**Why this priority**: Core enforcement — without this, the commercial gate has no effect and premium capability is available to all spaces.

**Independent Test**: Can be tested by sending create, update-metadata, and delete mutations on a Collaboration with `SPACE_FLAG_OFFICE_DOCUMENTS.enabled = false`, verifying all return a `LICENSE_ENTITLEMENT_NOT_AVAILABLE` error.

**Acceptance Scenarios**:

1. **Given** a Collaboration with `SPACE_FLAG_OFFICE_DOCUMENTS.enabled = false`, **When** any user (including admin) attempts to create a document, **Then** the server returns a `LICENSE_ENTITLEMENT_NOT_AVAILABLE` error and no document is created.
2. **Given** a Collaboration without the entitlement, **When** any user attempts to update document metadata (e.g., rename, description), **Then** the server returns `LICENSE_ENTITLEMENT_NOT_AVAILABLE` and no update is applied.
3. **Given** a Collaboration without the entitlement, **When** any user attempts to delete a document, **Then** the server returns `LICENSE_ENTITLEMENT_NOT_AVAILABLE` and no document is deleted.
4. **Given** a Collaboration without the entitlement, **When** the platform admin attempts to create a document, **Then** the same `LICENSE_ENTITLEMENT_NOT_AVAILABLE` error is returned (no admin bypass).
5. **Given** a Collaboration without the entitlement, **When** the collaborative editing service is queried for a document, **Then** it returns `{ read: true, update: false, isMultiUser: false, maxCollaborators: 1 }` — allowing the user to open the document in the editor as a read-only viewer.

---

### User Story 4 — Client Rendering Signal via GraphQL Field (Priority: P2)

A client queries an office document and inspects its `isEntitlementEnabled` field to know whether the current Collaboration is licensed. This allows the client to conditionally render create/edit/delete controls without making a separate license traversal.

**Why this priority**: Enables client-side conditional UI without the client needing to understand license propagation internals. Decoupled from P1 stories but necessary for a complete integration.

**Independent Test**: Can be tested by querying the `isEntitlementEnabled` field on an `OfficeDocument` type in both a licensed and an unlicensed Collaboration, and verifying the returned value matches the entitlement status.

**Acceptance Scenarios**:

1. **Given** an office document in a licensed Collaboration, **When** the client queries `OfficeDocument.isEntitlementEnabled`, **Then** the field returns `true`.
2. **Given** an office document in an unlicensed Collaboration, **When** the client queries `OfficeDocument.isEntitlementEnabled`, **Then** the field returns `false`.
3. **Given** a sub-space Collaboration whose parent L0 Space holds the entitlement, **When** the client queries `isEntitlementEnabled` on a document in that sub-space, **Then** the field returns `true` (propagated via cascade).

---

### User Story 5 — Cross-Space Isolation (Priority: P2)

Two documents in different Spaces are independently gated by their own Collaboration licenses. Holding the entitlement in Space A does not allow write operations in Space B, and vice versa.

**Why this priority**: Security boundary — prevents license bleed-over between tenants.

**Independent Test**: Can be tested by verifying that a document in a licensed Space A allows creation, while a document in an unlicensed Space B returns `LICENSE_ENTITLEMENT_NOT_AVAILABLE`, using separate requests with the same authenticated user who has CREATE privilege in both.

**Acceptance Scenarios**:

1. **Given** Space A is licensed and Space B is not, **When** a user with CREATE privilege in both sends a create-document mutation to Space B's Collaboration, **Then** the mutation is rejected for Space B and succeeds for Space A.
2. **Given** two documents in different Spaces, **When** the entitlement is checked for each, **Then** each check uses only the Collaboration license that directly contains the document.

---

### Edge Cases

- What happens when a document's traversal path (OfficeDocument → Collaboration → License) is broken due to orphaned data? The server must throw `EntityNotFoundException` rather than returning a false negative or positive.
- What happens when a Space's license is updated to remove the entitlement mid-session? The server does NOT push a termination signal to active editing sessions. On the next `info` poll from the collaborative editor, the service returns `{ read: true, update: false, isMultiUser: false, maxCollaborators: 1 }`, causing the client to degrade to read-only mode naturally. Any subsequent mutation attempts are rejected with `LICENSE_ENTITLEMENT_NOT_AVAILABLE`.
- What happens when `SPACE_FLAG_OFFICE_DOCUMENTS` has `enabled = false` vs. the entitlement record is entirely absent? Both cases are treated identically as "not enabled" — the system must not distinguish them.
- What happens if an admin revokes the L0 Space credential? The cascade removes the entitlement from all sub-space Collaborations; existing documents remain readable but further writes are blocked.

---

## Requirements _(mandatory)_

### Functional Requirements

**Entitlement Signal**

- **FR-001**: The entitlement gate MUST use `LicenseService.isEntitlementEnabled(license, SPACE_FLAG_OFFICE_DOCUMENTS)` — the `enabled` boolean on the `FLAG`-type entitlement record on the containing Collaboration's license — consistent with all other `SPACE_FLAG_*` entitlements. The `limit` field has no semantic meaning for `FLAG`-type entitlements and MUST NOT be used as the gate signal.
- **FR-002**: The entitlement MUST always be read from the Collaboration that directly contains the document; no ambient Space-level context from the request may substitute.

**Read Operations**

- **FR-010**: When the `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement is absent or has `enabled = false`, the server MUST return the full existing document list for read queries without throwing a license error. Each returned document MUST have `isEntitlementEnabled = false`.
- **FR-011**: Read operations MUST NOT be blocked by the entitlement gate under any circumstance. Unlicensed users have read-only access to all documents in the Collaboration.

**Create Operations**

- **FR-020**: A create-document mutation MUST be rejected with a license-entitlement unavailability error when `SPACE_FLAG_OFFICE_DOCUMENTS` is not enabled on the containing Collaboration's license.
- **FR-021**: The entitlement check for create MUST be performed before the authorization privilege check on the document itself.

**Edit (Collaborative Session) Operations**

- **FR-030**: The collaborative editing service, when queried for a document in an unlicensed Collaboration, MUST return `{ read: true, update: false, isMultiUser: false, maxCollaborators: 1 }`. The `read: true` value means the user may open the document in the collaborative editor in read-only mode; `isMultiUser: false` signals single-viewer mode; `maxCollaborators: 1` caps collaborative writing participants to 1 (effectively no concurrent editing).
- **FR-031**: The collaborative editing service, when queried for a document in a licensed Collaboration, MUST return `{ read: true, update: <authorization result>, isMultiUser: true, maxCollaborators: N }` where N is the configured maximum collaborators per room.
- **FR-032**: The collaborative editing service MUST first check READ privilege; if denied, it MUST return `{ read: false, update: false, isMultiUser: false, maxCollaborators: 0 }` regardless of entitlement.
- **FR-033**: When the entitlement is revoked from a Collaboration while a collaborative editing session is active, the server MUST NOT push an active session termination signal. The next `info` poll MUST return `{ read: true, update: false, isMultiUser: false, maxCollaborators: 1 }`, causing the client to degrade to read-only mode naturally. No additional server-side mechanism is required to enforce this beyond the existing poll-based `info` handler.

**Delete Operations**

- **FR-040**: A delete-document mutation MUST be rejected with a license-entitlement unavailability error when `SPACE_FLAG_OFFICE_DOCUMENTS` is not enabled on the containing Collaboration's license.
- **FR-041**: The entitlement check for delete MUST be performed before the authorization privilege check on the document itself.

**Metadata Update Operations**

- **FR-042**: Any mutation that updates office document metadata (e.g., title/name, description) MUST be rejected with a license-entitlement unavailability error when `SPACE_FLAG_OFFICE_DOCUMENTS` is not enabled on the containing Collaboration's license.
- **FR-043**: The entitlement check for metadata updates MUST be performed before the authorization privilege check on the document itself. Unlicensed users have no write capability whatsoever — they are strictly read-only.

**License Traversal**

- **FR-050**: A service method MUST exist that, given a document identifier, resolves the Collaboration license by walking the path: document → contribution → callout → callouts-set → collaboration → license (with entitlements loaded).
- **FR-051**: If no Collaboration or License is found during traversal, the method MUST throw an entity-not-found error.

**Entitlement Query Helper**

- **FR-060**: A domain service method MUST exist that encapsulates the entitlement check for a given document identifier, returning a boolean result.
- **FR-061**: All call sites (editing service and mutation resolvers) MUST use this single method as the source of truth for entitlement status.

**GraphQL Entitlement Field**

- **FR-070**: The `OfficeDocument` GraphQL type MUST expose an `isEntitlementEnabled: Boolean!` field.
- **FR-071**: This field MUST resolve to `true` when the Collaboration license has `SPACE_FLAG_OFFICE_DOCUMENTS.enabled = true`, and `false` otherwise.

**Error Semantics**

- **FR-080**: All entitlement-gate failures MUST use the platform's standard license-entitlement unavailability error status.
- **FR-081**: Error messages MUST NOT include dynamic data such as document identifiers; structured properties on the error object MUST be used for any contextual details.

**Admin Bypass**

- **FR-090**: Platform admins and Space admins MUST NOT receive a bypass from the entitlement check. The gate applies uniformly regardless of role.

**Cross-Space Isolation**

- **FR-100**: Entitlement checks MUST use only the Collaboration that directly contains the document. No cross-Space license sharing or fallback is permitted.

**Observability**

- **FR-110**: Each entitlement-gate rejection (create, update-metadata, delete) MUST emit a structured warning-level log entry containing the Collaboration context. Dynamic data such as document identifiers MUST NOT appear in the log message; they MUST be placed in the structured log properties.
- **FR-111**: Successful entitlement checks MUST emit a debug-level log entry at `LogContext.LICENSE` with a static message and structured `collaborationId` property (no dynamic data in the message text), consistent with constitution Principle 5 (feature flags and license checks MUST log decision points). Read operations that pass through without an entitlement gate (i.e., read queries on documents) do NOT emit a log entry.

### Key Entities

- **OfficeDocument**: A collaborative office document owned by a CalloutContribution. Traversed to reach the Collaboration license. Key attributes: identifier, title, content reference, owning contribution.
- **CalloutContribution**: The contribution record that owns an OfficeDocument within a Callout.
- **Callout**: Groups contributions within a CalloutsSet. Bridge between contribution and the collaboration context.
- **CalloutsSet**: The container of Callouts within a Collaboration.
- **Collaboration**: The collaboration context for a Space or sub-space. Holds the License with its entitlements.
- **License (with Entitlements)**: The license record attached to a Collaboration. Contains entitlement records including `SPACE_FLAG_OFFICE_DOCUMENTS` with its `enabled` flag (`FLAG`-type entitlement; `limit` has no semantic meaning for this type).

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of create and delete mutations on office documents in unlicensed Collaborations are rejected with the correct license error — verifiable via contract tests.
- **SC-002**: 100% of read queries on office documents in unlicensed Collaborations return the full document list (not empty) with no license error, and each document has `isEntitlementEnabled = false` — verifiable via contract tests.
- **SC-003**: The `isEntitlementEnabled` GraphQL field returns the correct value for both licensed and unlicensed Collaborations in all tested scenarios — verifiable via unit and integration tests.
- **SC-004**: Cross-space isolation holds: a user with privileges in multiple Spaces cannot perform writes in an unlicensed Space, regardless of entitlements held in other Spaces — verifiable via integration tests.
- **SC-005**: The entitlement check traversal completes within the same response-time envelope as equivalent memo/whiteboard entitlement checks (no measurable regression in write-operation latency) — verifiable via performance benchmarks or load tests.
- **SC-006**: No new lint or type errors are introduced; the implementation passes the existing CI quality gates — verifiable via CI pipeline.
- **SC-007**: The collaborative editing service correctly returns `maxCollaborators = 1` for unlicensed Collaborations and the configured maximum for licensed ones — verifiable via unit tests on the integration service.
