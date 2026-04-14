# Research: Collabora Document Integration

**Branch**: `086-collabora-integration` | **Date**: 2026-04-14

## Research Findings

### 1. Callout/Contribution Model Extension Strategy

**Decision**: Add a new `CalloutContributionType.COLLABORA_DOCUMENT` enum value. Each Collabora document is a `CalloutContribution` with this type inside a callout. The contribution references the document file via the existing `document` table (managed by file-service-go).

**Rationale**: The callout/contribution model already handles posts, whiteboards, links, and memos. Adding a new contribution type follows the established pattern: enum value + optional relation on CalloutContribution. Authorization, sorting, and lifecycle reuse existing infrastructure.

**Alternatives considered**:
- New top-level entity on Space -- Rejected. Would duplicate authorization, sorting, and storage patterns.
- Child of Collaboration directly -- Rejected. Breaks the CalloutsSet→Callout→Contribution hierarchy.

### 2. CalloutContribution Entity Extension

**Decision**: Add optional `collaboraDocument` OneToOne relation on `CalloutContribution`, pointing to a new `CollaboraDocument` entity. This entity holds the Collabora-specific metadata (document type, document file reference).

**Rationale**: Follows the same pattern as `post`, `whiteboard`, `link`, `memo` -- only one is populated per contribution.

### 3. CollaboraDocument Entity Design

**Decision**: New entity `CollaboraDocument` with fields:
- `id` (UUID PK)
- `documentType` (enum: SPREADSHEET, PRESENTATION, TEXT_DOCUMENT)
- `document` (relation to existing Document entity managed by file-service-go)
- `profile` (relation to Profile for title/description)
- Standard authorization + timestamps

**Rationale**: The document file itself lives in file-service-go. The CollaboraDocument entity holds the type metadata and profile. Title comes from the profile (existing pattern for named entities).

### 4. WOPI Token Flow

**Decision**: Server calls `POST /wopi/token` on the WOPI service (via HTTP through traefik) with `{ documentId }`. The WOPI service validates the actor via JWT (Oathkeeper), checks authorization, resolves the correct Collabora editor via MIME→extension→discovery mapping, and returns `{ accessToken, accessTokenTTL, wopiSrc, editorUrl }`.

**Rationale**: The WOPI service (spec 002-editor-url-privilege) handles the full editor URL construction: MIME type mapping, discovery lookup, URL template processing, and `WOPI_BASE_URL` rewriting. The Alkemio server just forwards the `editorUrl` to the client — zero knowledge of Collabora's URL structure needed.

**Server config needed**: Only `collabora.wopi_service_url` (e.g., `http://localhost:3000`). No `editor_base_url` or discovery config.

### 5. Empty Document Templates

**Decision**: Ship 3 minimal static template files with the server (empty XLSX, PPTX, DOCX). Upload the appropriate template to file-service-go when creating a new Collabora document.

**Rationale**: Simplest approach. Templates are ~5-10KB each. No runtime dependency on Collabora for creation.

### 6. GraphQL Mutations

**Decision**: Extend existing contribution mutations rather than creating separate top-level mutations:
- `createContributionOnCallout` with `type: COLLABORA_DOCUMENT` -- creates the document
- New `getCollaboraEditorUrl(documentId)` query -- returns editor URL with WOPI token
- Existing `deleteContribution` -- handles deletion
- Rename via `updateCollaboraDocument` mutation

**Rationale**: Reuses existing callout contribution infrastructure. Only the editor URL query and the template upload are net-new.

### 7. WOPI Service HTTP Client

**Decision**: Create a `WopiServiceAdapter` in `src/services/adapters/wopi-service-adapter/` following the same pattern as `FileServiceAdapter` -- `@nestjs/axios` with timeout/retry. Single method: `issueToken(documentId)` → returns `{ accessToken, accessTokenTTL, wopiSrc, editorUrl }`.

**Rationale**: Consistent with the file-service adapter pattern. The WOPI service (spec 002) returns a ready-to-use `editorUrl`, so the adapter just forwards the response. No URL construction, MIME mapping, or discovery parsing on the server side.

### 8. Authorization Model

**Decision**: Reuse existing callout contribution authorization. Space members with `CONTRIBUTE` privilege can create Collabora documents. The document's auth policy controls edit/delete. The WOPI service independently checks `update-content` privilege when issuing tokens.

**Rationale**: No new authorization model needed. The WOPI service reads the document's `authorizationPolicyId` from the Alkemio DB and evaluates via auth-evaluation-service.
