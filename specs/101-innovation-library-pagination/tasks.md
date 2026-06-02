---

description: "Task list for Paginated Innovation Library (feature 101, Option A — documented cursor pattern)"
---

# Tasks: Paginated Innovation Library

**Input**: Design documents from `specs/101-innovation-library-pagination/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/library-pagination.graphql

**Approach**: Follow `docs/Pagination.md` exactly — reuse `getPaginationResults` +
shared `PaginationArgs` + `Paginate(...)`. Add a `rowId` cursor column to
`InnovationPack` and `Template` (migration). Paginated fields page in `rowId`
order, newest-first (DESC). No field-based ordering on the paginated fields.

**Tests**: Risk-based service specs (Constitution Principle 6).

**Organization**: By user story. US1 (templates) is the MVP. US2 (packs) and US3
(backward-compat) are independent increments. Paths are repo-relative to `server/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete dependency)
- **[Story]**: US1 / US2 / US3 (Setup/Foundational/Polish unlabeled)

---

## Phase 1: Setup

- [x] T001 Capture the current schema as the diff baseline: `cp schema.graphql tmp/prev.schema.graphql`

---

## Phase 2: Foundational — `rowId` cursor enablement (Blocking Prerequisites)

**⚠️ CRITICAL**: the documented cursor helper requires a `rowId`; no story can page until this is done.

- [x] T002 [P] Add `rowId` to InnovationPack: `@Column({ unique: true, nullable: false }) @Generated('increment') rowId!: number;` in `src/library/innovation-pack/innovation.pack.entity.ts`, and `rowId!: number;` in `src/library/innovation-pack/innovation.pack.interface.ts` (so `IInnovationPack` satisfies `Paginationable`)
- [x] T003 [P] Add `rowId` to Template: same column in `src/domain/template/template/template.entity.ts` and `rowId!: number;` in `src/domain/template/template/template.interface.ts`
- [x] T004 Create migration `src/migrations/<timestamp>-AddRowIdToInnovationPackAndTemplate.ts` — up: `ALTER TABLE "innovation_pack" ADD "rowId" SERIAL NOT NULL` + `ADD CONSTRAINT "UQ_innovation_pack_rowId" UNIQUE ("rowId")`; same for `"template"`; down: drop the UNIQUE constraints + columns. Inline rollback note. (SERIAL backfills existing rows.) (depends: T002, T003)
- [x] T005 Validate the migration: `bash .scripts/migrations/run_validate_migration.sh`, then `pnpm run migration:run` → `migration:revert` → `migration:run` to confirm idempotent up/down; confirm existing rows get sequential `rowId`s (depends: T004)

**Checkpoint**: both entities are `Paginationable`; cursor helper usable.

---

## Phase 3: User Story 1 - Browse library templates a page at a time (Priority: P1) 🎯 MVP

**Goal**: New `Library.templatesPaginated` cursor field returning a newest-first page of `TemplateResult`s with `total` + `pageInfo`, composing with the template-type filter.

**Independent Test**: `templatesPaginated(filter:{types:[CALLOUT]}, first:5)` → ≤5 newest CALLOUT results + `total` (filtered) + `endCursor`; re-query with `after: endCursor` → next distinct slice, no overlap.

### Tests for User Story 1 (risk-based)

