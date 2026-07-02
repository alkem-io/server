# Feature Specification: Optimize Space Authorization Reset

**Feature Branch**: `105-optimize-auth-reset`

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "I want to optimize the authorization reset process within space entities. This process is currently failing on production for our largest spaces. The suspicion is that we are loading in too much data when doing the authorization reset process. Please review the data that is loaded for all entities that are in the authorization reset process within a space, and optimize that to load only necessary data."

## Overview

When a space's access rules need to be recalculated, the platform runs an **authorization reset** that walks every entity belonging to that space (its collaboration, callouts, contributions, community, storage, templates, timeline, subspaces, etc.) and recomputes each entity's access policy. Today this walk loads far more data than it needs to: for each entity it pulls in heavy related content — full message histories, every contribution and its content, every stored document, every calendar event, every template's embedded structure — even though recomputing an access policy only needs each entity's identity and its existing policy/parent relationships.

For the platform's **largest spaces**, the volume of data loaded grows so large that the reset **fails outright in production** (e.g. runs out of memory or exceeds time limits). This feature reduces the data loaded during an authorization reset to only what is required to compute the access policies, so the process completes reliably and quickly regardless of space size — **without changing the resulting access rules**.

## Clarifications

### Session 2026-06-27

- Q: Performance acceptance target for a reset of the largest space → A: Completes in under 5 minutes with peak memory staying within the production container limit (no OOM).
- Q: How is the "access policies unchanged" requirement verified and protected → A: A permanent automated regression check asserts computed policies match a captured baseline across all entity types.
- Q: Should the new reduced-loading behavior be reversible at runtime (feature flag) or replace the old path outright → A: Replace outright with no feature flag, relying on the equivalence regression check to de-risk; rollback is via redeploy/revert.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authorization reset completes for the largest spaces (Priority: P1)

A platform administrator (or an automated platform process) triggers an authorization reset that affects one of the platform's largest spaces — a space with a deep subspace hierarchy and a high volume of callouts, contributions, documents, messages, and templates. The reset runs to completion and the space's entities end up with correct, up-to-date access policies.

**Why this priority**: This is the core failure being addressed. Today this exact scenario fails in production, which means access rules for the largest (and often most important) spaces cannot be reliably reset. Fixing it restores a critical operational capability.

**Independent Test**: Trigger an authorization reset against a representative large space and confirm it completes successfully (no out-of-memory/timeout failure) and that the access policies on the space and its descendants are correct.

**Acceptance Scenarios**:

1. **Given** a very large space that previously caused the authorization reset to fail, **When** an authorization reset is triggered for that space, **Then** the reset completes successfully without exhausting memory or exceeding time limits.
2. **Given** a space with many callouts, contributions, documents, messages, and calendar events, **When** an authorization reset runs, **Then** only the data needed to compute access policies is loaded (heavy content such as message bodies, document contents, contribution payloads, and event details is not loaded).
3. **Given** a space with a deep hierarchy of subspaces, **When** an authorization reset is triggered on the top-level space, **Then** the reset recurses through all descendant subspaces and completes successfully.

---

### User Story 2 - Access rules are unchanged after optimization (Priority: P1)

A platform administrator resets authorization on a space after this optimization ships. Every user, group, and contributor that had a particular level of access before the reset has exactly the same access afterwards. No one gains or loses access as a side effect of loading less data.

**Why this priority**: An optimization that changes the computed access rules would be a security and correctness regression. Preserving identical authorization outcomes is a hard requirement and must be verifiable independently of the performance gains.

**Independent Test**: Capture the authorization policies produced for a space (and its descendant entities) by the current process, run the optimized process against the same space, and confirm the resulting policies are equivalent.

**Acceptance Scenarios**:

