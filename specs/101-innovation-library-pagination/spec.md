# Feature Specification: Paginated Innovation Library

**Feature Branch**: `feat/101-innovation-library-pagination`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "I want to add pagination to the InnovationLibrary query. Take a look to the query in the client, take a look to the server code and how pagination is performed, and create the spec in the server for now (the client spec follows later, on a separate branch)."

## Context

The platform Innovation Library is exposed through the `platform.library` part of
the public API. It surfaces two browsable collections:

- **Templates** — every template that listed Innovation Packs contribute to the
  library, returned today as a single unbounded list (one entry per template
  across *all* packs), optionally narrowed by template type.
- **Innovation Packs** — the listed packs themselves, returned today as a single
  unbounded list with only an optional total-count cap.

Both collections are returned in full on every request. The library client loads
the entire result set once and then filters it in the browser. As the number of
listed packs and templates grows, this makes the single library request heavier
over time, delays first render, and forces every consumer to receive data it may
never display.

This specification covers the **server** side only: introducing a paginated way
to browse both collections. The matching client work (adopting the paginated
fields, infinite scroll / load-more, moving any remaining in-browser filtering
to the server) is tracked separately and will be specified on its own branch.

## Clarifications

### Session 2026-06-02

- Q: Which collection(s) should gain pagination? → A: Both the templates
  collection and the innovation-packs collection.
- Q: How should the paginated capability relate to the existing unpaginated
  fields? → A: Additive — introduce new paginated fields alongside the existing
  list fields, which remain unchanged. No breaking change to current consumers;
  clients migrate when ready.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse library templates a page at a time (Priority: P1)

A person browsing the Innovation Library wants to view available templates
without waiting for the entire catalogue to load. They request a first page of
templates and, as they scroll or ask for more, request subsequent pages. Each
response carries only the requested slice plus enough information to fetch the
next slice and to know how many templates exist in total.

**Why this priority**: Templates are the largest and fastest-growing collection
in the library and the one currently pulled in full on first load. Paginating
templates delivers the bulk of the performance and scalability benefit and is a
viable standalone MVP.

**Independent Test**: Request the first page of library templates with a chosen
page size and confirm that exactly that many templates (or fewer, if the
catalogue is smaller) are returned, together with a total count and a forward
cursor. Use the cursor to request the next page and confirm it continues without
overlap or gaps.

**Acceptance Scenarios**:

1. **Given** a library with more templates than the requested page size,
   **When** a consumer requests the first page, **Then** only a page-sized slice
   of templates is returned, along with the total number of templates available
   and the information needed to request the next page.
2. **Given** a returned page that is not the last, **When** the consumer requests
   the following page using the supplied forward reference, **Then** the next
   distinct slice of templates is returned with no items repeated from or skipped
   after the previous page.
3. **Given** the consumer has reached the final page, **When** they inspect the
   page information, **Then** it indicates there are no further pages.
4. **Given** a template-type filter is supplied alongside pagination, **When** a
   page is requested, **Then** pagination applies to the filtered set only, the
   total reflects the filtered count, and paging walks the filtered results
   consistently.

---

### User Story 2 - Browse innovation packs a page at a time (Priority: P2)

A person exploring the Innovation Library wants to browse the listed innovation
packs in pages rather than receiving every pack at once, while preserving the
ability to order packs (for example by how many templates each contains).

**Why this priority**: Packs are fewer than templates today, so the immediate
load pressure is lower, but paginating them keeps the library consistent and
future-proofs the collection as the store grows. It is independent of the
template work and can ship separately.

**Independent Test**: Request the first page of innovation packs with a chosen
page size and ordering, confirm only that slice is returned with a total count
and forward cursor, then page forward and confirm the ordering and continuity
hold across pages.

**Acceptance Scenarios**:

1. **Given** a library with more listed packs than the requested page size,
   **When** a consumer requests the first page, **Then** only a page-sized slice
   of packs is returned, along with the total number of listed packs and the
   means to request the next page.
2. **Given** an ordering preference is supplied, **When** the consumer pages
   through the packs, **Then** the ordering is honoured consistently across all
   pages with no item repeated or omitted.
3. **Given** the consumer requests a page beyond the available results, **When**
   the response is returned, **Then** it contains no packs and indicates there
   are no further pages.

---

### User Story 3 - Existing consumers keep working unchanged (Priority: P1)

Consumers that already read the current unpaginated library lists (including the
production client and any other integrations) must continue to function exactly
as before, with no change required on their side, until they choose to adopt the
paginated capability.

**Why this priority**: The client that consumes this API is migrated to
pagination separately and later. The server change must not break any current
consumer, so backward compatibility is as critical as the new capability itself.

**Independent Test**: Issue the existing library request that reads the current
list fields, unchanged, and confirm the response shape and contents match the
pre-change behaviour.

**Acceptance Scenarios**:

1. **Given** a consumer using the existing unpaginated library lists, **When**
   they make their current request after this feature ships, **Then** they
   receive the same fields with the same shape and the same contents as before.
2. **Given** the new paginated capability exists, **When** a consumer does not
   use it, **Then** their behaviour and the data they receive are unaffected.

---

### Edge Cases

- **No page size supplied**: A request that omits the page size receives a
  sensible default-sized first page (not the entire collection), so a paginated
  request can never accidentally fall back to loading everything.
- **Page size above the allowed maximum**: A requested page larger than the
  permitted ceiling is capped at the ceiling rather than rejected or honoured
  unbounded, preserving the performance guarantee.
- **Empty library / empty filtered set**: Requesting a page returns an empty
  page, a total of zero, and page information indicating no further pages.
