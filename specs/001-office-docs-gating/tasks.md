# Tasks: Office Documents Feature Gating

**Feature**: `001-office-docs-gating`  
**Input**: [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md), [contracts/schema.graphql](contracts/schema.graphql), [contracts/rest-api.md](contracts/rest-api.md), [research.md](research.md), [quickstart.md](quickstart.md)  
**Branch**: `001-office-docs-gating`  
**Date**: 2026-04-21

> **Entitlement note (research.md resolution)**: The entitlement gate uses `LicenseService.isEntitlementEnabled()` with the `enabled` boolean field — NOT `limit ≥ 1` — consistent with all other `SPACE_FLAG_*` entitlements (`LicenseEntitlementDataType.FLAG`). The spec's "limit ≥ 1" language describes commercial intent, not the code path.

## Format: `[ID] [P?] [Story?] Description — file path`

- **[P]**: Can run in parallel (different files, no incomplete task dependencies)
- **[Story]**: User story label (US1–US5), required in story phases only

---

## Phase 1: Setup

**Purpose**: Add the enum value and config key that every subsequent task depends on. No user story work begins until this phase is complete.

- [ ] T001 Add `SPACE_FLAG_OFFICE_DOCUMENTS = 'space-flag-office-documents'` to `LicenseEntitlementType` enum after `SPACE_FLAG_MEMO_MULTI_USER` — `src/common/enums/license.entitlement.type.ts`
- [ ] T002 [P] Add `collaboration.office_documents.max_collaborators_in_room` (default: 20) config key to `alkemio.yml`, map `OFFICE_DOCUMENT_MAX_COLLABORATORS_IN_ROOM`, and extend the corresponding TypeScript config interface/type so `ConfigService` can read it — `alkemio.yml` + `src/config/`

**Checkpoint**: `SPACE_FLAG_OFFICE_DOCUMENTS` enum value compiles; config key is accessible via `ConfigService`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that **must** be complete before any user story can be implemented. Creates the `OfficeDocument` entity, wires the FK on `CalloutContribution`, generates the migration, adds the license traversal method, and seeds the default entitlement.

**⚠️ CRITICAL**: No user story phase can begin until all Phase 2 tasks are done.

