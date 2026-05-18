# Feature Specification: User Design Version Setting

**Feature Branch**: `096-user-design-version`
**Created**: 2026-05-12
**Status**: Draft
**Input**: User description: "We need to extend the userSettings to support designVersion field. We have to set the default one to 2 (new crd) and every new user should also have it set to 2 (new); Conceptually the old design will be 1 and in the future we might move to 3, 4 etc. We should support switching the field with mutation. No restrictions, just accepting integer. The filed should be returned to the graphql API where needed by the client - user queries."

## Clarifications

### Session 2026-05-12

- Q: Where should `designVersion` live on the `UserSettings` GraphQL type? → A: Top-level field, peer of `privacy`, `communication`, `notification`, and `homeSpace` (not nested inside any sub-group).

### Session 2026-05-13

- Q: What should the initial default value for `designVersion` be? → A: `1` (the current default design generation). The default will be flipped to `2` (the new design) in a subsequent release as part of a phased rollout. Users can still switch to `2` (or any other integer) via the existing update mutation today.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Every user has a recorded design version, defaulting to 1 (Priority: P1)

When a new user is registered on the platform, the platform records `designVersion = 1` (the current default design generation) on their settings. Pre-existing users also surface `1` after deployment. The client uses this value to decide which UI to render. A subsequent release is expected to flip the default to `2` (the new design); in the meantime, individual users can be moved to `2` (or any other integer) via the existing update mutation.

**Why this priority**: This is the core driver of the feature — the product needs a recorded design preference on every account so the client can render the correct UI and product can roll the new design out in a controlled way. Without a recorded value, behavior is undefined and the rollout has no anchor.

**Independent Test**: Register a brand-new user. Query that user's settings via the API. The returned design version is `1`.

**Acceptance Scenarios**:

1. **Given** a new user is being created, **When** the registration completes, **Then** the user's design version is recorded as `1`.
2. **Given** a freshly registered user, **When** the client requests the user's settings, **Then** the response includes a design version of `1`.
3. **Given** an existing user who has never had this preference recorded, **When** the client requests the user's settings after this feature is deployed, **Then** the response includes a design version of `1` (the default).

---

### User Story 2 - User switches their design preference (Priority: P2)

A user (or an admin acting on their behalf, subject to the existing user-settings authorization rules) can change which design version is recorded for their account. The change persists and is reflected on subsequent queries. The platform accepts any integer value, so the same mechanism continues to work when future design versions (`3`, `4`, …) are introduced, and a user can also be moved to the new design (`2`) while it is opt-in.

**Why this priority**: Enables the rollout strategy — testers, support, or individual users can opt into or out of a design version without code changes. It also future-proofs the field, so adding a new design version does not require API changes.

**Independent Test**: Authenticated as a user with permission to change their settings, submit a mutation that sets the design version to a chosen integer. Query the user's settings — the returned value matches what was submitted.

**Acceptance Scenarios**:

1. **Given** a user with design version `1` (the default), **When** an authorized request switches the value to `2`, **Then** subsequent queries of that user's settings return `2`.
2. **Given** a user with any design version, **When** an authorized request sets the value to a future integer such as `3`, **Then** the change is accepted and persisted.
3. **Given** an unauthorized caller, **When** they attempt to change another user's design version, **Then** the request is rejected by the same rules that protect other user-settings updates.

---

### User Story 3 - Clients read the design version through existing user queries (Priority: P1)

Whenever the client retrieves a user (e.g., the currently authenticated user) it can read the design version alongside the rest of the user's settings. The client uses that value to decide which UI to render. No new top-level query is required — the field is exposed through the same paths the client already uses to read user settings.

**Why this priority**: Without this, the platform stores the preference but the client cannot act on it, which defeats the purpose. It is grouped with P1 because the new-default behavior (Story 1) only delivers user value once the client can read the value.

**Independent Test**: Issue the existing user-settings query for the authenticated user. The response shape includes the design version field with the persisted value.

**Acceptance Scenarios**:

