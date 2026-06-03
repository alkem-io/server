# Research: Paginated Innovation Library

**Feature**: 101-innovation-library-pagination
**Date**: 2026-06-02 (revised — Option A, documented cursor pattern)
**Input**: spec.md (+ Clarifications), current server code, `docs/Pagination.md`

Implementation **follows the platform's documented cursor pagination exactly**
(`docs/Pagination.md`): relay-style cursor connection, shared `PaginationArgs`,
`rowId`-keyset helper. The earlier offset/field-ordering exploration is superseded
by the final clarification.

---

## Current state (as-found)

- **Resolver** `src/library/library/library.resolver.fields.ts`: `templates` and
  `innovationPacks` are `@ResolveField`s on `ILibrary`, each returning a plain
  array (unchanged by this feature).
- **Service** `src/library/library/library.service.ts`:
  `getTemplatesInListedInnovationPacks` (loads all listed+public packs, flattens
  templates, sorts alphabetically) and `getListedInnovationPacks` (loads all,
  sorts by RANDOM/template-count). Both remain for the unpaginated fields.
- **Documented pagination** `src/core/pagination/`: `getPaginationResults(qb, paginationArgs, sort?)`
  → `{ total, items, pageInfo }`; cursors keyed on a unique sequential `rowId`
  (`Paginationable = { rowId: number }`); shared `PaginationArgs`
  (`first`/`after`/`last`/`before`); `Paginate(classRef, fieldName)` output factory;
  `PageInfo { startCursor, endCursor, hasNextPage, hasPreviousPage }`.
- Reference usage: `getPaginatedSpaces`/`getPaginatedUsers`/`getPaginatedOrganizations`
  all call `getPaginationResults(qb, paginationArgs)` and page in `rowId` order.

---

## Decision 1 — Follow the documented cursor pattern; page in `rowId` order

**Decision**: Reuse `getPaginationResults` + `PaginationArgs` + `Paginate(...)`.
Paginated fields page in `rowId` order, **default newest-first (`'DESC'`)**.

**Rationale**: This is the platform standard (Constitution P3/P7); truly scalable
(per-page cost constant via the `rowId` keyset); zero new pagination
infrastructure. The documented helper windows the cursor **only on `rowId`**, so
it pages in insertion order — it cannot sort by display name/provider/count. Per
the final clarification, that trade is accepted: field-based ordering is **not**
offered on the paginated fields (remains on the unpaginated fields).

