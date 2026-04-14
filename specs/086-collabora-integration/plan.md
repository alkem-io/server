# Implementation Plan: Collabora Document Integration

**Branch**: `086-collabora-integration` | **Date**: 2026-04-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/086-collabora-integration/spec.md`

## Summary

Add Collabora Online document support to Alkemio spaces. Collaborative documents (XLSX/PPTX/DOCX) are modeled as `CalloutContribution` entries with a new `COLLABORA_DOCUMENT` type. A new `CollaboraDocument` entity holds document type metadata and links to the file (managed by file-service-go). Editor URLs are obtained by requesting WOPI access tokens from the WOPI service. The server ships minimal empty templates for new document creation.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, `@nestjs/axios` (axios), GraphQL 16
**Storage**: PostgreSQL 17.5 (new `collabora_document` table + FK on `callout_contribution`)
**Testing**: Vitest 4.x
**Target Platform**: Linux server (Docker)
**Project Type**: Single NestJS server
**Performance Goals**: Editor URL generation must complete within 2s (single HTTP call to WOPI service)
**Constraints**: WOPI service (with 002-editor-url-privilege) and Collabora must be deployed; file-service-go manages document files
**Scale/Scope**: ~12 files created, ~8 files modified. 1 new GraphQL query, 1 new mutation, 1 new entity, 1 migration.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Domain-Centric Design | PASS | CollaboraDocument entity in domain layer. Service orchestrates adapters. |
| 2. Modular NestJS Boundaries | PASS | New CollaboraDocumentModule with single purpose. WopiServiceAdapterModule separate. |
| 3. GraphQL Schema as Stable Contract | PASS | Additive only: new enum value, new types, new query/mutation. No breaking changes. |
| 4. Explicit Data & Event Flow | PASS | Create: validation → auth → file upload → entity save. Edit: auth → WOPI token → URL. |
| 5. Observability & Operational Readiness | PASS | Adapter logs token requests. Document creation logged. |
| 6. Code Quality with Pragmatic Testing | PASS | Unit tests for service + adapter. Risk-based: test create/edit/delete flows. |
| 7. API Consistency & Evolution | PASS | Follows contribution pattern. Mutation naming: imperative. Query: descriptive. |
| 8. Secure-by-Design Integration | PASS | WOPI adapter has timeout/retry. Token endpoint behind Oathkeeper. |
| 9. Container & Deployment Determinism | PASS | Template files embedded in build. Config-driven URLs. |
| 10. Simplicity & Incremental Hardening | PASS | Reuses callout/contribution model. No new abstractions. |

## Project Structure

### Documentation (this feature)

```text
specs/086-collabora-integration/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Research findings
├── data-model.md        # Entity design
├── quickstart.md        # Implementation guide
├── contracts/
│   └── graphql-schema-changes.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Task breakdown
```

### Source Code (repository root)

```text
src/
├── common/enums/
│   ├── callout.contribution.type.ts         # MODIFY: add COLLABORA_DOCUMENT
│   └── collabora.document.type.ts           # NEW: enum
├── domain/collaboration/
│   ├── collabora-document/                  # NEW: module
│   │   ├── collabora.document.entity.ts
│   │   ├── collabora.document.interface.ts
│   │   ├── collabora.document.module.ts
│   │   ├── collabora.document.service.ts
│   │   ├── collabora.document.service.authorization.ts
│   │   ├── collabora.document.resolver.fields.ts
│   │   ├── collabora.document.resolver.mutations.ts
│   │   ├── collabora.document.resolver.queries.ts
│   │   ├── dto/
│   │   └── templates/                       # Empty XLSX/PPTX/DOCX files
│   ├── callout-contribution/
│   │   └── callout.contribution.entity.ts   # MODIFY: add collaboraDocument relation
│   └── callout/
│       └── callout.service.ts               # MODIFY: handle COLLABORA_DOCUMENT type
├── services/adapters/
│   └── wopi-service-adapter/                # NEW: module
│       ├── wopi.service.adapter.ts
│       └── wopi.service.adapter.module.ts
├── migrations/
│   └── XXXX-CreateCollaboraDocument.ts      # NEW: migration
└── alkemio.yml                              # MODIFY: add collabora.wopi_service_url config
```

## Implementation Approach

### Phase 1: Infrastructure
1. Add `CollaboraDocumentType` enum
2. Add `COLLABORA_DOCUMENT` to `CalloutContributionType`
3. Create `WopiServiceAdapter` (HTTP client — single method: `issueToken(documentId)` → returns `{ accessToken, accessTokenTTL, wopiSrc, editorUrl }`)
4. Add `collabora.wopi_service_url` config to `alkemio.yml` (only URL needed — WOPI service handles editor URL construction, MIME mapping, and Collabora discovery internally)

### Phase 2: Entity & Migration
5. Create `CollaboraDocument` entity with relations
6. Extend `CalloutContribution` with `collaboraDocument` relation
7. Generate migration

### Phase 3: Service Layer
8. Create `CollaboraDocumentService`:
   - `create()` — upload empty template to file-service-go, create entity
   - `getEditorUrl()` — call `wopiServiceAdapter.issueToken(documentId)`, return `editorUrl` from response (no URL construction on server side — WOPI service returns ready-to-use editor URL)
   - `delete()` — remove entity + underlying file
   - `rename()` — update profile displayName
9. Ship empty template files (XLSX/PPTX/DOCX)
10. Extend `CalloutContributionService` to handle COLLABORA_DOCUMENT creation

### Phase 4: GraphQL
11. Create resolvers (fields, mutations, queries)
12. Extend `CreateContributionOnCalloutInput` with `collaboraDocument` field
13. Add `collaboraEditorUrl` query (thin wrapper: forward doc ID to WOPI adapter, return `editorUrl`)
14. Regenerate schema

### Phase 5: Polish
15. Authorization service for CollaboraDocument (follow whiteboard pattern: `CONTRIBUTE` → `UPDATE_CONTENT`)
16. Lint, tests, schema validation

## Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| WOPI service v0.0.2 | External service | Deployed in Docker stack |
| file-service-go v0.0.5 | External service | Deployed, handles file storage |
| Collabora Online 24.04.12.2.1 | External service | Deployed in Docker stack |
| authorization-evaluation-service v0.0.2 | External service | Deployed, used by WOPI service |

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| WOPI service unavailable | Can't get editor URL | Fail gracefully with error, documents still listable |
| Collabora down | Editor iframe fails | Server not responsible, returns URL regardless |
| Large documents | Upload timeout | 30s timeout on file-service adapter, adjustable |
| Template files stale | Wrong format for newer Collabora | Templates are minimal, format is stable (OOXML) |
