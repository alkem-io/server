# Feature Specification: Paginated Innovation Library

**Feature Branch**: `feat/101-innovation-library-pagination`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "I want to add pagination to the InnovationLibrary query. Take a look to the query in the client, take a look to the server code and how pagination is performed, and create the spec in the server for now (the client spec follows later, on a separate branch)."

## Context

The platform Innovation Library is exposed through the `platform.library` part of
the public API. It surfaces two browsable collections:

- **Templates** — every template that listed Innovation Packs contribute to the
  library, returned today as a single unbounded list (one entry per template,
  paired with the pack that contributes it), optionally narrowed by template type.
- **Innovation Packs** — the listed packs themselves, returned today as a single
  unbounded list with only an optional total-count cap.

Both collections are returned in full on every request. The library client loads
the entire result set once and then filters it in the browser. As the number of
listed packs and templates grows, this makes the single library request heavier
over time and delays first render.

This specification covers the **server** side only: adding a paginated way to
browse both collections, **following the platform's documented cursor-pagination
pattern** (`docs/Pagination.md`). The matching client work (adopting the
paginated fields, infinite scroll / load-more) is tracked separately and will be
specified on its own branch.

## Clarifications

### Session 2026-06-02

- Q: Which collection(s) should gain pagination? → A: Both the templates
  collection and the innovation-packs collection.
- Q: How should the paginated capability relate to the existing unpaginated
  fields? → A: Additive — new paginated fields alongside the existing list
  fields, which remain unchanged. No breaking change.
- Q: Default and maximum page size? → A: Default 25 items (the platform's
  documented pagination default) when no page size is supplied; page size capped
  at 100.
- Q: **(Supersedes earlier ordering/mechanism decisions in this session)** Should
  pagination follow the platform's documented cursor pattern exactly, even though
  that pattern pages in `rowId` (insertion) order and therefore cannot sort by
  display name / provider name / template count? → A: **Yes — implement it exactly
  as `docs/Pagination.md` describes.** Add a sequential `rowId` column to
  `InnovationPack` and `Template` via migration and reuse the existing relay-style
  cursor helper and shared `PaginationArgs`. The paginated fields page in `rowId`
  order, **default newest-first (descending)**. Field-based ordering (display
  name, provider name, template count) and random ordering are **not** offered on
  the paginated fields; they remain available only on the existing unpaginated
  fields. (This intentionally reverses the earlier offset-pagination and
  field-ordering answers from the same session.)
- Q: Should the paginated fields support a server-side text filter, and over which
  fields? → A: **Yes.** Both paginated fields accept an optional free-text
  `searchTerm`. It is matched **case-insensitively as a substring** across the
  item's **title (display name), description, and tags**, OR-ed together (an item
  matches if the term appears in *any* of those). The term AND-composes with the
  existing template-type filter and with pagination (the `total` and pages reflect
  the filtered set). A blank/omitted term means "no text filter". **Filtering only
  narrows the set — it does not change ordering** (results still page newest-first
  by `rowId`), so this does not reopen the field-ordering decision above.
  **Provider name is intentionally NOT searched**: the provider is a reverse
  `accountID` lookup to the user/organization tables (no FK join), and matching it
  would require per-row `EXISTS` subqueries that risk slowing the query — excluded
  for performance. Ranked/fuzzy/typo-tolerant search and per-field search operators
  also remain out of scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse library templates a page at a time (Priority: P1)

A person browsing the Innovation Library wants to view templates without waiting
for the entire catalogue to load. They request a first page of templates and, as
they scroll or ask for more, request subsequent pages using the cursor returned
with the previous page. Each response carries only the requested slice, the total
count, and the cursors/flags needed to fetch adjacent pages.

**Why this priority**: Templates are the largest collection and the one currently
pulled in full on first load. Paginating them delivers the bulk of the benefit
and is a viable standalone MVP.

**Independent Test**: Request the first page of templates with a chosen page size;
confirm exactly that many results (or fewer) come back with a total and an end
cursor; use that cursor to request the next page and confirm it continues with no
overlap or gaps.

**Acceptance Scenarios**:

1. **Given** a library with more templates than the requested page size, **When**
   a consumer requests the first page, **Then** only a page-sized slice is
   returned, with the total number of templates and the cursor needed for the
   next page.