**Alternatives considered** (rejected): DB offset/limit with field ordering (not
the documented pattern; reopened P3); a new composite-cursor keyset for field
ordering (speculative infra; provider/count keys don't index cleanly).

---

## Decision 2 — Add `rowId` to `InnovationPack` and `Template` (migration)

The documented helper requires `T extends IBaseAlkemio & Paginationable` (a unique
sequential `rowId`). Neither entity has one today (`rowId` is opt-in; User/Space/
Organization/VC have it, these two don't).

**Decision**: Add `rowId` to both, following the existing pattern verbatim:
- Entity: `@Column({ unique: true, nullable: false }) @Generated('increment') rowId!: number;`
- Interface: add `rowId!: number;` to `IInnovationPack` and `ITemplate`.
- Migration: `ALTER TABLE "innovation_pack" ADD "rowId" SERIAL NOT NULL` + `ADD CONSTRAINT "UQ_…" UNIQUE ("rowId")`; same for `"template"`. Postgres `SERIAL`
  backfills existing rows with sequential values on add. Down-migration drops the
  constraint + column. (Pattern mirrors `rowId` in the baseline migration / audit-entry migration.)

**Rationale**: Minimal, follows precedent, backfills automatically, keyset-ready.
`rowId` is unique ⇒ deterministic order with no separate tie-breaker (FR-016).

---

## Decision 3 — Templates: paginate the `Template` entity, then pair with packs

`ITemplateResult { template, innovationPack }` is a composite, not a paginatable
entity. **Each `Template` belongs to exactly one pack** (`Template.templatesSet`
ManyToOne; `InnovationPack.templatesSet` OneToOne), so:

**Decision**: Paginate the `Template` entity with the documented helper, then map
each returned template to its pack:
1. Build a `Template` QueryBuilder joined (for the WHERE only) to its
   `templates_set` and the owning `innovation_pack`:
   `INNER JOIN templates_set ts ON ts.id = template.templatesSetId`,
   `INNER JOIN innovation_pack pack ON pack.templatesSetId = ts.id`,
   `WHERE pack.listedInStore = true AND pack.searchVisibility = 'PUBLIC'`
   `[AND template.type IN (:types)]`.
2. `getPaginationResults(qb, paginationArgs, 'DESC')` → `{ total, items: Template[], pageInfo }`.
3. Load the packs for the returned templates (one query: packs whose
   `templatesSetId IN (returned templates' templatesSetIds)`), map each
   `Template` → `ITemplateResult { template, innovationPack }`.
4. Return `{ total, templateResults, pageInfo }` (total + pageInfo straight from
   step 2). The **cursor tokens** exposed in `pageInfo` (`startCursor`/`endCursor`)
   and accepted as `after`/`before` are template **`id`s (UUIDs)** — the shared
   helper's `cursorColumn` defaults to `id`. The `rowId` keyset is the helper's
   **internal** sort/window key (it converts the UUID cursor → `rowId` via a
   lookup); it is never surfaced as a cursor token.

**Rationale**: Reuses the documented helper unchanged; one extra bounded query
(≤ page size packs); no in-memory full-collection load.

---

## Decision 4 — Packs: paginate the `InnovationPack` entity directly

**Decision**: QueryBuilder on `InnovationPack` with the eligibility WHERE
(`listedInStore = true AND searchVisibility = 'PUBLIC'`), pass to
`getPaginationResults(qb, paginationArgs, 'DESC')`, wrap as `PaginatedInnovationPacks`.

---

## Decision 5 — API surface: additive fields, shared args, default DESC

**Decision**: Two new `Library` fields, existing fields untouched:
- `innovationPacksPaginated(pagination: PaginationArgs): PaginatedInnovationPacks!`
- `templatesPaginated(filter: LibraryTemplatesFilterInput, pagination: PaginationArgs): PaginatedLibraryTemplateResults!`

Reuse the shared `PaginationArgs` (satisfies P7) and `Paginate(...)` output.
Default sort `'DESC'` (newest first) is applied in the service when calling the
helper. Page size: the helper defaults to 25; pre-clamp `first`/`last` to 100
(FR-005) before calling it. Same `READ` guard + decorator as the existing fields.

**Rationale**: Additive ⇒ non-breaking (FR-010, US3). Cursor input now fits (we
page by cursor). No offset input, no ordering enums, no custom page-info helper.

---

## Decision 6 — Authorization, schema, tests

- **Auth/visibility**: reuse `@AuthorizationActorHasPrivilege(READ)` +
  `@UseGuards(GraphqlGuard)` and the identical eligibility filter (FR-012).
- **Schema**: additive GraphQL — regenerate `schema.graphql`
  (`pnpm run schema:print && schema:sort`), `pnpm run schema:diff`; expect
  non-breaking additions. **Schema baseline note**: adding `rowId` to two entities
  also adds two output fields (`InnovationPack.rowId`? No — `rowId` is not exposed
  on the GraphQL type unless decorated with `@Field`; it stays a DB/entity column
  only, as on User/Space). Confirm `rowId` is **not** added to the GraphQL schema.
- **Migration**: validate via `.scripts/migrations/run_validate_migration.sh`;
  include inline rollback notes (down migration drops column + constraint).
- **Tests** (risk-based, P6): service specs for templates + packs — page size
  default 25 + clamp 100, cursor continuity newest-first (no repeat/skip),
  template type filter composes + filtered total, pageInfo flags at first/last/
  empty pages, eligibility (listed+public only), invalid/conflicting args rejected.

---

## Open items → resolved

| Question | Resolution |
|----------|-----------|
| Cursor vs offset | Documented cursor pattern (Decision 1) |
| Entities lack `rowId` | Add via migration, SERIAL backfill (Decision 2) |
| Default order | `rowId` DESC, newest first (Decision 1/5) |
| Templates are composite, not an entity | Paginate `Template`, pair packs after (Decision 3) |
| Field ordering (name/provider/count) | Out of scope on paginated fields (spec) |
| `rowId` leaking into GraphQL schema | Keep entity-only, not `@Field` (Decision 6) |

No `NEEDS CLARIFICATION` remain.
