# Tasks: TypeORM to Drizzle ORM Migration

**Input**: Design documents from `/specs/034-drizzle-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md, contracts/

**Tests**: Not explicitly requested in the spec. Test *migration* (updating existing tests to use Drizzle mocks) is covered under US3. No new tests are created.

**Organization**: Tasks grouped by user story. US1 (migration) is subdivided into schema definitions and service migration sub-phases due to scale (~80 entities, ~158 files with repository injection, 37 DataLoaders).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths included in descriptions

---

## Phase 1: Setup

**Purpose**: Install dependencies and establish baseline measurements before any code changes.

- [X] T001 Install Drizzle ORM dependencies: `pnpm add drizzle-orm postgres` and `pnpm add -D drizzle-kit`
- [X] T002 [P] Create Drizzle Kit configuration file at drizzle.config.ts (project root) per quickstart.md Step 7
- [ ] T003 [P] Record TypeORM test suite baseline timing by running `pnpm test:ci` on current master and saving per-file + aggregate results to specs/034-drizzle-migration/benchmark-typeorm.json

---

## Phase 2: Foundational (Drizzle Infrastructure)

**Purpose**: Core Drizzle infrastructure that MUST be complete before any schema or service migration.

**CRITICAL**: No US1 work can begin until this phase is complete.

- [X] T004 Create DRIZZLE injection token (Symbol) and DrizzleDb type alias in src/config/drizzle/drizzle.constants.ts
- [X] T005 [P] Create shared base column definitions (baseColumns, authorizableColumns, nameableColumns, contributorColumns) in src/config/drizzle/base.columns.ts per data-model.md "Shared Column Definitions" section
- [X] T006 [P] Create custom column types (simpleArray for 9 entities, simpleJson for AiPersona) in src/config/drizzle/custom-types.ts per data-model.md "Custom Types" section
- [X] T007 [P] Create query helpers (updateWithVersion for optimistic locking, withAuthorization/withProfile/withAgent eager-loading replacements) in src/config/drizzle/helpers.ts per research.md sections 8 and 10
- [X] T008 Create global DrizzleModule with postgres.js connection pooling in src/config/drizzle/drizzle.module.ts per research.md section 2. Include structured logging integration: configure postgres.js `debug` callback to route query logs through Winston with `LogContext.DATABASE` context, respecting the existing log level configuration. Add a `drizzle` logger instance following the same pattern as existing NestJS module loggers (Constitution P5: structured log contexts required for new modules).
- [X] T009 Create empty barrel schema export file at src/config/drizzle/schema.ts (will be populated as schemas are created in Phase 3)
- [X] T010 Add DrizzleModule to AppModule imports in src/app.module.ts (alongside existing TypeOrmModule initially for incremental migration)
- [X] T011 [P] Create mock Drizzle provider factory (createMockDrizzle, mockDrizzleProvider) for unit tests in test/utils/drizzle.mock.factory.ts per research.md section 12

**Checkpoint**: Drizzle infrastructure ready — schema definition can begin.

---

## Phase 3: User Story 1 — Migrate Data Access Layer (Part A: Schema Definitions) (Priority: P1)

**Goal**: Create Drizzle `pgTable()` schema definitions and `relations()` for all ~80 entities, co-located with domain modules. Each task creates `*.schema.ts` and `*.relations.ts` files following the patterns defined in data-model.md.

**Independent Test**: Run `drizzle-kit generate` after barrel export — an empty migration confirms schema parity with the existing database.

### Common Domain Schemas (~23 entities)

- [X] T012 [P] [US1] Create authorization policy schema + relations in src/domain/common/authorization-policy/authorization.policy.schema.ts and authorization.policy.relations.ts (baseColumns, 5 columns)
- [X] T013 [P] [US1] Create profile, reference, tagset, tagset template, tagset template set schemas + relations in src/domain/common/profile/, src/domain/common/reference/, src/domain/common/tagset/ (5 entities, authorizableColumns/baseColumns, simpleArray for tagset.tags and tagsetTemplate.allowedValues)
- [X] T014 [P] [US1] Create visual, location, form, lifecycle, NVP schemas + relations in src/domain/common/visual/, src/domain/common/location/, src/domain/common/form/, src/domain/common/lifecycle/, src/domain/common/nvp/ (5 entities, authorizableColumns/baseColumns, simpleArray for visual.allowedTypes)
- [X] T015 [P] [US1] Create whiteboard schema + relations in src/domain/common/whiteboard/whiteboard.schema.ts and whiteboard.relations.ts (authorizableColumns, compressed text custom type for content column — see research.md section 7)
- [X] T016 [P] [US1] Create license, license entitlement, classification, memo, media gallery, knowledge base schemas + relations in src/domain/common/license/, src/domain/common/classification/, src/domain/common/memo/, src/domain/common/media-gallery/, src/domain/common/knowledge-base/ (6 entities)

### Core Domain Schemas (~45 entities)

- [X] T017 [P] [US1] Create agent, credential schemas + relations in src/domain/agent/agent/ and src/domain/agent/credential/ (2 entities, authorizableColumns, simpleArray for credential resourceIDs)
- [X] T018 [P] [US1] Create space, account, space-about schemas + relations in src/domain/space/space/, src/domain/space/account/, src/domain/space/space-about/ (3 entities, nameableColumns for space, authorizableColumns for account/space-about, jsonb for space.settings)
- [X] T019 [P] [US1] Create collaboration, innovation flow, innovation flow state schemas + relations in src/domain/collaboration/collaboration/, src/domain/collaboration/innovation-flow/ (3 entities)
- [X] T020 [P] [US1] Create callout, callout framing, callout contribution, callout contribution defaults, callouts set, post, link schemas + relations in src/domain/collaboration/callout/, src/domain/collaboration/callout-contribution/, src/domain/collaboration/callouts-set/, src/domain/collaboration/post/, src/domain/collaboration/link/ (7 entities, nameableColumns for callout, lifecycle hooks replacement for callout contribution defaults)
- [X] T021 [P] [US1] Create user, organization, virtual contributor schemas + relations in src/domain/community/user/, src/domain/community/organisation/, src/domain/community/virtual-contributor/ (3 entities, contributorColumns, simpleArray for virtualContributor.searchVisibility)
- [X] T022 [P] [US1] Create community, community guidelines, user group, user settings, organization verification schemas + relations in src/domain/community/community/, src/domain/community/community-guidelines/, src/domain/community/user-group/, src/domain/community/user-settings/, src/domain/community/organisation-verification/ (5 entities)
- [X] T023 [P] [US1] Create communication, room, conversation, conversation membership, messaging, VC interaction schemas + relations in src/domain/communication/ (6 entities)
- [X] T024 [P] [US1] Create template, templates set, template defaults, templates manager, template content space schemas + relations in src/domain/template/ (5 entities)
- [X] T025 [P] [US1] Create application, invitation, platform invitation, role, role set schemas + relations in src/domain/access/ (5 entities, simpleArray for invitation.invitedContributors and platformInvitation.invitedToParent)
- [X] T026 [P] [US1] Create calendar, event, timeline schemas + relations in src/domain/timeline/ (3 entities)
- [X] T027 [P] [US1] Create document, storage bucket, storage aggregator schemas + relations in src/domain/storage/ (3 entities, simpleArray for storageBucket.allowedMimeTypes)
- [X] T028 [P] [US1] Create innovation hub schema + relations in src/domain/innovation-hub/innovation.hub.schema.ts and innovation.hub.relations.ts (1 entity, nameableColumns, simpleArray for subdomain)

### Platform & Services Schemas (~16 entities)

- [X] T029 [P] [US1] Create platform entity schemas + relations in src/platform/ covering: activity, forum, discussion, platform root, service metadata (5 entities, simpleArray for forum.discussionCategories)
- [X] T030 [P] [US1] Create in-app notification schema + relations in src/platform/in-app-notification/in.app.notification.schema.ts (1 entity, baseColumns, discriminator column pattern per data-model.md)
- [X] T031 [P] [US1] Create license plan, license policy, licensing framework schemas + relations in src/platform/licensing/ (3+ entities)
- [X] T032 [P] [US1] ~~Create authentication provider, Ory configuration schemas~~ N/A — these are plain DTOs, not TypeORM entities (no database tables)
- [X] T033 [P] [US1] Create AI persona, AI server schemas + relations in src/services/ai-server/ai-persona/ and src/services/ai-server/ai-server/ (2 entities, simpleJson for aiPersona.prompt and aiPersona.externalConfig)

### Schema Assembly

- [X] T034 [US1] Populate src/config/drizzle/schema.ts barrel export with all ~80 schema and ~80 relation imports from T012–T033
- [X] T035 [US1] Verify schema parity: run `npx drizzle-kit generate` and confirm it produces an empty migration; fix any discrepancies until zero-diff achieved

**Checkpoint**: All Drizzle schema definitions complete and verified against existing database.

---

## Phase 3.5: Transaction Pattern Audit

**Purpose**: Catalog all transaction usage sites before service migration begins, ensuring no pattern is missed or incorrectly translated.

- [X] T035a [US1] Audit all transaction patterns: grep for `entityManager.transaction`, `manager.transaction`, `queryRunner.startTransaction`, and nested transaction/savepoint usage across src/. Produce a checklist in specs/034-drizzle-migration/transaction-audit.md listing each call site (file:line), the transaction scope (single-entity vs multi-entity), nesting depth, and the planned Drizzle equivalent per quickstart.md "Transaction" section. Mark each site as verified during Phase 4 service migration.

**Checkpoint**: Transaction audit complete — all transaction sites cataloged with planned Drizzle equivalents.

---

## Phase 4: User Story 1 — Migrate Data Access Layer (Part B: Service & Module Migration) (Priority: P1)

**Goal**: Replace all `@InjectRepository()` (102 usages), `@InjectEntityManager('default')` (168 usages), and `createQueryBuilder()` (67 usages across 29 files) with `@Inject(DRIZZLE)` and Drizzle query builder API. Remove `TypeOrmModule.forFeature()` from each module. Update corresponding `.spec.ts` test files to use `mockDrizzleProvider` instead of `repositoryMockFactory`/`MockEntityManagerProvider`.

**Independent Test**: Each migrated module's tests should pass individually via `pnpm test -- <path>`.

**Note**: Each task below includes updating the service file(s), module file(s), AND corresponding test file(s) for that domain area. Follow the query migration patterns in quickstart.md "Common Migration Patterns Reference".

### Common Domain Services

- [X] T036 [US1] Migrate authorization policy service: replace @InjectRepository/@InjectEntityManager with @Inject(DRIZZLE), rewrite queries to Drizzle API, remove TypeOrmModule.forFeature, update tests in src/domain/common/authorization-policy/
- [X] T037 [P] [US1] Migrate profile service + module + tests in src/domain/common/profile/
- [X] T038 [P] [US1] Migrate tagset, tagset template services + modules + tests in src/domain/common/tagset/
- [X] T039 [P] [US1] Migrate visual, reference, location services + modules + tests in src/domain/common/visual/, src/domain/common/reference/, src/domain/common/location/
- [X] T040 [P] [US1] Migrate whiteboard service (replace @BeforeInsert/@AfterLoad lifecycle hooks with pre/post-processing in service layer per research.md section 7) + module + tests in src/domain/common/whiteboard/
- [X] T041 [P] [US1] Migrate form, lifecycle, NVP, license, classification, memo, media gallery, knowledge base services + modules + tests in src/domain/common/

### Core Domain Services

- [X] T042 [P] [US1] Migrate agent, credential services + modules + tests in src/domain/agent/
- [X] T043 [P] [US1] Migrate space, account, space-about services + modules + tests in src/domain/space/ (includes complex QueryBuilder patterns for space hierarchy queries)
- [X] T044 [P] [US1] Migrate collaboration, innovation flow services + modules + tests in src/domain/collaboration/collaboration/ and src/domain/collaboration/innovation-flow/
- [X] T045 [P] [US1] Migrate callout, callout contribution, callouts set services + modules + tests in src/domain/collaboration/callout*/ (includes cascade insert/update replacement for callout creation)
- [X] T046 [P] [US1] Migrate post, link services + modules + tests in src/domain/collaboration/post/ and src/domain/collaboration/link/
- [X] T047 [P] [US1] Migrate user, organization, virtual contributor services + modules + tests in src/domain/community/ (contributorColumns entities, includes QueryBuilder pagination patterns)
- [X] T048 [P] [US1] Migrate community, community guidelines, user group, user settings services + modules + tests in src/domain/community/
- [X] T049 [P] [US1] Migrate communication, room, conversation services + modules + tests in src/domain/communication/
- [X] T050 [P] [US1] Migrate template, templates set, template defaults, templates manager services + modules + tests in src/domain/template/
- [X] T051 [P] [US1] Migrate application, invitation, platform invitation, role, role set services + modules + tests in src/domain/access/
- [X] T052 [P] [US1] Migrate timeline, storage, innovation hub services + modules + tests in src/domain/timeline/, src/domain/storage/, src/domain/innovation-hub/

### Platform, Admin & Library Services

- [X] T053 [P] [US1] Migrate platform services (activity, forum, discussion, notifications, licensing, configuration) + modules + tests in src/platform/
- [X] T054 [P] [US1] Migrate AI persona, AI server services + modules + tests in src/services/ai-server/
- [X] T055 [P] [US1] Migrate platform-admin services (7 files: admin auth, user backfill, whiteboard admin, notification admin, licensing admin, geolocation admin, platform admin) + modules + tests in src/platform-admin/
- [X] T056 [P] [US1] Migrate library services (innovation pack, library service) + modules + tests in src/library/

### API, Infrastructure & Core Services

- [X] T057 [US1] Migrate API layer services (search, activity log, roles, input creation, URL resolution) + modules + tests in src/services/api/ (23 files with repository injection)
- [X] T058 [P] [US1] Migrate infrastructure services (entity resolvers, contributor lookup, naming, URL generation, storage aggregator resolution) + modules + tests in src/services/infrastructure/
- [X] T059 [US1] Migrate DataLoader creators (37 files): replace EntityManager.find/findOne with Drizzle relational queries in src/core/dataloader/ (critical for GraphQL N+1 optimization)
- [X] T060 [P] [US1] Migrate core auth and bootstrap services (authentication, agent info, bootstrap, GraphQL guard) in src/core/

### TypeORM Removal

- [X] T061 [US1] Remove all remaining TypeOrmModule.forFeature() imports from NestJS modules (97 modules total — verify none remain via grep)
- [X] T062 [US1] Remove TypeOrmModule.forRootAsync() configuration from src/app.module.ts and remove TypeORM DataSource configuration

**Checkpoint**: All services migrated to Drizzle. TypeORM module registrations removed. Server should start and connect to PostgreSQL.

---

## Phase 5: User Story 3 — Ensure All Existing Tests Pass (Priority: P1)

**Goal**: Verify all existing tests pass after the Drizzle migration with zero behavior changes.

**Independent Test**: `pnpm test:ci` returns zero failures.

- [X] T063 [US3] Remove old TypeORM test mock utilities (repositoryMockFactory, MockEntityManagerProvider, repository.mock.factory.ts, repository.provider.mock.factory.ts) from test/utils/ and update all remaining import references
- [X] T064 [US3] Sweep all *.spec.ts files for remaining TypeORM mock patterns (getRepositoryToken, getEntityManagerToken) and replace with DRIZZLE token mocks
- [X] T065 [US3] Run full test suite (`pnpm test:ci`) and fix all failures — iterate until zero-failure result
- [X] T066 [US3] Verify no previously passing test is skipped or deleted: compare test file count and test case count between TypeORM baseline and Drizzle branch
- [X] T067 [US3] Document all test modifications with justification (what changed and why) in specs/034-drizzle-migration/test-changes.md

**Checkpoint**: Full test suite passes. All test modifications documented.

---

## Phase 6: User Story 2 — Benchmark Test Suite Performance (Priority: P1)

**Goal**: Produce a side-by-side benchmark comparing test suite execution times under TypeORM vs. Drizzle.

**Independent Test**: A stakeholder can review the benchmark report and understand relative performance without running tests themselves.

**Dependency**: Requires T003 (TypeORM baseline) and Phase 5 completion (all tests passing on Drizzle).

- [X] T068 [US2] Record Drizzle test suite timing by running `pnpm test:ci` (3 runs, take median) and saving per-file + aggregate results to specs/034-drizzle-migration/benchmark-drizzle.json
- [X] T069 [US2] Generate benchmark comparison report with per-file timing, aggregate timing, percentage differences, and pass/fail counts in specs/034-drizzle-migration/benchmark-report.md
- [X] T070 [US2] Include benchmark reproduction steps in specs/034-drizzle-migration/benchmark-report.md (commands, environment requirements, expected setup time < 30 minutes per SC-005)

**Checkpoint**: Benchmark report complete and reproducible.

---

## Phase 7: User Story 4 — Produce Migration Effort Summary (Priority: P2)

**Goal**: Catalog the migration effort so the team can estimate cost/risk of a future production migration.

**Independent Test**: A team member unfamiliar with Drizzle can understand scope and nature of changes.

- [X] T071 [US4] Produce migration effort summary covering: schema translation patterns, query translation patterns (repository/EntityManager/QueryBuilder), transaction handling changes, cascade removal approach, eager loading replacement, lifecycle hook replacement, migration tooling differences, and pain points encountered — write to specs/034-drizzle-migration/migration-summary.md
- [X] T072 [US4] Include quantitative statistics in migration-summary.md: files changed per category, lines of code changed, pattern frequency counts (e.g., X cascade removals, Y eager loading replacements, Z QueryBuilder rewrites), and per-domain-area effort estimates

**Checkpoint**: Migration effort summary complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup — replace entity class imports with interface imports, remove TypeORM entity files, remove TypeORM packages, update migration scripts, and validate.

**Codebase Analysis (pre-cleanup)**:
- 91 `*.entity.ts` files total (67 still imported by non-entity code, 24 with no external imports)
- 143 entity class imports across 83 service files (used as TypeScript types)
- 4 interface files also import entity classes
- 123 files still contain `from 'typeorm'` imports (91 entity files + 13 migration files + 6 utility files + 5 config files + test mocks)
- 93% of entity files have a corresponding `*.interface.ts` file with an `I*` type (e.g., `IAccount`, `ISpace`)

### Step 1: Strip TypeORM from Entity Files (Revised Approach)

**REVISED**: Instead of deleting entity files (which would break 127+ call sites using `Entity.create()` and `new AuthorizationPolicy()`), entity files were converted to plain TypeScript classes by stripping all TypeORM decorators and imports.

**Pattern**: Remove `@Entity()`, `@Column()`, `@OneToOne()`, `@ManyToOne()`, `@JoinColumn()`, etc. and their `import { ... } from 'typeorm'` lines. Keep class hierarchy, constructors, methods, and non-TypeORM imports.

- [X] T073a [P] Strip TypeORM from common domain entity files (~18 files): src/domain/common/ (authorization-policy, classification, form, knowledge-base, license, license-entitlement, lifecycle, location, media-gallery, memo, nvp, profile, reference, tagset, tagset-template, tagset-template-set, visual, whiteboard)
- [X] T073b [P] Strip TypeORM from core domain entity files (~45 files): src/domain/agent/, src/domain/space/, src/domain/collaboration/, src/domain/access/, src/domain/community/, src/domain/communication/, src/domain/template/, src/domain/timeline/, src/domain/storage/, src/domain/innovation-hub/
- [X] T073c [P] Strip TypeORM from platform, library, and services entity files (~12 files): src/platform/, src/library/, src/services/ai-server/
- [X] T073d Rewrite base entity classes: BaseAlkemioEntity (add static create()), AuthorizableEntity, NameableEntity, ContributorBase — remove TypeORM BaseEntity extends and decorators
- [X] T073e Update test files: remove repositoryProviderMockFactory usage from 6 spec files, update default.mocker.factory.ts to remove repository mock, update entity.manager.provider.mock.ts to use string tokens
- [X] T073f Run full test suite — 495 tests pass, 0 failures

### Step 2: Delete Entity Files — DEFERRED

Entity files are kept as plain TypeScript classes. Deletion deferred to a future cleanup phase once all services are fully migrated to use Drizzle `InferSelectModel` types instead of entity classes.

### Step 3: Remove TypeORM Utilities with `from 'typeorm'` Imports

- [X] T074a Create typeorm-compat.types.ts shim with stub types (SelectQueryBuilder, Brackets, ILike, etc.) to replace `from 'typeorm'` imports in pagination/filtering/dataloader utilities
- [X] T074b Update pagination utilities to import from @core/typeorm-compat.types: src/core/pagination/pagination.fn.ts, src/core/pagination/relay.style.pagination.fn.ts
- [X] T074c Update filtering utilities to import from @core/typeorm-compat.types: src/core/filtering/filter.fn.ts, src/core/filtering/filter.fn.where.expression.ts, src/core/filtering/filters/organizationFilter.ts, src/core/filtering/filters/userFilter.ts
- [X] T074d Update dataloader utilities to import from @core/typeorm-compat.types: src/core/dataloader/utils/find.by.batch.options.ts, src/core/dataloader/utils/selectOptionsFromFields.ts, src/core/dataloader/creators/base/data.loader.creator.base.options.ts
- [X] T074e Update src/schema-bootstrap/stubs/db.stub.ts to use string tokens instead of TypeORM DataSource/EntityManager class references
- [X] T074f Update src/domain/community/user-authentication-link/user.authentication.link.types.ts to replace FindOneOptions<User> with Record<string, boolean | object>

### Step 4: Remove TypeORM Config & Migration Infrastructure

- [X] T075 [P] Delete TypeORM configuration files: src/config/typeorm.cli.config.ts, src/config/typeorm.cli.config.run.ts, src/config/migration.config.ts, src/config/migration.create.config.ts, src/config/fix.uuid.column.type.ts + updated src/config/index.ts barrel
- [X] T075a [P] Delete entire src/migrations/ directory (13 TypeORM migrations + utils/)
- [X] T075b [P] Delete TypeORM test mock files: test/utils/repository.mock.factory.ts, test/utils/repository.provider.mock.factory.ts + updated test/mocks/entity.manager.provider.mock.ts to use string tokens
- [X] T075c [P] Update test/schema/bootstrap-parity.spec.ts to use string tokens instead of TypeORM DataSource/EntityManager imports

### Step 5: Remove TypeORM Packages & Update Scripts

- [X] T076a Remove TypeORM and related packages from package.json: removed typeorm, @nestjs/typeorm, pg, @types/pg and ran pnpm install
- [X] T076 Update CLAUDE.md and .claude/CLAUDE.md to reflect Drizzle ORM stack: replace TypeORM references with Drizzle, update tech stack table, update migration commands, update entity guidelines
- [X] T076b Update package.json migration scripts to use Drizzle Kit: replaced typeorm/typeorm-no-entities/migration:create/generate/run/revert/show/validate with migration:generate (drizzle-kit generate), migration:run (drizzle-kit migrate), migration:drop (drizzle-kit drop)

### Step 6: Validation

- [X] T077a Run full test suite after all cleanup — 116 test files, 495 tests passed, 0 failures
- [X] T077b Verify zero `from 'typeorm'` or `from '@nestjs/typeorm'` imports remain — confirmed: grep returns zero results for both src/ and test/
- [ ] T077c Verify zero `*.entity.ts` files remain under src/ — DEFERRED (entity files kept as plain classes)
- [X] T077d Run `pnpm build` to confirm TypeScript compilation succeeds — ZERO build errors. All 221 type errors resolved: search.ingest.service.ts rewritten (42 entityManager→Drizzle), space/account/template/storage/collaboration services fixed (relations→with, Entity.create casts, nested with syntax), entity-resolver/platform-admin/API services fixed, notification adapter fixed. Full progression: 398→270→221→156→114→2→0.
- [X] T077 Run quickstart.md validation: execute all setup steps from specs/034-drizzle-migration/quickstart.md end-to-end on the migrated branch to confirm developer onboarding works — VALIDATED: dependencies verified (drizzle-orm 0.45.1, postgres 3.4.8, drizzle-kit 0.31.9), schema parity confirmed (75 tables, zero diff), server starts successfully with DrizzleModule, GraphQL endpoint serves data via Drizzle relational queries (spaces, profiles, tagsets, references, locations all load correctly), migration:generate produces empty migration

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on T001 (dependencies installed) — BLOCKS all US1 work
- **US1 Schemas (Phase 3)**: Depends on Phase 2 (base columns, custom types, barrel file exist)
- **Transaction Audit (Phase 3.5)**: Depends on Phase 3 (schemas defined). BLOCKS Phase 4 — ensures all transaction sites are known before rewriting.
- **US1 Services (Phase 4)**: Depends on T034–T035 (barrel export populated, schema parity verified) AND T035a (transaction audit complete)
- **US3 Tests (Phase 5)**: Depends on Phase 4 (all services migrated)
- **US2 Benchmark (Phase 6)**: Depends on T003 (TypeORM baseline) AND Phase 5 (tests passing)
- **US4 Summary (Phase 7)**: Depends on Phase 4 (migration complete for data collection)
- **Polish (Phase 8)**: Depends on Phases 5, 6, and 7

### Within Phase 8 (Polish)

- **Step 1** (T073a–T073i): Replace entity imports — all [P] tasks parallel, then T073i validates
- **Step 2** (T073j–T073o): Delete entity files — depends on Step 1 completion
- **Step 3** (T074a–T074e): Remove TypeORM utilities — can run parallel with Step 2
- **Step 4** (T075–T075c): Remove TypeORM config/migrations — can run parallel with Steps 2–3
- **Step 5** (T076a–T076b): Remove packages & update scripts — depends on Steps 2–4 (no typeorm imports remain)
- **Step 6** (T077a–T077): Final validation — depends on all previous steps

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US3 (P1)**: Depends on US1 completion — validates the migration
- **US2 (P1)**: Depends on US3 completion — needs passing tests for valid benchmark
- **US4 (P2)**: Depends on US1 completion — needs migration data for summary

---

## Parallel Opportunities

### Phase 8: Entity Import Replacement (High Parallelism)

T073a–T073g can all run simultaneously (different file sets):

```
Parallel batch:
  T073a: common domain services (~20 files)
  T073b: core domain services (~25 files)
  T073c: community services (~15 files)
  T073d: template/timeline/storage services (~15 files)
  T073e: platform/library/admin services (~15 files)
  T073f: API/infrastructure/core services (~15 files)
  T073g: interface files (4 files)