- [ ] T003 Create `IOfficeDocument` interface (extends `INameable`, declare `createdBy?: string`, `contentUpdatePolicy: ContentUpdatePolicy`, `contribution?: ICalloutContribution`) — `src/domain/common/office-document/office.document.interface.ts`
- [ ] T004 [P] Create `OfficeDocument` TypeORM entity (extends `NameableEntity`, implements `IOfficeDocument`; fields: `createdBy uuid nullable`, `contentUpdatePolicy ContentUpdatePolicy not-null`; OneToOne inverse `contribution` relation) following the `Memo` entity pattern — `src/domain/common/office-document/office.document.entity.ts`
- [ ] T005 [P] Create input DTOs: `CreateOfficeDocumentOnContributionInput` (`calloutID: UUID!`, `profileData: CreateProfileInput!`, `contentUpdatePolicy?: ContentUpdatePolicy`), `UpdateOfficeDocumentInput` (`ID: UUID!`, `profileData?: UpdateProfileInput`), `DeleteOfficeDocumentInput` (`ID: UUID!`) — `src/domain/common/office-document/dto/`
- [ ] T006 Add `officeDocument` OneToOne owning-side relation to `CalloutContribution` entity (`eager: false`, `cascade: true`, `onDelete: 'SET NULL'`; `@JoinColumn()` for the `officeDocumentId uuid NULL` FK column) — `src/domain/collaboration/callout-contribution/callout.contribution.entity.ts`
- [ ] T007 Generate TypeORM migration `AddOfficeDocumentEntity` (run `pnpm run migration:generate -n AddOfficeDocumentEntity`); verify it creates the `office_document` table and adds `officeDocumentId` FK column on `callout_contribution` — `src/migrations/<timestamp>-AddOfficeDocumentEntity.ts`
- [ ] T008 [P] Add two traversal methods to `CommunityResolverService` (confirm each does not already exist before adding): **(a)** `getCollaborationLicenseFromOfficeDocumentOrFail(officeDocumentId: string): Promise<ILicense>` — traverse `Collaboration → calloutsSet → callouts → contributions → officeDocument` filtered by `officeDocumentId`; **(b)** `getCollaborationLicenseFromCalloutOrFail(calloutId: string): Promise<ILicense>` — traverse `Collaboration → calloutsSet → callouts` filtered by `calloutId`; both load relations `{ license: { entitlements: true } }` and throw `EntityNotFoundException` with `LogContext.COLLABORATION` if not found. Method (b) is used by the CREATE path in `OfficeDocumentService.createOfficeDocument` because the document does not yet exist at entitlement-check time — `src/services/infrastructure/entity-resolver/community.resolver.service.ts`
- [ ] T009 [P] Add `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement seed (`dataType: FLAG`, `limit: 0`, `enabled: false`) to the default space collaboration license seed after `SPACE_FLAG_MEMO_MULTI_USER` — `src/domain/template/template-content-space/template.content.space.service.ts`

**Checkpoint**: `pnpm build` succeeds; migration runs without error (`pnpm run migration:run`); no circular-dependency warnings (`pnpm run circular-dependencies`).

---

## Phase 3: US1 + US3 — Read Path & Write Gate (Priority: P1) 🎯 MVP

**Goal (US1)**: Return the full document list for read queries in unlicensed Collaborations with `isEntitlementEnabled = false` — no license error.  
**Goal (US3)**: Reject all write mutations (create, update-metadata, delete) in unlicensed Collaborations with `LICENSE_ENTITLEMENT_NOT_AVAILABLE` before authorization is checked.

**Independent Tests**:
- US1: Query office documents on a Collaboration with `enabled = false`; verify full list returned, no license error.
- US3: Send create/update/delete mutations on a Collaboration with `enabled = false`; verify all return `LICENSE_ENTITLEMENT_NOT_AVAILABLE`.

### Implementation

- [ ] T010 [US1] [US3] Create `OfficeDocumentService` implementing:
  - `isEntitlementEnabled(officeDocumentId: string): Promise<boolean>` — resolves license via `getCollaborationLicenseFromOfficeDocumentOrFail`, calls `LicenseService.isEntitlementEnabled(license, SPACE_FLAG_OFFICE_DOCUMENTS)`; logs debug `{ message: 'Entitlement check passed', collaborationId }` at `LogContext.LICENSE` on success (per FR-111 + constitution Principle 5).
  - `assertEntitlementOrFail(officeDocumentId: string): Promise<void>` — **UPDATE / DELETE path only** (document already exists); resolves license via `getCollaborationLicenseFromOfficeDocumentOrFail`; on rejection logs `warn` + throws `LicenseEntitlementNotAvailableException` with static message + `details: { collaborationId }` (no dynamic data in message, per coding standards); on success logs debug `{ message: 'Entitlement check passed', collaborationId }` at `LogContext.LICENSE`.
  - `getOfficeDocumentOrFail` — standard entity fetch.
  - `createOfficeDocument(input: CreateOfficeDocumentInput): Promise<IOfficeDocument>` — **CREATE path**: resolves license via `CommunityResolverService.getCollaborationLicenseFromCalloutOrFail(input.calloutID)` (document does not yet exist at check time); same log/throw pattern as above; then creates the document.
  - `updateOfficeDocument` — calls `assertEntitlementOrFail(officeDocumentId)` before update.
  - `deleteOfficeDocument` — calls `assertEntitlementOrFail(officeDocumentId)` before deletion.
  — `src/domain/common/office-document/office.document.service.ts`
- [ ] T011 [P] [US1] [US3] Create `OfficeDocumentAuthorizationService` (define CRUD privilege rules following `MemoAuthorizationService` pattern) — `src/domain/common/office-document/office.document.service.authorization.ts`
- [ ] T012 [P] [US1] Create base `OfficeDocumentResolver` (`@Resolver(() => OfficeDocument)`) with `@Query` field stubs and any parent-type field declarations required for NestJS resolver wiring — `src/domain/common/office-document/office.document.resolver.ts`
- [ ] T013 [P] [US3] Create `OfficeDocumentResolverMutations` with `@Mutation` handlers for `createOfficeDocument`, `updateOfficeDocument`, `deleteOfficeDocument`; delegate to `OfficeDocumentService` (entitlement gate is in service, not here); enforce authorization after entitlement check — `src/domain/common/office-document/office.document.resolver.mutations.ts`
- [ ] T014 [P] [US4] Create `OfficeDocumentResolverFields` with `@ResolveField(() => Boolean) isEntitlementEnabled(@Parent() doc: IOfficeDocument)` that calls `OfficeDocumentService.isEntitlementEnabled(doc.id)` — `src/domain/common/office-document/office.document.resolver.fields.ts`
- [ ] T015 [US1] [US3] Create `OfficeDocumentModule` (declare entity, providers: service, auth-service, resolvers; export service); register `OfficeDocumentModule` in `AppModule` — `src/domain/common/office-document/office.document.module.ts`
- [ ] T016 [P] [US1] [US3] Write unit tests for `OfficeDocumentService.isEntitlementEnabled` (returns `true`/`false` based on mock license) and `assertEntitlementOrFail` (throws `LicenseEntitlementNotAvailableException` when disabled; resolves when enabled; assert `warn` log emitted on rejection; assert `debug` log emitted on success; assert dynamic data absent from exception message) — `src/domain/common/office-document/office.document.service.spec.ts`

**Checkpoint**: US1 read path and US3 write rejection are fully functional and unit-tested. `pnpm test:ci` passes for this module.

---

## Phase 4: US2 — Licensed Collaborative Editing (Priority: P1)

**Goal**: Licensed Collaborations (`enabled = true`) receive `{ read: true, update: <auth result>, isMultiUser: true, maxCollaborators: N }` from the REST `info` endpoint; write mutations succeed for privileged users.

**Independent Test**: Call `GET /rest/office-document/info?documentId=<id>&userId=<id>` on a licensed Collaboration with UPDATE_CONTENT privilege; verify `update: true` and `maxCollaborators = 20`. Call again on unlicensed; verify `update: false`, `maxCollaborators = 1`.

### Implementation

- [ ] T017 [US2] Create `OfficeDocumentIntegrationService` with `info({ userId, documentId }): Promise<InfoOutputData>` implementing all four response scenarios (no-READ → `{read:false, update:false, isMultiUser:false, maxCollaborators:0}`; READ + no entitlement → `{read:true, update:false, isMultiUser:false, maxCollaborators:1}`; READ + entitlement + no UPDATE_CONTENT → `{read:true, update:false, isMultiUser:true, maxCollaborators:N}`; READ + entitlement + UPDATE_CONTENT → `{read:true, update:true, isMultiUser:true, maxCollaborators:N}`); read `max_collaborators_in_room` via `ConfigService` — `src/services/office-document-integration/office.document.integration.service.ts`
- [ ] T018 [P] [US2] Create `InfoInputData`, `InfoOutputData`, `FetchOutputData`, `SaveInputData` input/output type classes for the integration service — `src/services/office-document-integration/inputs/` and `src/services/office-document-integration/outputs/`
- [ ] T019 [P] [US2] Create `OfficeDocumentIntegrationController` with four handlers: `GET /rest/office-document/info` (calls `service.info`), `GET /rest/office-document/fetch` (returns base64 document content), `POST /rest/office-document/save` (persists base64 binary state), `GET /rest/office-document/who` (resolves actor ID from JWT); follow the `CollaborativeDocumentIntegrationController` pattern — `src/services/office-document-integration/office.document.integration.controller.ts`
- [ ] T020 [US2] Create `OfficeDocumentIntegrationModule` (declare controller, service; export service); add barrel `index.ts`; register module in `AppModule` — `src/services/office-document-integration/office.document.integration.module.ts` + `src/services/office-document-integration/index.ts`
- [ ] T021 [P] [US2] Write unit tests for `OfficeDocumentIntegrationService.info()` covering all four scenarios (no-read, unlicensed, licensed-no-update, licensed-with-update); verify `maxCollaborators = 1` for unlicensed and configured N for licensed; assert `isMultiUser` correctness — `src/services/office-document-integration/office.document.integration.service.spec.ts`

**Checkpoint**: All four `info` scenarios return correct payloads. `pnpm test:ci` passes for the integration service. Write mutations succeed for licensed Collaborations end-to-end.

---

## Phase 5: US5 — Cross-Space Isolation (Priority: P2)

**Goal**: Entitlement checks use only the Collaboration that directly contains the queried document; holding the entitlement in Space A does not grant write access in Space B.

**Independent Test**: Mock two Collaborations (A licensed, B unlicensed); verify `assertEntitlementOrFail` resolves for a document in A and throws for a document in B when called by the same user — using separate traversal calls, no shared context.

### Implementation

- [ ] T022 [US5] Write unit test for `CommunityResolverService.getCollaborationLicenseFromOfficeDocumentOrFail` verifying that it resolves the license of the Collaboration that **directly** contains the document (not a sibling or parent Space's license); cover the `EntityNotFoundException` path for an orphaned document — `src/services/infrastructure/entity-resolver/community.resolver.service.spec.ts`
- [ ] T023 [P] [US5] Write unit test for `OfficeDocumentService` verifying that `assertEntitlementOrFail` called for documents in two different Collaborations (one licensed, one not) uses each document's own license independently — extend `src/domain/common/office-document/office.document.service.spec.ts`

**Checkpoint**: Cross-space isolation is verified by unit tests; no shared Collaboration context is possible given the traversal design.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Schema contract gate, migration validation, and final CI gate. Affects all stories.

- [ ] T024 Run `pnpm run schema:print && pnpm run schema:sort && pnpm run schema:diff`; inspect `change-report.json` to confirm **zero** `BREAKING` or `PREMATURE_REMOVAL` entries; commit updated `schema.graphql` — `schema.graphql` + `change-report.json`
- [ ] T025 [P] Validate the migration with `.scripts/migrations/run_validate_migration.sh`; verify snapshot/restore cycle succeeds and CSV comparison passes — `src/migrations/<timestamp>-AddOfficeDocumentEntity.ts`
- [ ] T027 [P] Verify SC-005 (performance regression): exercise a representative write-mutation on a local instance for both `OfficeDocument` (`getCollaborationLicenseFromOfficeDocumentOrFail`) and `Memo` (`getCollaborationLicenseFromMemoOrFail`) entitlement traversals; compare response times and confirm no measurable regression; record the outcome (or declare "no regression observed") in the PR description. No dedicated benchmark file is required.
- [ ] T026 Run `pnpm lint` (tsc + Biome) and `pnpm test:ci`; resolve all type errors, lint violations, and test failures before marking the branch ready for review

**Checkpoint (Exit Criteria)**:
- [ ] All acceptance scenarios for US1–US5 verified
- [ ] SC-001 through SC-007 covered by unit + integration tests
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:ci` exits 0
- [ ] `schema:diff` shows only additive changes, zero BREAKING entries
- [ ] Migration validation script passes

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
  └── Phase 2 (Foundational) — BLOCKS everything below
        ├── Phase 3 (US1 + US3) — P1, can start after Phase 2
        ├── Phase 4 (US2)       — P1, can start after Phase 2
        └── Phase 5 (US5)       — P2, can start after Phase 2
              └── Phase 6 (Polish) — after all story phases complete
