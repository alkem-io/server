# Feature Specification: Adding additional tabs in L0 space

**Feature Branch**: `story/6177-adding-additional-tabs-in-l0-space`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Adding additional tabs in L0 space — As a user, I want to be able to add more tabs to the fixed 4 Space L0 ones. Rework the L0 constraints for amount of tabs to be similar to L1 and L2. Revise the existing mutation for adding flow state to L0 space and fix/extend. Revise the template logic for creating/applying space templates to work with the latest changes without regressions and without overriding the fixed phases for L0 space (the first 4)."

**Story**: [alkem-io/server#6177](https://github.com/alkem-io/server/issues/6177)

**Epic**: [alkem-io/alkemio#1930 "Additional Tabs Support in L0 spaces"](https://github.com/alkem-io/alkemio/issues/1930)

**Sibling (frontend) story**: client-web#9857

## Background *(non-normative context)*

In Alkemio, a **Space** exists at one of three levels: L0 (root space of an account), L1 (subspace), L2 (sub-subspace). Each Space's Collaboration owns an **InnovationFlow** whose **states** render as the navigation **tabs** of the Space. The number of states an InnovationFlow may hold is bounded by two settings persisted on the flow: `minimumNumberOfStates` and `maximumNumberOfStates`.

Today these bounds are set at Space creation time and differ by level:

- **L0**: `minimumNumberOfStates = 4`, `maximumNumberOfStates = 4` (a fixed, immutable set of exactly 4 tabs).
- **L1 / L2 (subspaces)**: `minimumNumberOfStates = 1`, `maximumNumberOfStates = 8` (flexible).

Because L0 is pinned to 4/4, a user cannot add a 5th tab to an L0 space: the add-state mutation rejects it, and applying a Space Template either fails the bound check or would replace the 4 fixed tabs entirely. This feature loosens the L0 upper bound so users can **add** tabs beyond the first 4, while keeping the first 4 phases **fixed** (they cannot be removed, and template application must not overwrite them).

## Clarifications

### Session 2026-06-22 (iteration 1)

All ambiguities below were surfaced across the SpecKit taxonomy (Scope & Boundaries, Domain & Data Model, Interaction & State, Non-Functional, Edge Cases, Integration). In YOLO mode each is resolved by decision, with rationale, and encoded into the requirements above.

- **Q1 (Scope / Domain): What numeric maximum should L0 spaces allow?**
  **A:** 8 — the same maximum subspaces (L1/L2) already use. Rationale: the story says "similar to L1 and L2"; reusing the existing subspace bound avoids inventing a new value and keeps the frontend's tab handling uniform. Encoded in FR-001, SC-002. The two bound values (min 4 for L0, max 8 shared) become named constants (FR-010).

- **Q2 (Domain / Data Model): Does "fixed first 4 phases" require a new per-state immutable flag, or is the minimum-of-4 floor sufficient?**
  **A:** No new flag. "Fixed" is enforced by (a) keeping `minimumNumberOfStates = 4` on L0 so the count can never drop below 4, and (b) the template-apply path preserving the first 4 states by leading sort order rather than replacing them. Rationale: Principle 10 (Simplicity) — avoid speculative schema additions; the floor + apply-preservation fully satisfies the story's "without overriding the fixed phases (the first 4)". Encoded in FR-002, FR-008. (Note: deletion of a *specific* one of the first 4 while above the floor is out of scope for this story — the frontend slice client-web#9857 governs which tabs are deletable in the UI; the server guarantees only the count floor and template preservation.)

- **Q3 (Data Model / Migration): Do existing L0 spaces (persisted with max=4) automatically gain the loosened maximum?**
  **A:** Yes, via an idempotent data migration that sets `maximumNumberOfStates = 8` on the `innovation_flow.settings` of every L0 space (`space.level = 0` → `collaboration` → `innovation_flow`), leaving `minimumNumberOfStates` untouched (stays 4). Rationale: without backfill, only newly created L0 spaces could add tabs, contradicting "I want to be able to add more tabs" for the existing fleet. Template content spaces are excluded because they are not rows in the `space` table. Encoded in FR-014. Follows the existing backfill pattern (`1780500000000-BackfillInnovationFlowStateVisible`).

- **Q4 (Interaction / Edge Case): When applying a Space Template would push an L0 space beyond its maximum, reject or silently truncate?**
  **A:** Reject atomically, leaving the target unchanged. Rationale: silent truncation loses user-intended template content unpredictably; an explicit validation error is the least-surprising, testable behavior and matches how add-state already rejects at the max. Encoded in FR-009, US3 scenario 2.

- **Q5 (Integration / Contract): Does the GraphQL schema change?**
  **A:** No new mutations or input fields are required. `createStateOnInnovationFlow` and `deleteStateOnInnovationFlow` already exist and are generic over the bounds; only the *bounds* (set at L0 creation and backfilled) change, plus internal template-apply logic. The schema is therefore expected to be unchanged; `pnpm run schema:print && schema:diff` is run as a gate to confirm zero diff. Encoded in FR-013 and the GraphQL/Contract assumption.

- **Q6 (Interaction / State): How does the template-apply path know a target is L0 so it can preserve the first 4?**
  **A:** The applier resolves the target Space (and its `level`) for the collaboration being updated; for `level === L0` it preserves the existing first-4 states (by sort order) and appends only the template's *additional* states up to the L0 maximum, instead of the wholesale `updateInnovationFlowStates` replacement used for subspaces. Subspace behavior is untouched (FR-011). Encoded in FR-008.

No `[NEEDS CLARIFICATION]` markers remain in this spec.

### Session 2026-06-22 (iteration 2)

Re-scan across all taxonomy categories produced **zero new ambiguities**. The decisions from iteration 1 are internally consistent, every FR is testable, and no requirement depends on an unresolved choice. Clarify loop terminates.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a tab beyond the fixed 4 on an L0 space (Priority: P1)

As a Space administrator of an L0 (root) space, I want to add a new tab in addition to the 4 fixed ones, so the space can host more phases of work — the same flexibility subspaces already have.

**Why this priority**: This is the core, must-have scope of the epic. Without it the feature delivers no value. It is the minimal viable slice — once an admin can add a 5th tab to an L0 space, the feature is demonstrable.

**Independent Test**: Create an L0 space (which starts with 4 states), call the add-state mutation against its InnovationFlow, and confirm a 5th state is created and persisted with the correct sort order and a valid current-state pointer.

**Acceptance Scenarios**:

1. **Given** an L0 space whose InnovationFlow has the 4 fixed states, **When** an authorized admin adds a new state via the create-state mutation, **Then** the InnovationFlow has 5 states, the new state appears last in sort order, and the flow-state tagset template lists all 5 names.
2. **Given** an L0 space whose InnovationFlow already holds the maximum allowed number of states, **When** an admin attempts to add one more, **Then** the mutation is rejected with a validation error stating the maximum, and no state is created.
3. **Given** an L1 or L2 subspace, **When** an admin adds a tab, **Then** behavior is unchanged from today (regression guard).

---

### User Story 2 - Keep the first 4 L0 phases fixed and undeletable (Priority: P1)

As a platform operator, I want the original 4 L0 phases to remain fixed — a user may add tabs but must never delete the space below 4 states — so existing L0 spaces keep their canonical phase structure.

**Why this priority**: AC#1 of the story ("Rework the L0 constraints … similar to L1 and L2") must not regress the guarantee that L0 always has at least its 4 fixed phases. If deletion below 4 were allowed, existing data assumptions and the frontend's fixed-tab handling would break. Equal priority to US1 because the loosened upper bound is only safe if the lower bound holds.

**Independent Test**: Against an L0 space with exactly 4 states, attempt to delete a state and confirm rejection; against an L0 space with 5 states, delete the 5th and confirm it succeeds down to but not below 4.

**Acceptance Scenarios**:

1. **Given** an L0 space with exactly 4 states, **When** an admin attempts to delete any state, **Then** the deletion is rejected with a validation error citing the minimum of 4.
2. **Given** an L0 space with 5 states, **When** an admin deletes one added tab, **Then** the space returns to 4 states and the deletion succeeds; callouts assigned to the deleted state are moved to a remaining valid state.
3. **Given** an L0 space, **When** the minimum bound is read, **Then** it equals 4 (unchanged from today).

---

### User Story 3 - Apply a Space Template to an L0 space without overwriting the fixed phases (Priority: P2)

As a Space administrator, I want to apply a Space Template to my L0 space and have it add the template's extra phases/callouts without replacing or reordering the 4 fixed L0 phases, so templates compose with the fixed structure instead of fighting it.

**Why this priority**: AC#3 of the story. It is essential for a regression-free rollout but depends on US1/US2 being in place first; templates are applied less frequently than the basic add-tab action, so it is P2 rather than P1.

**Independent Test**: Apply a Space Template (whose InnovationFlow has its own states) to an L0 space and confirm the first 4 fixed phases are preserved in identity and order, while any additional template states are appended up to the L0 maximum.

**Acceptance Scenarios**:

1. **Given** an L0 space with its 4 fixed phases and a Space Template whose InnovationFlow defines additional phases, **When** the template is applied, **Then** the 4 fixed phases remain (same names, same leading order) and the template's additional phases are appended without exceeding the L0 maximum.
2. **Given** a Space Template whose InnovationFlow would push the L0 space beyond its maximum number of states, **When** the template is applied, **Then** the apply is rejected (per the resolved clarification) with a clear validation error and the target space is left unchanged.
3. **Given** creation of a new L0 space from a template, **When** the space is created, **Then** it starts with exactly the 4 fixed phases (creation-time behavior unchanged) and the loosened maximum is in effect so tabs can be added afterward.

---

### Edge Cases

- **At-maximum add**: Adding a state when the flow is already at `maximumNumberOfStates` must be rejected with the existing max-states validation error; the loosened L0 maximum must be a single source of truth shared with the validation path.
- **Delete to the floor**: Deleting a state when at exactly 4 (the L0 minimum) must be rejected; callout reassignment must not run for a rejected delete.
- **Template with fewer than 4 states**: Creating an L0 space from a template whose InnovationFlow has fewer than 4 states must still be rejected at creation time (existing guard preserved).
- **Template apply that exceeds the L0 maximum**: Resolved in Clarifications — reject atomically rather than silently truncate.
- **Sort order / current state pointer**: After adding or removing a tab, the current-state pointer must remain valid and sort order monotonic.
- **Existing L0 spaces created before this change**: They were persisted with `maximumNumberOfStates = 4`. Whether they automatically gain the loosened maximum is resolved in Clarifications (data backfill decision).
- **Flow-state tagset template**: Adding/removing a tab must keep the InnovationFlow's flow-state tagset template's allowed values in sync with the live states.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow an L0 (root) space's InnovationFlow to hold more than 4 states, raising its `maximumNumberOfStates` to match the subspace allowance (8) rather than being pinned to 4.
- **FR-002**: The system MUST keep the L0 InnovationFlow `minimumNumberOfStates` at 4, so an L0 space can never be reduced below its 4 fixed phases.
- **FR-003**: When a new L0 space is created, the system MUST initialize it with exactly the 4 fixed phases (creation behavior unchanged) while persisting the loosened maximum so additional tabs can be added afterward.
- **FR-004**: The create-state (add-tab) mutation MUST succeed for an authorized actor on an L0 space whose current state count is below the L0 maximum, appending the new state with a correct sort order and keeping the flow-state tagset template in sync.
- **FR-005**: The create-state mutation MUST reject an add when the L0 InnovationFlow is already at its maximum number of states, returning the existing max-states validation error and persisting no state.
- **FR-006**: The delete-state mutation MUST reject any deletion that would take an L0 InnovationFlow below 4 states, returning the existing min-states validation error.
- **FR-007**: The delete-state mutation MUST succeed for added tabs above the floor, reassigning callouts from the deleted state to a remaining valid state, exactly as it does today for subspaces.
- **FR-008**: Applying a Space Template to an existing L0 space MUST preserve the 4 fixed phases (identity and leading order) and MUST NOT replace or reorder them; the template's additional phases MAY be appended subject to the L0 maximum.
- **FR-009**: Applying a Space Template to an L0 space whose resulting state count would exceed the L0 maximum MUST be rejected atomically, leaving the target space unchanged (per Clarification).
- **FR-010**: The L0 minimum/maximum bounds MUST be defined as named constants (single source of truth) rather than scattered magic numbers, so the add/delete validation paths and the creation path agree.
- **FR-011**: Subspace (L1/L2) behavior for adding, deleting, and template application MUST remain unchanged (no regressions).
- **FR-012**: All new and changed mutations MUST enforce the existing authorization checks before mutating, and MUST validate inputs at the DTO layer.
- **FR-013**: Changes to the GraphQL surface (if any) MUST regenerate the committed schema artifact; if no schema change is required, the spec MUST note that the existing mutations are reused unchanged.
- **FR-014**: Existing L0 spaces persisted with `maximumNumberOfStates = 4` MUST be migrated to the loosened maximum so their administrators can add tabs (per Clarification on backfill).

### Key Entities *(include if feature involves data)*

- **Space**: The collaboration container at a given `level` (L0/L1/L2). Owns a Collaboration which owns the InnovationFlow. Level drives the state-count bounds applied at creation.
- **InnovationFlow**: Holds an ordered set of states (the tabs), a `currentStateID`, a flow-state tagset template (the canonical list of state names), and a `settings` JSONB carrying `minimumNumberOfStates` and `maximumNumberOfStates`.
- **InnovationFlowState**: A single tab/phase — `displayName`, optional `description`, `sortOrder`, optional per-state settings. The first 4 on an L0 space are the "fixed phases".
- **InnovationFlowSettings**: The bounds object (`minimumNumberOfStates`, `maximumNumberOfStates`) persisted in the InnovationFlow `settings` JSONB column.
- **Space Template / TemplateContentSpace**: A reusable Collaboration shape (InnovationFlow states + callouts) that can be applied to a Space or used to seed a new one.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorized admin can add at least one tab beyond the fixed 4 on an L0 space, and the new tab persists and is returned by subsequent queries.
- **SC-002**: An L0 space can hold up to the same maximum number of tabs as a subspace (8); the (4+1)th through 8th adds all succeed and the 9th is rejected.
- **SC-003**: 100% of attempts to delete an L0 space below 4 states are rejected; the space never persists fewer than 4 states.
- **SC-004**: Applying any Space Template to an L0 space preserves the 4 fixed phases by name and leading order in 100% of cases, with zero instances of the fixed phases being replaced or reordered.
- **SC-005**: No regression in subspace (L1/L2) add/delete/template behavior, verified by the existing and added tests passing.
- **SC-006**: The repo's full local exit gates (test suite, production build, lint/format/typecheck) pass clean on the branch before PR.

## Assumptions

- The maximum number of tabs an L0 space may hold equals the existing subspace maximum (8). This mirrors "similar to L1 and L2" from the story and avoids introducing a new bound value. (Confirmed in Clarifications.)
- The 4 fixed L0 phases are exactly the first 4 states by sort order at creation; "fixed" means they cannot be deleted (the minimum-of-4 floor) and template application must not replace/reorder them. No separate per-state immutable flag is introduced unless required (resolved in Clarifications).
- Authorization for adding/deleting tabs on L0 spaces uses the same privilege already required for the create-state / delete-state mutations on subspaces; no new privilege is introduced.
- The frontend slice (client-web#9857) consumes the existing mutations; this server slice keeps the GraphQL mutation contract stable, reusing `createStateOnInnovationFlow` and `deleteStateOnInnovationFlow`.
- Existing L0 spaces require a data migration to raise their persisted maximum from 4 to 8; the minimum stays 4 (resolved in Clarifications).
- The flow-state tagset template is kept in sync by the existing add/update/delete paths; no new sync mechanism is introduced.
