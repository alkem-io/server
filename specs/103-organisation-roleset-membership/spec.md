# Feature Specification: Organisation RoleSet Membership

**Feature Branch**: `103-organisation-roleset-membership`

**Created**: 2026-06-10

**Status**: Draft

**Input**: User description: "I want to allow invitations, applications and joins for organisations. I also want that organisations can be invited to join spaces. The logic should be one set of mutations for managing actor roles on a roleset, so not having different mutations for users, orgs or vcs. There should be a clearly defined, and separate, set of logic to state what types of actors can apply, be invited to or join a particular type of roleset. For the organisation roleset, users are the only allowed actor type. For space roleset, a) a user can join, apply, be invited b) vc can be invited c) org can be invited. For platform roleset, there is only invitations for users. When an organisation becomes a member of a space, then there should be a notification email sent to the organisation admin/owners. When an organisation is invited to join a space, there should be a notification sent to admins + owners. When an organisation admin or owner retrieves the list of open membership related items needing their attention, it should be like with the VC in that they should see organisation invitations for organisations they are a member of. If an actor invites an organisation to a space, and that actor also has the permissions to accept the invitation then just accept - but send a notification. The open organisation invitations should also be shown in the list of pending memberships on the community settings page for a space. If a membership event (apply, join, invite) is triggered for an actor that is not supported on a roleset then an error should be thrown (and logged). For an organisation that is being invited to a space, the org can only be invited to be a member - we do not at this moment support inviting to be lead. It is also important that for some roles, such as space admin that only users can have that role (orgs and VCs cannot be admins, for now)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Invite an organisation to join a space (Priority: P1)

A space administrator wants a partner organisation to participate in their space as a member. They invite the organisation (by selecting it as a contributor, the same way they would invite a person or a virtual contributor). The organisation is added as a pending invitation. The organisation's admins and owners are notified by email and can see the invitation in their list of items needing attention. When one of them accepts, the organisation becomes a member of the space, and the organisation's admins and owners are notified that the organisation has joined.

**Why this priority**: This is the headline new capability — organisations cannot currently be invited to spaces. It delivers the core business value (organisation-level participation in spaces) and is independently demonstrable end-to-end.

**Independent Test**: Invite a known organisation to a space, confirm a pending invitation is created, confirm the organisation's admins/owners receive the invitation notification and see it in their pending-membership list, accept it, and confirm the organisation appears as a member of the space and the "became a member" notification is sent.

**Acceptance Scenarios**:

1. **Given** a space and an organisation, and an actor with permission to invite contributors to that space, **When** the actor invites the organisation as a member, **Then** a pending invitation for the organisation is created and visible in the space's community settings pending-membership list.
2. **Given** a pending invitation for an organisation, **When** it is created, **Then** an invitation notification email is sent to the organisation's admins and owners.
3. **Given** a pending organisation invitation, **When** an admin or owner of that organisation views their list of open membership items needing attention, **Then** the organisation invitation appears there.
4. **Given** a pending organisation invitation, **When** an admin or owner of that organisation accepts it, **Then** the organisation becomes a member of the space and a "became a member" notification email is sent to the organisation's admins and owners.
5. **Given** a pending organisation invitation, **When** an admin or owner of that organisation declines it, **Then** the organisation does not become a member and the invitation is closed.

---

### User Story 2 - Enforce per-roleset allowed actor types (Priority: P1)

The platform defines, in one clearly separated place, which kinds of actor (user, organisation, virtual contributor) may take each membership action (join, apply, be invited) on each kind of roleset (space, organisation, platform). Every membership action is validated against this policy before it is carried out. An action involving an unsupported actor type is rejected with a clear error, and the rejection is logged.

**Why this priority**: This policy is the guardrail that makes organisation membership safe to add without accidentally enabling unsupported combinations (e.g. an organisation applying to the platform). It is the single source of truth the rest of the feature depends on and prevents regressions across all actor types.

**Independent Test**: Attempt each (actor type × action × roleset type) combination; confirm supported combinations succeed and every unsupported combination is rejected with an error and produces a log entry, without any membership change.

**Acceptance Scenarios**:

