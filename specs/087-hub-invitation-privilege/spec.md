# Feature Specification: Space-Side Privilege for Accepting Innovation Hub Invitations

**Feature Branch**: `087-hub-invitation-privilege`
**Created**: 2026-04-24
**Status**: Draft
**Input**: User description: "I want to add a privilege for checking if a user is allowed to accept an invitation for joining an innovation hub. The privilege should be assigned on top level spaces as they are what can invited to an innovation hub. The roles to get the privilege are a) admins of the top level space b) admins of the account hosting the space c) support admins. When an innovation hub is inviting (adding) a space to the hub this privilege should be checked on the space that is being invited, in addition to checking the existing privilege on the innovation hub that the space is being invited into."

## Clarifications

### Session 2026-04-24

- Q: When an authorised caller invokes the dedicated add action for a space that is already a hub member, or the remove action for a space that is not a hub member, what should happen? → A: Both cases are idempotent success — authorization checks still run first, then the operation returns the current hub state without error.
- Q: How should a denial from the new space-side check be distinguished from a denial from the existing hub-side check? → A: Both use the existing authorization-denied exception, but attach structured details (`side: "space" | "hub"`, the missing privilege name, and the subject entity id). The human-readable message is derived from these details.
- Q: Which existing privilege on the innovation hub governs the dedicated add and remove actions? → A: The `UPDATE` privilege on the innovation hub. Both the dedicated add action and the dedicated remove action require that the caller holds `UPDATE` on the target hub; the add action additionally requires the new space-side privilege on the target space.
- Q: Should the dedicated add and remove actions be available on all innovation hubs, regardless of their configured type (`LIST` vs `VISIBILITY`)? → A: No. Both actions MUST only be executable against hubs whose type is `LIST` (explicit spaces list). When invoked against a `VISIBILITY` hub (whose membership is derived from a filter), the action MUST be rejected with a validation error indicating the hub's type does not support explicit membership modification — before authorization errors are surfaced, so that an authorised caller learns the precondition that actually failed.
- Q: Are "invitation" (the hub-side intent to add a space) and "acceptance" (the space's authorisation to be added) separate operations, or do they occur as a single atomic action? → A: Single atomic action. Both checks — `UPDATE` on the hub (the "invitation" aspect) AND the new space-side privilege (the "acceptance" aspect) — are evaluated within the same add mutation. There is NO two-step protocol, no pending-invitation entity, and no delayed accept step. The caller of the add action must personally hold both privileges at the moment of invocation, and the mutation succeeds or fails atomically.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Space admin authorises their space joining a hub (Priority: P1)

A space administrator wants authority over whether their top-level space is associated with a given innovation hub. When an innovation hub operator attempts to add their space to a hub, the operation is only permitted if someone empowered to speak for the space (the space admin, the account admin that hosts the space, or a platform support admin) has the authority to accept that invitation on the space's side.

Adding and removing a space from an innovation hub are their own discrete actions — they are NOT part of the general "update innovation hub" action. The general update action cannot set, replace, or otherwise change the list of spaces associated with a hub; that list changes only through the dedicated add and remove actions, each of which enforces the appropriate authorization on both sides. This separation is what makes the new space-side privilege actually enforceable: if updating a hub could rewrite its space list, a user with hub-update rights could bypass the space-side check in a single call.

Although the feature is framed in terms of "invitation" and "acceptance", these are conceptual framings for the two authorization checks — they are NOT separate runtime steps. The single add action embodies both: the hub-side `UPDATE` check ("the hub may invite this space") and the new space-side check ("the space may be accepted into this hub") are evaluated atomically within the same mutation. There is no pending-invitation entity, no asynchronous accept step, and no possibility of partial state. The caller must personally hold both privileges at the moment of invocation.

**Why this priority**: This is the core reason the feature exists. Without a space-side check, innovation hub operators can attach any space to their hub unilaterally, which misrepresents the space's affiliation and can expose it to unwanted branding, moderation, or routing behaviour associated with that hub. Protecting the space from involuntary inclusion — and preventing that protection from being bypassed through the generic update path — is the minimum viable outcome.

**Independent Test**: Fully testable by attempting to add a space to an innovation hub as three different actors — a user who holds only innovation-hub-side rights, a user who holds only space-side admin rights, and a user who holds both. Only the third should succeed; the first two should be blocked with an authorization error citing the missing side. Additionally, attempting to set or change the hub's space list through the generic update action must fail regardless of who the caller is.

**Acceptance Scenarios**:

1. **Given** an innovation hub operator who has the rights to add spaces to their hub but holds no role on the target top-level space or its hosting account, **When** they attempt to add that space to the hub via the dedicated add action, **Then** the operation is denied with an authorization error and the space is not associated with the hub.
2. **Given** a top-level space administrator who has the new acceptance privilege on the space but no rights on the innovation hub, **When** they attempt to add their space to the hub via the dedicated add action, **Then** the operation is denied with an authorization error and the space is not associated with the hub.
3. **Given** a user who is both an admin of the top-level space and authorised to modify the innovation hub, **When** they add the space to the hub via the dedicated add action, **Then** the operation succeeds and the space appears on the hub.
4. **Given** a platform support admin, **When** they add any top-level space to any innovation hub they are authorised to modify via the dedicated add action, **Then** the operation succeeds.
5. **Given** an account admin for the account hosting a top-level space who also holds hub-side rights, **When** they add that space to a hub via the dedicated add action, **Then** the operation succeeds.
6. **Given** a user with full rights to update an innovation hub, **When** they attempt to set or modify the hub's list of member spaces through the generic hub update action, **Then** the update is rejected (the space-list field is not an accepted input on the update action) and the hub's membership is unchanged.
7. **Given** a user with rights on both the hub and the space, **When** they invoke the dedicated remove action to remove a space from the hub, **Then** the space is removed from the hub's member list (removal authorization follows existing hub-side rules; see Assumptions).
8. **Given** an innovation hub whose type is `VISIBILITY` (membership derived from a visibility filter) and a caller who holds `UPDATE` on the hub and the new space-side privilege on the space, **When** they invoke the dedicated add or remove action targeting that hub, **Then** the action is rejected with a validation error that the hub's type does not support explicit membership modification, and no authorization-denied error is raised.

---

### User Story 2 — Authorization policy reflects the new privilege on every top-level space (Priority: P2)

Whenever a top-level space's authorization policy is built or refreshed, the new acceptance privilege must be granted to exactly the intended roles, so that downstream authorization checks are consistent and discoverable (for example, when clients introspect what a user may do on a space).

**Why this priority**: Correct assignment at policy-build time is what makes Story 1 work in practice for every space, including new ones, spaces whose policies are reset, and spaces whose hosting account changes. Without this, Story 1's checks would be inconsistent.

**Independent Test**: For a freshly created top-level space and for an existing top-level space whose authorization policy is rebuilt, inspect the effective privileges for each of the three roles (space admin, account admin of the hosting account, platform support admin) and for a regular space member. Only the first three see the new privilege; the member does not.

**Acceptance Scenarios**:

1. **Given** a newly created top-level space, **When** its authorization policy is built, **Then** the new acceptance privilege is present for the space admin role, for admins of the hosting account, and for platform support admins.
2. **Given** an existing top-level space whose authorization policy is reset, **When** the reset completes, **Then** the same three role-holders hold the new privilege and no other roles do.
3. **Given** a subspace (not a top-level space), **When** its authorization policy is built, **Then** the new privilege is NOT assigned on the subspace, because subspaces cannot be added to an innovation hub.
4. **Given** a regular member, contributor, or guest of a top-level space, **When** their effective privileges are computed, **Then** the new privilege is absent.

---

### User Story 3 — Clients can discover whether the current user may accept a hub invitation (Priority: P3)

Operators building or using admin interfaces need to know up front whether a given user can add a specific space to an innovation hub, so the UI can show or hide the control and avoid surprising denials.

**Why this priority**: Story 1 secures the action; Story 3 makes it discoverable. This is a usability improvement that builds on the correctness guaranteed by Stories 1 and 2 and can ship after them without blocking the security-critical work.

**Independent Test**: Query the effective privileges on a top-level space for users in each of the three relevant roles and for a non-privileged user, and confirm the presence/absence of the new privilege aligns with Story 1 outcomes.

**Acceptance Scenarios**:

1. **Given** a user who is an admin of a top-level space, **When** a client queries the user's effective privileges on that space, **Then** the response includes the new acceptance privilege.
2. **Given** a user with no relevant role, **When** a client queries the user's effective privileges on the same top-level space, **Then** the response does not include the new acceptance privilege.

---

### Edge Cases

- **Hosting account changes**: When a top-level space is moved to a different hosting account, the set of "account admins that can accept" must follow the new account. The policy must be re-derived so that admins of the prior account lose the privilege and admins of the new account gain it.
- **Role revocation mid-flow**: A user who had the privilege at the moment a client rendered the "add to hub" control, but has since lost the qualifying role, must be denied at the time the action is executed. The server-side check is authoritative.
- **Attempting to pass a space list to the update action**: A client that still sends a space list in the generic update payload (because it pre-dates this change) must be rejected in a way that clearly signals the field is no longer accepted and that the caller should use the dedicated add/remove actions instead. The remainder of an otherwise valid update payload must not be silently partially applied — the request fails as a whole.
- **Idempotent add/remove**: Adding a space that is already a member of the hub, or removing a space that is not a member, is a successful no-op once authorization has passed. The authorization checks always run first (so an unauthorised caller still receives an authorization error even in the "already in desired state" case); on pass, the action returns the current hub state without modification and without error.
- **Hub type mismatch**: The dedicated add and remove actions are only meaningful for hubs whose type is `LIST`. When invoked against a `VISIBILITY` hub (whose membership is derived from a filter), the actions MUST return a validation error that clearly identifies the hub's type as the reason, so the caller understands the action is structurally inapplicable rather than a matter of missing permissions.
- **Bulk/filter-based inclusion**: Innovation hubs of type `VISIBILITY` include spaces via a visibility filter (not via the explicit member list). The new privilege governs the *explicit* add action on `LIST`-type hubs only; spaces that appear on a `VISIBILITY` hub because they match its filter are not governed by this check (see Assumptions).
- **Subspaces as targets**: Adding a subspace directly to an innovation hub is not supported today and remains unsupported; the privilege is only meaningful on top-level spaces. The dedicated add action must reject a subspace target.
- **Space archived or deleted**: If the target top-level space is archived, deleted, or otherwise not in a state where it can be associated with a hub, the request is rejected before or alongside the privilege check, per existing rules for that state.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST define a new authorization privilege that represents the permission to accept an invitation for a space to join an innovation hub.
- **FR-002**: The new privilege MUST be assignable only on top-level spaces. Subspaces MUST NOT carry this privilege in their authorization policies.
- **FR-003**: When a top-level space's authorization policy is constructed or reset, the new privilege MUST be granted to: (a) administrators of that top-level space, (b) administrators of the account that hosts the space, and (c) platform support administrators.
- **FR-004**: No other role (including space members, contributors, leads, guests, or unauthenticated users) MAY receive the new privilege via the space authorization policy.
- **FR-005**: The system MUST provide a dedicated action to add a top-level space to an innovation hub, and a separate dedicated action to remove a top-level space from an innovation hub. These are the only supported paths for changing the hub's explicit list of member spaces.
- **FR-006**: The generic action that updates an innovation hub MUST NOT accept, set, or modify the hub's explicit list of member spaces. Any request that attempts to change the space list through the generic update action MUST be rejected, and the hub's membership MUST remain unchanged. (Other configurable hub fields continue to be updatable through the generic action as before.)
- **FR-007**: When a user invokes the dedicated add action, the system MUST authorize the action within a single atomic operation by checking BOTH (i) the `UPDATE` privilege on the target innovation hub (the "invitation" aspect), AND (ii) the new privilege on the top-level space being added (the "acceptance" aspect). The caller MUST personally hold both privileges at the moment of invocation. The action MUST be denied — with no partial state written — if either check fails. The system MUST NOT introduce a two-step invite/accept protocol, a pending-invitation entity, or any delayed acceptance mechanism.
- **FR-008**: When a user invokes the dedicated remove action, the system MUST authorize the action by checking the `UPDATE` privilege on the target innovation hub. The new space-side privilege is NOT required for removal (see Assumptions).
- **FR-009**: Denials from the dedicated add action MUST use the existing authorization-denied exception type and MUST attach structured details sufficient to distinguish a space-side failure from a hub-side failure. The structured details MUST include at minimum: (i) which side failed (space vs. hub), (ii) the name of the missing privilege, and (iii) the identifier of the subject entity (the space or the hub) whose policy failed the check. The human-readable error message MUST be derived from these details so that message and metadata are consistent.
- **FR-010**: The new privilege MUST be exposed through the same mechanisms clients already use to discover a user's effective privileges on a space, so that interfaces can pre-filter actions users are not permitted to perform.
- **FR-011**: The new privilege MUST be enforced server-side on every invocation of the dedicated add action; client-side presence or absence of the privilege is advisory only.
- **FR-012**: The new privilege MUST continue to be granted correctly after events that rebuild a space's authorization policy, including (but not limited to) changes to the space's hosting account, changes to the space's own admin roster, and global authorization resets.
- **FR-013**: Existing innovation-hub-to-space associations created before this feature ships MUST remain valid; the new check applies only to add actions performed after the feature is active. Migration of the existing update action (removal of the space-list field) MUST NOT disturb the stored hub↔space associations themselves.
- **FR-014**: The dedicated add action MUST behave idempotently when the target space is already a hub member: after running authorization checks, the action MUST succeed without modifying the hub and return the hub's current state. The dedicated remove action MUST behave the same way when the target space is not a hub member. An unauthorised caller MUST still receive an authorization error in the idempotent case (authorization precedes the state check).
- **FR-015**: The dedicated add and remove actions MUST only be executable against innovation hubs whose configured type is `LIST` (explicit spaces list). When invoked against a hub of any other type (notably `VISIBILITY`), the action MUST be rejected with a validation error that identifies the hub's type as the reason for rejection. This type precondition MUST be evaluated ahead of authorization checks so that a hub-type mismatch surfaces as a type error rather than as an authorization error.

### Key Entities _(include if feature involves data)_

- **Top-level space**: A space at the root of the space hierarchy (not a subspace). It is the only kind of space that can be associated with an innovation hub, and therefore the only kind of space on which the new privilege is meaningful.
- **Innovation hub**: A platform-level construct that aggregates a curated set of top-level spaces. Hubs are configured with one of two types: `LIST` (membership is an explicit list of spaces, mutated via the dedicated add and remove actions) or `VISIBILITY` (membership is derived from a visibility filter and is not mutated through add/remove). The dedicated add and remove actions introduced by this feature apply to `LIST`-type hubs only. The hub's existing `UPDATE` privilege continues to govern who may invoke those actions on the hub side.
- **Authorization privilege (new)**: A named permission representing "may accept an invitation for this space to join an innovation hub." Carried by the top-level space's authorization policy and granted to the three roles listed in FR-003.
- **Hosting account**: The account that owns a top-level space. Its administrators are one of the three role categories that receive the new privilege on the spaces the account hosts.
- **Space admin role**: The administrative role on a top-level space itself, distinct from the hosting account's admin role.
- **Platform support admin**: A platform-wide support role that already carries broad administrative rights; receives the new privilege on all top-level spaces.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of attempts to add a top-level space to an innovation hub by a user lacking the new space-side privilege are rejected, verified across the full matrix of {has/lacks hub-side rights} × {has/lacks space-side rights} in integration testing.
- **SC-002**: 100% of attempts to change the hub's explicit space list through the generic hub update action are rejected — the add/remove functionality is reachable only via the dedicated actions.
- **SC-003**: 100% of top-level spaces created or whose authorization policies are reset after the feature ships expose the new privilege to exactly the three role categories defined in FR-003, and to no other role, as verified by authorization policy inspection.
- **SC-004**: When the hosting account of a top-level space changes, the set of account-admin users that hold the new privilege on that space reflects the new account within the same policy-refresh cycle that currently propagates other account-admin rights.
- **SC-005**: Zero regressions in the success rate of the add-space-to-hub flow for users who already hold both sides of authorisation, measured by comparing pre-release and post-release success rates for that action.
- **SC-006**: Authorization errors returned by the dedicated add action carry structured details (failing side, missing privilege name, subject entity id) that allow a support agent — or automated log tooling — to classify the denial without needing to reproduce the request, with a target classification time of under one minute.
- **SC-007**: 100% of invocations of the dedicated add or remove action against a `VISIBILITY`-type hub return a validation error naming the hub type as the reason, and no such invocation mutates hub state or returns an authorization-denied error.

## Assumptions

- **Scope is explicit "add" actions only**: The new privilege is checked when a user invokes the dedicated add action. Filter-based or visibility-based inclusion mechanisms (where spaces appear on a hub because they match a visibility rule rather than being individually added) are out of scope and do not trigger the new check. If existing filter behaviour should also be gated by this privilege, that will be handled as follow-up work.
- **Removal uses the hub's `UPDATE` privilege only**: The user's stated requirement introduces a *space-side* check for the *add* action. Removing a space from a hub is treated as a hub operator's prerogative and continues to be governed solely by the hub's existing `UPDATE` privilege. The space does not need to "consent" to being removed. If symmetric space-side consent on removal is desired, that will be addressed as a follow-up.
- **Privilege applies only to top-level spaces**: Subspaces cannot be added to an innovation hub, so the privilege is meaningless on them and is deliberately not assigned there. This keeps the authorization policy minimal and avoids implying a capability that the platform does not offer.
- **"Admin of account hosting the space" means the current host**: If the hosting account changes, the previous account's admins lose the privilege on that space as part of the standard authorization-refresh mechanism. No grandfathering of prior account admins is provided.
- **"Support admin" is the platform-wide support admin role**, which already holds broad administrative privileges across the platform. The new privilege is consistent with the scope of that role.
- **Users with qualifying roles whose credentials have expired or been revoked** do not receive the privilege. Credential validity is governed by the existing credential lifecycle.
- **Clients that currently update the hub's space list via the generic update action will need to migrate** to the dedicated add and remove actions. A brief client-side breaking change is preferred over keeping a bypassable path. The update action will reject the space-list field outright rather than silently ignoring it.
- **No new UI surface is introduced by this feature at the specification level**. Clients already consuming effective-privileges lists on spaces will automatically see the new privilege and can choose to render it as an affordance, but building such an interface is not required for this feature to be considered complete.
- **No migration of historical hub↔space associations is required**. Previously formed associations remain as-is; the update action simply stops accepting the space-list field, and future changes flow through the dedicated actions.
