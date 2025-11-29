# Feature Specification: URL Resolver Parent Access

**Feature Branch**: `018-url-resolver-parent-access`
**Created**: 2025-11-28
**Status**: Draft
**Input**: User description: "Add parent/ancestor context to urlResolver response when user lacks access to resource, enabling client to redirect to nearest accessible parent. See client-web #9001."

## Context

The client now needs to differentiate between three URL outcomes: (a) resource exists and is accessible, (b) resource exists but the viewer lacks credentials, (c) resource no longer exists. The current `urlResolver` GraphQL response does not expose enough metadata to redirect a user toward an accessible ancestor. This feature equips the resolver with hierarchical access evaluations so the client can render the right redirect dialog and countdown described in client-web #9001 by introducing a `UrlResolverResult` descriptor interface, a flattened `state: UrlResolverResultState!` on the main result, and a dedicated `UrlResolverQueryClosestAncestor` node (with canonical `url`) that reuses the descriptor interface to avoid duplication.

### Current Implementation Gaps

- `UrlResolverService` calls `authorizationService.grantAccessOrFail` as soon as it resolves a space, callout, or contribution. Any unauthorized access triggers an exception, so responses never contain partial data or ancestor hints. We must restructure the flow to capture authorization outcomes instead of throwing immediately.
- DTOs such as `UrlResolverQueryResults` and `UrlResolverQueryResultSpace` do not expose a resolver `state`, a shared descriptor interface, or a dedicated ancestor node. Schema additions and resolver wiring are required before the client can consume richer metadata.
- Ancestor traversal halts once an authorization error occurs; there is no logic to continue walking up the hierarchy to find an accessible parent. Implementing `closestAncestor` selection will require new traversal helpers, a dedicated `UrlResolverQueryClosestAncestor` type (reusing the descriptor interface), and consistent data for all entity types the resolver supports today (spaces, callouts, contributions, innovation packs/hubs, virtual contributors).
- Resource existence checks are currently intertwined with authorization; if a contribution lookup fails due to access, the resolver cannot differentiate “missing” vs “forbidden.” The feature demands separate existence validation so `NOT_FOUND` and `NOT_AUTHORIZED` states are accurate.

## Clarifications

### Session 2025-11-28

- Q: Should `closestAncestor` stay `null` when `state = NOT_FOUND` even if a parent is accessible? → A: Populate the first accessible ancestor even for `NOT_FOUND` outcomes so the client can redirect users to a valid context.

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Return ancestor metadata for unauthorized viewers (Priority: P1)

A logged-in member follows a deep link to a contribution, callout, or sub-space they cannot access, and the client needs the nearest accessible ancestor to redirect them gracefully instead of showing a dead-end 404.

**Why this priority**: Without server-provided ancestor metadata the new client redirection flow cannot operate, leaving users stranded on a 404 despite having access to higher-level contexts.

**Independent Test**: Trigger `urlResolver` for a resource where the viewer lacks privileges and verify the response includes `UrlResolverResult = NOT_AUTHORIZED`, the offending resource descriptor, and `closestAncestor` (ID + slug) ready for the client to redirect.

**Acceptance Scenarios**:

1. **Given** a contribution exists but the viewer lacks membership, **When** the client calls `urlResolver`, **Then** the response marks the target as `NOT_AUTHORIZED` and supplies the first ancestor (e.g., its callout or space) that the viewer can access.
2. **Given** multiple ancestors are locked (e.g., private sub-space and parent space), **When** the resolver evaluates access, **Then** it climbs the hierarchy until it finds a permitted ancestor or confirms none exist and labels the outcome appropriately.

---

### User Story 2 - Guide unauthenticated visitors toward valid parents (Priority: P2)

An unauthenticated visitor opens a shared URL. The server must indicate that the viewer currently lacks access (state `NOT_AUTHORIZED`) while still telling the client which ancestor to navigate to after login.

**Why this priority**: Even though the state no longer distinguishes “needs login” vs “never allowed,” the client must still prompt for authentication when the best remediation is to log in, and that requires reliable ancestor metadata.

**Independent Test**: Call `urlResolver` without an authenticated agent for a resource that would be accessible if logged in, and confirm the response reports `NOT_AUTHORIZED`, preserves the resolved resource target, and still returns `closestAncestor` so the client can plan the post-login redirect and messaging.

**Acceptance Scenarios**:

1. **Given** a public space requiring login for participation, **When** an anonymous agent resolves its URL, **Then** the response states `NOT_AUTHORIZED` and surfaces the same target info (plus ancestor) the user will see after logging in.
2. **Given** an anonymous agent requests a resource that still requires additional authorization even after login, **When** the resolver runs, **Then** it still returns `NOT_AUTHORIZED` along with the best accessible ancestor so the client can guide the user appropriately.

---

### User Story 3 - Distinguish deleted or missing resources (Priority: P3)

Support staff and end users must know when a link targets a resource that no longer exists so they can stop hunting for it or escalate a restoration request.

**Why this priority**: Without a distinct “not found” signal, the client might incorrectly assume the user simply lacks access and redirect them somewhere unrelated, hiding legitimate data-loss issues.

