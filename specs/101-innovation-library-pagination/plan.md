# Implementation Plan: Paginated Innovation Library

**Branch**: `feat/101-innovation-library-pagination` | **Date**: 2026-06-02 (revised — Option A) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/101-innovation-library-pagination/spec.md`

## Summary

Add **additive, non-breaking** cursor-paginated access to the two Innovation
Library collections under `platform.library`, **following the platform's
documented cursor pagination (`docs/Pagination.md`) exactly**. Two new `Library`
fields — `templatesPaginated` and `innovationPacksPaginated` — reuse the existing
`getPaginationResults` helper, the shared `PaginationArgs` (`first`/`after`/
`last`/`before`), and the `Paginate(...)` connection output. Pages are ordered by
a sequential `rowId` cursor, **newest-first (DESC)** by default.

To enable the documented `rowId`-keyset helper, this feature adds a `rowId`
column to `InnovationPack` and `Template` (migration, SERIAL-backfilled). Because
the helper windows cursors on `rowId`, the paginated fields page in insertion
order and do **not** offer field-based ordering (display name / provider name /
template count) — those remain on the existing unpaginated fields, which are left
untouched so current consumers (including the production client, which migrates
separately) keep working.

**Server-side text filter (added 2026-06-02).** Both paginated fields accept an
optional `searchTerm` — a single case-insensitive substring matched (OR-ed) across
title, description, and tags. It is applied as extra `WHERE` predicates on the
QueryBuilder *before* the cursor helper, so it composes with `rowId` pagination and
the `total`. Title/description are direct `ILIKE` on the joined `profile`; **tags
use an `EXISTS` subquery** (a profile has many tagsets) to keep the result one row
per item, so `getCount()`/`take()` stay correct. All matched fields are on the
item's own profile, so no provider/account joins are needed. **Provider name is
deliberately not searched** — it is a reverse `accountID` lookup to user/organization
(no FK) whose per-row `EXISTS` subqueries risk slowing the query. Filtering only
narrows the set — ordering is unchanged (still `rowId` DESC), so this does not
reopen the ordering decision.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta 22.21.1)

**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork), Apollo Server 4, GraphQL 16

**Storage**: PostgreSQL 17.5 — **one migration**: add `rowId SERIAL` (+ UNIQUE) to `innovation_pack` and `template`; otherwise read-only `rowId`-keyset queries

**Testing**: Vitest 4.x (`*.spec.ts` service-level), migration validation harness

**Target Platform**: Linux server (GraphQL API)

**Project Type**: Single project — NestJS GraphQL backend

**Performance Goals**: Per-page cost constant via the `rowId` keyset (documented pattern); replaces today's full-collection in-memory load + JS sort for the new fields

**Constraints**: Additive/non-breaking GraphQL; cursor pagination per `docs/Pagination.md`; default 25 / max 100; eligibility + visibility identical to existing fields; `rowId` stays internal (not a GraphQL field)

**Scale/Scope**: Innovation Library — tens–hundreds of packs; hundreds–low thousands of templates

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after design.*

| Principle | Assessment |
|-----------|------------|
| **1. Domain-Centric Design** | ✅ Pagination logic in `LibraryService`; resolver fields thin. |
| **2. Modular NestJS Boundaries** | ✅ Extends the existing `library` module; reuses `@core/pagination`. |
| **3. GraphQL Schema as Stable Contract** | ✅ **Now fully compliant** — uses the documented cursor pattern (`docs/Pagination.md`); additive fields/types only; regenerate + `schema:diff`. (Resolves the prior C1 finding.) |
| **4. Explicit Data & Event Flow** | ✅ Read paths; no events. The migration is additive (new column), no data-shape change requiring reverse data strategy beyond drop-column. |
| **5. Observability & Operational Readiness** | ✅ No perf-sensitive ad-hoc queries (keyset is the documented optimization); no orphaned metrics. |
| **6. Pragmatic Testing** | ✅ Risk-based service specs (cursor continuity, clamp/default, filter+total, pageInfo, eligibility, invalid args). |
| **7. API Consistency & Evolution** | ✅ **Reuses shared `PaginationArgs`** (satisfies "reuse shared input types"); descriptive `*Paginated` field names; `Paginate`/`PageInfo` reused. |
| **8. Secure-by-Design** | ✅ Same `READ` guard; inputs validated by the standard pagination validator + page-size clamp. |
| **9. Container/Deploy Determinism** | ✅ No runtime/env changes. |
| **10. Simplicity & Incremental Hardening** | ✅ Zero new pagination infra; reuses the house helper. The `rowId` migration is the minimal enabler. |
| **Migrations (Workflow §3-4)** | ⚠️ One migration — must be idempotent, validated on a snapshot, with inline rollback notes (down = drop column + constraint). |

**Gate result: PASS.** (The only standing item is the migration discipline, tracked as a task.)

## Project Structure

### Documentation (this feature)
```text
specs/101-innovation-library-pagination/
├── plan.md, spec.md, research.md, data-model.md, quickstart.md
├── contracts/library-pagination.graphql
└── checklists/requirements.md
```

### Source Code (repository root)
```text
src/
├── migrations/
│   └── <timestamp>-AddRowIdToInnovationPackAndTemplate.ts   # NEW migration (SERIAL + UNIQUE, both tables)
├── library/
│   ├── innovation-pack/
│   │   ├── innovation.pack.entity.ts        # + rowId column
│   │   └── innovation.pack.interface.ts     # + rowId (Paginationable)
│   └── library/
│       ├── library.resolver.fields.ts       # + innovationPacksPaginated, templatesPaginated
│       ├── library.service.ts               # + getPaginatedListedInnovationPacks(), getPaginatedTemplates()
│       ├── library.service.spec.ts          # + cursor/clamp/filter/pageInfo/eligibility tests
│       └── dto/
│           ├── library.dto.innovationPacks.paginated.ts   # NEW PaginatedInnovationPacks
│           └── library.dto.templates.paginated.ts          # NEW PaginatedLibraryTemplateResults
└── domain/template/template/
    ├── template.entity.ts                   # + rowId column
    └── template.interface.ts                # + rowId (Paginationable)