1. **Given** the authenticated user has design version `1` recorded (the default), **When** the client fetches the user's settings, **Then** the response includes design version `1`.
2. **Given** a user whose design version has been changed to `2`, **When** the client fetches that user's settings, **Then** the response includes design version `2`.

---

### Edge Cases

- A user record exists from before this feature was introduced and has no recorded design version. The platform returns the default (`1`) for that user, and subsequent updates from that user are persisted normally.
- A caller submits a negative integer or zero. The platform accepts and stores the integer as-is, because there are no restrictions on the value. (The client decides how to interpret unknown values — typically by falling back to the current default.)
- A caller submits a non-integer value (e.g., a string or a decimal). The request is rejected with a validation error from the standard input validation layer.
- Concurrent updates: the last update wins, consistent with how other user-settings fields behave.
- A future design version (3, 4, …) is introduced. No API or schema change is required — operators simply start setting the new integer.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The platform MUST persist a design version preference for every user as part of that user's settings, exposed as a top-level field on the `UserSettings` type (peer of `privacy`, `communication`, `notification`, and `homeSpace`).
- **FR-002**: The default design version for any user without an explicitly recorded value MUST be `1`.
- **FR-003**: Every newly registered user MUST have design version `1` recorded as part of their initial settings.
- **FR-004**: The platform MUST accept any integer value when the design version is changed, with no enumeration of allowed values and no minimum/maximum bound.
- **FR-005**: Non-integer values (strings, decimals, booleans, null where the field is required) MUST be rejected by input validation.
- **FR-006**: The platform MUST expose a way to change a user's design version through the existing user-settings mutation surface, governed by the same authorization rules that already protect user-settings updates.
- **FR-007**: Updates to the design version MUST persist across sessions and be visible to subsequent reads of the user's settings.
- **FR-008**: The platform MUST return the current design version as part of the user's settings on the existing user queries the client already uses to fetch settings (e.g., the authenticated-user query path).
- **FR-009**: Existing user records that pre-date this feature MUST surface design version `1` when read, without requiring any additional client action.
- **FR-010**: Changes to a user's design version MUST be subject to the same audit/logging behavior as other user-settings changes (no new audit category is introduced).

### Key Entities _(include if feature involves data)_

- **User Settings — Design Version**: An integer preference stored on each user's settings record. Represents which design generation the client should render for the user. Conceptual values: `1` = current default design generation; `2` = new design (opt-in for now, expected to become the default in a subsequent release); `3+` = reserved for future generations. The platform stores and returns the integer verbatim; interpretation is the client's responsibility.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of newly registered users have design version `1` recorded on their settings at the moment of account creation.
- **SC-002**: 100% of existing users return design version `1` on the first read after this feature is deployed, with no manual backfill action required from operators.
- **SC-003**: A user (or authorized caller) can change the design version and observe the new value in a follow-up read in under 1 second under normal load.
- **SC-004**: Zero client changes are required to add support for a future design version (3, 4, …) beyond the client deciding how to render the new integer — the API surface does not need to change.
- **SC-005**: No regression in existing user-settings flows: privacy, communication, notification, and home-space settings continue to round-trip unchanged after this field is added.

## Assumptions

- The field is added at the top level of the existing `UserSettings` GraphQL type as a peer of `privacy`, `communication`, `notification`, and `homeSpace` (not nested inside any of them). No new top-level type or query is introduced.
- The same mutation surface used today to change other user-settings fields is extended to accept the new value; no separate dedicated mutation is required.
- Authorization for changing the design version reuses the existing user-settings update privileges — there is no new privilege.
- The interpretation of integer values (which UI to render for `1`, `2`, `3`, …) is owned by the client. The server is only responsible for accepting, storing, and returning the integer.
- Existing user records get the default value (`1`) on first read after deployment, via either a column default or a backfill — the choice is left to the implementation plan, but the outward behavior must be that every user appears to have design version `1` until they change it.
- The "new design" maps conceptually to `2` and is opt-in until a subsequent release flips the column default. The server does not enforce or assume the conceptual mapping; it is documentation only.