**Independent Test**: Resolve a URL pointing to a deleted contribution and validate that the response marks the target as `NOT_FOUND`, leaves `closestAncestor` unset (unless an accessible parent exists), and continues to return accessible metadata for parent resources that still exist.

**Acceptance Scenarios**:

1. **Given** a contribution slug no longer exists and no ancestors remain accessible, **When** `urlResolver` is invoked, **Then** the response states `NOT_FOUND` and `closestAncestor` is `null`.
2. **Given** the deleted contribution had a parent callout that still exists and is accessible, **When** the resolver encounters the missing child, **Then** it still includes the parent’s identifiers via `closestAncestor` so the client can redirect there while acknowledging the missing child.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- How does the resolver behave when an access chain spans more than three levels (e.g., contribution → callout → sub-space → parent space) and none are accessible?
- What happens when the resolved slug maps to multiple entities (legacy duplicates) and one is accessible while another is not?
- How are URLs handled when the requested resource moved to a different parent after the link was generated?
- What occurs if the viewer loses authorization between resolution calls (stale cache) and the resolver must recompute the closest ancestor each time?
- How is rate limiting or throttling enforced if clients poll `urlResolver` repeatedly during the 10-second countdown?

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: `urlResolver` MUST determine whether the requested resource exists independently of authorization outcomes so it can differentiate `NOT_FOUND` from `NOT_AUTHORIZED` cases.
- **FR-002**: The GraphQL schema MUST extend `UrlResolverQueryResults` with a non-null `state` field (enum values `SUCCESS`, `NOT_AUTHORIZED`, `NOT_FOUND`) surfaced directly alongside the existing resource descriptor metadata so clients can branch without extra nesting.
- **FR-003**: When `state` is not `SUCCESS` (including `NOT_FOUND`), the response MUST include a `closestAncestor` value representing the highest ancestor the viewer can open immediately; only when no ancestors are accessible may the field be `null` so the client can fall back to generic error messaging.
- **FR-004**: `closestAncestor` MUST be typed as `UrlResolverQueryClosestAncestor`, which reuses the shared `UrlResolverResult` descriptor interface while appending the canonical `url: String!` field so the client can redirect without recomputing path info.
- **FR-005**: The resolver MUST compute ancestor relationships for all supported entities (spaces at every level, callouts, callout contributions, virtual contributor resources, innovation packs, and innovation hubs) and stop traversing once a permitted ancestor is found or the root is reached.
- **FR-006**: When the agent is unauthenticated (or lacks memberships) and the resource requires authentication, the resolver MUST set `state = NOT_AUTHORIZED` and still populate `closestAncestor` using the permissions that would apply post-login for a new member (i.e., assume no memberships) to enable consistent post-auth redirects.
- **FR-007**: When both the target and all ancestors are inaccessible, the resolver MUST still supply a sanitized descriptor (type + slug only) for the target so the client can message the user without leaking private metadata such as internal IDs; the ancestor field remains `null` to avoid exposing policy details.
- **FR-008**: Resolver responses MUST log structured context (`details` payload) whenever the state is `NOT_AUTHORIZED` or `NOT_FOUND` so support staff can audit redirect decisions without exposing sensitive data to the client.
- **FR-009**: The resolver MUST maintain backward compatibility for existing clients by defaulting `state = SUCCESS` and leaving `closestAncestor` unset when the target is accessible, ensuring legacy flows continue to work.
- **FR-010**: `UrlResolverService` MUST enforce consistent caching or memoization boundaries so repeated resolution of the same URL within a single request does not trigger redundant database lookups for ancestor chains.

### Key Entities _(include if feature involves data)_

- **UrlResolverResult Descriptor**: Shared interface describing the requested entity (type, optional IDs, nested nodes such as `space`, `virtualContributor`, `innovationPack`). Implemented by both the root result and ancestor objects so serialization logic stays DRY.
- **UrlResolverResultState**: Enum powering the flattened `state` field with values `{SUCCESS, NOT_AUTHORIZED, NOT_FOUND}`.
- **UrlResolverQueryClosestAncestor**: Specialized object implementing the descriptor interface while appending `url: String!` so the client can immediately redirect to the accessible ancestor without recomputing canonical paths.

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 100% of `NOT_AUTHORIZED` resolver responses include a `closestAncestor` when such an ancestor exists.
- **SC-002**: Resolver responses correctly classify `SUCCESS` vs `NOT_AUTHORIZED` vs `NOT_FOUND` with <1% misclassification rate during QA regression tests that cover all supported entity types.
- **SC-003**: Client telemetry shows that redirected sessions reach an accessible ancestor within one click for 95% of unauthorized URL visits triggered by deep links.
- **SC-004**: Support tickets tagged “broken deep link” referencing 404 outcomes drop by at least 30% within one release after deploying the enhanced resolver.

## Assumptions

- Authorization checks reuse the existing `AuthorizationService` capabilities; no new privilege model is required.
- Client applications will own the countdown UX, so the server only needs to supply metadata (states, ancestor descriptors, redirect paths).
- For unauthenticated users, the resolver treats them as guests with zero memberships; once authenticated, the client is responsible for re-running the query if necessary.
