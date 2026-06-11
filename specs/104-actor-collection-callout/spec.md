# Feature Specification: Actor Collection Callout Type

**Feature Branch**: `104-actor-collection-callout`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "I want to add another callout type, that is for displaying a collection of actors. The intention is to replace the block currently shown on the community page on the platform. The post type should in the first version allow selecting what types of contributors to display, users, organisations or both. The default is both. It should also have a flag to allow control of whether there should be filtering by role. It should keep the ability to search within the available contributors. In addition to having the current display of showing cards for each contributor, there should be the option to display the contributors on a map. This is then just about putting the contributors on a map, no other connectivity. The contributors without location data should be shown as cards underneath the map with a message re 'these contributors do not have location data set'. The default map display shown should be controlled by the settings for the callout, not set per user. The settings for the callout should allow choosing the map to be displayed and the default zoom level. There should be metrics shown beneath the map re # of each type of contributor (user, org, VC)."

## Overview

This feature adds a new callout type that displays a collection of **actors**. In this first version, the actors displayed are **contributors** — users, organizations, and virtual contributors — sourced from the callout's community/space. The callout is named generically ("Actor Collection") so that it can later be expanded to display other actor kinds (e.g., spaces) without introducing a new callout type. The immediate goal is to replace the hard-coded contributor block currently shown on the community page with a configurable callout supporting card and map displays; a future expansion to space actors would additionally let the same callout replace the hard-coded "subspaces" display on the adjacent tab.

## Clarifications

### Session 2026-06-11

- Q: How is a contributor's map position determined? → A: Use the existing profile geo-coordinates; plot only when valid coordinates exist, otherwise list beneath the map. No new geocoding is introduced (city/country-only contributors are treated as "no location data set").
- Q: Where are search and type/role filtering applied, and how are cards loaded for large communities? → A: Server-side over the full eligible membership; card display is paginated, while the map display receives all located contributors.
- Q: What should the role filter offer (mockup shows "All / Lead / Organization")? → A: A combined filter row mixing membership roles (e.g., Lead) and contributor types (e.g., Organization), reproducing the existing community-block control.
- Q: Which contributors are visible to a viewer? → A: Reuse existing callout/community read authorization — show the same contributors the viewer can already see on the community page; no new visibility semantics.
- Q: What default settings should the auto-provisioned L0 callout have? → A: Card display, all contributor types shown, role/type filter enabled — mirroring the existing community block; map is opt-in per administrator.
- Q: When a viewer searches/filters, what do the per-type metric counts reflect? → A: The total eligible set (per the admin type selector), independent of the viewer's live search/filter.
- Q: Default sort order of contributors in the card display? → A: Leads/admins first, then alphabetically by display name, mirroring the existing community block.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Show a collection of contributors as cards (Priority: P1)

A space administrator adds an Actor Collection callout to a community/space page so members and visitors can see who is part of the community. The callout displays each contributor as a card (avatar, name, and role label), and a viewer can search by name to narrow the list. This replaces the existing hard-coded contributor block on the community page with a configurable callout.

**Why this priority**: This is the minimum viable replacement for the existing community members block. Without it, there is no callout-based way to display contributors at all. It delivers immediate value on its own.

**Independent Test**: Add an Actor Collection callout to a community that has users and organizations as members, open the page, confirm all member contributors render as cards, and confirm typing a name in the search field filters the displayed cards.

**Acceptance Scenarios**:

1. **Given** a community with member users and organizations, **When** an admin adds an Actor Collection callout with default settings, **Then** all member users and organizations appear as cards.
2. **Given** an Actor Collection callout in card display, **When** a viewer types text into the search field, **Then** only contributors whose name matches the search text remain visible.
3. **Given** the callout configured to display only users, **When** the page loads, **Then** organizations are not shown.
4. **Given** the callout configured to display only organizations, **When** the page loads, **Then** users are not shown.
5. **Given** the callout with default contributor-type setting, **When** the page loads, **Then** users, organizations, and virtual contributors are all shown.

---

### User Story 2 - Display contributors on a map (Priority: P2)

A space administrator configures an Actor Collection callout to default to a map display so contributors with location data are plotted geographically. Contributors that have no location set are listed as cards beneath the map under a clear message. Beneath the map, the viewer sees counts of each contributor type.

