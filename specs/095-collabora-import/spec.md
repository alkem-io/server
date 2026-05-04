# Feature Specification: Collabora Document Framing Import — Server Contract for Blank-or-Upload Creation (P1 Collections)

**Feature Branch**: `095-collabora-import`
**Created**: 2026-05-04
**Status**: Ready for `/speckit.plan` — all clarifications resolved (see Clarifications)
**Input**: Server-side P1 (Collections) scope. The server MUST allow API consumers to create a callout whose framing is a Collabora document, in two interchangeable ways within a single semantic operation: (1) blank, type-picked; (2) populated from uploaded file bytes. The blank path already exists; the upload path is the new server work. Documents as a CalloutContribution variant are out of scope for P1.

> **NOTE — supersedes prior scope.** Any earlier draft of this spec scoped to "Collabora documents as a contribution/response" is wholly replaced. The user stories, functional requirements, and success criteria below are the authoritative scope for branch `095-collabora-import`.

## Clarifications

### Session 2026-05-04

- Q: Server-contract shape for the upload path — extend the existing input or add a dedicated mutation? → A: Option A — extend `CreateCollaboraDocumentInput` with an optional `file: Upload` field on the existing `createCalloutOnCalloutsSet` mutation. One entry point handles both blank and upload.
- Q: When `file` and `documentType` are both supplied, how does the server resolve the type? → A: Imitate the existing `importCollaboraDocument` pattern — when `file` is present, the server delegates type derivation entirely to file-service-go (which sniffs MIME from content and rejects anything outside the supported list); `documentType` from the input is not consulted in the upload case. When `file` is absent, the existing blank path's `documentType` requirement is unchanged.
- Q: Is Drawing (ODG) part of the P1 upload-path supported set? → A: Defer to file-service-go's existing supported list. Drawing is supported on upload iff file-service-go accepts ODG today; the server does not maintain a parallel allowlist. The existing `importCollaboraDocument` allowlist is the single source of truth for accepted formats.
- Q: Does the framing Collabora document entity need a new column to record upload origin or original filename? → A: No new column. Origin and original filename are not persisted; `displayName` is the only human-readable label and may default from the uploaded filename with extension stripped (mirroring `importCollaboraDocument`). Zero migration; preserves FR-008's "indistinguishable downstream" promise.
- Q: What is the concrete latency budget for SC-004? → A: Adopt the existing `importCollaboraDocument` observed p95 as the budget. SC-004 becomes a parity criterion: the upload-path p95 MUST be ≤ `importCollaboraDocument`'s p95 plus a small tolerance for the additional callout-creation work, measured on a 10 MB DOCX. No new explicit numeric target is invented at spec time.
- Q: How should the server handle file-service-go transient failures (timeout, 5xx, unreachable) — distinct from format/size rejections? → A: Fail fast. On any file-service-go timeout, 5xx, or unreachable error, the server MUST return a structured "upstream unavailable" error immediately, with no in-resolver retry. The caller is responsible for retry. Mirrors `importCollaboraDocument`'s current behavior. Atomicity is preserved (no callout / framing / storage created on failure).
- Q: How is `displayName` resolved on the upload path? → A: Mirror `importCollaboraDocument`. When `file` is present and `displayName` is absent or empty, the server MUST default `displayName` from the uploaded filename with extension stripped. When `file` is present and `displayName` is supplied, the server uses the supplied value verbatim. When `file` is absent (blank path), `displayName` remains required as today.

## User Scenarios & Testing _(mandatory)_

> Stories are written from the perspective of API consumers (clients calling the GraphQL API) and operators of the server. The server is the system whose behavior this spec governs.

### User Story 1 — Existing blank-framing contract remains stable (Priority: P1)

