# Quickstart: Collabora Document Integration

**Branch**: `086-collabora-integration` | **Date**: 2026-04-14

## Overview

Add Collabora document support to spaces via the callout/contribution model. New `COLLABORA_DOCUMENT` contribution type with a `CollaboraDocument` entity. Editor URLs obtained via WOPI service token issuance.

## Key Integration Points

### 1. CollaboraDocument Entity + Migration
**Where**: `src/domain/collaboration/collabora-document/`
**What**: New entity with `documentType` enum, profile relation, document relation. Migration adds table + FK on callout_contribution.

### 2. CalloutContributionType Extension
**Where**: `src/common/enums/callout.contribution.type.ts`
**What**: Add `COLLABORA_DOCUMENT = 'collabora_document'`

### 3. CalloutContribution Entity Extension
**Where**: `src/domain/collaboration/callout-contribution/callout.contribution.entity.ts`
**What**: Add optional `collaboraDocument` OneToOne relation

### 4. WopiServiceAdapter
**Where**: `src/services/adapters/wopi-service-adapter/`
**What**: HTTP client calling WOPI service `POST /wopi/token`. Returns `{ accessToken, accessTokenTTL, wopiSrc, editorUrl }`. The `editorUrl` is ready-to-use — the WOPI service (spec 002) handles MIME→editor mapping, discovery lookup, and URL construction. Server just forwards it. Uses same `@nestjs/axios` pattern as FileServiceAdapter.

### 5. CollaboraDocumentService
**Where**: `src/domain/collaboration/collabora-document/collabora.document.service.ts`
**What**: 
- `createCollaboraDocument(input)` -- creates entity, uploads empty template to file-service-go, creates profile
- `getEditorUrl(documentId)` -- calls `wopiServiceAdapter.issueToken(documentId)`, returns `editorUrl` from response directly (no URL construction needed)
- `deleteCollaboraDocument(id)` -- removes entity + underlying file
- `updateCollaboraDocument(input)` -- renames via profile update

### 6. Contribution Creation Extension
**Where**: `src/domain/collaboration/callout-contribution/callout.contribution.service.ts`
**What**: Handle `COLLABORA_DOCUMENT` type in `createCalloutContribution()` -- call `collaboraDocumentService.createCollaboraDocument()`

### 7. GraphQL Resolvers
**Where**: `src/domain/collaboration/collabora-document/collabora.document.resolver.*.ts`
**What**:
- Field resolver for `CalloutContribution.collaboraDocument`
- Query: `collaboraEditorUrl(collaboraDocumentID)` -- returns editor URL
- Mutation: `updateCollaboraDocument(updateData)` -- rename

### 8. Empty Document Templates
**Where**: `src/domain/collaboration/collabora-document/templates/`
**What**: 3 minimal static files: `empty.xlsx`, `empty.pptx`, `empty.docx` (~5-10KB each). Read and uploaded to file-service-go during document creation.

### 9. Configuration
**Where**: `alkemio.yml`
**What**: Add `collabora.wopi_service_url` config key only. No `editor_base_url` needed — the WOPI service returns ready-to-use editor URLs.

## Testing Strategy

- Unit test: CollaboraDocumentService creation/deletion/rename
- Unit test: WopiServiceAdapter token issuance mock
- Integration: Create contribution with COLLABORA_DOCUMENT type via GraphQL
- Integration: Request editor URL, verify token structure
- Manual: Open editor URL in browser, verify Collabora loads