1. **Given** a space roleset, **When** a user joins, applies, or is invited, **Then** the action is permitted (subject to existing authorization).
2. **Given** a space roleset, **When** a virtual contributor or an organisation is invited, **Then** the action is permitted (subject to existing authorization).
3. **Given** a space roleset, **When** an organisation or virtual contributor attempts to join or apply, **Then** the action is rejected with an error and the rejection is logged.
4. **Given** an organisation roleset, **When** any actor other than a user takes any membership action, **Then** the action is rejected with an error and the rejection is logged.
5. **Given** a platform roleset, **When** a user is invited, **Then** the action is permitted; **When** any actor attempts to join or apply, or any non-user is invited, **Then** it is rejected with an error and the rejection is logged.

---

### User Story 3 - Restrict roles and lead invitations by actor type (Priority: P2)

Separately from who may *enter* a roleset, the platform constrains which actor types may *hold* particular roles. Certain roles (for example, space admin) may be held only by users; organisations and virtual contributors cannot hold them. When an organisation is invited to a space, it may be invited only as a member — not as a lead.

**Why this priority**: Without this constraint, organisation membership could grant administrative roles to non-user actors, which the business explicitly does not want yet. It protects the integrity of administrative control while the broader capability rolls out.

**Independent Test**: Attempt to invite an organisation as a lead and confirm it is rejected; attempt to assign an admin role to an organisation or virtual contributor and confirm it is rejected; confirm a user can still hold the admin role.

**Acceptance Scenarios**:

1. **Given** an organisation being invited to a space, **When** the invitation specifies the lead role (or any role other than member), **Then** the invitation is rejected with an error.
2. **Given** an organisation or a virtual contributor, **When** an attempt is made to give it an admin-type role on a space, **Then** the attempt is rejected with an error.
3. **Given** a user, **When** they are assigned an admin-type role on a space, **Then** the assignment succeeds (subject to existing authorization).

---

### User Story 4 - Auto-accept an organisation invitation when the inviter can also accept (Priority: P2)

When an actor invites an organisation to a space and that same actor also holds the permission required to accept the invitation on the organisation's behalf, the platform skips the pending step: the organisation becomes a member immediately. A notification is still sent to the organisation's admins and owners so they are informed.

**Why this priority**: This streamlines the common case where an authorised operator manages both sides, avoiding a needless pending state, while still keeping the organisation's leadership informed. It depends on US1 being in place.

**Independent Test**: As an actor holding both invite and accept permissions, invite an organisation, and confirm the organisation becomes a member immediately (no lingering pending invitation) and that the organisation's admins/owners receive a notification.

**Acceptance Scenarios**:

1. **Given** an actor with both invite permission on the space and accept permission for the organisation, **When** they invite the organisation, **Then** the organisation becomes a member immediately without a pending invitation remaining, and only the "became a member" notification is sent to the organisation's admins and owners.
2. **Given** an actor with invite permission but without accept permission for the organisation, **When** they invite the organisation, **Then** a pending invitation is created and the standard invitation notification is sent.

---

### User Story 5 - Single unified actor-agnostic membership mutation surface (Priority: P3)

The platform manages membership through one set of actions that operate on actors generically, rather than separate actions per actor type (users vs organisations vs virtual contributors). Eligibility is decided by the per-roleset actor-type policy (US2), keeping the action surface uniform while behaviour varies by policy.

**Why this priority**: This is an explicit design constraint requested to keep the membership surface consistent and maintainable as new actor types are added. It is a structural quality of the solution rather than a user-visible flow, so it is lower priority to demonstrate but should govern how US1–US4 are realised.

**Independent Test**: Confirm that joining, applying, and inviting are each driven by a single action that accepts any actor type and defers eligibility to the policy layer, with no actor-type-specific duplicate actions.

**Acceptance Scenarios**:

1. **Given** the membership actions for join, apply, and invite, **When** a membership action is performed, **Then** the same action is used regardless of whether the actor is a user, organisation, or virtual contributor.
2. **Given** a new or existing actor type, **When** its eligibility for an action changes, **Then** the change is expressed in the per-roleset actor-type policy without adding a new actor-type-specific action.

---

### Edge Cases

