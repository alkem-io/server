# Tasks: Collabora Document Integration

**Input**: Design documents from `/specs/086-collabora-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested -- existing test patterns will be followed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Enums, config, adapter infrastructure

- [x] T001 Add `CollaboraDocumentType` enum (`SPREADSHEET`, `PRESENTATION`, `WORDPROCESSING`) in `src/common/enums/collabora.document.type.ts` and register with GraphQL
- [x] T002 Add `COLLABORA_DOCUMENT` value to `CalloutContributionType` enum in `src/common/enums/callout.contribution.type.ts` and update `AllCalloutContributionTypes` array
- [x] T003 Add `collabora.wopi_service_url` config block to `alkemio.yml` (default: `http://localhost:3000`) and add typing in `src/types/alkemio.config.ts`
- [x] T004 Create `WopiServiceAdapter` in `src/services/adapters/wopi-service-adapter/wopi.service.adapter.ts` -- HTTP client using `@nestjs/axios` with timeout/retry. Single method: `issueToken(documentId: string, actorJWT: string): Promise<{ accessToken, accessTokenTTL, wopiSrc, editorUrl }>`. Calls `POST /wopi/token` on WOPI service with `{ documentId }` in request body and forwards the actor's Bearer token in the `Authorization` header (Oathkeeper on the WOPI service side extracts `alkemio_actor_id` from this JWT).
- [x] T005 Create `WopiServiceAdapterModule` in `src/services/adapters/wopi-service-adapter/wopi.service.adapter.module.ts` -- NestJS module exporting WopiServiceAdapter, importing HttpModule

**Checkpoint**: Enums registered, config added, WOPI adapter ready.

---

## Phase 2: Foundational -- Entity & Migration

**Purpose**: Create CollaboraDocument entity and extend CalloutContribution. MUST complete before user stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Create `CollaboraDocument` entity in `src/domain/collaboration/collabora-document/collabora.document.entity.ts` with fields: `documentType` (CollaboraDocumentType enum), relations: `profile` (OneToOne → Profile, cascade), `document` (ManyToOne → Document), `authorization` (OneToOne → AuthorizationPolicy, cascade). Extends AuthorizableEntity.
- [x] T007 Create `ICollaboraDocument` interface in `src/domain/collaboration/collabora-document/collabora.document.interface.ts`
- [x] T008 Add optional `collaboraDocument` OneToOne relation on `CalloutContribution` entity in `src/domain/collaboration/callout-contribution/callout.contribution.entity.ts` (same pattern as `post`, `whiteboard`, `link`, `memo`)
- [x] T009 Generate TypeORM migration for `collabora_document` table + `collaboraDocumentId` FK on `callout_contribution` in `src/migrations/`
- [x] T010 Ship empty document templates: `src/domain/collaboration/collabora-document/templates/empty.xlsx`, `empty.pptx`, `empty.docx` (minimal valid OOXML files, ~5-10KB each)
- [x] T010b Create `CollaboraDocumentAuthorizationService` in `src/domain/collaboration/collabora-document/collabora.document.service.authorization.ts` -- follow whiteboard pattern: inherit parent authorization, grant `UPDATE_CONTENT` from `CONTRIBUTE` privilege, creator gets CRUD. Must be ready before any document is created.

**Checkpoint**: Entity exists, migration runs, templates available, authorization service ready.

---

## Phase 3: User Story 1 -- Create a Collaborative Document (Priority: P1) MVP

**Goal**: Users can create a new collaborative document (XLSX/PPTX/DOCX) in a space via a callout contribution.

**Independent Test**: Create a COLLABORA_DOCUMENT contribution via GraphQL. Verify entity created, template file uploaded to file-service-go, document appears in contribution list.

### Implementation for User Story 1