1. **Given** a space whose entities have known access policies, **When** the optimized authorization reset runs, **Then** the resulting access policy for every entity is equivalent to the policy the previous process produced.
2. **Given** entities of every type touched by the reset (space, collaboration, callouts set, callout, contribution, post, whiteboard, link, memo, community, role set, communication/rooms, storage aggregator and documents, templates, innovation flow, timeline/calendar, license), **When** the optimized reset runs, **Then** each entity type still receives a correctly computed access policy.

---

### User Story 3 - Reset performs predictably as spaces grow (Priority: P2)

As a space accumulates more content over time (more callouts, contributions, documents, messages), the time and resources needed to reset its authorization grow in proportion to the number of entities whose policies must be computed — not in proportion to the volume of content stored inside those entities.

**Why this priority**: Prevents the problem from silently returning as spaces continue to grow. Ensures the fix is structural (load less per entity) rather than a one-off tuning that degrades again at the next scale milestone.

**Independent Test**: Compare reset resource usage between a space with light content per entity and a space with heavy content per entity but the same entity count; confirm resource usage is driven by entity count, not content volume.

**Acceptance Scenarios**:

1. **Given** two spaces with the same number of entities but vastly different amounts of stored content (messages, documents, contribution payloads), **When** each is reset, **Then** the resource usage of the two resets is comparable.

---

### Edge Cases

