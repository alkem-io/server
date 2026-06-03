# Data Model: Paginated Innovation Library

**Feature**: 101-innovation-library-pagination
**Date**: 2026-06-02 (revised — Option A)

A **schema migration is required**: add a `rowId` cursor column to two entities.
No other persisted changes. New GraphQL output types reuse the documented
pagination factory; the input reuses the shared `PaginationArgs`.

---

## Schema change: `rowId` columns (migration)

| Entity / table | Column | Definition |
|----------------|--------|-----------|
| `InnovationPack` / `innovation_pack` | `rowId` | `@Column({ unique: true, nullable: false }) @Generated('increment')` → `"rowId" SERIAL NOT NULL` + `UNIQUE` |
| `Template` / `template` | `rowId` | same |

- `SERIAL` backfills existing rows with sequential values on `ADD COLUMN`.
- `rowId` is the unique, monotonic cursor/sort key → inherently deterministic
  ordering (FR-016); no separate tie-breaker.
- `rowId` is an **entity/DB column only** — it is NOT exposed as a GraphQL `@Field`
  (matching `User`/`Space`), so it does not appear in `schema.graphql`.
- Interfaces `IInnovationPack` and `ITemplate` gain `rowId!: number;` so they
  satisfy `Paginationable` for `getPaginationResults`.

Down-migration: drop the UNIQUE constraint and the column on both tables.

---

## Existing entities (otherwise unchanged, read-only)

| Entity | Table | Role | Key fields used |
|--------|-------|------|-----------------|
| `InnovationPack` | `innovation_pack` | Pack collection + template→pack pairing | `id`, `rowId`(new), `templatesSetId`, `listedInStore`, `searchVisibility` |
| `Template` | `template` | Template collection | `id`, `rowId`(new), `templatesSetId`, `type` |
| `TemplatesSet` | `templates_set` | Links pack ↔ its templates | `id` |

**Relationship relied upon**: `Template.templatesSet` (ManyToOne) +
`InnovationPack.templatesSet` (OneToOne) ⇒ each template belongs to exactly one
pack.

**Eligibility invariant** (unchanged): an item appears in the library iff its pack
has `listedInStore = true AND searchVisibility = 'PUBLIC'`.

---

## GraphQL input (reused)

`PaginationArgs` (from `@core/pagination`) — `first?`, `after?` (UUID cursor),
`last?`, `before?` (UUID cursor). Validated by the helper's `tryValidateArgs`
(rejects `first`+`last` together, `after` without `first`, etc. — FR-011).
Page size clamped to 100 in the service (FR-005); defaults to 25 in the helper
(FR-006).

## GraphQL output types (new, via the shared factory)

### `PaginatedInnovationPacks`
`extends Paginate(IInnovationPack, 'innovationPacks')` →
`{ total: Float!, innovationPacks: [InnovationPack!]!, pageInfo: PageInfo! }`
(`total` is `Float!` — the shared `Paginate(...)` factory declares it with
`@Field(() => Number)`, as on every other `Paginated*` type).

### `PaginatedLibraryTemplateResults`
`extends Paginate(ITemplateResult, 'templateResults')` →
`{ total: Float!, templateResults: [TemplateResult!]!, pageInfo: PageInfo! }`.
`ITemplateResult { template, innovationPack }` reused unchanged.

### `PageInfo` (reused)
`{ startCursor: String, endCursor: String, hasNextPage: Boolean!, hasPreviousPage: Boolean! }`
— `start/endCursor` are the first/last item **ids** (the cursor values).

---

## Computed-result rules (service layer)

| Field | Derivation |
|-------|-----------|
| `items` / `templateResults` / `innovationPacks` | One `rowId`-ordered (DESC default) page from `getPaginationResults`; for templates, each `Template` paired with its `InnovationPack`. |
| `total` | From the helper (`qb.getCount()`), over the filtered/eligible set (FR-003, FR-009). |
| `pageInfo` | From the helper (`hasNextPage`/`hasPreviousPage` via rowId look-around; cursors = first/last item id). |

## Validation rules
- `PaginationArgs` validated by `tryValidateArgs` (FR-011).
- `first`/`last` clamped to ≤ 100 before calling the helper (FR-005); omitted ⇒ 25 (FR-006).
- Stale/unknown cursor ⇒ the helper throws `EntityNotFoundException` (FR-011 / edge case).
