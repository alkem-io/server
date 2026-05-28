# Phase 1 Data Model — Collabora Document Framing Import

## Database schema changes

**None.** Per spec clarification Q4 ("No new columns. Origin and original filename are not persisted; zero migration"), this feature introduces zero schema changes.

The existing tables remain unchanged:

- `callout` — no changes
- `callout_framing` — no changes
- `collabora_document` — no changes (`originalMimeType` column, populated by both blank and upload paths today, continues to carry the format value: canonical MIME for blank, sniffed MIME for upload)
- `document` (file-service-go-managed row) — no changes; the temp→permanent flow already used by `importCollaboraDocument` is reused

No `migration:generate` invocation is required for this feature.

## Entity audit

### `Callout` (aggregate)

- **Existing**. Carries `framing: CalloutFraming`. No new fields.
- Lifecycle unchanged: created via `CalloutsSetService.createCalloutOnCalloutsSet` → `CalloutFramingService.createCalloutFraming` → `calloutService.save` → existing authorization-reset and event-emission cycle.
- Per FR-008, the response shape on the upload path is byte-equivalent to the response shape on the blank path for the same `documentType`.

### `CalloutFraming`

- **Existing**. Owns `collaboraDocument: CollaboraDocument | null` when `type === COLLABORA_DOCUMENT`.
- The framing service's existing branch at `callout.framing.service.ts:176-190` is the insertion point: it currently always calls `createCollaboraDocument` (blank); the change is to inspect the input for a buffered `file` and call `importCollaboraDocument` instead when present. See `plan.md` § Project Structure for the file-level diff.

### `CollaboraDocument` (framing variant)

- **Existing**. No new columns. Has:
  - `id` (UUID)
  - `documentType: CollaboraDocumentType` (enum: `SPREADSHEET | PRESENTATION | WORDPROCESSING | DRAWING`) — set by either the input (blank path) or the sniffed MIME → `MIME_TO_DOCUMENT_TYPE` lookup (upload path)
  - `originalMimeType: string` — set by `getDefaultMimeForCreate(documentType)` (blank) or sniffed MIME (upload)
  - `profile: Profile` — created via `profileService.createProfile({ displayName }, ProfileType.COLLABORA_DOCUMENT, storageAggregator)`. On the upload path, `displayName` defaults from filename (extension stripped) when the input `displayName` is absent or empty (FR-012).
  - `document: Document` — file-service-go row carrying the actual bytes. On the blank path, an empty buffer is uploaded with the canonical MIME. On the upload path, the user's bytes are uploaded with `temporaryLocation: true`, then finalized after entity wiring (existing two-phase flow in `importCollaboraDocument`).
  - `authorization: AuthorizationPolicy` — `AuthorizationPolicyType.COLLABORA_DOCUMENT`
  - `createdBy: string`
- Path of origin (blank vs. upload) is **not** persisted (clarify Q4).

### `Document` (file-service-go row)

- **Existing**. No new columns. The upload path uses the same `temporaryLocation: true` → finalize-with-`temporaryLocation: false` two-phase flow as `importCollaboraDocument`. On any failure between the temp upload and the entity save, the temp row is deleted via `fileServiceAdapter.deleteDocument(...)`.

## Input-shape delta

The only change to a domain-facing class:

```text
src/domain/collaboration/collabora-document/dto/collabora.document.dto.create.ts
  CreateCollaboraDocumentInput
    displayName: string  →  displayName?: string   (decorator: @IsNotEmpty → @IsOptional + @IsString)
    documentType: CollaboraDocumentType  →  documentType?: CollaboraDocumentType  (decorator: @IsEnum stays, add @IsOptional)
```

Rationale: FR-012 (clarify Q7) requires `displayName` to be derivable from filename on the upload path; FR-005 (clarify Q2) requires `documentType` to be ignored / derived from MIME on the upload path. Both fields stay required for the blank path, enforced at the service layer in `CalloutFramingService` (see research R3). Pushing the conditional to the service layer matches the existing pattern at `callout.framing.service.ts:185-189`.

## Operational invariants

- **FR-006 (atomicity)**: zero new rows in `callout`, `callout_framing`, `collabora_document`, or `document`, and zero new objects in storage on any failure path. Enforced by:
  - Existing single-shot resolver authorization at `CalloutsSetResolverMutations.createCalloutOnCalloutsSet` line 59.
  - Existing two-phase temp→permanent upload in `CollaboraDocumentService.importCollaboraDocument`.
  - Existing rollback compensation in `importCollaboraDocument` that deletes the temp `document` row and any partially-created profile on failure.
  - Existing transactional save in `calloutService.save`.
- **FR-008 (downstream parity)**: the saved entity graph (Callout → CalloutFraming → CollaboraDocument → Profile + Document) is byte-equivalent between blank and upload paths modulo `originalMimeType` and the `Document.size`/content. Authorization, search, audit, and event-emission subsystems all consume the same graph shape.
- **FR-011 (event parity)**: existing `contributionReporter.calloutCreated(...)` call in the resolver (line 142) fires unchanged on the upload path; the activity adapter's `calloutPublished` event (line 134) fires under the same conditions; no new event types.