```

### Within Phase 2

```
T003 (interface) → T004 (entity) → T006 (FK on contribution) → T007 (migration)
T002, T005, T008, T009 are [P] with T003/T004 (different files)
```

### Within Phase 3

```
T010 (service) required before T011, T012, T013, T014, T015, T016
T011, T012, T013, T014, T016 are [P] with each other (different files)
T015 (module) last — wires all providers
```

### Within Phase 4

```
T018 [P] with T017 (types created alongside service)
T019 [P] with T017 (controller in separate file)
T017 + T018 + T019 → T020 (module wiring) → T026 (CI)
T021 [P] with T019 (test file is independent)
```

---

## Parallel Execution Examples

### Phase 2 (once T001 complete)

```
Parallel group A (all can start simultaneously):
  T003 — IOfficeDocument interface
  T004 — OfficeDocument entity
  T005 — Input DTOs
  T008 — CommunityResolverService traversal method
  T009 — TemplateContentSpaceService seed

Sequential after T004 completes:
  T006 — CalloutContribution FK  →  T007 — Migration
```

### Phase 3 + Phase 4 (once Phase 2 complete, two developers)

```
Developer A — Phase 3:
  T010 → (T011 [P], T012 [P], T013 [P], T014 [P], T016 [P]) → T015

Developer B — Phase 4:
  (T017, T018 [P]) → T019 → T020 → T021 [P]
