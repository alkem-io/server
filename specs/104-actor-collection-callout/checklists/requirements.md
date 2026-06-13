# Specification Quality Checklist: Actor Collection Callout Type

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-06-11
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- All clarifications resolved with the user: VCs are a first-class displayed + counted type (FR-003/FR-004); the map setting controls geographic focus with a platform-fixed base map (FR-012); the contributor source is community membership and the spaces source is subspaces, with curated sets as a future enhancement (FR-016/FR-019); L0 spaces get the default callouts by default (FR-020).
- Spaces brought into scope (2026-06-13): the callout displays one **actor kind** — contributors or spaces — chosen at creation and immutable thereafter (FR-001a). Spaces are subspaces, card-only (no map, FR-007), reusing the existing client subspace card unchanged; contributors likewise reuse the existing contributor card — no card redesign (FR-007a). Added US4 (spaces display) and made US5 (guaranteed presence) cover both the community tab (contributors) and subspaces tab (spaces).
- Migration scope locked down (2026-06-13): the default L0 callouts are **non-deletable and non-movable** (fixed sort position and tab) — only their editable settings change (FR-020a/FR-021). The intended user-visible difference is minimal: hard-coded blocks become in-place callouts (SC-011). This reverses the earlier "remains removable/reorderable" position.
- Migration mechanics + epic goal (2026-06-13): these callouts replace the client's hard-coded contributor/subspaces components, advancing the epic side-goal of **fully callout-driven L0 pages** (Overview, FR-020c, SC-013). Guaranteed presence is delivered both by **updating all L0 templates** to include the two callouts (FR-020b) and by **server-side enforcement on L0 space creation** that adds either callout if the template omits it, with type matching the tab (FR-020c, SC-012).
- Stakeholder-feedback session 2026-06-13 incorporated: dropped the admin "filter availability" flag AND viewer-side role/type filtering in favour of an admin **contributor-selection** story (US3, FR-003/FR-003a), designed to gain a "by role" dimension once custom roles exist (FR-026). US3 is **P1**: a key goal is letting a space show only participating organizations and hide member users so it feels safe to make public — enforced server-side as a hard visibility boundary for all viewers incl. anonymous (FR-003b, SC-014).
- Two complementary privacy mechanisms (both P1): (1) per-callout contributor-type selection hides users from *everyone* on that callout (US3/FR-003); (2) a new **space-level** "who can read user information" setting (US6/FR-028) defaults to following space visibility but can be restricted to **members only**, hiding the user list from non-members/anonymous while members still see it — letting a space go public without exposing its membership list (SC-015). The space setting applies to user data only; orgs/VCs unaffected; the two compose without conflict (FR-028b). user-facing presentation is a concrete **Contributors** collection, never a generic "Actor Collection" (FR-005); added the admin-settings-vs-viewer-view distinction and a **settings-edit-access** setting (FR-027); creation-flow direction deferred to a separate story (Future Considerations).
- Map decisions (2026-06-13): OpenStreetMap + MapLibre GL via an open, OSM-based hosted tile provider vetted for public-interest-tech alignment, no proprietary/tracking providers (FR-012); automatic pin grouping for legibility (FR-013a); pin hover shows info and click-through opens the contributor's page in a new tab (FR-013b). Supported base maps are controlled **server-side and platform-wide** (FR-012b): one base map in this version, model designed to hold multiple (SC-016) — not a per-callout/per-space choice. Viewer interactions deliberately kept minimal: name search + card/map view switch only — no viewer-side filtering or on-map type toggling.
- Spec passes all quality items; ready for `/speckit-clarify` (optional) or `/speckit-plan`.
