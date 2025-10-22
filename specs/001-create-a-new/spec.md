# Feature Specification: Whiteboard Image Document Conversion Mutation

**Feature Branch**: `001-create-a-new`
**Created**: 2025-10-04
**Status**: Draft
**Input**: User description: "Create a new GraphQL mutation to convert an image contained in a Document entity for a Whiteboard via synchronous RabbitMQ RPC to an external microservice, retrieving an Excalidraw JSON file with embedded images."

## Execution Flow (main)

```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements

- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation

When creating this spec from a user prompt:

1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As a collaborator editing a whiteboard, I want to request conversion of an image stored in a Document linked to or accessible by the whiteboard so that I receive a downloadable Excalidraw JSON file that allows me to then directly work in excalidraw with a representation of the original image. This representation of the original image as excalidraw content may in turn still contain other images.

### Acceptance Scenarios

1. **Given** a valid Whiteboard (exists, user has access) and a Document containing an image asset, **When** the user invokes the mutation with whiteboardId and documentId, **Then** within ≤3s the system returns an acknowledged submission response (job queued or in-progress) AND (asynchronously) performs the RPC; once the Excalidraw JSON is ready it EITHER (a) injects the content into the active collaboration session if one exists OR (b) opens a new collaboration room (putting the whiteboard into edit mode) and then injects the content.
2. **Given** a Document ID that does not contain an image, **When** the mutation is invoked, **Then** the system rejects the request with a validation error indicating unsupported document content.
3. **Given** the external microservice returns an error status, **When** the mutation is invoked, **Then** the system returns a conversion failure error with a stable error code and does not create any stored result.
4. **Given** network timeout while awaiting RPC response, **When** the mutation is invoked, **Then** the system aborts, surfaces a timeout error, and logs correlation identifiers.
5. **Given** user lacks permission to access either the whiteboard or the document, **When** the mutation is invoked, **Then** an authorization error is returned.

### Edge Cases

- Document references corrupted metadata (missing mime type) → treat as non-image (validation failure).
- External service returns malformed URL → fail fast, surface integration error.
- Excalidraw JSON download returns HTTP 404 → conversion marked failed, error surfaced.
- Duplicate submission (same whiteboard + document while prior is in-flight) → either idempotent same result (if correlation key reused) or validation error [NEEDS CLARIFICATION: Is idempotency required for repeated requests?].
- Very large image (>10 MB) → validation failure before RPC dispatch with error code IMAGE_TOO_LARGE.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST expose a GraphQL mutation `convertWhiteboardDocumentImage(whiteboardId: ID!, documentId: ID!): ConversionResult!` (exact name subject to naming conventions finalization).
- **FR-002**: Mutation MUST validate that both Whiteboard and Document exist and the requesting user has required access (read on both; write on whiteboard if result is persisted there) before further processing.
- **FR-003**: System MUST verify the referenced Document contains a single image asset whose mime type is a member of the existing `MimeFileTypeVisual` enum (exact values centrally defined; no additional ad-hoc types permitted). Requests with mime types outside this enum MUST fail with UNSUPPORTED_IMAGE_TYPE.
- **FR-004**: If validation fails (missing entity, no permission, non-image content, unsupported type) the mutation MUST return a structured validation error with a domain error code (e.g., DOCUMENT_NOT_IMAGE, UNSUPPORTED_IMAGE_TYPE, NOT_AUTHORIZED).
- **FR-005**: On success mutation MUST initiate a synchronous RPC call over existing RabbitMQ setup to an external conversion microservice, including: correlation ID, source image retrieval URL, requested output format=Excalidraw.
- **FR-006**: RPC call MUST enforce a timeout (configurable) after which a TIMEOUT error is returned.
- **FR-007**: External service response MUST include a result retrieval URL; system MUST perform an authenticated (if required) HTTP GET to download the produced Excalidraw JSON.
- **FR-008**: System MUST validate downloaded file is well‑formed JSON containing at minimum: `type` (string), `version` (number), `elements` (array with ≥1 element), `appState` (object), and `source` (string). Each element MUST include `id`, `type`, `x`, `y`.
- **FR-009**: On successful retrieval system MUST use the contents of the JSON to update the whiteboard content.
- **FR-010**: Initial mutation return MUST occur within ≤3s, providing: submissionStatus (QUEUED|REJECTED), conversionId (UUID if queued), whiteboardId, documentId, and any immediate validation error details if rejected.
- **FR-011**: Background processing MAY continue after initial response for up to a configurable maximum (default 5 minutes) to obtain the converted Excalidraw JSON; once complete it MUST update the whiteboard content by: (a) pushing an update into the existing collaboration session if active, or (b) programmatically opening a new collaboration session (transitioning to edit mode) and then pushing the update.
  **FR-012**: Final conversion visibility MUST be guaranteed through: (a) real-time whiteboard collaboration session update (if user has it open) AND (b) a user notification via existing notification framework (in-app + email per user preferences) announcing completion status.
  **FR-013**: Notification dispatch MUST occur only after successful whiteboard content injection (or failure determination) and include conversionId, whiteboardId, status, and optional errorCode.
  **FR-014**: All failures MUST log correlation ID, whiteboardId, documentId, and error code at warning level; successes at info with latency metric (separate metrics for submit latency vs total completion latency and notification latency).
  **FR-015**: System MUST prevent concurrent duplicate conversions if prior still in-progress by ensuring that each user can only have one image conversion running at any given time (scoped per whiteboard) and reuse existing collaboration session if present.
  **FR-016**: Mutation MUST not expose internal service URLs; only sanitized result reference.
  **FR-017**: System MUST record metrics: submission latency p95, total completion latency p95, notification dispatch latency p95, total conversions, failures by code, abandonment count (jobs exceeding max wait window), retry count (if any).
  **FR-018**: Notification dispatch failures MUST NOT mark the conversion as failed; they are logged with NOTIFICATION_ERROR and retried according to existing policy.
  **FR-019**: Unsupported or unexpected external service responses MUST map to a generic INTEGRATION_ERROR while retaining original detail in logs only.
  **FR-020**: System MUST reject any source image larger than 10 MB (binary size) before initiating RPC, returning IMAGE_TOO_LARGE validation error.

_Ambiguity Markers for Clarification:_
(none remaining in this session)

### Non-Functional / Constraints (Derived)

- **NFR-001**: Initial submit response MUST complete ≤3s p95; background total completion SHOULD complete < 5m p95 (configurable max wait window default 5 minutes) [NEEDS CLARIFICATION: acceptable background p99].
- **NFR-002**: Operation MUST NOT block event loop with large file buffering; stream or chunk if size exceeds threshold [NEEDS CLARIFICATION: expected max result size].
- **NFR-003**: All network operations MUST include correlation ID header / context.
- **NFR-004**: Retries for RPC MUST NOT be automatic on non-timeout failures to avoid duplicate processing; single attempt + explicit failure.
- **NFR-005**: Validation & authorization MUST precede any outbound RPC.

### Key Entities _(include if feature involves data)_

- **Whiteboard**: Collaborative canvas entity; requires identification (id), ownership/permissions, possibly list of linked documents or assets (read for authorization check). Used here only as contextual parent for conversion.
- **Document**: Represents stored content; must expose metadata: id, mimeType, size, storageLocation or retrieval URL, ownership/permissions. Must indicate if binary content is an image.
- **ConversionJob (new or implicit concept)**: Ephemeral record capturing correlationId, sourceDocumentId, whiteboardId, status, resultLocation, errorCode, startedAt, completedAt should be stored within teh cluster cache that is implemented with Redis.
- **ExternalConversionService** (integration concept): Accepts RPC requests with image retrieval URL, returns result retrieval URL or error.
- **ExcalidrawResult**: JSON file artifact (schema subset to validate); stored or transient.

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [ ] No implementation details (languages, frameworks, APIs) (Note: Some transport details included due to domain context—verify acceptable or relocate to plan.)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders (May need slight simplification of technical jargon.)
- [ ] All mandatory sections completed

### Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Clarifications

### Session 2025-10-04

- Q: What set of image MIME types should be accepted for conversion? → A: Use `MimeFileTypeVisual` enum set.
- Q: Performance model (immediate vs long-running)? → A: Return submit ack ≤3s; background completion up to 5 minutes.
- Q: Whiteboard update path if not being edited? → A: Auto-open collaboration room and inject conversion result.
- Q: Client notification mechanism? → A: Live whiteboard update if open + user notification (in-app/email) always.
- Q: Maximum image size? → A: 10 MB limit (reject >10 MB with IMAGE_TOO_LARGE).
- Q: Minimal Excalidraw schema validation subset? → A: type, version, elements (≥1), appState, source, element id/type/x/y.

## Execution Status

_Updated by main() during processing_

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---