2. **Given** a page that is not the last, **When** the consumer requests the next
   page using the returned end cursor, **Then** the next distinct slice is
   returned with no item repeated from or skipped after the previous page.
3. **Given** the consumer has reached the final page, **When** they inspect the
   page info, **Then** it indicates there are no further pages.
4. **Given** a template-type filter is supplied alongside pagination, **When** a
   page is requested, **Then** pagination applies to the filtered set only, the
   total reflects the filtered count, and paging walks the filtered results
   consistently.
5. **Given** no explicit ordering, **When** the consumer pages through templates,
   **Then** results appear newest-first (most recently added first) and the order
   is stable across the whole traversal.
6. **Given** a free-text search term, **When** a page of templates is requested,
   **Then** only templates whose title, description, or tags contain the term
   (case-insensitive) are returned, the total reflects that matched set, and paging
   walks the matched set newest-first.
7. **Given** both a template-type filter and a search term, **When** a page is
   requested, **Then** only templates matching **both** the type **and** the term
   are returned.

---

### User Story 2 - Browse innovation packs a page at a time (Priority: P2)

A person exploring the Innovation Library wants to browse the listed innovation
packs in pages rather than receiving every pack at once.

**Why this priority**: Packs are fewer than templates today, so load pressure is
lower, but paginating them keeps the library consistent and future-proofs the
collection. Independent of the template work; ships separately.

**Independent Test**: Request the first page of packs with a chosen page size;
confirm only that slice returns with a total and end cursor; page forward and
confirm continuity (no repeat/skip).

**Acceptance Scenarios**:

1. **Given** more listed packs than the requested page size, **When** a consumer
   requests the first page, **Then** only a page-sized slice is returned, with the
   total number of listed packs and the cursor for the next page.
2. **Given** a page that is not the last, **When** the consumer requests the next
   page using the returned cursor, **Then** the next distinct slice is returned
   newest-first with no item repeated or omitted.
3. **Given** the consumer requests a page beyond the available results, **When**
   the response is returned, **Then** it contains no packs and indicates there are
   no further pages.
4. **Given** a free-text search term, **When** a page of packs is requested,
   **Then** only packs whose title, description, or tags contain the term
   (case-insensitive) are returned, the total reflects that matched set, and paging
   walks the matched set newest-first with no item repeated even when it matches on
   several fields at once.

---

### User Story 3 - Existing consumers keep working unchanged (Priority: P1)

Consumers that already read the current unpaginated library lists (including the
production client and any other integrations) must continue to function exactly
as before, with no change on their side, until they adopt the paginated fields.

**Why this priority**: The client migrates to pagination separately and later;
the server change must not break any current consumer.

**Independent Test**: Issue the existing library request reading the current list
fields, unchanged, and confirm the response shape and contents match pre-change
behaviour (including the existing `RANDOM` and template-count orderings and the
alphabetical templates list).

**Acceptance Scenarios**:

1. **Given** a consumer using the existing unpaginated lists, **When** they make
   their current request after this feature ships, **Then** they receive the same
   fields with the same shape and contents as before.
2. **Given** the new paginated fields exist, **When** a consumer does not use
   them, **Then** their behaviour and data are unaffected.

---

### Edge Cases

- **No page size supplied**: A request that omits the page size receives a
  default-sized first page of 25 items (the documented default), never the whole
  collection.
- **Page size above the maximum**: A requested page larger than 100 is capped at
  100.
- **Empty library / empty filtered set**: A page request returns an empty page, a
  total of zero, and page info indicating no further pages.
- **Invalid or stale cursor**: A cursor that no longer resolves (e.g. the
  referenced item was removed) is rejected with a clear error, as per the
  documented cursor helper's behaviour.
- **Conflicting paging directions**: Supplying both forward (`first`/`after`) and
  backward (`last`/`before`) paging at once is rejected with a clear validation
  error (the documented helper already enforces this).
- **Item added or removed mid-traversal**: Cursor paging tolerates concurrent
  inserts/removals — because cursors are anchored to a stable sequential id, a
  newly added item simply appears at the newest end and a removed item drops out;
  the traversal is not corrupted.
- **Filter that matches nothing**: A template-type filter matching no templates
  returns an empty page with a total of zero.