- **Empty / sparse spaces**: A space with no callouts, contributions, documents, or subspaces must still reset correctly and quickly.
- **Deep and wide hierarchies**: Spaces with many levels of subspaces and many siblings at each level must complete without compounding the data loaded at each level.
- **Top-level (L0) spaces with templates**: L0 spaces additionally reset their templates; templates must still receive correct policies without loading each template's full embedded content structure.
- **Partial failure within the walk**: If computing the policy for one entity fails, the process should behave the same way it does today with respect to resilience/continuation (this feature does not change failure-handling semantics, only the data loaded).
- **Cascading entry points**: Account-level and platform-wide resets that fan out to many spaces must benefit from the per-space reduction and not regress.
- **Concurrent content changes**: Content added or removed while a reset is in progress must not cause the reset to load more than the necessary identifying/policy data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The authorization reset for a space MUST load only the data required to compute access policies for each entity it visits — namely each entity's identity, its existing access policy, and the relationships needed to determine policy inheritance and access rules.
- **FR-002**: The reset MUST NOT load heavy or content-bearing data that is not used in computing access policies, including (but not limited to): message/comment room contents, full contribution payloads, document contents and their tags, calendar event details, and the full embedded structure of templates.
- **FR-003**: The reset MUST continue to visit and recompute access policies for **every entity type** currently covered by the process, so that coverage is not reduced as a side effect of loading less data. (See Key Entities for the in-scope set.)
- **FR-004**: The access policy computed for every entity after the optimization MUST be equivalent to the access policy the previous process produced for that entity, given the same input state.
- **FR-005**: The reset MUST recurse through all descendant subspaces of the target space and complete successfully for deep and wide hierarchies.
- **FR-006**: For the platform's largest production spaces, the reset MUST complete without failing due to memory exhaustion or exceeding time limits.
- **FR-007**: The amount of data loaded during a reset MUST scale with the number of entities whose policies are computed, not with the volume of content stored within those entities.
- **FR-008**: All existing entry points that trigger a space authorization reset (single-space resets, account-level resets that cascade across a space's spaces, and platform-wide reset-all flows) MUST continue to function and MUST benefit from the reduced per-space data loading.
- **FR-009**: The reset MUST preserve its current failure-handling/resilience behavior (how it responds when an individual entity's policy computation fails); this feature changes only the data loaded, not the orchestration or error semantics.
- **FR-010**: The optimization MUST NOT require changes to the authorization rules or policies themselves, nor to the public API surface that triggers resets.
- **FR-011**: Policy equivalence (FR-004) MUST be protected by a permanent automated regression check that asserts the computed access policies match a captured baseline across all in-scope entity types, so future changes cannot silently alter access outcomes.
- **FR-012**: The feature MUST produce a written optimization overview that (a) lists, per entity, what data loading was dropped, reduced to identifier-only, or kept, and (b) gives a rough (order-of-magnitude) estimate of the data-loading improvement expected for a large space. This overview is a key deliverable of the work.

### Key Entities *(include if data involved)*

The authorization reset walks the following entities within a space. For each, only identity + existing policy + inheritance-relevant relationships should be loaded; content-bearing relations should not.

- **Space**: The unit being reset; owns collaboration, community, about/profile, storage, license, templates (L0 only), and child subspaces. Establishes the root policy that descendants inherit from.
- **Subspaces**: Child spaces; each is reset recursively using the same rules. Source of hierarchy depth/width.
- **Collaboration**: Container for the space's working surface; links to callouts set, innovation flow, timeline, and license.
- **Callouts Set / Callout**: A callout groups contributions and discussion. Today the reset loads every callout's comments room and all contributions — content that is not needed for policy computation.
- **Contribution** (and its **Post**, **Whiteboard**, **Link**, **Memo**, **Collabora document**): The high-volume entities driving the failure; their content (and post comment rooms) is loaded today but not needed for policy computation.
- **Community / Role Set / User Groups / Communication (rooms & updates)**: Define membership and roles that inform access. Room/message contents are not needed.
- **Storage Aggregator / Documents**: Document access is governed here; the documents' contents and tags are loaded today but not needed for policy computation.
- **Templates Manager / Templates Set / Template** (L0 spaces only): Templates receive policies; their full embedded callout/whiteboard/framing structure is loaded today but not needed for policy computation.
- **Innovation Flow / Timeline / Calendar / Events**: Calendar events are loaded today but not needed for policy computation.
- **License / Entitlements**: Governs feature access; retained as needed for policy computation.
- **Authorization Policy**: The output recomputed for each entity above; its correctness must be preserved exactly.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Authorization reset succeeds for 100% of the platform's largest spaces that currently fail, with no out-of-memory or timeout failures.
- **SC-002**: The resulting access policies for a reset space and all its descendant entities are identical to those produced by the previous process for the same input state (0 differences in computed access).
- **SC-003**: Peak memory used during a reset of the largest spaces stays within the production container's memory limit (no out-of-memory failures), driven by a substantial, order-of-magnitude reduction in data rows loaded for content-heavy spaces.
- **SC-004**: An authorization reset of the platform's largest space completes in under 5 minutes.
- **SC-005**: For two spaces with equal entity counts but very different content volumes, reset resource usage differs by no more than a small margin (resource usage is decoupled from stored-content volume).
- **SC-006**: Every entity type previously covered by the reset still receives a recomputed access policy (no reduction in coverage).

## Assumptions

- **Scope is the per-space authorization reset walk and the data it loads.** Account-level and platform-wide reset flows reuse the per-space walk, so they inherit the improvement; this feature does not redesign those higher-level orchestrators or their queuing/async behavior.
- **Authorization rules are unchanged.** The policies and the logic that computes them stay the same; only the data fetched to feed that computation is reduced. Any data an entity's policy computation genuinely depends on remains loaded.
- **No public API or schema changes.** The mutations and surface that trigger resets stay the same; this is an internal data-loading optimization.
- **No feature flag / dual loading path.** The reduced-loading behavior replaces the existing loading outright; the permanent equivalence regression check (FR-011) is the safeguard, and rollback is handled by redeploy/revert rather than a runtime toggle.
- **Recursion through subspaces is retained.** The feature reduces per-entity loading; it does not remove the need to recurse into descendant subspaces (each must still be reset).
- **Failure-handling/resilience semantics are retained.** The way the process responds to an individual entity's failure is unchanged.
- **"Largest spaces" refers to production spaces** with deep subspace hierarchies and high counts of callouts, contributions, documents, messages, calendar events, and templates — the spaces currently triggering the failure.
- **Correctness is verified by equivalence**, comparing computed policies before and after the change across all in-scope entity types.
