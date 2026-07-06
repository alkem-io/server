# Feature Specification: Innovation Flow — Persist Phase/Tab Visibility

**Feature Branch**: `story/6138-persist-phase-tab-visibility`

**Created**: 2026-06-10

**Status**: Draft

**Input**: GitHub story alkem-io/server#6138 — "Innovation flow: persist phase/tab visibility (server support for hiding tabs)". Server-side counterpart for client-web story alkem-io/client-web#9727. Client slice (alkem-io/client-web#9844) is already implemented and degrades gracefully against a missing field.

## Clarifications

### Session 2026-06-10

All ambiguities below were resolved by decision in autonomous (YOLO) mode, choosing the option most consistent with the target repo's existing conventions and the agreed client contract.

- Q: Where is the `visible` flag persisted — a new dedicated database column on the state, or a key inside the existing structured settings object that already holds `allowNewCallouts`? → A: Inside the existing settings object (no new DB column/table). Rationale: `allowNewCallouts` already lives in that settings object; adding a sibling key needs only a data backfill of existing rows, mirroring the established pattern for adding fields to settings objects in this codebase. Reflected in FR-003, FR-004, Key Entities, and Assumptions.
- Q: How does the API/schema contract classify adding a non-nullable `visible` output field plus an optional `visible` input field? → A: Additive / non-breaking — adding a field to an output type and adding an optional field to an input type are backward-compatible; no breaking-change approval is required, but the regenerated published schema artifact MUST be committed. Reflected in FR-001, FR-002, and Success Criteria SC-005.
- Q: When an update to state settings omits `visible`, is the stored value preserved or reset? → A: Preserved (omission is a partial update, not "set false"); only an explicit value changes it. Reflected in FR-002 and User Story 4.
- Q: Does `visible` ever affect access to the phase's content (the state entity, its callouts/contributions)? → A: Never — it is a navigation-affordance hint only; per-entity authorization is unchanged. Reflected in FR-007 and User Story 1, scenario 3.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin hides a phase/tab from member navigation (Priority: P1)

A space or subspace administrator decides that one innovation-flow phase (e.g. a draft or internal phase) should not appear in the phase navigation that ordinary members see. The admin toggles that phase's visibility off. From then on, every user (not just the admin who set it) sees the navigation without that phase, while the phase's content remains reachable by anyone who has its direct URL and the underlying access rights.

**Why this priority**: This is the entire purpose of the story — without server-side persistence of the visibility flag, the already-shipped client cannot make hiding stick across users or sessions. It is the MVP.

**Independent Test**: Set `visible = false` on a state via the existing innovation-flow state update path as an admin, re-read the innovation flow as any user, and confirm the state's `settings.visible` returns `false` for everyone while the state and its callouts are still individually fetchable.

**Acceptance Scenarios**:

1. **Given** an innovation flow with a state whose `settings.visible` is `true`, **When** an admin updates that state's settings with `visible: false`, **Then** subsequent reads of `InnovationFlowStateSettings.visible` for that state return `false` for all users.
2. **Given** a state previously hidden (`visible: false`), **When** an admin updates that state's settings with `visible: true`, **Then** subsequent reads return `visible: true`.
3. **Given** a hidden state (`visible: false`), **When** any user fetches that state's content (the state entity and its associated callouts) by direct identifier, **Then** the content is returned exactly as before — visibility does not change what content is accessible.

---

### User Story 2 - Existing flows keep current behaviour (Priority: P1)

Before this change, no innovation-flow state carries a visibility flag. After the change ships, every pre-existing state must behave as fully visible, so that no phase silently disappears from any space's navigation on deploy.

**Why this priority**: A regression here would hide phases across the entire platform on rollout — unacceptable. It is co-critical with Story 1.

**Independent Test**: On a database populated before the change, run the data backfill, then read any pre-existing state's `settings.visible` and confirm it is `true`.

**Acceptance Scenarios**:

1. **Given** an innovation-flow state created before this feature (its persisted settings have no `visible` key), **When** the backfill runs, **Then** the state's persisted settings contain `visible: true`.
2. **Given** the field is now part of the type as non-nullable, **When** any state is read through the API after backfill, **Then** `settings.visible` resolves to a boolean (never null) for every state.

---

### User Story 3 - Newly created phases default to visible (Priority: P2)

When an admin adds a new phase to an innovation flow, that phase should appear in navigation by default (visible), matching the prior behaviour where every phase was always shown.

**Why this priority**: Important for correct ongoing behaviour, but a strictly smaller surface than the persistence/backfill core; new-state creation already initialises settings server-side.

**Independent Test**: Create a new state on an innovation flow without specifying visibility and confirm its `settings.visible` is `true`.

**Acceptance Scenarios**:

1. **Given** an admin creating a new state on an innovation flow, **When** no visibility value is supplied, **Then** the created state's `settings.visible` is `true`.

---

### User Story 4 - Toggle is admin-gated and partial updates are safe (Priority: P2)

Only those who already hold the privilege to edit innovation-flow state settings may change the visibility flag. A non-privileged user cannot change it. Additionally, when an admin updates state settings without including a visibility value, the existing visibility value is left unchanged (omission is not "set to false").