```

---

## Implementation Strategy

### MVP Scope (P1 only — US1, US2, US3)

1. **Phase 1** → enum + config
2. **Phase 2** → entity + migration + traversal + seed
3. **Phase 3** → domain service + auth + resolvers + module (covers US1 + US3)
4. **Validate** US1 + US3 independently via unit tests
5. **Phase 4** → integration service (covers US2)
6. **Validate** US2 via unit tests on `info()` scenarios
7. **Phase 6** → schema + migration + CI gate
8. **Ship MVP**

### Incremental Delivery Beyond MVP

After MVP:
- **Phase 5** (US4 already done via T014 in Phase 3 — `isEntitlementEnabled` field resolver)
- **Phase 5** (US5) — Cross-space isolation tests (T022, T023)

---

## Task Count Summary

| Phase | Tasks | User Stories |
|-------|-------|-------------|
| Phase 1: Setup | 2 | — |
| Phase 2: Foundational | 7 | — |
| Phase 3: US1 + US3 | 7 | US1 (P1), US3 (P1) |
| Phase 4: US2 | 5 | US2 (P1) |
| Phase 5: US5 | 2 | US5 (P2) |
| Phase 6: Polish | 4 | — |
| **Total** | **27** | **5 stories** |

| User Story | Tasks | Independent Test |
|-----------|-------|-----------------|
| US1 — Read-Only Unlicensed | T010, T012, T014, T015, T016 | Query docs on `enabled=false` Collab; expect full list + no license error |
| US2 — Licensed Editing | T017, T018, T019, T020, T021 | Call `info` on licensed Collab; expect `update:true`, `maxCollaborators:20` |
| US3 — Write Gate | T010, T013, T015, T016 | Send write mutations on `enabled=false` Collab; expect `LICENSE_ENTITLEMENT_NOT_AVAILABLE` |
| US4 — `isEntitlementEnabled` field | T014 | Query field on licensed + unlicensed docs; verify `true`/`false` |
| US5 — Cross-Space Isolation | T022, T023 | Two separate traversals for docs in A (licensed) and B (unlicensed); each independent |

| Parallel Opportunities | Count |
|------------------------|-------|
| Phase 2 parallel group | 5 tasks |
| Phase 3 parallel group | 5 tasks (after T010) |
| Phase 4 parallel group | 3 tasks |
| **Total parallelizable** | **14 of 27** |