schema.graphql                               # regenerated (additive; rowId NOT exposed)
```

**Structure Decision**: Single-project NestJS. Feature code in the `library`
module + the `Template` entity/interface (for `rowId`) + one migration. Reuses
`@core/pagination` wholesale — no new pagination files.

## Implementation phases (for /speckit-tasks)

1. **`rowId` enablement** — add `rowId` to both entities + interfaces; one
   migration (SERIAL + UNIQUE, both tables, backfilled); validate migration.
2. **Output types** — `PaginatedInnovationPacks`, `PaginatedLibraryTemplateResults`
   via `Paginate(...)`.
3. **Service — packs** — `getPaginatedListedInnovationPacks(pagination, filter?)`:
   eligibility QueryBuilder (+ optional `searchTerm` `OR` group) →
   `getPaginationResults(qb, args, 'DESC')`.
4. **Service — templates** — `getPaginatedTemplates(pagination, filter?)`:
   `Template` QueryBuilder (join templates_set + innovation_pack for eligibility +
   type filter + optional `searchTerm` `OR` group) →
   `getPaginationResults(qb, args, 'DESC')` → pair each template with its pack →
   `PaginatedLibraryTemplateResults`.
5. **Search filter** — a shared helper that joins `profile` and appends the
   `searchTerm` `OR` group (title/description `ILIKE`; tags via `EXISTS`) to either
   QueryBuilder; no-op on blank term. No provider/account join.
5. **Resolver fields** — wire both `@ResolveField`s with the `READ` guard + clamp.
6. **Schema** — regenerate + `schema:diff`; confirm additive and that `rowId` is
   not exposed.
7. **Tests** — service specs (Decision 6).
8. **Docs/PR** — note the additive fields + the `rowId` migration.

## Complexity Tracking

No constitution deviations. (The previous offset-input and ordering-enum
deviations are gone — this revision uses the documented pattern verbatim.)

| Item | Why | Note |
|------|-----|------|
| `rowId` migration on 2 tables | Documented cursor helper requires a `rowId` keyset column | Additive, SERIAL-backfilled, reversible (drop column); validated via the migration harness |
| Paginated fields lack field-based ordering | Documented helper pages in `rowId` order only | Accepted in Clarifications; ordering stays on the unpaginated fields; field-ordering is a deferred future upgrade |
| `searchTerm` tag match via `EXISTS` subquery | A profile has many tagsets; a plain join would multiply rows and corrupt `total`/page size | One bracketed `OR` group (title/description `ILIKE` + tags `EXISTS`) AND-ed with eligibility; tag match is substring on the `simple-array` column (approximate, accepted) |
| Provider name NOT searched | Provider is a reverse `accountID` lookup to User/Organization (no FK) needing per-row `EXISTS` against two large tables | Excluded for performance; revisitable. All searched fields live on the item's own profile, so no provider join is needed |

## Phase 2 outputs

`/speckit-tasks` produced `tasks.md` (revised for Option A). No code is written by `/speckit-plan`.