Sequential: T073h (test files — depends on service file patterns)
Sequential: T073i (validation — depends on all above)
```

### Phase 8: Cleanup (Medium Parallelism)

After import replacement validated (T073i):

```
Parallel batch:
  T073j–T073o: Delete entity files
  T074a–T074e: Remove TypeORM utilities
  T075–T075c: Remove TypeORM config/migrations
Sequential: T076a–T076b (package removal — after all imports gone)
Sequential: T077a–T077 (final validation — after everything)
```

---

## Implementation Strategy

### Completed Work (Phases 1–7)

1. ~~Phase 1: Setup~~ ✓ (T001–T002 complete; T003 skipped — TypeORM baseline not recorded pre-migration)
2. ~~Phase 2: Foundational~~ ✓ (T004–T011 complete)
3. ~~Phase 3: Schema definitions~~ ✓ (T012–T035 complete)
4. ~~Phase 3.5: Transaction audit~~ ✓ (T035a complete)
5. ~~Phase 4: Service migration~~ ✓ (T036–T062 complete)
6. ~~Phase 5: Test migration~~ ✓ (T063–T067 complete)
7. ~~Phase 6: Benchmark~~ ✓ (T068–T070 complete)
8. ~~Phase 7: Migration summary~~ ✓ (T071–T072 complete)

### Remaining Work (Phase 8: ~30 tasks)

Phase 8 is the final cleanup phase. Execute in step order:
1. **Step 1**: Replace entity→interface imports across ~83 service files (T073a–T073i)
2. **Step 2**: Delete all ~91 entity files (T073j–T073o)
3. **Step 3**: Remove TypeORM utility code (T074a–T074e)
4. **Step 4**: Remove TypeORM config and migrations (T075–T075c)
5. **Step 5**: Remove TypeORM packages and update scripts (T076a–T076b)
6. **Step 6**: Final validation — tests, build, grep verification (T077a–T077)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [US*] label maps task to specific user story for traceability
- **Entity→interface replacement pattern**: Most entities have `I*` interfaces (93%). For the 6 without interfaces (utility/DTO files), handle individually per task description.
- **PITFALL**: When using `replace_all`, watch for import path collisions (e.g., `space.level` enum path vs `spaces.level` schema). Use targeted replacements, not broad find/replace.
- **PITFALL**: Watch for local variable names that match schema imports (e.g., `credential` as arrow fn param). Use targeted edits, not `replace_all`.
- Refer to research.md for decision rationale on cascades (section 9), eager loading (section 8), lifecycle hooks (section 7), and transactions (section 6)
- Commit after each step for easy rollback