An API consumer creates a callout on a calloutsSet and includes a Collabora document descriptor (display name + document type) inside the framing input. The server creates the callout, creates a blank Collabora document of the requested type as its framing, persists both atomically, and returns the resulting Callout with the framing document populated. This is existing behavior shipped via `createCalloutOnCalloutsSet` (PR #9615 / `specs/086-collabora-integration`); it MUST continue to work unchanged after the upload path lands.

**Why this priority**: This contract is already in production and is the baseline the new upload path must coexist with. Any regression here breaks the blank-create flow that callers already depend on. Listed as P1 because its preservation is a hard non-regression boundary, not because new work is required.

**Independent Test**: An API consumer with create-callout authorization on a calloutsSet submits the existing `createCalloutOnCalloutsSet` mutation with `framing.collaboraDocument: { displayName, documentType }` (no file). The server returns a Callout whose framing Collabora document matches the requested type and display name and is openable through the existing Collabora editor flow.

**Acceptance Scenarios**:

1. **Given** an authorized API consumer and a calloutsSet that accepts framed callouts, **When** they submit `createCalloutOnCalloutsSet` with a `collaboraDocument` framing input containing only `displayName` and `documentType`, **Then** the server creates a blank Collabora document of the requested type, attaches it as the callout's framing, persists both atomically, and returns the Callout populated with the framing document.
2. **Given** the same authorized consumer, **When** they submit a request with an unknown or unsupported `documentType`, **Then** the server rejects the request with a validation error and creates no callout.
3. **Given** a consumer without create-callout authorization on the calloutsSet, **When** they submit a blank-framing request, **Then** the server returns an authorization error and creates no callout.

---

### User Story 2 — Server accepts file bytes as the framing document (Priority: P1)

An API consumer creates a callout on a calloutsSet and supplies file bytes (a multipart upload) alongside the existing framing input fields. The server reads the file's bytes, validates the file's format and size, derives or validates the document type from the file's MIME / extension, creates a Collabora document populated from those bytes, attaches it as the new callout's framing, persists everything atomically, and returns the resulting Callout.

**Why this priority**: This is the new server work the P1 (Collections) milestone is gated on. Without it, callers cannot create a Document-framed callout from existing office content; they can only create blank documents. Co-equal in product priority with Story 1's continued operation.

**Independent Test**: An authorized API consumer submits a create-callout request with a DOCX file attached and a display name. The server returns a Callout whose framing is a Collabora document carrying that file's contents, and a follow-up read of the framing document shows those contents to subsequent callers.

**Acceptance Scenarios**:

1. **Given** an authorized API consumer and an office file whose format is in file-service-go's supported list (DOCX, XLSX, PPTX, ODT, ODS, ODP, and ODG iff supported), **When** they submit a create-callout request with the file attached and a display name, **Then** the server creates a callout whose framing Collabora document is populated from the file's bytes and returns the populated Callout.
2. **Given** a request that supplies a file (with or without an explicit `documentType` in the input), **When** the request is processed, **Then** the server delegates type derivation to file-service-go and ignores any `documentType` value from the input; the file's sniffed MIME is the authoritative type.
3. **Given** a request that supplies a file whose sniffed MIME is outside file-service-go's supported list, **When** file-service-go rejects the bytes, **Then** the server returns a structured format error and creates no callout.
4. **Given** a request whose file is well-formed but whose bytes the Collabora backend cannot ingest (e.g., corrupted internal structure), **When** ingestion fails after the file passes pre-checks, **Then** the server creates no callout, releases any reserved storage, and returns a structured error identifying the ingestion failure.

---

### User Story 3 — Server rejects unsupported, oversize, and malformed uploads atomically (Priority: P2)

An API consumer submits a create-callout request with a file whose format is outside the supported set, whose size exceeds the configured limit, or whose bytes are malformed. The server rejects the request with a structured error before any callout, framing record, or storage object is created. After the rejection, the calloutsSet has the same row count and storage footprint as before the request.

**Why this priority**: Defends against orphan callouts, leaked storage, and partial state. Lower than P1 because the happy paths in Stories 1 and 2 are the deliverable; this is the safety boundary around them.

**Independent Test**: Submit a create-callout request with a file whose extension and MIME are outside the supported set. The server returns a validation error; an audit of the database and object storage shows zero new rows and zero new objects attributable to the request.

**Acceptance Scenarios**:

1. **Given** an authorized consumer and a file whose sniffed MIME is outside file-service-go's supported list, **When** they submit a create-callout-with-upload request, **Then** the server rejects with a format-specific error and creates no callout, no framing record, and no storage object.
2. **Given** an authorized consumer and a file exceeding file-service-go's configured size limit (the same limit enforced by `importCollaboraDocument` today), **When** they submit the request, **Then** file-service-go rejects the bytes and the server returns a size-specific structured error and creates no callout.
3. **Given** an authorized consumer and a file whose declared extension is misleading but whose sniffed MIME is unsupported, **When** they submit the request, **Then** file-service-go rejects the bytes and the server returns a format error and creates no callout (extension is never consulted; sniffed MIME is authoritative).
4. **Given** any rejection above, **When** the consumer queries the calloutsSet immediately after, **Then** no new callout is visible and no orphan framing or document records exist.

---

### User Story 4 — Uploaded-framed and blank-framed callouts are indistinguishable downstream (Priority: P3)

After creation, a callout whose framing was populated via the upload path behaves identically to a callout whose framing was created blank: same authorization checks, same Collabora editor lifecycle, same delete / move / archive semantics, same event emissions, same downstream platform integrations (search indexing, references, audit logs).

**Why this priority**: Parity is implicit — once the framing document exists, its origin should be irrelevant to every other subsystem. Lower priority because it is verified through regression of existing flows rather than new server work, but still required so the upload path does not become a second-class citizen.

**Independent Test**: Create two callouts on the same calloutsSet — one blank-framed, one upload-framed — using the same display name pattern. Compare authorization checks, edit operations, delete operations, and emitted domain events. Behavior should match across both.

**Acceptance Scenarios**:

1. **Given** a callout whose framing was created via upload, **When** any authorized caller invokes the existing Collabora editor / read / update / delete endpoints, **Then** the response shape and behavior match those of a blank-framed callout of the same document type.
2. **Given** the same upload-framed callout, **When** an admin deletes it, **Then** the framing Collabora document and any backing storage are released atomically without orphaning rows or storage objects, identically to the blank-framed case.
3. **Given** the same upload-framed callout, **When** any subsystem subscribes to callout-creation events, **Then** the emitted events are structurally identical to those emitted for a blank-framed callout (the path of origin is not exposed downstream beyond what is already exposed for any framed callout).

---

### Edge Cases

- **Interrupted upload**: The connection drops mid-upload. The server MUST NOT persist a callout, framing record, or storage object. Any partially buffered bytes MUST be discarded.
- **Storage backend transient failure**: After file bytes are accepted but before the framing document is persisted, the storage backend errors. The server MUST roll back the callout creation, return a structured error, and leave no orphan records.
- **file-service-go unavailable / timeout / 5xx**: file-service-go is unreachable, times out, or returns a 5xx — distinct from a format/size rejection. The server MUST fail fast (no in-resolver retry), return a structured "upstream unavailable" error, and create no callout, framing, or storage object. The caller is responsible for retrying.
- **Race on display-name uniqueness**: Two concurrent create-callout requests with the same display name on the same calloutsSet. The server MUST apply the same uniqueness rules it already applies for blank-framed callouts; one succeeds, the other fails with the existing display-name-conflict error.
- **Authorization revoked mid-flight**: Caller's create-callout authorization is revoked between request acceptance and persistence. The server MUST re-check authorization at the persistence boundary (or rely on existing transactional authorization) and reject the request without leaving partial state.
- **Quota / rate-limit exceeded**: The calloutsSet's storage quota or the caller's rate limit is exceeded. The server MUST reject with a quota- or rate-specific structured error and create no callout.
- **Multipart payload with file but no framing input**: The request includes a file but no `collaboraDocument` framing descriptor. The server MUST reject as a validation error (the file alone is not a complete request).
- **Multipart payload with multiple files**: The request includes more than one file part where the contract expects exactly one. The server MUST reject as a validation error.
- **Empty file (zero bytes)**: The server MUST reject zero-byte uploads with a format/integrity error before any persistence.
- **File whose declared MIME is supported but whose sniffed MIME is something else**: file-service-go's sniffed MIME is authoritative; the server surfaces file-service-go's rejection as a structured format error.
- **Callout creation succeeds but downstream event emission fails**: Existing transactional and retry semantics for callout creation apply unchanged; this feature does not alter event-emission guarantees.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The server MUST continue to support blank-framing Collabora document creation through the existing `createCalloutOnCalloutsSet` mutation with `framing.collaboraDocument: { displayName, documentType }`. No regression in request shape, response shape, validation rules, or authorization checks is permitted.
- **FR-002**: The server MUST extend `CreateCollaboraDocumentInput` (the input nested inside `CreateCalloutFramingInput.collaboraDocument`) with an optional `file: Upload` field. When the field is present on a `createCalloutOnCalloutsSet` request, the server MUST read bytes from the uploaded file and populate the framing Collabora document from those bytes; when absent, the server MUST behave exactly as the blank-create path does today. The existing `createCalloutOnCalloutsSet` mutation remains the single entry point for both blank and upload variants — no new top-level mutation is introduced.
- **FR-003**: The server MUST delegate format validation and type derivation for uploaded files to file-service-go, exactly as the existing `importCollaboraDocument` code path does. file-service-go's supported-format list is the single source of truth for accepted upload formats; the server MUST NOT maintain a parallel allowlist or attempt parallel validation. The server MUST surface file-service-go's rejection as a structured format error. The accepted set on the upload path is therefore identical to whatever `importCollaboraDocument` accepts at the time of release — including Drawing (ODG) iff file-service-go accepts it.
- **FR-004**: The server MUST delegate file-size validation to file-service-go, just as it delegates format validation (FR-003). file-service-go enforces the same maximum it already enforces for `importCollaboraDocument`; the server MUST surface oversize rejection as a structured size error and MUST NOT result in any persistent state on rejection.
- **FR-005**: When the request includes a `file`, the server MUST ignore any `documentType` value supplied in the input and MUST treat the type returned by file-service-go (derived from sniffed MIME) as authoritative. When the request includes no `file`, the server MUST require `documentType` and use it to create a blank document of that type — current blank-path behavior is unchanged.
- **FR-012**: When the request includes a `file` and `displayName` is absent or empty, the server MUST default `displayName` from the uploaded filename with extension stripped (mirroring `importCollaboraDocument`). When `displayName` is supplied alongside a file, the server MUST use the supplied value verbatim. When the request includes no `file`, `displayName` remains required (current blank-path behavior).
- **FR-006**: The create-callout operation MUST be atomic with respect to the framing Collabora document and its backing storage. On any failure (validation, ingestion, storage, persistence, authorization, quota), the server MUST leave zero new rows in callout, framing, and document tables and zero new objects in storage attributable to the failed request.
- **FR-007**: Authorization to create a Document-framed callout via either path MUST be identical to authorization to create any other framed callout on the same calloutsSet. No new permission scope, role, or privilege is introduced by this feature. Authorization MUST be checked at the same boundary as existing framed-callout creation.
- **FR-008**: After successful creation, the resulting Callout MUST be indistinguishable from a blank-framed callout of the same document type with respect to: authorization checks; Collabora editor read/update/delete; domain event emission shape and ordering; search indexing; storage lifecycle (delete cascade, archival). The server MUST NOT expose the path of origin (blank vs. upload) on the Callout response beyond what is already exposed for any framed callout.
- **FR-009**: All rejections MUST return structured errors that distinguish at least: invalid format (file-service-go rejected the sniffed MIME), size exceeded, corrupted/unreadable file bytes, Collabora ingestion failure, file-service-go upstream unavailable (timeout / 5xx / unreachable), missing required input, authorization denied, and quota / rate exceeded. Error payloads MUST follow the same conventions as other framed-callout creation errors on the existing mutation.
- **FR-010**: The existing `importCollaboraDocument(uploadData: { calloutID }, file) → CalloutContribution` mutation, which adds a Collabora document as a CalloutContribution, MUST remain unconsumed by P1 client work but MAY remain merged on the server for a future iteration. This spec does not require its removal, modification, or extension. Any change to that mutation is out of scope for `095-collabora-import`.
- **FR-011**: The server MUST emit the same domain events for upload-path callout creation that it emits for blank-path callout creation. No new event types are introduced. Event payloads MUST be byte-equivalent to the blank-path payloads modulo the document's content.

### Dependencies / Open Server-Contract Questions

- **Server-contract shape (DECIDED — see Clarifications)**: The upload path is delivered by extending `CreateCollaboraDocumentInput` (nested inside `CreateCalloutFramingInput.collaboraDocument`) with an optional `file: Upload` field on the existing `createCalloutOnCalloutsSet` mutation. No new top-level mutation is introduced. Resolver location, input class structure, and validator placement follow the existing `createCalloutOnCalloutsSet` pipeline.

- **Existing surface to preserve**: `createCalloutOnCalloutsSet` blank-framing path (PR #9615 / `specs/086-collabora-integration`) MUST remain functional and pass its existing tests after the upload path lands. The schema-contract diff for this feature MUST not include any breaking change to that mutation — the only change to the input type is the addition of one optional field.

- **Adjacent mutation out of scope**: `importCollaboraDocument` (CalloutContribution variant) is neither consumed nor altered by this feature. Decisions about its long-term fate (keep, remove, repurpose) are deferred to a future iteration.

- **Schema contract**: All schema changes resulting from option (a) or option (b) MUST be regenerated, sorted, and diffed per the project's schema-contract workflow (`pnpm run schema:print && pnpm run schema:sort && pnpm run schema:diff`) before merge. Any breaking change requires CODEOWNER `BREAKING-APPROVED` per `CLAUDE.md` schema-contract rules.

### Key Entities _(include if feature involves data)_

- **Callout (framed)**: The aggregate created by the operation. Carries a framing reference. Existing entity; this feature does not introduce new columns.
- **Collabora Document (framing variant)**: The framing-time office document attached to a Callout. Has a display name and a document type. Existing entity; this feature does not introduce any new columns. Origin (blank vs. upload) and original filename are not persisted — `displayName` is the only human-readable label, and on the upload path the server defaults `displayName` from the uploaded filename with extension stripped when the input `displayName` is absent or empty (see FR-012), mirroring `importCollaboraDocument`.
- **Uploaded File (transient)**: The multipart file part supplied by the caller in the upload path. Exists only within the request lifecycle; is not persisted independently of the resulting Collabora Document's stored bytes.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The existing blank-framing path's test suite passes 100% unchanged after the upload path lands. No regression in request/response shapes or behavior.
- **SC-002**: 100% of upload-path requests with a supported file under the size limit, valid framing input, and sufficient authorization result in exactly one new callout, one new framing Collabora document, and one new storage object — no more, no less — on the calloutsSet.
- **SC-003**: 100% of upload-path requests that fail validation (format, size, mismatch, corruption, missing input, authorization, quota) result in zero new callouts, zero new framing records, and zero new storage objects on the calloutsSet, verified by integration tests covering each rejection class.
- **SC-004**: For a 10 MB DOCX upload-path request, end-to-end server-side processing p95 latency MUST be ≤ the existing `importCollaboraDocument` path's measured p95 latency plus a small tolerance for the additional callout-creation work. The bar is parity with the existing import path, not an absolute number — verified by comparing instrumented latency over the same representative sample.
- **SC-005**: Domain events emitted on upload-path callout creation are byte-equivalent (modulo document content) to events emitted on blank-path creation for the same document type, verified by an event-shape parity test.
- **SC-006**: GraphQL schema diff between pre-feature and post-feature baseline introduces only additive changes on the create-callout surface (option a or option b), with zero breaking changes to existing fields, arguments, or types — verified by `pnpm run schema:diff` and the schema-contract workflow.
- **SC-007**: Storage backend audit over a representative integration-test run shows zero orphan storage objects (objects not referenced by any framing Collabora document row) attributable to the upload path.

## Assumptions

- **Format set**: file-service-go's supported-format list (used by `importCollaboraDocument` today) is the single source of truth for accepted upload formats. The server does not maintain a parallel allowlist. DOCX, XLSX, PPTX, ODT, ODS, ODP are expected at minimum; ODG (Drawing) is supported iff file-service-go accepts it.
- **Size limit**: file-service-go enforces the size limit (same enforcement point as `importCollaboraDocument`). The server does not maintain a parallel size check.
- **Authorization model**: No new permission scope is introduced. Authorization is exactly what is required to create any framed callout on the same calloutsSet today.
- **Storage path**: Uploaded bytes flow through the same storage subsystem already used by `importCollaboraDocument` and the existing Collabora-framed-callout flows. No new storage backend is introduced.
- **Document type derivation**: When a file is supplied, derivation is delegated entirely to file-service-go — the server does not inspect the file itself. file-service-go sniffs MIME from content (extension is not consulted) and either returns the derived type or rejects the bytes; the server surfaces that decision verbatim. Any `documentType` supplied alongside a file is ignored.
- **Atomicity**: Existing transactional boundaries used by the blank-framing path are extended around the byte-ingestion step. No new distributed-transaction primitive is introduced.
- **Drawing type**: Drawing is part of the upload-path supported set iff file-service-go accepts ODG today (consistent with the `importCollaboraDocument` allowlist). The blank path's existing `DRAWING` enum value is unaffected by this decision.
- **No new schema columns**: Confirmed — the framing Collabora document entity does not require new columns. Origin (blank vs. upload) and original filename are not persisted. Zero migration is needed for this feature.