- **Unsupported actor/action/roleset combination**: rejected with a clear error and logged (e.g. organisation applying to a space, organisation joining the platform, virtual contributor joining a space).
- **Organisation invited with a disallowed role**: an invitation specifying lead (or any non-member role) for an organisation is rejected.
- **Assigning an admin role to a non-user**: rejected.
- **Duplicate invitation**: an organisation that already has a pending invitation, or is already a member, is not invited again (the request is rejected or treated as a no-op consistent with existing behaviour for other actor types).
- **Viewer scope for pending items**: only admins and owners of an organisation see and act on that organisation's pending invitations; ordinary organisation members do not.
- **Organisation with no admins or owners**: if an organisation has no admins/owners to notify or to accept, the invitation can still be created but cannot be accepted by the organisation's leadership; this state should be observable (notification recipients = none) rather than failing silently.
- **Accept/decline authority**: an organisation invitation can be accepted or declined only by an admin or owner of that organisation (or an actor otherwise permitted to act on its behalf).
- **Inviting a non-registered user to an organisation**: rejected — only users with an existing Alkemio account may be invited to an organisation roleset (email invitations of not-yet-registered users are not supported for organisations, even though they remain supported for spaces).
- **Joining an organisation with a non-matching email domain**: rejected — direct join requires the organisation's domain-gated join to be enabled and the user's verified email domain to match the organisation's configured join domain; the user may apply or be invited instead.
- **Joining an organisation when domain-gated join is disabled or no join domain is configured**: the join action is not available and is rejected.
- **Application to an organisation**: approved or rejected only by an admin or owner of that organisation; on rejection the application is closed and the user does not become a member.
- **Inviting a user to an organisation as owner**: rejected — owner is not an invitable/assignable role for org admins (owner assignment is reserved for platform/global admins).
- **Removal of an organisation member**: an organisation can be removed from a space by its own admins/owners (mirroring how virtual contributors are governed by their managing account) and also by a space admin.

## Requirements *(mandatory)*

### Functional Requirements

#### Actor-type eligibility policy

- **FR-001**: The system MUST define, in a single clearly separated place, the set of actor types permitted for each membership action (join, apply, invite) on each roleset type (space, organisation, platform).
- **FR-002**: For a **space** roleset, the policy MUST permit: users to join, apply, or be invited; virtual contributors to be invited; and organisations to be invited.
- **FR-003**: For an **organisation** roleset, the policy MUST permit only users (no organisations or virtual contributors), and for users it MUST permit all three actions — invitation, application, and join — subject to FR-003a and FR-003b.
- **FR-003a**: Invitations to an **organisation** roleset MUST be restricted to users who already have an account on Alkemio; the system MUST reject invitations addressed to email addresses with no existing Alkemio account (no email-based invitation of not-yet-registered users for organisation rolesets).
- **FR-003b**: A user MAY join an **organisation** directly (without approval) only when the organisation has domain-gated join enabled AND the user's verified email domain matches the organisation's configured join domain. When the setting is disabled, no join domain is configured, or the user's email domain does not match, the system MUST reject the join attempt (the user may instead apply or be invited). Application and invitation to an organisation do NOT require a domain match.
- **FR-004**: For a **platform** roleset, the policy MUST permit only the invite action and only for users (no join, no apply, no non-user actors).
- **FR-005**: The system MUST validate every membership action (join, apply, invite) against the actor-type eligibility policy before performing it.
- **FR-006**: When a membership action is attempted for an actor type not permitted by the policy, the system MUST reject it with a clear error and MUST record a log entry for the rejection. No membership change may occur.

#### Unified membership actions

- **FR-007**: The system MUST manage membership through a single set of actor-agnostic actions (join, apply, invite) that operate on actors regardless of type, rather than separate actions per actor type.
- **FR-008**: Eligibility differences between actor types MUST be expressed through the actor-type eligibility policy (FR-001) rather than through actor-type-specific actions.
- **FR-008a**: All actor-type-specific roleset mutations MUST be removed. After this feature, the roleset API MUST expose only actor-generic mutations (operating on an actor, regardless of type); no mutation may exist that is bound to a particular actor type (e.g. separate user-, organisation-, or virtual-contributor-specific assign/remove/membership mutations). Existing per-actor-type mutations are removed, not merely deprecated.