- **Blank / whitespace-only search term**: Treated as "no text filter" — the
  eligible (and otherwise-filtered) set is returned in full, not an empty page.
- **Search term matching nothing**: A term that matches no item's title,
  description, or tags returns an empty page with a total of zero.
- **Search term case / partial words**: Matching is case-insensitive substring,
  so a lowercase term matches mixed-case content and partial words (e.g. `inno`
  matches `Innovation`).
- **Item matching the term on multiple fields**: An item whose term appears in,
  say, both its description and a tag MUST still appear **once** and count
  **once** toward the total.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a way to retrieve the library's templates in
  pages, returning only a bounded slice per request instead of the entire
  collection.
- **FR-002**: The system MUST provide a way to retrieve the library's innovation
  packs in pages, returning only a bounded slice per request.
- **FR-003**: Each paginated response MUST include the total number of items in
  the (optionally filtered) collection being paged.
- **FR-004**: Each paginated response MUST include cursors and flags indicating
  whether further pages exist before and after the returned slice (start/end
  cursor, has-next-page, has-previous-page).
- **FR-005**: Consumers MUST be able to request a page size, honoured up to a
  maximum of 100 (larger requests capped to 100).
- **FR-006**: When no page size is supplied, the system MUST return the documented
  default page of 25 items, not the full collection.
- **FR-007**: Paging through templates MUST be consistent — successive pages MUST
  neither repeat nor skip items relative to one another, for a collection that is
  not changing.
- **FR-008**: Paging through innovation packs MUST be consistent in the same way.
- **FR-009**: Template-type filtering MUST compose with template pagination, so
  pagination, totals, and page indicators all apply to the filtered subset.
- **FR-010**: The system MUST preserve the existing unpaginated library template
  and innovation-pack fields unchanged (including their current `RANDOM`,
  template-count, and alphabetical orderings), so current consumers keep working
  without modification; the paginated capability is purely additive.
- **FR-011**: The system MUST validate pagination inputs and reject invalid or
  contradictory combinations (e.g. forward and backward paging at once, or a
  negative page size) with a clear error — reusing the platform's standard
  pagination-argument validation.
- **FR-012**: The paginated capability MUST apply the same listing eligibility and
  visibility rules as the existing lists (listed in store + public visibility), so
  a consumer never sees through pagination an item they could not see through the
  current lists.
- **FR-013**: The paginated capability MUST follow the platform's documented
  cursor-pagination pattern (`docs/Pagination.md`): relay-style cursor connection
  (`total` + items + `pageInfo`), the shared pagination arguments
  (`first`/`after`/`last`/`before`), and a sequential `rowId` cursor column — so
  consumers page it exactly as they page other collections in the API.
- **FR-014**: Retrieving a single page MUST NOT load the entire collection into
  application memory; the database MUST return only the requested page via the
  documented `rowId`-keyset query, so per-page cost stays effectively constant as
  the collection grows.
- **FR-015**: The paginated fields MUST page in `rowId` (insertion) order,
  defaulting to **descending (newest first)**. Field-based ordering (display name,
  provider name, template count) and random ordering MUST NOT be offered on the
  paginated fields (they remain only on the existing unpaginated fields).
- **FR-016**: To support cursor pagination, `InnovationPack` and `Template` MUST
  each have a unique sequential `rowId` column (added by migration, backfilled for
  existing rows). `rowId` is the stable, unique sort/cursor key, so ordering is
  inherently deterministic with no separate tie-breaker needed.
- **FR-017**: The paginated templates field MUST accept an optional free-text
  search term that restricts results to templates whose **title (display name),
  description, or tags** contains the term.
- **FR-018**: The paginated innovation-packs field MUST accept an optional
  free-text search term that restricts results to packs whose **title (display
  name), description, or tags** contains the term.
- **FR-019**: Search matching MUST be **case-insensitive substring** matching. A
  search term that is omitted, empty, or whitespace-only MUST behave as no filter
  (the eligible/otherwise-filtered set is returned unchanged).
- **FR-020**: The search term MUST compose with cursor pagination and with the
  template-type filter: the `total`, the page slice, and the page indicators MUST
  all reflect the **intersection** of (eligibility + type filter + search term),
  and pages MUST continue to walk that filtered set in `rowId` (newest-first)
  order. Filtering narrows the set only; it MUST NOT change the ordering (FR-015).