**Why this priority**: Authorization correctness and non-destructive partial updates protect against accidental hiding and privilege escalation, but the gate reuses an existing privilege so it is lower-risk than the core persistence.

**Independent Test**: As a non-privileged member, attempt to update a state's settings — confirm it is rejected by the existing authorization layer. As an admin, update settings omitting `visible` — confirm the previously stored `visible` value is retained.

**Acceptance Scenarios**:

1. **Given** a user without the innovation-flow update privilege, **When** they attempt to change a state's `visible`, **Then** the operation is denied by the existing authorization layer (no new privilege introduced).
2. **Given** a state with `visible: false`, **When** an admin updates the state's settings but omits `visible`, **Then** the stored value remains `false`.
3. **Given** a state with `visible: true`, **When** an admin updates the state's settings but omits `visible`, **Then** the stored value remains `true`.

---

### Edge Cases

- **State with no persisted settings object at all** (legacy/corrupt row): backfill targets only rows whose settings exist; rows are expected to always have a settings object (`allowNewCallouts` is already mandatory). The backfill adds the `visible` key only when absent and does not overwrite an existing one.
- **Hiding the current/active phase**: visibility is independent of which phase is active. Hiding the active phase changes only navigation affordance, never the active-state pointer or access. (Client owns active-state semantics; server stores the flag only.)
- **All phases hidden**: server persists each flag independently; there is no server-side constraint requiring at least one visible phase. The empty-navigation experience is a client concern.
- **Re-running the backfill migration**: must be idempotent — running it twice leaves every state at the value it already had (only sets the key when missing).
- **Omitted vs explicit false on update**: omission preserves the prior value; an explicit `false` sets it false.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a non-nullable boolean `visible` field on the `InnovationFlowStateSettings` type returned by the API, indicating whether the phase/tab is shown in member-facing navigation.
- **FR-002**: The system MUST accept an optional `visible` boolean on the input used to update innovation-flow state settings; when present it sets the flag, when omitted it leaves the stored value unchanged.
- **FR-003**: The system MUST persist the `visible` flag as part of the innovation-flow state's settings so the value applies to all users and survives restarts.
- **FR-004**: The system MUST backfill `visible = true` for every innovation-flow state whose persisted settings do not already carry a `visible` value, so existing behaviour (all phases shown) is preserved on deploy.
- **FR-005**: The system MUST default `visible` to `true` for newly created innovation-flow states when no value is supplied.
- **FR-006**: The system MUST restrict changing `visible` to actors holding the existing privilege that already governs editing innovation-flow state settings; no new role or privilege is introduced.
- **FR-007**: The `visible` flag MUST be treated as a UI-affordance/navigation hint ONLY; it MUST NOT gate, filter, or otherwise affect authorization to or accessibility of the state's content (the state, its callouts, and contributions remain reachable by direct reference regardless of `visible`).
- **FR-008**: The backfill MUST be idempotent and reversible: re-running it MUST not change already-correct values, and a documented down path MUST remove the key it added.
- **FR-009**: The system MUST keep `visible` independent of `allowNewCallouts` and of the active-state selection; changing one MUST NOT change the others.

### Key Entities *(include if feature involves data)*

- **InnovationFlowStateSettings**: The settings block attached to a single innovation-flow state. Currently carries `allowNewCallouts` (boolean). This feature adds `visible` (boolean, default `true`) — a navigation-visibility hint with no authorization meaning. Persisted inside the state's settings.
- **InnovationFlowState (phase/tab)**: One phase of an innovation flow. Owns its `settings`. Visibility is per-state. Its content (callouts/contributions) is unaffected by `visible`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For 100% of innovation-flow states existing before deploy, reading `settings.visible` after backfill returns `true` (no phase becomes hidden by the rollout).
- **SC-002**: An admin can change a phase's visibility and 100% of subsequent reads by any user reflect the new value (visibility is global, not per-user).
- **SC-003**: For a hidden phase, 100% of direct content accesses that succeeded before hiding still succeed after hiding (zero access regressions attributable to visibility).
- **SC-004**: A user lacking the innovation-flow edit privilege has a 0% success rate at changing `visible`.
- **SC-005**: The client slice (alkem-io/client-web#9844), which reads/writes `settings.visible` and treats absence as `true`, functions against this server with no further client changes required for the flag to round-trip.

## Assumptions

- The existing privilege governing innovation-flow state-settings edits (the `Update` privilege on the innovation flow, exercised through the existing state-settings update path) is the correct and sufficient gate; no new authorization construct is needed.
- Innovation-flow state settings are persisted as a structured settings object on the state; adding a key to that object does not require a new database column or table — only a data backfill of existing rows.
- Every existing innovation-flow state already has a settings object (because `allowNewCallouts` is already mandatory), so the backfill operates on an existing object rather than creating one.
- The client (alkem-io/client-web#9844) is already merged-ready and degrades gracefully; this server change is the only remaining piece for the flag to round-trip.
- "Space/subspace admin" in the story maps to whoever already holds the innovation-flow update privilege in the current authorization model; the story does not request a finer-grained or new role.
- Content reachability "by direct URL" maps server-side to the existing per-entity authorization on the state and its callouts, which this feature must not alter.