**Why this priority**: The map view is a significant value-add for understanding the geographic spread of a community, but the card view (P1) is usable without it. It builds on the same contributor set established in P1.

**Independent Test**: Configure a callout to default to map display in a community where some contributors have location data and some do not; confirm located contributors appear on the map, non-located contributors appear as cards below with the explanatory message, and type counts are shown beneath the map.

**Acceptance Scenarios**:

1. **Given** an Actor Collection callout with map display as its default, **When** the page loads, **Then** the map is shown first with contributors that have valid location data plotted on it.
2. **Given** contributors without location data, **When** the map display is shown, **Then** those contributors are listed as cards below the map under a message stating "these contributors do not have location data set".
3. **Given** the map display, **When** the page loads, **Then** the configured default map and default zoom level from the callout settings are applied (not a per-user preference).
4. **Given** the map display, **When** the page loads, **Then** metrics beneath the map show the number of each contributor type (users, organizations, virtual contributors).
5. **Given** a callout whose default display is cards, **When** the page loads, **Then** the card display is shown by default while the map remains available as an alternate view.

---

### User Story 3 - Toggle role-based filtering (Priority: P3)

A space administrator decides whether viewers can filter the displayed contributors by their role (e.g., Lead vs. Member, or by being an organization). When the role-filtering flag is enabled, viewers see role filter controls; when disabled, no role filter controls are offered.

**Why this priority**: Role filtering is a refinement of the contributor display. The callout is fully usable for displaying and searching contributors without it, so it is the lowest priority of the three core stories.

**Independent Test**: Create two callouts, one with role filtering enabled and one disabled; confirm the enabled callout offers role filter controls that narrow the list by role, and the disabled callout offers none.

**Acceptance Scenarios**:

1. **Given** an Actor Collection callout with role filtering enabled, **When** the page loads, **Then** role filter controls are shown.
2. **Given** role filtering enabled, **When** a viewer selects a specific role filter, **Then** only contributors holding that role remain visible.
3. **Given** an Actor Collection callout with role filtering disabled, **When** the page loads, **Then** no role filter controls are shown and all eligible contributors are listed.

---

### User Story 4 - Guaranteed presence on L0 spaces (Priority: P1)

Rather than relying on every administrator to add it manually, a top-level (L0) space always has an Actor Collection callout present at the top of its community page out of the box, so the contributor display is consistent across spaces and genuinely replaces the previous hard-coded block. The same guaranteed-presence behavior is intended for the subspaces tab once space actors are supported.

**Why this priority**: This is what makes the feature an actual replacement for the hard-coded block rather than an optional add-on. Without guaranteed presence, existing spaces would silently lose the contributor display.

**Independent Test**: Inspect an L0 space's community page (existing and newly created) and confirm an Actor Collection callout is present at the top with default settings, without any administrator having added it.

**Acceptance Scenarios**:

1. **Given** a newly created L0 space, **When** its community page is opened, **Then** an Actor Collection callout is present at the top with default settings.
2. **Given** an existing L0 space that previously showed the hard-coded contributor block, **When** the feature is rolled out, **Then** an Actor Collection callout is present at the top of its community page.
3. **Given** the guaranteed callout, **When** an administrator edits its settings, **Then** their configuration is preserved (the guarantee is about presence, not about locking settings).

---

### Edge Cases