- [x] T006 [P] [US1] Service spec `getPaginatedTemplates` in `src/library/library/library.service.spec.ts` — default page 25 when `first` omitted; `first`>100 clamped to 100; newest-first (`rowId` DESC) cursor continuity across consecutive pages (no repeat/skip); type filter composes and `total` reflects the filtered set; `pageInfo` flags at first/last/empty; only `listedInStore=true`+`PUBLIC` templates returned. (Arg validation — conflicting/invalid `first`+`last` etc. — is owned by the shared helper's own spec `validate.pagination.args.spec.ts`, not re-tested here.)

### Implementation for User Story 1

- [x] T007 [P] [US1] Create `PaginatedLibraryTemplateResults` in `src/library/library/dto/library.dto.templates.paginated.ts` — `@ObjectType()` extending `Paginate(ITemplateResult, 'templateResults')`
- [x] T008 [US1] Implement `LibraryService.getPaginatedTemplates(pagination, filter?)` in `src/library/library/library.service.ts` — `Template` QueryBuilder INNER JOIN `templates_set` + `innovation_pack` (eligibility WHERE `listedInStore=true AND searchVisibility='PUBLIC'`, + `template.type IN (:types)` when filtered); clamp `first`/`last`→100; `getPaginationResults(qb, pagination, 'DESC')`; load packs for the returned templates (one query, `templatesSetId IN (...)`); map each `Template`→`ITemplateResult{template, innovationPack}`; return `{ total, templateResults, pageInfo }` (depends: T002-T005, T007)
- [x] T009 [US1] Add `templatesPaginated` `@ResolveField('templatesPaginated', () => PaginatedLibraryTemplateResults)` in `src/library/library/library.resolver.fields.ts` — reuse `@AuthorizationActorHasPrivilege(READ)` + `@UseGuards(GraphqlGuard)`; args `filter?`, `pagination?: PaginationArgs`; delegate to `getPaginatedTemplates` (depends: T008)
- [x] T010 [US1] Regenerate schema (`pnpm run schema:print && pnpm run schema:sort`) + `pnpm run schema:diff`; confirm `templatesPaginated` + `PaginatedLibraryTemplateResults` are **additive** and that `rowId` is **not** exposed on `Template`/`InnovationPack` in `change-report.json` (depends: T009)

**Checkpoint**: `templatesPaginated` works and is independently shippable (MVP).

---

## Phase 4: User Story 2 - Browse innovation packs a page at a time (Priority: P2)

**Goal**: New `Library.innovationPacksPaginated` cursor field returning a newest-first page of packs with `total` + `pageInfo`.

**Independent Test**: `innovationPacksPaginated(first:10)` → ≤10 newest packs + `total` + `endCursor`; re-query with `after: endCursor` → next distinct slice, no repeats.

### Tests for User Story 2 (risk-based)

- [x] T011 [P] [US2] Service spec `getPaginatedListedInnovationPacks` in `src/library/library/library.service.spec.ts` — default page 25 + clamp 100; newest-first cursor continuity (no repeat/skip); `total` = listed+public pack count; `pageInfo` flags at first/last/empty; only `listedInStore=true`+`PUBLIC` packs returned

### Implementation for User Story 2

- [x] T012 [P] [US2] Create `PaginatedInnovationPacks` in `src/library/library/dto/library.dto.innovationPacks.paginated.ts` — `@ObjectType()` extending `Paginate(IInnovationPack, 'innovationPacks')`
- [x] T013 [US2] Implement `LibraryService.getPaginatedListedInnovationPacks(pagination)` in `src/library/library/library.service.ts` — `InnovationPack` QueryBuilder with eligibility WHERE; clamp `first`/`last`→100; `getPaginationResults(qb, pagination, 'DESC')`; return `PaginatedInnovationPacks` (depends: T002-T005, T012)
- [x] T014 [US2] Add `innovationPacksPaginated` `@ResolveField` in `src/library/library/library.resolver.fields.ts` — `READ` guard + decorator; args `pagination?: PaginationArgs`; delegate to `getPaginatedListedInnovationPacks` (depends: T013)
- [x] T015 [US2] Regenerate schema + `pnpm run schema:diff`; confirm `innovationPacksPaginated` + `PaginatedInnovationPacks` are **additive** (depends: T014)

**Checkpoint**: both paginated fields work; legacy fields still present.

---

## Phase 5: User Story 3 - Existing consumers keep working unchanged (Priority: P1)

**Goal**: Prove additivity — existing `Library.templates` / `Library.innovationPacks` (incl. `RANDOM`, template-count, alphabetical) behave exactly as before.

**Independent Test**: existing library query reading `templates` and `innovationPacks(queryData:{orderBy: RANDOM})` returns identical shape/contents; `change-report.json` shows no change to these fields.

### Tests for User Story 3 (risk-based)

- [x] T016 [P] [US3] Regression spec in `src/library/library/library.service.spec.ts` asserting `getTemplatesInListedInnovationPacks` and `getListedInnovationPacks` (incl. `RANDOM`, `NUMBER_OF_TEMPLATES_ASC/DESC`, `limit`, alphabetical templates) are unchanged by this feature (FR-010)

### Verification for User Story 3

- [x] T017 [US3] Review `change-report.json`: confirm **zero** changes to existing `Library.templates` / `Library.innovationPacks`, that `rowId` is not exposed in the GraphQL schema, and that the only additions are the two paginated fields + two connection types (depends: T010, T015)

**Checkpoint**: backward compatibility proven.

---

## Phase 5b: Server-side text filter (`searchTerm`) — US1 + US2 (added 2026-06-02)

**Goal**: Both paginated fields accept an optional `searchTerm` matched
case-insensitively (substring) across title, description, and tags (OR-ed),
composing with eligibility, the type filter, and pagination/total. **Provider name
is NOT searched** (excluded for performance — FR-022).

**Independent Test**: `templatesPaginated(filter:{searchTerm:"inno"}, first:5)` →
only templates whose title/description/tags contain "inno"; `total` = matched count;
`innovationPacksPaginated(filter:{searchTerm:"inno"})` likewise; an item matching on
several fields appears once.

### Tests (risk-based)

- [x] T021 [P] [US1/US2] Service specs in `src/library/library/library.service.spec.ts`
  for the `searchTerm` filter on both methods — blank/whitespace term ⇒ no filter;
  the `OR` group is applied (assert the bracketed predicate / tags `EXISTS` fragment
  on the deep-QB mock); composes with the type filter (AND) on templates; no row
  duplication / `total` inflation when matching multiple tags (FR-019–FR-021)

### Implementation

- [x] T022 Extend filter inputs: add `searchTerm?: string` to
  `src/library/library/dto/library.dto.templates.input.ts` (`LibraryTemplatesFilterInput`);
  create `LibraryInnovationPacksFilterInput { searchTerm?: string }` in
  `src/library/library/dto/library.dto.innovationPacks.filter.ts`
- [x] T023 Add a private `applySearchTerm(qb, alias, term)` helper in
  `library.service.ts` — no-op on blank; else join `profile` and add a single
  bracketed `OR` group: `profile.displayName`/`profile.description` `ILIKE`; tags via
  `EXISTS` on `tagset` (by `profileId`). **No provider/account join** (depends: T022)
- [x] T024 [US2] Wire `getPaginatedListedInnovationPacks(pagination, filter?)` to call
  `applySearchTerm` and the resolver field to accept `filter: LibraryInnovationPacksFilterInput`
  (depends: T023)
- [x] T025 [US1] Wire `getPaginatedTemplates` to call `applySearchTerm` (matching the
  template's own `profile`), composing with the existing type filter (depends: T023)
- [x] T026 Regenerate schema + `pnpm run schema:diff`; confirm the only additions are
  `searchTerm` on `LibraryTemplatesFilterInput`, the new `LibraryInnovationPacksFilterInput`,
  and the `filter` arg on `innovationPacksPaginated` — all additive/non-breaking (depends: T024, T025)

**Checkpoint**: free-text filtering works on both fields and composes with type + pagination.

---

## Phase 6: Polish

- [x] T018 [P] Run `quickstart.md` validation (queries 1–7, incl. cursor/clamp/conflict/empty edge cases + migration up/down) against `pnpm start:dev`
- [x] T019 [P] Run `pnpm lint` (tsc --noEmit + Biome) and fix issues in new/edited files
- [ ] T020 Update the PR description: additive paginated fields + the `rowId` migration (idempotent, reversible); note paginated fields page newest-first with no field ordering

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T005)** blocks all stories.
- **US1 (T006–T010)** and **US2 (T011–T015)** both depend only on Foundational; independent of each other (MVP = US1).
- **US3**: T016 independent; T017 depends on T010 + T015.
- **Polish (T018–T020)** after the stories you ship.

### Within stories / parallel
- Foundational: **T002 ∥ T003** (different files); T004→T005 sequential.
- US1: **T006 ∥ T007**, then T008→T009→T010.
- US2: **T011 ∥ T012**, then T013→T014→T015.
- **US1 and US2 can run in parallel** except the two shared files — `library.service.ts` (T008 vs T013) and `library.resolver.fields.ts` (T009 vs T014) — sequence those edits.

---

## Implementation Strategy

### MVP first (US1)
T001 → T002–T005 (rowId + migration) → T006–T010 (templates). **Stop & validate**, ship.

### Incremental
Setup+Foundational → US1 → US2 → US3 (compat proof) → Polish.

### Notes
- `rowId` is internal (not a GraphQL `@Field`) — verify it stays out of `schema.graphql` (T010/T017).
- Migration must be idempotent + reversible; validate with the harness (T005).
- Signed commits; commit after each task or logical group.