#### Organisation invitations to spaces

- **FR-009**: Users MUST be able to invite an organisation to a space as a member, using the same invite action used for other contributor types.
- **FR-010**: When an organisation is invited to a space, the system MUST create a pending invitation associated with that organisation.
- **FR-011**: An organisation MUST be invitable to a space only for the member role; the system MUST reject an attempt to invite an organisation as a lead (or any non-member role).
- **FR-012**: A pending organisation invitation MUST be acceptable or declinable only by an admin or owner of that organisation (or an actor otherwise permitted to act on the organisation's behalf).
- **FR-012a**: A user's application to join an **organisation** MUST be approvable or rejectable only by an admin or owner of that organisation (or an actor otherwise permitted to act on the organisation's behalf). On approval the user becomes a member of the organisation; on rejection the application is closed and the user does not become a member.
- **FR-013**: On acceptance of an organisation invitation, the organisation MUST become a member of the space; on decline, the organisation MUST NOT become a member and the invitation MUST be closed.
- **FR-013a**: Organisation membership in a space MUST be held by the organisation as a single actor only; it MUST NOT automatically grant space membership or access to the organisation's individual users (mirroring how a virtual contributor is a member).
- **FR-013b**: The system MUST NOT permit an organisation to apply to or join any roleset in this release; organisations participate only via invitation. Any apply or join action with an organisation actor MUST be rejected (per FR-006).
- **FR-013c**: An organisation MUST be removable from a space by an admin or owner of that organisation, and also by an admin of the space (mirroring the space's ability to remove any member).
- **FR-013d**: The authorization required to directly add an organisation as a space member MUST be the same set of roles permitted to directly add a user as a space member; the system MUST NOT grant any broader or separate permission for adding organisations directly.

#### Role-holder constraints

- **FR-014**: The system MUST restrict designated roles (at minimum, space admin) so that only users may hold them; organisations and virtual contributors MUST be prevented from holding those roles.
- **FR-015**: An attempt to give a restricted role to a disallowed actor type MUST be rejected with a clear error.
- **FR-015a**: When inviting a user to an **organisation**, the invitation MAY grant the associate (entry) role and MAY additionally grant the admin role; it MUST NOT grant the owner role. An invitation requesting the owner role MUST be rejected.
- **FR-015b**: Granting the organisation **owner** role (whether via invitation, application approval, or direct assignment) MUST be restricted to Alkemio platform (global) admins. Organisation admins and owners MUST NOT be able to grant the owner role to a user.

#### Auto-accept

- **FR-016**: When an actor invites an organisation to a space and that actor also holds the permission required to accept the invitation, the system MUST add the organisation as a member immediately without leaving a pending invitation.
- **FR-017**: When an invitation is auto-accepted (FR-016), the system MUST send only the "became a member" notification to the organisation's admins and owners; it MUST NOT send the invitation notification (no pending invitation existed).

#### Notifications

The feature introduces four org-admin/owner notifications, grouped into two **separately-controllable** concerns: (Group A) the organisation's **own membership** — actors becoming associated with the organisation; and (Group B) the organisation **becoming a member of a space** roleset. Each notification has its own toggle; the two groups MUST NOT share a single combined setting.

*Group B — organisation as a member of a space:*

- **FR-018**: When an organisation is invited to a space, the system MUST send an invitation notification email to the organisation's admins and owners.
- **FR-019**: When an organisation becomes a member of a space (whether via accepted invitation or auto-accept), the system MUST send a "became a member" notification email to the organisation's admins and owners.

*Group A — membership of the organisation itself:*

- **FR-019d**: When a user applies to join an organisation, the system MUST send an "application received" notification to the organisation's admins and owners.
- **FR-019e**: When a user becomes a member of an organisation (via accepted application or domain-match join), the system MUST send a "new member joined" notification to the organisation's admins and owners.

*Common preference rules (apply to all four notifications):*

- **FR-019a**: Each of the four organisation-admin/owner notifications MUST be independently controllable by the recipient via their per-user notification settings (separate toggles, per channel: email, in-app, push), in the same way the virtual-contributor account-host invitation notification is controllable today. The Group A (organisation-membership) settings and the Group B (organisation-in-a-space) settings MUST be distinct settings, not a single shared toggle, and MUST NOT be conflated with or gated by the existing organisation "admin message received" / "admin mentioned" toggles.
- **FR-019b**: The new notification preferences MUST default to enabled (consistent with the equivalent virtual-contributor invitation preference). Existing users' settings MUST be backfilled with the new preferences (defaulted on) so the toggles are present and on for everyone, not only newly created users.
- **FR-019c**: At send time, the system MUST consult the recipient's preference for each of these notifications and suppress the channel(s) the recipient has turned off.

#### Visibility of pending items

- **FR-020**: When an admin or owner of an organisation retrieves their list of open membership items needing attention, the system MUST include pending invitations addressed to organisations they administer or own (mirroring how virtual contributor invitations are surfaced to their managing account's admins).
- **FR-021**: Pending organisation invitations MUST appear in the space's community-settings list of pending memberships, alongside pending user and virtual-contributor items.
- **FR-022**: The organisation admin area MUST display the list of open (pending) invitations and applications for that organisation's roleset, so an organisation admin or owner can review the organisation's own pending membership items in one place (in addition to the per-user "needs attention" list in FR-020).
- **FR-023**: Because invitations (and applications) now span more than space communities — they also apply to organisation rolesets — the terminology used to retrieve and expose a user's pending items MUST drop the "community" qualifier and refer to invitations/applications generally (e.g. "invitations" rather than "community invitations"). This includes the internal retrieval logic (currently `getCommunityInvitationsForUser` / `getCommunityApplicationsForUser`) and the corresponding externally-exposed fields under the `me` query, which MUST be renamed to reflect that they cover all roleset types, not only communities.

### Key Entities *(include if data involved)*

- **RoleSet**: A membership boundary with a type (space, organisation, or platform) and an entry role. Owns its invitations, applications, and the roles its members hold. The actor-type eligibility policy is keyed by RoleSet type.
- **Actor**: A participant that can hold roles — a user, organisation, or virtual contributor. Membership actions operate on actors generically.
- **Organisation**: An actor that can now be invited to a space as a member. Has admins and owners who are notified about and who act on the organisation's invitations. Carries a domain-gated join setting (enabled flag + configured join domain) that controls whether users with a matching verified email domain may join the organisation directly.
- **Invitation**: A pending request for an actor to take up a role on a roleset. Can be accepted or declined by a party permitted to act for the invited actor, and can be auto-accepted by an inviter who also holds accept permission.
- **Application**: A request initiated by a user to join a roleset (applicant is always a user under the policy). Applies to a space roleset or an organisation roleset; an application to an organisation is approved or rejected by that organisation's admins or owners.
- **Actor-type eligibility policy**: The separated definition of which actor types may take which membership action on which roleset type; the single source of truth consulted before every membership action.
- **Membership notification**: An email informing an organisation's admins and owners of an invitation received or of the organisation becoming a member.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorised operator can invite an organisation to a space and the organisation can be made a member, completing the full invite→notify→accept→member flow without any manual workaround.
- **SC-002**: 100% of unsupported actor/action/roleset combinations are rejected with an error and produce a log entry, and none result in a membership change.
- **SC-003**: Every organisation invitation and every organisation-became-member event results in a notification delivered to all of that organisation's admins and owners (and to no one outside that set).
- **SC-004**: 100% of an organisation's pending invitations are visible both to that organisation's admins/owners (in their "needs attention" list) and in the relevant space's community-settings pending-membership list.
- **SC-005**: No membership or role mutation exists that is specific to a single actor type; join, apply, invite, assign, and remove are each driven by one actor-agnostic action whose eligibility is decided solely by the actor-type policy, and the previously existing per-actor-type roleset mutations no longer exist in the API.
- **SC-006**: Attempting to invite an organisation as a lead, or to give an admin role to an organisation or virtual contributor, is rejected in 100% of attempts.
- **SC-007**: When an inviter also holds accept permission, inviting an organisation results in immediate membership (no pending invitation remains) in 100% of such cases, while still notifying the organisation's admins and owners.
- **SC-008**: An organisation admin or owner can view, in the organisation admin area, 100% of the open invitations and applications for that organisation's roleset.
- **SC-009**: 100% of attempts to invite a not-yet-registered email address to an organisation are rejected, while equivalent email invitations to spaces continue to succeed.
- **SC-010**: A user whose verified email domain matches an organisation with domain-gated join enabled can join it directly in 100% of cases; a user whose domain does not match (or where the setting is disabled) is rejected in 100% of cases and can instead apply or be invited.
- **SC-011**: An org admin/owner who disables any one of the four org-admin/owner notifications (for a given channel) receives 0 of that notification on that channel, while leaving it enabled delivers 100% of them; the organisation-membership group (Group A) and the organisation-in-a-space group (Group B) can be toggled independently of each other; all four default to on for every existing and new user.
- **SC-012**: An organisation admin can invite a user to the organisation as associate and/or admin in 100% of permitted cases; 100% of attempts by an organisation admin/owner to invite or assign the owner role are rejected, while a platform global admin can assign the owner role.

## Assumptions

- **Organisation membership in spaces is limited to the member role** for now; lead and admin roles for organisations are explicitly out of scope.
- **Organisations cannot apply to or join any roleset** in this release; they participate in spaces only via invitation. The headline "applications and joins for organisations" is realised as making the membership system actor-generic, with the per-roleset policy currently permitting only invitations for organisations.
- **An organisation is a member only as a single actor**: its individual users do not gain automatic access to the space through the organisation's membership.
- **The audience for an organisation's pending invitations (both notification recipients and the "needs attention" viewers) is the organisation's admins and owners**, consistent with how virtual contributor invitations are surfaced to a managing account's admins. Ordinary organisation members are not included.
- **An organisation can be removed from a space by its own admins/owners or by a space admin**.
- **Directly adding an organisation as a space member requires the same authorization as directly adding a user**. Where the platform today applies a different (broader) permission set to add organisations than to add users, this feature aligns them to the user direct-add permission set.
- **Organisation invitations target existing Alkemio users only**; email-based invitation of not-yet-registered users remains available for spaces but is not offered for organisations.
- **Users may be invited to, apply to, or join an organisation**; direct join is gated by a per-organisation setting requiring the user's verified email domain to match the organisation's configured join domain. Application and invitation to an organisation are not domain-gated.
- **The organisation admin area is an existing surface** that this feature extends to list the organisation roleset's open invitations and applications.
- **Invitation/application retrieval is being generalised from "community"-scoped to roleset-wide** (FR-023). Renaming the externally-exposed `me` fields (e.g. `communityInvitations` → `invitations`) is a breaking GraphQL schema change and MUST be handled via the schema contract / deprecation process; the plan should decide on a deprecation window versus a direct rename.
- **Removing the per-actor-type roleset mutations** (FR-008a) is a breaking GraphQL schema change and MUST be handled via the schema contract process. The actor-generic equivalents already exist (the per-type mutations are already deprecated today), so removal is the final step of the consolidation rather than new replacement surface.
- **Authorization for inviting and accepting is unchanged in nature**: existing privilege checks for inviting contributors and for accepting invitations continue to apply; this feature adds the actor-type policy on top of, not in place of, those checks.
- **Existing behaviour for users and virtual contributors is preserved**: the policy encodes today's permitted combinations for those actor types so that no current capability regresses.
- **Duplicate/idempotency and removal behaviour for organisations mirrors the existing behaviour** already in place for users and virtual contributors.
- **Notifications use the platform's existing email/notification mechanism**; this feature adds organisation-targeted recipients and the relevant invitation/new-member payloads.
- **The four new org-admin/owner notifications require new per-user notification preferences** (FR-019a–c), organised into two independently-controllable groups: Group A (organisation's own membership — application received, new member joined) and Group B (organisation as a member of a space — invited, became member). Today the per-user organisation notification settings only cover "admin message received" and "admin mentioned"; this feature extends that settings block with the new separately-controllable toggles, following the virtual-contributor account-host invitation preference as the precedent. This entails new notification-event definitions, recipient-preference checks at send time, default values for new users, and a data migration to backfill existing users (defaulted on).
