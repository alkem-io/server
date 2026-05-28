# Feature Specification: Collabora Document Import

**Feature Branch**: `087-collabora-import`
**Created**: 2026-04-30
**Status**: Draft
**Input**: User description: "Allow users to import an existing document (any format Collabora Online supports) and edit it as a CollaboraDocument inside a callout."

## Context

PR #5970 (`086-collabora-integration`) delivers blank-document creation: users pick a category (SPREADSHEET / PRESENTATION / WORDPROCESSING) and the system creates an empty OOXML file that Collabora populates on first save. Import is the natural next step: the user already has a `.doc`, `.odt`, `.xls`, etc. and wants to collaborate on it without recreating from scratch.

@techsmyth flagged import as MVP-required during the [086-collabora-integration spec.md:17 thread](https://github.com/alkem-io/server/pull/5970#discussion_r3098473653) (others on that thread — search, observability, public/guest sharing, version control — stayed out-of-MVP).

## User Scenarios

### User Story 1 — Import an existing document into a callout (P1)

A space member wants to bring an existing document (any format Collabora can edit) into a callout for collaborative editing.

**Acceptance:**
1. Given a callout that allows COLLABORA_DOCUMENT contributions, when a member uploads a file in any Collabora-supported format (incl. legacy `.doc`, `.xls`, `.ppt`, OpenDocument formats, etc.), the system creates a CollaboraDocument linked to the callout, returns the document ID and editor URL.
2. The original file format is preserved on save — `.doc` opened, edited, and saved stays a `.doc`. No silent conversion.
3. The system rejects formats Collabora can't edit (uncommon image/archive/binary types) with a clear error.
4. A user without contribute privilege on the callout cannot import.

### User Story 2 — Open and edit an imported document (P1)

Identical to PR #5970's User Story 2. Once imported, the document is indistinguishable from a blank-created one in the editor flow.

### User Story 3 — Rename an imported document (P2)

Same flow as the existing `updateCollaboraDocument`. The rename must preserve the imported file's original extension (a `.doc` rename stays `.doc`, never silently becomes `.docx`).

### User Story 4 — Delete an imported document (P1)

Identical to PR #5970's User Story 3. Cascades from callout/post deletion same as blank-created docs.

## Design Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Supported formats: all Collabora-supported.** Concretely: every MIME advertised by Collabora's `/hosting/discovery` for the editor modes Calc, Impress, Writer, and Draw. | Curated subsets get stale and create user friction. Collabora itself is the authority on what's editable. |
| 2 | **Preserve original format on save.** No auto-convert to OOXML. | Round-trip integrity. Users uploading `.doc` expect `.doc` back. Collabora natively saves in the source format. |
| 3 | **Separate `importCollaboraDocument` mutation** (not an overload of `createCollaboraDocument`). | GraphQL discriminated unions on input are awkward; two simple mutations beat one with two modes. Each can have its own auth privilege if the model evolves. |
| 4 | **GraphQL `Upload` scalar** for the file payload. | Matches existing upload paths in the codebase. Forward-compatible: when direct-upload-with-ticket lands, the mutation swaps `Upload` → `fileId: UUID!` and the rest of the server logic stays identical. |
| 5 | **Validation delegated entirely to file-service-go.** Server provides `COLLABORA_SUPPORTED_MIMES` as the `allowedMimeTypes` parameter and `bucket.maxFileSize` as the size cap. file-service-go sniffs the actual MIME from content (`mimetype.Detect`) and rejects with `415 ErrUnsupportedMediaType` on miss. | Server never inspects file bytes — saves Node memory, avoids server/Go MIME mismatch. Forward-compatible with direct-upload (signed URLs can pass the same `allowedMimeTypes` list). |
| 6 | **Document categories: SPREADSHEET, PRESENTATION, WORDPROCESSING, DRAWING.** Add `DRAWING` (new) to support `.odg`. **Defer PDF** to a separate scope. | 4 broad categories drive 4 FE icons / 4 editor modes. PDF's editor flow in Collabora is meaningfully different (annotation-first vs document-first) and warrants its own spec. |
| 7 | **Two-phase upload via `temporaryLocation`.** Server uploads with `temporaryLocation: true`, gets back the sniffed MIME + file id, builds the `CollaboraDocument` entity, then flips `temporaryLocation: false` to finalize. On any failure between upload and finalize, `deleteDocument` cleans up the temp row. | Reuses the existing temp→permanent pattern (already used by blank-create). Atomic-enough. Forward-compatible with direct-upload: client uploads to file-service-go directly, then calls server with `fileId`; server does the same finalize step. |
| 8 | **Add `originalMimeType` column on `CollaboraDocument`.** Populated from the sniffed MIME at import (or derived from `documentType` for blank-create). Refactor `updateCollaboraDocument` to derive the file extension from this instead of from `documentType`. | The current rename path computes `${displayName}${ext}` where `ext` is derived from `documentType` (a 3-value enum). That's wrong for imports — `documentType=WORDPROCESSING` doesn't tell us if the underlying file is `.docx`, `.doc`, or `.odt`. Storing the MIME explicitly makes rename correct for any imported format. |

## Out of Scope

- **PDF import/edit.** Defer to a separate spec; Collabora's PDF mode is a different editor flow.
- **Auto-conversion to OOXML.** Files stay in their uploaded format. Users who want `.docx` can save-as in the editor.
- **Search across imported documents.** Same out-of-MVP call as PR #5970.
- **Per-format quotas.** Single `maxFileSize` per bucket applies to all formats.
- **Bulk import.** One file per mutation call. Bulk can be a separate UX-driven mutation later.
- **Format conversion at import time.** Don't pre-convert anything. Collabora opens what we give it.
- **Source-of-truth refresh of the supported-MIME list.** Hardcoded in `src/common/enums/collabora.supported.mime.types.ts` with a comment pointing to Collabora's `/hosting/discovery` endpoint. Manual updates if Collabora adds/removes formats.

## Dependencies

- file-service-go: no new functionality required. Existing `CreateDocument` handler (with `temporaryLocation`, sniffed MIME, `allowedMimeTypes` enforcement) covers the contract end-to-end.
- PR #5970 (`086-collabora-integration`) must be merged: this feature extends `CollaboraDocument` and the import mutation lives alongside `createCollaboraDocument`.

## Implementation Sketch

**New / changed surface:**

1. `src/common/enums/collabora.supported.mime.types.ts` (new): three exports — `COLLABORA_SUPPORTED_MIMES: string[]`, `MIME_TO_DOCUMENT_TYPE: Record<string, CollaboraDocumentType>`, `MIME_TO_EXTENSION: Record<string, string>`. Single file, no DI, no dynamic discovery.
2. `src/common/enums/collabora.document.type.ts`: add `DRAWING = 'drawing'`.
3. `src/domain/collaboration/collabora-document/collabora.document.entity.ts`: add `@Column() originalMimeType!: string` (NOT NULL, length matched to file-service-go's column).
4. `src/domain/collaboration/collabora-document/collabora.document.service.ts`:
   - `createCollaboraDocument`: populate `originalMimeType` from the OOXML MIME the blank-create flow already determines.
   - `updateCollaboraDocument`: derive `ext` from `MIME_TO_EXTENSION[collaboraDocument.originalMimeType]` instead of from `documentType`.
   - New `importCollaboraDocument(input, upload)`: reads buffer → calls `storageBucketService.uploadFileAsDocumentFromBuffer` with `temporaryLocation: true`, `allowedMimeTypes: COLLABORA_SUPPORTED_MIMES`, `skipDedup: true` → derives `documentType` + `originalMimeType` from the result → builds entity → finalizes via `updateDocument({ temporaryLocation: false })`.
5. `src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.ts`: new `@Mutation()` for import.
6. New input DTO `ImportCollaboraDocumentInput` (`callout` reference, optional displayName override).
7. Migration: add `originalMimeType` column + backfill for existing rows from the existing `documentType` (rows are blank OOXML, so reverse-mapping from `documentType` → MIME is unambiguous).

**Estimated diff size:** ~400-500 LOC across ~10 files. No new infra, no Go changes.

## Open Questions

- Concrete `bucket.maxFileSize` for spaces using collabora docs — current default may be too tight (~2 MB). Either bump the default or set per-space override at space creation. Suggest deferring to a follow-up issue scoped to bucket policy.
- Collabora's editor-mode discovery (Calc / Impress / Writer / Draw) returns hundreds of MIME entries; we don't want all of them. Filter to formats Collabora can both **open and save** (some formats are read-only in Calc, etc.). Suggest a small Go helper inside file-service-go that exposes a curated allowlist via `/hosting/capabilities`-style metadata, but for MVP a hand-maintained list is fine.

## References

- PR #5970 (`086-collabora-integration`) — blank-create flow, where this builds on.
- PR #5970 thread on import scope: https://github.com/alkem-io/server/pull/5970#discussion_r3098473653
- file-service-go MIME-detection logic: `internal/domain/service/file_service.go:175-195` (`resolveMIME`)
- Collabora discovery endpoint: served at `/hosting/discovery` of the running Collabora instance
