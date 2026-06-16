# Feature Specification: Actor Collection Callout Type

**Feature Branch**: `104-actor-collection-callout`

**Created**: 2026-06-11

**Status**: Draft

**Input**: A new callout type for displaying a collection of **actors**, of one of two creation-fixed kinds:

- **Contributors** (users, organizations, virtual contributors) sourced from the callout's community/space — replacing the hard-coded contributor block on the community tab. The administrator selects which contributor types are shown (default all; designed to extend to "by role" once custom roles exist). Supports a card display and a contributors-only **map** display: contributors with valid stored coordinates are plotted (no new geocoding), those without are listed beneath the map under "these contributors do not have location data set", and per-type metrics (user/org/VC) are shown beneath the map. The map uses OpenStreetMap + MapLibre GL via an open, public-interest-aligned tile provider; the administrator sets the default display mode, geographic focus, and zoom (not per-user). Viewers can search by name, hover a pin for info, and click through to a contributor's page in a new tab.
- **Spaces** (the space's subspaces) — replacing the hard-coded subspaces display on the subspaces tab. Card display only (no map), reusing the existing client subspace card unchanged.

A callout displays exactly one kind, fixed at creation and not switchable. Administrators can create new callouts of either kind through the standard callout creation flow, and every L0 space is **provisioned** with both default callouts (contributors on the community tab, spaces on the subspaces tab) via updated templates plus authoritative server-side enforcement on space creation and a one-time backfill migration. After provisioning, these callouts behave like any other callout — they can be reordered, moved, and deleted using the existing callout lifecycle (only the actor kind stays fixed); the guarantee is presence **by default at creation/rollout**, not a permanent placement lock. Each callout also carries a setting for who may edit its settings. This work advances the epic side-goal of making all L0 space page content callout-driven rather than hard-coded.

## Overview

This spec pursues two intertwined purposes. First, it advances the epic goal of making **all main body content on L0 space pages callout-driven rather than hard-coded** — replacing fixed, bespoke UI components with configurable callouts. Second, it **enriches the platform's ability to display collections of actors in a generic way** — a single callout type that can present different kinds of actors (contributors, spaces) through displays suited to each, rather than a one-off component per collection. Together these let the previously hard-coded contributor and subspaces blocks become managed callouts, and lay the groundwork for further actor collections and further callout-driven page content.

This feature adds a new callout type that displays a collection of **actors**. The callout displays one of two actor kinds, chosen when the callout is created:

- **Contributors** — users, organizations, and virtual contributors sourced from the callout's community/space. Goal: replace the hard-coded contributor block on the community page. Supports both card and map displays.
- **Spaces** — the subspaces of the space the callout belongs to. Goal: replace the hard-coded "subspaces" display on the adjacent tab. Card display only (no map).

The actor kind is a **fixed property set at creation and not changeable afterwards**: a given callout displays either contributors or spaces, never both, and cannot be switched between them. The two kinds are completely separate sets, each rendered with its existing client card (the current contributor card and the current subspace card, both unchanged). "Actor Collection" is an internal/backend name only; to end users the two are distinct, concrete options (a Contributors collection and a Spaces collection), never a single generic choice.

These callouts replace the corresponding hard-coded components in the client. In line with the callout-driven goal above, the design choices here — server-provisioned callouts replacing hard-coded blocks in place, then managed like any other callout — are made so this generalises to the remaining hard-coded L0 page content later.

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
6. **Given** the map display, **When** the viewer hovers over (or taps) a pin, **Then** additional information about that contributor is shown, and **When** the viewer clicks through, **Then** that contributor's page opens in a new browser tab.
7. **Given** the base map, **When** it loads, **Then** it is served from the platform's configured open, OSM-based tile provider (no proprietary tracking provider).

---

### User Story 3 - Administrator selects which contributors are displayed (Priority: P1)

A space administrator chooses which contributors the callout displays — all contributors, or a chosen subset of contributor types (users, organizations, virtual contributors). The default is all. A key use of this control is letting a space show **only participating organizations and not its member users**, so that a space can be made public without exposing the individuals who are members. This selection defines the eligible set that everyone then sees, searches, and (where applicable) sees plotted on the map. The selection model is designed so that, once custom roles exist, the administrator can additionally narrow the displayed set by role (e.g., only Leads) — but role-based selection is not implemented in this version.

**Why this priority**: This is a privacy/safety lever, not just a cosmetic filter. A core goal of this work is that a space can choose to surface only organizations while keeping member users invisible, so the space feels safe to make public. Because that protection must hold from the moment the callout exists, the contributor-type selection is P1 — the same priority as having the callout at all. (The default remains "show all", which matches today's community block; the P1 requirement is that an administrator can restrict it, and that the restriction is enforced everywhere.)

**Independent Test**: In a community containing users, organizations, and virtual contributors, configure one callout to show all types and another to show only organizations; confirm the first lists all contributors and the second lists only organizations — with member users absent from cards, map, metrics, and search — in both card and map displays.

**Acceptance Scenarios**:

1. **Given** an Actor Collection callout with the default selection, **When** the page loads, **Then** users, organizations, and virtual contributors are all shown.
2. **Given** the callout configured to show only users, **When** the page loads, **Then** organizations and virtual contributors are not shown and are excluded from the eligible set everywhere (cards, map, and metrics).
3. **Given** a public space whose callout is configured to show only organizations, **When** any viewer (including an anonymous/public visitor) loads the page or searches, **Then** only organizations appear and no member user is shown or discoverable anywhere (cards, map, metrics, search).
4. **Given** the administrator changes the contributor-type selection, **When** the page reloads, **Then** the displayed set, the map markers, and the metric counts all reflect the new selection consistently.
5. **Given** the selection UI, **When** the administrator views it, **Then** it is laid out so that a future "by role" selection can be added alongside the "by type" selection without redesign.

---

### User Story 4 - Display a collection of spaces as cards (Priority: P2)

A space administrator adds (or receives by default) a callout whose actor kind is **spaces**, which displays the subspaces of the current space using the existing subspace card (unchanged from what the client shows today). This replaces the hard-coded "subspaces" display. The actor kind is fixed when the callout is created: a spaces callout only ever shows spaces, never contributors, and cannot be switched. A spaces callout has no map display — it always uses the subspace cards.

**Why this priority**: This makes the callout type a replacement for the hard-coded subspaces display as well as the contributor block, unifying both into one configurable mechanism. It is independent of the contributor stories (US1–US3) and delivers value on its own, but the contributor card display (US1) is the primary replacement target, so spaces are P2.

**Independent Test**: Add a spaces callout to a space that has subspaces; confirm each subspace renders with the existing subspace card (unchanged), that no map option is offered, and that the actor kind cannot be changed to contributors after creation.

**Acceptance Scenarios**:

1. **Given** a space with subspaces, **When** a spaces callout is shown, **Then** each subspace appears using the existing subspace card, unchanged.
2. **Given** a spaces callout, **When** the administrator opens its settings, **Then** no map display option is offered and the display is always cards.
3. **Given** a spaces callout, **When** the administrator opens its settings, **Then** the actor kind (spaces) is shown as fixed and cannot be changed to contributors.
4. **Given** a viewer, **When** comparing a contributors callout and a spaces callout, **Then** each uses its existing client card (the current contributor card and the current subspace card respectively), unchanged from today.
5. **Given** a spaces callout, **When** a viewer searches by name, **Then** the listed spaces are narrowed by name (search applies to both kinds).
6. **Given** a space with custom subspace sort order and pinned subspaces, **When** the spaces callout is shown (including after migration of an existing space), **Then** the subspaces appear in the same order with the same pins as before — nothing is reordered or unpinned.

---

### User Story 5 - Default presence on L0 spaces (Priority: P1)

Rather than relying on every administrator to add them manually, a top-level (L0) space is **provisioned out of the box** with: a **contributors** callout at the top of its community page (replacing the hard-coded contributor block), and a **spaces** callout on its subspaces tab (replacing the hard-coded subspaces display). This makes both displays consistent across spaces at creation/rollout and genuinely replaces the previous hard-coded blocks. After provisioning, these are normal callouts — an authorized administrator may move, reorder, or delete them like any other callout (only the actor kind stays fixed); the guarantee is provisioning by default, not a permanent lock.

**Why this priority**: This is what makes the feature an actual replacement for the hard-coded blocks rather than an optional add-on. Without default provisioning, existing spaces would silently lose the contributor and/or subspaces display at rollout.

**Independent Test**: Inspect an L0 space (existing and newly created) and confirm a contributors callout is present on its community page and a spaces callout on its subspaces tab, each with default settings, without any administrator having added them; then confirm an administrator can move or delete one exactly as with any other callout.

**Acceptance Scenarios**:

1. **Given** a newly created L0 space, **When** its community page is opened, **Then** a contributors callout is present at the top with default settings.
2. **Given** a newly created L0 space, **When** its subspaces tab is opened, **Then** a spaces callout is present with default settings.
3. **Given** an existing L0 space that previously showed the hard-coded contributor block and subspaces display, **When** the feature is rolled out, **Then** the corresponding contributors and spaces callouts are present.
4. **Given** a provisioned default callout, **When** an administrator edits its (changeable) settings, **Then** their configuration is preserved (the actor kind itself remains fixed).
5. **Given** a provisioned default callout, **When** an authorized administrator reorders, moves, or deletes it, **Then** the operation succeeds exactly as for any other callout (no special lock), and the server does not silently re-add it.

---

### User Story 6 - Restrict who can read user information to space members (Priority: P1)

A space administrator sets a **space-level** setting controlling who may read information about the space's users. By default it follows the space's visibility (a public space's users are publicly readable, as today). The administrator can instead restrict it so user information is only readable by **members of the space**. This lets a space be made public without making the list of all its users public — non-members (including anonymous visitors) see the space but not its individual users.

This is distinct from the callout's contributor-type selection (US3): US3 is a per-callout choice that hides users from *everyone* for that callout, whereas this is a per-space privacy boundary that hides user information from *non-members* across the space (the contributors callout being the most visible place it applies). The two compose.

**Why this priority**: It is the other half of the "safe to make public" goal — a space may want to remain a community with visible members internally while not exposing that membership list to the public. Because it governs disclosure of personal data the moment a space goes public, it must be in place from the start, so P1.

**Independent Test**: On a public space, set user-information visibility to members-only; as a non-member/anonymous viewer confirm users are not readable (the contributors callout shows no users, and user data is not returned by the API), then as a member confirm users are readable again.

**Acceptance Scenarios**:

1. **Given** a space with the default setting, **When** the space is public, **Then** its users are readable consistent with today's behavior (the setting follows space visibility).
2. **Given** a public space with user-information visibility set to members-only, **When** a non-member or anonymous visitor views it, **Then** user information is not readable — the contributors callout shows organizations and virtual contributors but no member users, and no user data is returned by the API.
3. **Given** that same space, **When** a member views it, **Then** member users are readable and appear in the contributors callout as normal.
4. **Given** the members-only setting, **When** a non-member searches or loads the map in a contributors callout, **Then** no member user is discoverable or plotted, while organizations/virtual contributors remain.

---

### Edge Cases

- **No contributors**: The callout has an empty source set — display an empty state rather than an error, in both card and map displays.
- **All contributors lack location data in map mode**: The map shows no markers; all contributors appear in the "no location data set" card list beneath the map, with the explanatory message still shown.
- **Partial location data**: A contributor has a city/country but no precise coordinates that can be resolved — treat as "no location data set" and list them beneath the map. (Validity is determined by whether usable map coordinates exist.)
- **Virtual contributors and the administrator type selection**: The administrator selection exposes users, organizations, and virtual contributors as three independent options; deselecting a type removes those contributors from the eligible set in both card and map displays (so their count reflects the selected eligible set per FR-014).
- **Search with no matches**: Display an empty result state for the current display, preserving the search input.
- **Map/zoom settings unset**: Fall back to a sensible default map and zoom level when callout settings have not specified them.
- **Large communities**: The displayed contributor set may be large; the display must remain responsive (see Success Criteria).
- **Contributor removed from the community**: Once a contributor is no longer a member, they no longer appear in the callout.
- **No subspaces (spaces callout)**: A spaces callout whose space has no subspaces shows an empty state rather than an error.
- **Subspace added/removed (spaces callout)**: The spaces callout reflects the current set of subspaces; a removed subspace no longer appears, a newly created one does. Existing subspace sort order and pinned subspaces are honoured (FR-025a).
- **Map settings on a spaces callout**: Not applicable — a spaces callout has no map; map-related settings (focus, zoom) and metrics do not exist for it.
- **Visibility of subspaces**: A spaces callout shows only the subspaces the viewer is authorized to see, mirroring existing subspace read authorization (no new visibility semantics).
- **User-info visibility vs. type selection**: If a contributors callout already excludes users by type (US3), the space's members-only user-info setting has no additional effect on that callout (users are absent for everyone regardless); the two never conflict.
- **Member viewing a members-only space**: A member always sees member users (the restriction applies to non-members/anonymous only).
- **Organizations/VCs under members-only**: The members-only user-info setting restricts **user** information only; organizations and virtual contributors remain readable per normal space visibility.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a new callout type that displays a collection of actors associated with the callout's context. The callout displays one of two actor kinds — **contributors** or **spaces** — and "Actor Collection" is an internal/backend name only; the options exposed to end users MUST be the concrete **Contributors** collection and **Spaces** collection (see FR-005), never the generic name.
- **FR-001a**: System MUST record the actor kind (contributors or spaces) as a property of the callout chosen at creation time, and MUST NOT allow it to be changed afterwards. A callout displays exactly one kind for its whole lifetime; the two kinds are separate sets and a callout never displays both.
- **FR-002**: System MUST allow this callout type to replace the existing community-page contributor block (contributors kind) and the existing "subspaces" display (spaces kind).
- **FR-003**: System MUST, for a **contributors** callout, let an administrator select which contributors are displayed, choosing among the contributor types — users, organizations, and virtual contributors — as independently selectable options; by default all are displayed. This administrator selection defines the eligible set used everywhere (cards, map, metrics, and search). It MUST support the privacy/safety case of showing **only organizations and not member users**, so a space can be made public without exposing its individual members. (Not applicable to a spaces callout, which shows the space's subspaces.)
- **FR-003b**: System MUST enforce the contributor-type selection server-side as a hard visibility boundary for the callout: a contributor of a deselected type MUST NOT be returned to, plotted for, counted for, or discoverable via search by any viewer — including anonymous/public visitors of a public space. The selection is an exclusion of those contributors from the callout's data, not merely a UI hide.
- **FR-003a**: System MUST shape the contributor-selection settings model and its UI so that a future "by role" dimension (selecting contributors by membership role, e.g., only Leads) can be added alongside the existing "by type" dimension without a redesign. Role-based selection itself is out of scope for this version (depends on custom roles) but MUST NOT be precluded by the choices made now (see FR-019, FR-026).
- **FR-004**: System MUST display and count virtual contributors as a first-class contributor type on equal footing with users and organizations — they are both shown (subject to the administrator's type selection) and counted in the metrics row.
- **FR-005**: System MUST present each actor kind to end users as a concrete, named option — a **Contributors** collection and a **Spaces** collection — never as a generic "Actor Collection" choice. The generic actor framing is a backend/internal modelling convenience only; from the user's perspective contributors and spaces are completely different things and MUST be offered as separate, concrete options (including at creation time, where the choice fixes the callout's actor kind per FR-001a).
- **FR-006**: System MUST allow viewers to search the displayed actors by name within the callout (contributors or spaces, in whichever display modes that kind supports). Search MUST be applied server-side across the full eligible set (not only the currently loaded subset).
- **FR-006a**: System MUST, for a contributors callout, apply the administrator's contributor-type selection server-side, so the eligible set is computed across the full membership (not just the loaded subset).
- **FR-007**: System MUST support a card display (one card per actor) for both actor kinds, and a map display for the **contributors** kind only. A **spaces** callout MUST always display as cards and MUST NOT offer a map display.
- **FR-007a**: System MUST reuse the existing client card displays unchanged — the current contributor card for the contributors kind and the current subspace card for the spaces kind. These are two different existing cards; this feature introduces no new card design or change to either.
- **FR-008**: System MUST, for a contributors callout, let an administrator set the default display mode (cards or map) as a callout setting; this default MUST NOT be overridable as a stored per-user preference. (A spaces callout has no display-mode setting — it is always cards.)
- **FR-009**: System MUST, in map display, plot each contributor that has valid stored geo-coordinates in their profile at their location on the map. "Usable location data" means valid stored coordinates; the system MUST NOT introduce new geocoding, so contributors with only city/country (and no valid coordinates) are treated as having no location data.
- **FR-009a**: System MUST deliver all located contributors (those with valid coordinates) to the map display, independent of card-display pagination.
- **FR-010**: System MUST, in map display, list contributors that lack usable location data as cards beneath the map.
- **FR-011**: System MUST show the message "these contributors do not have location data set" above the list of contributors lacking location data in map display.
- **FR-012**: System MUST render the base map from OpenStreetMap data using the open-source MapLibre GL renderer, with base-map tiles served from an open, OSM-based hosted tile provider. The provider MUST be vetted to align with the platform's public-interest-tech values (acceptable ToS, no user tracking, workable rate limits); proprietary providers that track users or impose restrictive licensing (e.g. Google Maps, Mapbox) MUST NOT be used. The administrator sets only the default geographic focus and zoom (FR-012a, FR-013); the base map itself is not a per-callout setting but is governed centrally per FR-012b.
- **FR-012b**: System MUST control the set of supported base maps **server-side and platform-wide** (not per callout or per space). In this version exactly **one** base map is supported, but the model/logic MUST be designed to hold multiple supported base maps so additional ones can be added later (and, later still, exposed for selection) without rework. The list of supported base maps is authoritative on the server; clients render only base maps the server declares supported.
- **FR-012a**: System MUST allow an administrator to set the default geographic focus (the center/region the map opens on) as a callout setting.
- **FR-013**: System MUST allow an administrator to set the default zoom level for the map as a callout setting.
- **FR-013a**: System MUST keep the map legible for large communities by grouping overlapping contributor pins into a count indicator that separates into individual pins as the map is zoomed in. This is automatic display behaviour, not a configurable control, and introduces no contributor-to-contributor connectivity (FR-015).
- **FR-013b**: System MUST let a viewer hover over (or, on touch devices, tap) a contributor's pin to see additional information about that contributor (e.g. name and key profile details), and MUST let the viewer click through from there to that contributor's page, opened in a new browser tab. This is read-only navigation to an existing contributor page; it adds no contributor-to-contributor connectivity (FR-015) and persists nothing.
- **FR-014**: System MUST display metrics beneath the map showing the count of each contributor type (users, organizations, virtual contributors). These counts MUST reflect the total eligible set (per the administrator's type selection) and MUST NOT change in response to a viewer's live search.
- **FR-015**: System MUST scope the map feature to plotting actors only — no connectivity, relationships, or routing between contributors is included. (Automatic pin grouping per FR-013a, and pin hover/click-through to a contributor's page per FR-013b, are display/navigation aids, not connectivity.)
- **FR-016**: System MUST determine the callout's source set from its actor kind: a **contributors** callout sources from the membership of the community/space it belongs to (its role set); a **spaces** callout sources from the subspaces of the space it belongs to.
- **FR-017**: System MUST persist all administrator configuration (contributor-type selection, default display mode, map geographic focus, default zoom, and the settings-edit-access level per FR-027) as part of the callout's settings. Anything a viewer does (search text, current view) is transient session state and MUST NOT be persisted as callout settings or as per-user preferences.
- **FR-018**: System MUST present an appropriate empty state when there are no contributors to display or no search matches, rather than an error.
- **FR-019**: System SHOULD model the callout type and its settings generically enough that future versions can (a) source actors from an administrator-curated set rather than only community membership/subspaces, and (b) let the administrator narrow the displayed contributors by membership role once custom roles exist (see FR-003a, FR-026). (Displaying spaces is no longer future — it is in scope per FR-001/FR-016.) In all cases the user-facing options remain concrete and distinct per FR-005.
- **FR-020**: System MUST ensure that every top-level (L0) space has, by default — for both newly created and existing L0 spaces, with no per-space manual action — a **contributors** callout on its community tab (replacing the hard-coded contributor block) and a **spaces** callout on its subspaces tab (replacing the hard-coded subspaces display). The contributors callout's default settings MUST be: card display mode and all contributor types shown (map display is opt-in per administrator). The spaces callout displays as space cards.
- **FR-020a**: System MUST provision the default callouts at a sensible default position (contributors at the top of the community tab, spaces on the subspaces tab) but MUST NOT lock them there. Once provisioned, each default callout behaves like any other callout and MAY be reordered, moved between tabs where the platform allows, or deleted by an authorized administrator; the server MUST NOT silently re-create a default callout that an administrator has deliberately removed. The provisioning guarantee is presence **at creation/rollout** (FR-020b/FR-020c/FR-020d), not a permanent placement lock. Only the actor kind remains immutable (FR-001a). (At rollout the migration still turns each hard-coded block into a callout in the same place, so the immediate user-perceived change is minimal — SC-011 — but administrators are subsequently free to manage these callouts.)
- **FR-020b**: System MUST update all L0 space templates to include both default callouts — a contributors callout on the community tab and a spaces callout on the subspaces tab — so spaces created from a template carry them.
- **FR-020c**: System MUST, in the server-side L0 space creation logic, guarantee that a created L0 space always has **at least one** actor-collection callout on both the community tab (contributors kind) and the subspaces tab (spaces kind), with the actor kind matching each tab's intended usage. This guarantee MUST hold independently of the template used: if a tab has no such callout, the server MUST add one during creation (so it does not add a second when the template already supplies one). The guarantee is presence ("at least one of each"), not a hard uniqueness constraint — the server is not required to reject or dedupe additional callouts. This server enforcement is the authoritative backstop for the guaranteed presence (FR-020), beyond the template update (FR-020b).
- **FR-020d**: System MUST backfill existing L0 spaces via a **one-time database migration** that adds the two default callouts (contributors on the community tab, spaces on the subspaces tab, each at its default position) to every existing L0 space that lacks them. The migration MUST be idempotent — re-running it adds nothing to a space that already has the callout for a tab — and MUST place each callout with the correct actor kind and default position (FR-020a). This is the mechanism by which the "existing L0 spaces" portion of FR-020/SC-008 is met. (As a one-time backfill it does not re-add callouts an administrator later deletes — provisioning happens once, per FR-020a.)
- **FR-025**: System MUST, by default, order contributors in the card display with leads/admins first, then alphabetically by display name, mirroring the existing community block.
- **FR-025a**: System MUST, for a spaces callout, derive subspace **ordering and pinning** directly from the space's existing subspace sort settings — the space-level sort mode plus each subspace's stored sort order and pinned flag — so the spaces callout presents subspaces in the same order, with the same pins, as the hard-coded subspaces display it replaces. This version provides **no callout-level sort or pin control**; ordering and pinning are governed solely by the space (a per-callout sort/pin option MAY be added later). The rollout MUST NOT reorder subspaces or lose pins (consistent with SC-011).
- **FR-021**: System MUST preserve administrator changes to a callout's *editable* settings (e.g., contributor-type selection, default display mode, map focus/zoom, settings-edit-access) and to its position and lifecycle. The only immutable property is the **actor kind** (FR-001a): a callout cannot be switched between contributors and spaces. Presence and layout position are NOT locked — default callouts can be reordered, moved, or deleted like any other callout (FR-020a/FR-022).
- **FR-022**: System MUST allow an authorized administrator to create new callouts of this type — both the **contributors** kind and the **spaces** kind — through the standard callout creation flow, selecting the concrete option (Contributors or Spaces, per FR-005), which fixes the actor kind at creation (FR-001a). Created instances MUST reuse the existing callout lifecycle mechanics — placement, reordering, moving between tabs, and deletion — exactly like other callout types; this feature adds a new callout type, not a new lifecycle or container. Creation in this version is governed by the platform's existing callout-create authorization; enriching create-permission granularity (which callout types members may create) is a separate future story (see Future Considerations).
- **FR-023**: System MUST paginate the card display so that large communities remain responsive; the map display is exempt from pagination and receives all located contributors (per FR-009a).
- **FR-024**: System MUST restrict the contributors shown to those the viewer is already authorized to see under existing callout/community read rules, and additionally under the space-level user-information visibility setting (FR-028).
- **FR-028**: System MUST provide a **space-level** setting controlling who may read information about the space's users. It MUST offer at least two options: (a) **follow space visibility** (default — a public space's users are publicly readable, as today), and (b) **members only** — user information is readable only by members of the space. This setting governs disclosure of user (personal) data and is independent of any individual callout's configuration.
- **FR-028c**: For FR-028, "members" means the **accepted members** of the space (holders of the existing space member role, which inherently includes admins and leads). Users with only a pending invitation/application, and non-members, are NOT members for this purpose. The boundary reuses the platform's existing space-membership authorization; this feature defines no new membership concept.
- **FR-028a**: System MUST, when the setting is "members only", prevent non-members (including anonymous/public visitors) from reading the space's users anywhere this feature surfaces them — a contributors callout MUST omit member users from its cards, map, metrics, and search for such viewers, while still showing organizations and virtual contributors. Members MUST continue to see member users normally. This MUST be enforced server-side as a data boundary, not a UI hide.
- **FR-028b**: System MUST scope FR-028 to **user** information only; organizations and virtual contributors remain readable per normal space visibility. The space-level setting (FR-028, applies to non-members) and the per-callout contributor-type selection (FR-003/FR-003b, applies to everyone) compose without conflict: a user hidden by either mechanism is not shown.
- **FR-026**: System SHOULD, in a future version (dependent on custom roles), let an administrator narrow the displayed contributors by membership role as an additional selection dimension alongside contributor type. This version MUST NOT implement role-based selection but MUST leave the settings model and selection UI able to accommodate it (FR-003a).
- **FR-027**: System MUST provide a callout setting that controls **who is allowed to edit the callout's settings** — selectable among the relevant authorization levels (e.g., space admins, the space owner, or all members). This setting governs edit access to the callout's configuration (contributor selection, display mode, map focus/zoom, and this setting itself); it does not change who can *view* the callout, which continues to follow existing read authorization (FR-024). The chosen edit-access level MUST be enforced server-side, expressed in terms of the platform's existing authorization/privilege model rather than as a free-form list.

### Administrator settings vs. viewer view

The callout's **actor kind** (contributors or spaces) is fixed at creation and never changes (FR-001a); for the default L0 callouts, presence and layout position are also fixed (FR-020a). Within that, the **administrator's callout settings** (persisted) hold the editable configuration — for a contributors callout: contributor-type selection, default display mode (cards/map), map default focus and zoom, and who may edit the settings; a spaces callout has only the edit-access setting (it is always cards). These apply to every viewer and are not overridable per user. A **viewer** only consumes what the administrator configured — searching by name and (for contributors) switching between card and map views within a session — none of which is persisted. Metric counts always reflect the administrator-defined eligible set (FR-014).

### Key Entities *(include if feature involves data)*

- **Actor Collection Callout** (internal name; surfaced to users as a **Contributors** collection or a **Spaces** collection): A new callout type that displays a collection of actors of a single, creation-fixed **actor kind** (contributors or spaces). Holds administrator settings only. For a contributors callout: contributor selection (which types — and, in future, roles — form the eligible set), default display mode (cards/map), default map geographic focus, default zoom level, and the settings-edit-access level. For a spaces callout: the settings-edit-access level only (always cards, no map). It does NOT store viewer interaction state.
- **Actor kind**: The fixed property (contributors or spaces) chosen at creation that determines the source set, available displays (map is contributors-only), and card type. Not changeable after creation (FR-001a).
- **Contributor**: A user, organization, or virtual contributor that is a member of the community/space. Has a display profile (name, avatar) and optional location data. Rendered with the **existing contributor card**, unchanged (FR-007a).
- **Space (subspace)**: A subspace of the space the callout belongs to. Rendered with the **existing subspace card**, unchanged (FR-007a). Displayed as cards only — never on a map.
- **Location data**: Geographic information associated with a contributor's profile used to plot them on the map; may be present (usable) or absent (contributor listed beneath the map). Applies to contributors only.
- **Role**: A membership role (e.g., Lead, Member). Used now only to order the card display (leads/admins first); in a future version it becomes an administrator selection dimension for defining the eligible set (FR-026).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can add and fully configure an Actor Collection callout (contributor selection, default display mode, map focus, zoom, and who may edit the settings) without assistance in under 3 minutes.
- **SC-002**: A callout configured for a community displays 100% of that community's eligible contributors (per the selected contributor types) as cards.
- **SC-003**: In map display, 100% of contributors with usable location data appear on the map, and 100% of those without appear in the labelled list beneath the map.
- **SC-004**: The contributor-type metric counts beneath the map match the actual number of each contributor type in the total eligible set, with zero discrepancy, and remain stable while a viewer searches.
- **SC-005**: Searching within a community of at least 500 contributors returns the filtered result in under 1 second as perceived by the viewer.
- **SC-006**: The default display mode shown to every viewer matches the callout setting in 100% of loads, independent of any individual viewer.
- **SC-007**: The contributors callout can replace the existing community-page contributor block, and the spaces callout the existing subspaces display, with no loss of the contributors/subspaces previously shown there.
- **SC-008**: Immediately after rollout (and at creation for new spaces), 100% of L0 spaces have a contributors callout on their community tab and a spaces callout on their subspaces tab, without per-space manual action. (These are subsequently normal callouts an administrator may move or remove — the guarantee is provisioning, not permanent presence.)
- **SC-009**: A spaces callout displays 100% of the space's authorized subspaces as space cards, and offers no map display.
- **SC-010**: A callout's actor kind cannot be switched after creation: 100% of attempts to change a contributors callout into a spaces callout (or vice-versa) are prevented. All other management — reordering, moving, deleting, and editing settings — succeeds for authorized administrators exactly as for other callout types.
- **SC-011**: At rollout, the only user-perceived difference on the community and subspaces tabs is that the previously hard-coded blocks are now callouts in the same position — no content is lost and nothing moves automatically. (Administrators may subsequently rearrange or remove them by choice.)
- **SC-012**: 100% of L0 spaces created from any L0 template end up with both default callouts (community-tab contributors, subspaces-tab spaces) — verified to hold even when the source template omits one (server enforcement adds it).
- **SC-013**: The client renders the community contributor display and the subspaces display entirely from these callouts, with no remaining hard-coded contributor/subspaces components for L0 spaces.
- **SC-014**: For a public space whose callout is set to organizations-only, zero member users are returned, plotted, counted, or surfaced by search to any viewer (including anonymous/public visitors) — verified at the API level, not only in the UI.
- **SC-015**: For a public space with user-information visibility set to members-only, zero member users are readable by non-members/anonymous viewers (in the contributors callout or via the API), while members still read them and organizations/virtual contributors remain visible to all — verified at the API level.
- **SC-016**: The set of supported base maps is defined once, server-side and platform-wide; exactly one is supported in this version, and adding a second requires no change to callout or space data (the model already accommodates multiple).
- **SC-017**: 100% of existing L0 spaces have both default callouts after the one-time migration, which is idempotent (a second run changes nothing), and every spaces callout preserves the space's prior subspace sort order and pinned subspaces with zero reordering.

## Assumptions

- A callout displays one actor kind, fixed at creation: a contributors callout sources from community/space membership (its role set), a spaces callout from the space's subspaces. Administrator-curated source sets are a future enhancement (FR-019), not part of this version.
- "Contributors" refers to the platform's existing actor types: users, organizations, and virtual contributors, all displayed and counted as first-class types. "Spaces" refers to the subspaces of the callout's space. Both kinds are in scope; they are separate sets, each rendered with its existing client card (contributor card / subspace card) unchanged, and are never combined in one callout.
- Location data and its validity are derived from contributors' existing profile geo-coordinate information; no new location capture or geocoding is introduced by this feature. A contributor with only city/country and no valid coordinates is treated as having no location data.
- Search matches against contributor display name, is case-insensitive, and is evaluated server-side across the full eligible membership.
- Viewers narrow the displayed list only by name search; there is no viewer-side role/type filter control. The administrator's contributor-type selection defines the displayed set.
- The map display is plotting-only for v1: no routing or contributor-to-contributor connections, and no on-map type toggling. Overlapping pins are grouped automatically for legibility (FR-013a); hovering a pin reveals additional info and clicking through opens the contributor's page in a new tab (FR-013b).
- The base map uses OpenStreetMap data via the MapLibre GL renderer with tiles from an open, OSM-based hosted provider that aligns with public-interest-tech values; proprietary tracking providers (Google/Mapbox) are excluded. Self-hosting tiles is a later fallback if the hosted provider proves unsuitable.
- The supported base maps are defined server-side and platform-wide (FR-012b); this version supports exactly one, with the model built to accommodate several later. The base map is not a per-callout or per-space choice in this version.
- Default display mode is a callout-level setting and is not stored as a per-user override; a viewer may still switch views during a session, but the stored default is administrator-controlled.
- Standard authorization applies: who can view the callout follows existing callout/community/subspace read rules; who can configure it follows the per-callout edit-access setting (FR-027). This feature does not introduce new read-visibility semantics.
- Existing callout placement, ordering, creation, and lifecycle mechanics are reused for **all** callouts of this type, including the default L0 ones; this feature adds a new type rather than a new container or a new lifecycle. The default L0 callouts are provisioned by default but are not position-locked — after provisioning they are created, moved, and deleted like any other callout (FR-020a/FR-022).
- Default-callout provisioning applies to L0 (top-level) spaces in this version, on both the community tab (contributors callout) and the subspaces tab (spaces callout). These default callouts use default settings and keep their fixed actor kind; they are provisioned by default but otherwise managed like normal callouts (movable/deletable), and their settings remain administrator-editable.
- Migration is deliberately minimal: the default callouts replace the hard-coded blocks in place, so the only user-visible change is that those blocks are now callouts (FR-020a, SC-011).
- Guaranteed presence is delivered by three complementary mechanisms: updating L0 templates to include both callouts (FR-020b), enforcing at least one of each on L0 space creation server-side regardless of template (FR-020c), and a one-time idempotent migration backfilling existing L0 spaces (FR-020d). The server enforcement is authoritative; templates keep the callouts visible/editable in the expected place.
- These callouts are intended to replace the client's hard-coded contributor and subspaces components, advancing the epic goal of fully callout-driven L0 pages.

## Future Considerations

- **Granular create permissions for callout types (separate story).** Creating Contributors/Spaces callouts is in scope now via the standard callout creation flow (FR-022), but that flow's option set is already heavy and create permission is still the coarse Space setting "Allow members to create posts" (a yes/no). A likely future direction is enriching that setting into something more granular — e.g., controlling which callout types members may create. Out of scope for this version; flagged so the direction is considered as more callout types are added.
- **Hide the callout publisher (needs wider discussion — parked).** There is a need to optionally hide the "published by" attribution on callouts — particularly for this Actor Collection type (where a system/admin-provisioned callout showing an individual publisher reads oddly), but potentially **generically** across all callout types. This is **not implemented in this version** and is recorded here as an open design question. Open points to resolve before building: (1) **scope** — per-callout setting vs. per-space vs. platform default, and per-type vs. generic across all callouts; (2) whether "hide" removes the publisher from the API response entirely (a data boundary) or only suppresses it in the client UI; (3) interaction with audit/attribution needs and with the settings-edit-access model (FR-027); (4) default behaviour for the auto-provisioned default callouts (which have no meaningful individual publisher). It would complement the contributors callout's privacy levers (FR-003/FR-028).
- **Role-based contributor selection (depends on custom roles).** Extend the administrator's contributor selection from "by type" to also "by role" (FR-026). The settings model and selection UI are shaped now to accommodate it (FR-003a).
- **Curated source sets.** Source actors from an administrator-curated set rather than only community membership / subspaces (FR-019). Additional actor kinds beyond contributors and spaces could follow the same concrete-option pattern (FR-005).
- **Actor-collection callouts at lower space levels.** This version both provisions the default L0 callouts and lets administrators freely add, position, and remove their own actor-collection callouts on L0 spaces (FR-022). Extending guaranteed provisioning (and any level-specific behaviour) to subspaces / lower space levels is a later step.
- **Multiple base maps + selection.** The server-side, platform-wide supported-base-maps model (FR-012b) ships supporting one base map but is designed to hold several; later steps would add more supported base maps and then expose a choice (platform-wide, or per space/callout) beyond the single base map of this version.
- **Fully callout-driven L0 pages (epic direction).** This feature replaces two hard-coded components with callouts; the broader epic goal is for *all* L0 space page content to be callout-driven rather than hard-coded. Subsequent stories would migrate the remaining hard-coded components the same way (server-provisioned callouts replacing blocks in place, then managed like any other callout).

## Out of Scope

- Actor kinds other than contributors and spaces.
- Any change to the existing contributor or subspace card designs — the callouts reuse the current client cards unchanged (FR-007a).
- A map display for the spaces kind (spaces are always cards); changing a callout's actor kind after creation.
- Enriching create-permission *granularity* (controlling **which** callout types members may create); creation in this version uses the existing callout-create flow and authorization (FR-022). Creating, moving, and deleting instances of this callout type is **in scope** (no longer deferred).
- Any contributor-to-contributor connectivity, relationships, or routing on the map (pin hover info and click-through to a contributor's page are allowed per FR-013b; on-map contributor-type toggling is not included).
- Viewer-side role/type filtering of the contributor list (viewers narrow only by name search; type membership is set by the administrator).
- Per-user persisted preferences for display mode, map, or zoom.
- New location capture or geocoding capabilities for contributors.

## Dependencies

- Reuses the existing callout framework (callout creation, settings persistence, and page placement).
- Depends on the existing community/space membership model to source contributors, and on the subspaces model to source spaces.
- Depends on existing contributor profile and location/geo data to drive the map display (contributors kind only).
- Depends on a mechanism to provision default callouts on L0 community and subspaces tabs (templates + creation-time enforcement + one-time backfill migration); no position-locking is required, since the callouts are created/moved/deleted like any other callout after provisioning (FR-022).
- Depends on the L0 space template definitions (which MUST be updated to include both callouts, FR-020b), on the server-side L0 space creation logic (which MUST enforce at least one of each callout regardless of template, FR-020c), and on a one-time idempotent migration to backfill existing L0 spaces (FR-020d).
- Depends on the existing subspace sorting/pinning settings, which the spaces callout MUST honour and the rollout MUST preserve (FR-025a).
- Depends on the client replacing its hard-coded contributor block and subspaces display with rendering driven by these callouts.
- Depends on an external, open, OSM-based map tile provider (rendered via MapLibre GL) for the base map; the specific provider must be vetted for public-interest-tech alignment (ToS, privacy, rate limits) before adoption.