- [x] T011 [US1] Create `CollaboraDocumentService` in `src/domain/collaboration/collabora-document/collabora.document.service.ts` with `createCollaboraDocument(input)` method. Creation sequence: (1) read the correct empty template buffer based on `documentType`, (2) pre-create auth policy + tagset (same pattern as StorageBucketService upload), (3) upload template to file-service-go via `FileServiceAdapter.createDocument()` with auth/tagset IDs, (4) load the Document entity by ID from the Go service response (server reads it from DB — document table is read-only), (5) create CollaboraDocument entity with profile and the loaded Document relation, (6) apply authorization policy via CollaboraDocumentAuthorizationService
- [x] T012 [US1] Create `CollaboraDocumentModule` in `src/domain/collaboration/collabora-document/collabora.document.module.ts` -- imports FileServiceAdapterModule, WopiServiceAdapterModule, ProfileModule, AuthorizationPolicyModule, TagsetModule. Exports CollaboraDocumentService.
- [x] T013 [US1] Create `CreateCollaboraDocumentInput` DTO in `src/domain/collaboration/collabora-document/dto/collabora.document.dto.create.ts` with fields: `displayName` (string), `documentType` (CollaboraDocumentType)
- [x] T014 [US1] Import `CollaboraDocumentModule` into `CalloutModule` (or `CalloutContributionModule` if separate) in the appropriate module file — ensure no circular dependency by using `forwardRef()` if needed. Inject `CollaboraDocumentService` into `CalloutContributionService`.
- [x] T014b [US1] Extend `CalloutContributionService.createCalloutContribution()` in `src/domain/collaboration/callout-contribution/callout.contribution.service.ts` to handle `COLLABORA_DOCUMENT` type: call `collaboraDocumentService.createCollaboraDocument()` and set contribution.collaboraDocument
- [x] T015 [US1] Extend `CreateContributionOnCalloutInput` in `src/domain/collaboration/callout/dto/callout.dto.create.contribution.ts` with optional `collaboraDocument: CreateCollaboraDocumentInput` field
- [x] T016 [US1] Create field resolver for `CalloutContribution.collaboraDocument` in `src/domain/collaboration/collabora-document/collabora.document.resolver.fields.ts`

**Checkpoint**: Can create COLLABORA_DOCUMENT contributions via existing `createContributionOnCallout` mutation.

---

## Phase 4: User Story 4 -- List Collaborative Documents (Priority: P1)

**Goal**: Users can see collaborative documents in a space's callout contribution list with metadata.

**Independent Test**: Query a callout's contributions, verify COLLABORA_DOCUMENT contributions include collaboraDocument field with profile, documentType.

### Implementation for User Story 4

- [x] T017 [US4] Ensure `CalloutContribution` GraphQL type exposes `collaboraDocument` field (field resolver from T016 handles this)
- [x] T018 [US4] Add `CollaboraDocument` GraphQL type with fields: `id`, `profile`, `documentType`, `createdDate`, `updatedDate`, `authorization` in `src/domain/collaboration/collabora-document/collabora.document.resolver.fields.ts`

**Checkpoint**: Contributions of type COLLABORA_DOCUMENT show document metadata in queries.

---

## Phase 5: User Story 2 -- Open and Edit a Collaborative Document (Priority: P1)

**Goal**: Users can get a Collabora editor URL for an existing document. The WOPI service returns a ready-to-use `editorUrl`.

**Independent Test**: Call `collaboraEditorUrl` query with a document ID. Verify response includes `editorUrl` and `accessTokenTTL`. Load the URL in a browser -- Collabora editor opens.

### Implementation for User Story 2

- [x] T019 [US2] Add `getEditorUrl(collaboraDocumentId, actorJWT)` method to `CollaboraDocumentService` in `src/domain/collaboration/collabora-document/collabora.document.service.ts`: load the CollaboraDocument, get the underlying document ID, call `wopiServiceAdapter.issueToken(documentId, actorJWT)` (forwards actor JWT for Oathkeeper auth on WOPI side), return `{ editorUrl, accessTokenTTL }` from response
- [x] T020 [US2] Create `collaboraEditorUrl` query resolver in `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.ts` -- takes `collaboraDocumentID: UUID`, checks READ authorization on the document, calls service `getEditorUrl()`, returns `CollaboraEditorUrl` type
- [x] T021 [US2] Register query resolver in `CollaboraDocumentModule` and ensure it's wired into the GraphQL schema

**Checkpoint**: Can request editor URL via GraphQL and open Collabora editor in iframe.

---

## Phase 6: User Story 3 -- Delete a Collaborative Document (Priority: P2)