- **FR-021**: Applying the search filter MUST NOT cause an item to be returned
  more than once, nor inflate the `total`, when the term matches multiple of the
  item's tags. The filter MUST be expressed so the result stays one row per item
  (e.g. an existence check for tags rather than a row-multiplying join), so
  per-page cost and totals stay correct (FR-014).
- **FR-022**: Provider name MUST NOT be part of the search. The provider is a
  reverse `accountID` lookup to the user/organization tables (no FK join), and
  including it would require per-row `EXISTS` subqueries that risk degrading query
  performance; it is deliberately excluded. (Provider remains available on the
  existing unpaginated fields' results, just not as a search target.)

### Key Entities *(include if feature involves data)*

- **Innovation Library**: The platform-scoped container exposing the browsable
  template and innovation-pack collections.
- **Library Template Result**: A single template surfaced in the library together
  with the innovation pack that contributes it. The unit paged in the templates
  collection.
- **Innovation Pack**: A listed, store-visible bundle of templates with its own
  profile. The unit paged in the innovation-packs collection. Gains a `rowId`.
- **Template**: A library template. Gains a `rowId` to serve as its cursor key.
- **Page (cursor connection)**: A bounded slice of one collection plus its
  metadata — total count, start/end cursors, and has-next/has-previous flags.
- **Tag**: A label on an item's profile (stored in the profile's tagsets). The
  search term is matched against tags as substrings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A consumer can retrieve any single page of library templates with a
  bounded response (at most the requested page size); the database returns only
  that page, and per-page cost does not grow as the total number of templates
  grows.
- **SC-002**: A consumer can retrieve any single page of innovation packs with the
  same bounded, constant-cost guarantee.
- **SC-003**: The initial library view can be populated from a first page that is
  a small, bounded fraction of the catalogue rather than the entire collection.
- **SC-004**: A consumer can traverse the entire templates collection page by page
  and observe every template exactly once, with no duplicates or omissions, for a
  catalogue not changing during traversal.
- **SC-005**: 100% of existing consumers of the current unpaginated lists continue
  to receive identical results after the change, with zero changes on their part.
- **SC-006**: Template-type filtering combined with pagination returns totals and
  pages that exactly match the equivalent filtered, unpaginated result for the
  same filter.
- **SC-007**: A search term returns exactly the items whose title, description, or
  tags contain it (case-insensitive), with each matching item appearing once; the
  `total` equals the distinct count of matched items, and it composes correctly
  with the template-type filter (results = items matching both).

## Assumptions

- **Both collections in scope** and **additive/non-breaking** (Clarifications).
- **Documented cursor pattern**: pagination reuses `docs/Pagination.md` —
  relay-style cursor connection, shared `PaginationArgs`, `rowId` keyset
  (Clarifications). This requires adding a `rowId` column to `InnovationPack` and
  `Template` (migration, backfilled).
- **Order**: paginated fields page in `rowId` order, default newest-first (DESC).
  No field-based or random ordering on the paginated fields.
- **Filtering scope**: two filters compose with pagination — the existing
  template-type filter (templates only) and a new free-text `searchTerm` (both
  collections). `searchTerm` is a single case-insensitive substring matched across
  title, description, and tags (**not** provider — excluded for performance). Tag
  matching is substring against the stored tag values (approximate, not
  token-exact). No ranked/fuzzy search.
- **Defaults**: default page size 25 (documented default); maximum 100.
- **Eligibility unchanged**: which templates/packs appear in the library (listed
  in store, public visibility) is unchanged; pagination only changes delivery.
- **Client is separate**: client adoption is specified/delivered separately, later.

## Out of Scope

- Client-side adoption of the paginated fields (separate branch/spec).
- Field-based ordering (display name / provider name / template count) on the
  paginated fields — would require keyset-by-column infrastructure beyond the
  documented pattern; deferred.
- **Provider-name search** (excluded for performance — see FR-022), and
  **ranked, fuzzy, or typo-tolerant** search, relevance scoring, and per-field /
  advanced search operators. The name filter shipped here is a single
  case-insensitive **substring** (`ILIKE`) match across title, description, and
  tags (FR-017–FR-022) — nothing more.
- Changing which templates or packs are eligible to appear in the library.
- Removing or altering the existing unpaginated library list fields.