- **No contributors**: The callout has an empty source set — display an empty state rather than an error, in both card and map displays.
- **All contributors lack location data in map mode**: The map shows no markers; all contributors appear in the "no location data set" card list beneath the map, with the explanatory message still shown.
- **Partial location data**: A contributor has a city/country but no precise coordinates that can be resolved — treat as "no location data set" and list them beneath the map. (Validity is determined by whether usable map coordinates exist.)
- **Contributor holds multiple roles**: When role filtering is active, the contributor matches any of the roles they hold and is not duplicated.
- **Virtual contributors and the type selector**: The type selector exposes users, organizations, and virtual contributors as three independent toggles; deselecting a type hides those contributors from both card and map displays (their count still reflects the eligible set per FR-014).
- **Search with no matches**: Display an empty result state for the current display, preserving the search input.
- **Map/zoom settings unset**: Fall back to a sensible default map and zoom level when callout settings have not specified them.
- **Large communities**: The displayed contributor set may be large; the display must remain responsive (see Success Criteria).
- **Contributor removed from the community**: Once a contributor is no longer a member, they no longer appear in the callout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a new callout type, "Actor Collection", that displays a collection of actors associated with the callout's context; in this version the displayed actors are contributors.
- **FR-002**: System MUST allow this callout type to serve as a replacement for the existing community-page contributor block.
- **FR-003**: System MUST let an administrator configure which contributor types are displayed, with independently toggleable options for users, organizations, and virtual contributors; by default all three are displayed.
- **FR-004**: System MUST display and count virtual contributors as a first-class contributor type on equal footing with users and organizations — they are both shown (subject to the type selector) and counted in the metrics row.
- **FR-005**: System MUST provide a per-callout flag that controls whether role/type filtering of contributors is available to viewers; when disabled, no such filtering is offered. When enabled, the filter is a single combined control offering membership roles (e.g., Lead) alongside contributor types (e.g., Organization), reproducing the existing community-block control (e.g., "All / Lead / Organization").
- **FR-006**: System MUST allow viewers to search the available contributors by name within the callout, in both display modes. Search MUST be applied server-side across the full eligible membership (not only the currently loaded subset).
- **FR-006a**: System MUST apply contributor-type and role/type filtering server-side across the full eligible membership.
- **FR-007**: System MUST support two display modes for the callout: a card display (one card per contributor) and a map display.
- **FR-008**: System MUST let an administrator set the default display mode (cards or map) as a callout setting; this default MUST NOT be overridable as a stored per-user preference.
- **FR-009**: System MUST, in map display, plot each contributor that has valid stored geo-coordinates in their profile at their location on the map. "Usable location data" means valid stored coordinates; the system MUST NOT introduce new geocoding, so contributors with only city/country (and no valid coordinates) are treated as having no location data.
- **FR-009a**: System MUST deliver all located contributors (those with valid coordinates) to the map display, independent of card-display pagination.
- **FR-010**: System MUST, in map display, list contributors that lack usable location data as cards beneath the map.
- **FR-011**: System MUST show the message "these contributors do not have location data set" above the list of contributors lacking location data in map display.
- **FR-012**: System MUST allow an administrator to set the default geographic focus (the center/region the map opens on) as a callout setting; the base-map style itself is fixed by the platform in this version. (Chosen as the simpler approach; selectable base-map styles/providers are a possible later enhancement.)
- **FR-013**: System MUST allow an administrator to set the default zoom level for the map as a callout setting.
- **FR-014**: System MUST display metrics beneath the map showing the count of each contributor type (users, organizations, virtual contributors). These counts MUST reflect the total eligible set (per the administrator's type selector) and MUST NOT change in response to a viewer's live search or role/type filter.
- **FR-015**: System MUST scope the map feature to plotting actors only — no additional interactivity or connectivity between contributors is included.
- **FR-016**: System MUST, in this version, determine the source set of contributors for the callout from the membership of the community/space the callout belongs to (its role set).
- **FR-017**: System MUST persist all configuration (contributor-type selection, role-filtering flag, default display mode, map geographic focus, default zoom) as part of the callout's settings.
- **FR-018**: System MUST present an appropriate empty state when there are no contributors to display or no search matches, rather than an error.
- **FR-019**: System SHOULD model the callout type and its settings generically enough that future versions can (a) source actors from an administrator-curated set rather than only community membership, and (b) display additional actor kinds such as spaces — which would allow the same callout to replace the hard-coded "subspaces" display on the adjacent tab — without introducing a new callout type.
- **FR-020**: System MUST ensure that every top-level (L0) space has an Actor Collection callout present at the top of its community page by default — for both newly created and existing L0 spaces — so the callout replaces the hard-coded contributor block without per-space manual action. The auto-provisioned callout's default settings MUST be: card display mode, all contributor types shown, and role/type filtering enabled (map display is opt-in per administrator).
- **FR-025**: System MUST, by default, order contributors in the card display with leads/admins first, then alphabetically by display name, mirroring the existing community block.
- **FR-021**: System MUST preserve any administrator changes to a guaranteed callout's settings; the guarantee concerns the callout being provisioned by default, not the immutability of its configuration or its permanent enforcement (an administrator may subsequently edit, reorder, or remove it).
- **FR-022**: System SHOULD extend the same guaranteed-presence behavior to the subspaces tab once space actors are supported (future expansion, tied to FR-019).
- **FR-023**: System MUST paginate the card display so that large communities remain responsive; the map display is exempt from pagination and receives all located contributors (per FR-009a).
- **FR-024**: System MUST restrict the contributors shown to those the viewer is already authorized to see under existing callout/community read rules; this feature introduces no new visibility semantics.

### Key Entities *(include if feature involves data)*

- **Actor Collection Callout**: A new callout type that displays a collection of actors. Holds settings: contributor-type selection (users/organizations/both), role-filtering flag, default display mode (cards/map), chosen map, and default zoom level.
- **Actor / Contributor**: An entity that may be displayed in the callout. In this version, contributors — users, organizations, and virtual contributors — that are members of the community/space. Has a display profile (name, avatar) and optional location data. The model is intended to accommodate other actor kinds (e.g., spaces) in future.
- **Location data**: Geographic information associated with an actor's profile used to plot them on the map; may be present (usable) or absent (actor listed beneath the map).
- **Role**: A membership role (e.g., Lead, Member) used for optional role-based filtering of the displayed contributors.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can add and fully configure an Actor Collection callout (contributor types, role-filtering flag, default display mode, map focus, zoom) without assistance in under 3 minutes.
- **SC-002**: A callout configured for a community displays 100% of that community's eligible contributors (per the selected contributor types) as cards.
- **SC-003**: In map display, 100% of contributors with usable location data appear on the map, and 100% of those without appear in the labelled list beneath the map.
- **SC-004**: The contributor-type metric counts beneath the map match the actual number of each contributor type in the total eligible set, with zero discrepancy, and remain stable while a viewer searches or filters.
- **SC-005**: Searching within a community of at least 500 contributors returns the filtered result in under 1 second as perceived by the viewer.
- **SC-006**: The default display mode shown to every viewer matches the callout setting in 100% of loads, independent of any individual viewer.
- **SC-007**: The Actor Collection callout can replace the existing community-page contributor block with no loss of the contributors previously shown there.
- **SC-008**: 100% of L0 spaces (existing and newly created) have an Actor Collection callout present at the top of their community page after rollout, without per-space manual action.

## Assumptions

- The source set of contributors is the membership of the community/space (its role set) that the callout belongs to, mirroring the community-page block it replaces. Administrator-curated source sets are a future enhancement (FR-019), not part of this version.
- "Contributors" refers to the platform's existing actor types: users, organizations, and virtual contributors, all displayed and counted as first-class types. The broader "actor" framing anticipates future kinds such as spaces but those are out of scope for this version.
- Location data and its validity are derived from contributors' existing profile geo-coordinate information; no new location capture or geocoding is introduced by this feature. A contributor with only city/country and no valid coordinates is treated as having no location data.
- Search matches against contributor display name, is case-insensitive, and is evaluated server-side across the full eligible membership.
- The combined role/type filter draws membership roles from the existing role definitions of the community/space and contributor types from the platform's actor types, mirroring the existing community-block control.
- The map display is plotting-only for v1; no clustering behavior, routing, or contributor-to-contributor connections are in scope.
- Default display mode is a callout-level setting and is not stored as a per-user override; a viewer may still switch views during a session, but the stored default is administrator-controlled.
- Standard authorization applies: who can view the callout and who can configure it follows existing callout/community permission rules; this feature does not introduce new permission semantics.
- Existing callout placement, ordering, and lifecycle mechanics are reused; this feature adds a new type rather than a new container.
- Guaranteed presence applies to L0 (top-level) spaces' community pages in this version; the equivalent for the subspaces tab depends on space-actor support (out of scope here). The default-provisioned callout uses default settings and remains administrator-editable/removable thereafter.

## Out of Scope

- Displaying actor kinds other than contributors (e.g., spaces) — anticipated as a future expansion, not part of this version.
- Any contributor-to-contributor connectivity, relationships, routing, or interactivity on the map beyond plotting.
- Per-user persisted preferences for display mode, map, or zoom.
- New location capture or geocoding capabilities for contributors.

## Dependencies

- Reuses the existing callout framework (callout creation, settings persistence, and page placement).
- Depends on the existing community/space membership model to source contributors.
- Depends on existing contributor profile and location/geo data to drive the map display.