**Goal**: Users can delete a collaborative document, removing entity and underlying file.

**Independent Test**: Delete a COLLABORA_DOCUMENT contribution. Verify entity removed, file deleted from file-service-go.

### Implementation for User Story 3

- [x] T022 [US3] Add `deleteCollaboraDocument(id)` method to `CollaboraDocumentService`: delete underlying document via `DocumentService.deleteDocument()`, remove profile, remove entity
- [x] T023 [US3] Ensure `CalloutContributionService` deletion cascade handles COLLABORA_DOCUMENT type (verify OneToOne cascade on entity)

**Checkpoint**: Deleting a COLLABORA_DOCUMENT contribution removes all related data.

---

## Phase 7: User Story 5 -- Rename a Collaborative Document (Priority: P3)

**Goal**: Users can rename a collaborative document.

**Independent Test**: Call `updateCollaboraDocument` mutation with new displayName. Verify name changed in document list.

### Implementation for User Story 5

- [x] T024 [US5] Add `updateCollaboraDocument(input)` method to `CollaboraDocumentService`: update profile displayName
- [x] T025 [US5] Create `UpdateCollaboraDocumentInput` DTO in `src/domain/collaboration/collabora-document/dto/collabora.document.dto.update.ts` with fields: `ID` (UUID), `displayName` (string, optional)
- [x] T026 [US5] Create `updateCollaboraDocument` mutation resolver in `src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.ts` -- checks UPDATE authorization, calls service

**Checkpoint**: Can rename documents via GraphQL.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Authorization, schema, tests, validation

- [x] T028 Regenerate GraphQL schema: run `pnpm run schema:print && pnpm run schema:sort`
- [x] T029 Run `pnpm lint` and fix any linting errors
- [x] T030 Run `pnpm test:ci:no:coverage` and fix any broken tests
- [x] T031 Verify `pnpm build` succeeds with no errors
- [x] T032 Manual test: create one document of each type (SPREADSHEET, PRESENTATION, WORDPROCESSING), verify each opens in the correct Collabora editor (Calc, Impress, Writer)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies -- start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 -- BLOCKS all user stories
- **Phase 3 (US1 Create)**: Depends on Phase 2
- **Phase 4 (US4 List)**: Depends on Phase 3 (needs entity + field resolver)
- **Phase 5 (US2 Edit URL)**: Depends on Phase 3 (needs created documents)
- **Phase 6 (US3 Delete)**: Depends on Phase 3
- **Phase 7 (US5 Rename)**: Depends on Phase 3
- **Phase 8 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (Create, P1)**: Can start after Phase 2 -- no other story dependencies
- **US4 (List, P1)**: Depends on US1 (field resolver created there)
- **US2 (Edit, P1)**: Depends on US1 (needs documents to exist)
- **US3 (Delete, P2)**: Depends on US1
- **US5 (Rename, P3)**: Depends on US1

### Parallel Opportunities

After Phase 3 (US1) completes:
- **Stream A**: US4 (List) -- T017-T018
- **Stream B**: US2 (Edit URL) -- T019-T021
- **Stream C**: US3 (Delete) -- T022-T023
- **Stream D**: US5 (Rename) -- T024-T026

---

## Implementation Strategy

### MVP First (US1 + US4 + US2)

1. Complete Phase 1: Setup (enums, config, adapter)
2. Complete Phase 2: Entity + migration
3. Complete Phase 3: US1 -- Create documents
4. Complete Phase 4: US4 -- List documents
5. Complete Phase 5: US2 -- Edit with Collabora
6. **STOP and VALIDATE**: Create document, see it in list, open in Collabora editor
7. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. US1 → Can create documents (MVP foundation)
3. US4 + US2 → Can list and edit (MVP complete!)
4. US3 → Can delete documents
5. US5 → Can rename documents
6. Each increment adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- WOPI service must have spec 002 (editor-url-privilege) implemented for editorUrl field
- Authorization follows whiteboard pattern: CONTRIBUTE → UPDATE_CONTENT
- Empty templates shipped as static files in the codebase
- Server constructs zero URLs -- WOPI service returns ready-to-use editorUrl