- **Invalid or stale forward/backward reference**: A cursor that no longer
  resolves (for example, the referenced item was removed) is handled
  predictably with a clear error or a well-defined empty/boundary result rather
  than an inconsistent page.
- **Conflicting paging directions**: Supplying mutually exclusive forward and
  backward paging instructions together is rejected with a clear validation
  error.
- **Item added or removed mid-traversal**: Paging through a collection that
  changes between page requests does not crash and does not silently corrupt the
  traversal; minor drift (a newly added or removed item) is acceptable and
  documented.
- **Filter that matches nothing**: Combining pagination with a template-type
  filter that matches no templates returns an empty page with a total of zero.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a way to retrieve the library's templates
  in pages, returning only a bounded slice of templates per request instead of
  the entire collection.
- **FR-002**: The system MUST provide a way to retrieve the library's innovation
  packs in pages, returning only a bounded slice of packs per request instead of
  the entire collection.
- **FR-003**: Each paginated response MUST include the total number of items
  available in the (optionally filtered) collection being paged.
- **FR-004**: Each paginated response MUST include the information a consumer
  needs to request the next page and, where applicable, the previous page, plus
  indicators of whether further pages exist in each direction.
- **FR-005**: Consumers MUST be able to request a specific page size, and the
  system MUST honour it up to a defined maximum, capping larger requests at that
  maximum.
- **FR-006**: When no page size is supplied, the system MUST return a
  default-sized page rather than the full collection.
- **FR-007**: Paging through templates MUST be consistent — successive pages
  returned in order MUST neither repeat nor skip items relative to one another,
  for a collection that is not changing.
- **FR-008**: Paging through innovation packs MUST be consistent in the same way
  as templates, and MUST preserve the requested ordering of packs across all
  pages.
- **FR-009**: Template-type filtering MUST compose with template pagination, so
  that pagination, totals, and page indicators all apply to the filtered subset.
- **FR-010**: The system MUST preserve the existing unpaginated library template
  and innovation-pack lists unchanged, so current consumers continue to work
  without modification; the paginated capability is additive.
- **FR-011**: The system MUST validate pagination inputs and reject invalid or
  contradictory combinations (for example, requesting forward and backward paging
  at once, or a negative page size) with a clear error.
- **FR-012**: The paginated capability MUST apply the same listing eligibility
  and visibility rules as the existing library lists, so a consumer never sees a
  template or pack through pagination that they could not see through the current
  lists.
- **FR-013**: The paginated library capability MUST be consistent with the
  platform's established pagination conventions so that consumers can page it the
  same way they page other collections in the API.

### Key Entities *(include if feature involves data)*

- **Innovation Library**: The platform-scoped container exposing the browsable
  template and innovation-pack collections.
- **Library Template Entry**: A single template surfaced in the library together
  with the context of which innovation pack contributes it. The unit being paged
  in the templates collection.
- **Innovation Pack**: A listed, store-visible bundle of templates with its own
  profile and ordering attributes (such as the number of templates it contains).
  The unit being paged in the innovation-packs collection.
- **Page**: A bounded slice of one collection plus its accompanying metadata —
  the total count, the references needed to move to adjacent pages, and the
  indicators of whether adjacent pages exist.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A consumer can retrieve any single page of library templates in an
  amount of data and time that does not grow as the total number of templates in
  the library grows.
- **SC-002**: A consumer can retrieve any single page of innovation packs in an
  amount of data and time that does not grow as the total number of listed packs
  grows.
- **SC-003**: The initial library view can be populated from a first page that is
  a small, bounded fraction of the full catalogue rather than the entire
  collection.
- **SC-004**: A consumer can traverse the entire templates collection page by
  page and observe every template exactly once, with no duplicates or omissions,
  for a catalogue that is not changing during traversal.
- **SC-005**: 100% of existing consumers of the current unpaginated library lists
  continue to receive identical results after the change, requiring zero changes
  on their part.
- **SC-006**: Template-type filtering combined with pagination returns totals and
  pages that exactly match the equivalent filtered, unpaginated result for the
  same filter.

## Assumptions

- **Both collections in scope**: This feature paginates both the templates
  collection and the innovation-packs collection (confirmed in Clarifications).
- **Additive, non-breaking**: The paginated capability is added alongside the
  existing unpaginated library lists, which remain unchanged. No breaking change
  to the current API surface is introduced by this feature (confirmed in
  Clarifications).
- **Cursor-style paging**: Pagination follows the platform's existing
  cursor-based ("relay-style") convention already used for other collections in
  the API, rather than introducing a new paging style.
- **Filtering scope**: The only filter that must compose with pagination in this
  feature is the existing template-type filter on the templates collection.
  Free-text search over the library is not part of this feature.
- **Ordering**: The existing ordering options for innovation packs (such as by
  number of templates) are preserved and applied consistently across pages.
  Template ordering follows the library's existing default ordering.
- **Client is separate**: The client adopting these paginated fields — including
  moving any remaining in-browser filtering to the server and adding load-more /
  infinite scroll — is specified and delivered separately, on its own branch,
  after this server work.
- **Defaults**: A reasonable default page size and a defined maximum page size
  exist; their exact values are a planning/tuning concern and align with the
  platform's existing pagination defaults.
- **Eligibility unchanged**: The criteria for which templates and packs appear in
  the library (listed in store, public visibility) are unchanged; pagination only
  changes how that same eligible set is delivered.

## Out of Scope

- Client-side adoption of the paginated fields (separate branch/spec).
- Free-text or fuzzy search across the library.
- Changing which templates or packs are eligible to appear in the library.
- Removing or altering the existing unpaginated library list fields.
- New ordering or filtering options beyond those that exist today.
