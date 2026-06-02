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

## GraphQL filter inputs

- `LibraryTemplatesFilterInput` (existing) — gains an optional `searchTerm: String`
  alongside the existing `types: [TemplateType!]`. Additive; `types`-only callers
  unchanged.
- `LibraryInnovationPacksFilterInput` (new) — `searchTerm: String`. The packs field
  gains a `filter` argument of this type.

`searchTerm` is a single case-insensitive substring matched (OR-ed) across title,
description, and tags (FR-017–FR-021). **Provider name is excluded** for
performance (FR-022). Omitted / empty / blank ⇒ no text filter (FR-019).

## Filtering — how `searchTerm` maps to SQL

Applied as extra `WHERE` predicates on the paginated QueryBuilder **before** the
cursor helper runs, so it composes with `rowId`-keyset pagination and the `total`
(FR-020). To keep the result one row per item — so `getCount()`/`take()` stay
correct (FR-014, FR-021) — the tags match (a profile has many tagsets) uses an
`EXISTS` subquery rather than a row-multiplying join.

Let `:q = %<lowercased term>%`. For a given item (`Template` or `InnovationPack`)
joined to its `profile`:

| Field | Predicate (conceptual) |
|-------|------------------------|
| Title | `profile.displayName ILIKE :q` (OneToOne join, no fan-out) |
| Description | `profile.description ILIKE :q` |
| Tags | `EXISTS (SELECT 1 FROM tagset t WHERE t.profileId = profile.id AND t.tags ILIKE :q)` — `tagset.tags` is a `simple-array` (comma-joined TEXT), so this is a substring match |

The three predicates are combined with `OR` inside a single bracketed group, which
is then `AND`-ed with the eligibility filter (and, for templates, the type filter).
All matched fields live on the item's own `profile`, so no join to the provider's
account/host tables is needed.

**Excluded — provider name.** Matching the provider would mean, per row,
`EXISTS (… "user" u WHERE u.accountID = <pack>.accountId …) OR EXISTS (… organization …)`
— a reverse `accountID` lookup (no FK) against two large tables. Dropped to keep
the query cheap; can be revisited if needed.

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
