# Phase 0 Research: Adding additional tabs in L0 space

**Feature**: 104-l0-additional-tabs | **Date**: 2026-06-22

## R1. Where the L0 "4 tabs" constraint is enforced

**Decision**: The 4/4 pin lives in exactly one creation site; the runtime add/delete guards are generic.

- `src/domain/space/space/space.service.ts` `createRootSpaceAndSubspaces()` lines **1284-1285** set `minimumNumberOfStates = 4` and `maximumNumberOfStates = 4` for L0 at creation. Line **1278** also rejects templates with fewer than 4 states.
- `src/domain/space/space/space.service.ts` `createSubspace()` lines **1373-1374** set `maximumNumberOfStates = 8`, `minimumNumberOfStates = 1` for L1/L2.
- `src/domain/collaboration/innovation-flow/innovation.flow.service.ts`:
  - `createStateOnInnovationFlow()` line **352** reads `settings.maximumNumberOfStates`; line **359** rejects when `states.length >= max`.
  - `deleteStateOnInnovationFlow()` line **385** reads `settings.minimumNumberOfStates`; line **392** rejects when `states.length <= min`.
  - `validateInnovationFlowDefinition()` lines **494-528** validate a full state set against min/max.

**Rationale**: Because the add/delete guards are already generic over the persisted bounds, raising the L0 maximum at creation (and backfilling existing rows) is sufficient to let admins add tabs — no mutation logic change. **Alternatives rejected**: special-casing the mutations by space level (more branching, more regression surface) — unnecessary given the bounds-driven design.

## R2. Why template application needs special handling for L0

**Decision**: The Space-Template applier replaces *all* states, so for L0 it must instead preserve the first 4 fixed states and append only the additional template states.

- `src/domain/template/template-applier/template.applier.service.ts` `updateCollaborationFromTemplateContentSpace()` lines **125-134** call `innovationFlowService.updateInnovationFlowStates(targetFlow, newStatesInput)`.
- `updateInnovationFlowStates()` (`innovation.flow.service.ts` lines **243-298**) **deletes every existing state** (lines 256-260) then recreates from the input — a wholesale replacement. For an L0 space this would wipe the 4 fixed phases, violating FR-008.

**Rationale**: To honor "without overriding the fixed phases (the first 4)" the applier must, when the target is L0, build the new state set as `[first 4 existing fixed states] + [template states that are not duplicates], capped at the L0 max`, and reject if the result would exceed the L0 max (Clarification Q4 → FR-009). The applier resolver (`template.applier.resolver.mutations.ts`) already loads the target collaboration with its `innovationFlow.states`; the service can resolve the owning Space's `level` to branch L0 vs subspace.

**Alternatives rejected**: (a) Leaving the wholesale replacement and relying on the template always containing the 4 fixed phases first — fragile, depends on template authorship. (b) A new immutable per-state flag — rejected in Clarification Q2 for simplicity.

## R3. Resolving the target Space level from a Collaboration

**Decision**: Query the `space` row by `collaborationId` to read `level` (mirrors the existing private helper pattern `getCollaborationByInnovationFlowId` in `innovation.flow.service.ts:760`).

**Rationale**: TemplateContentSpaces (templates) are not rows in the `space` table, so a missing `space` row means the target is a template/non-space collaboration → no L0 preservation needed (behaves as today). A found row with `level = 0` triggers preservation.

## R4. Migration join path & precedent

**Decision**: Backfill `maximumNumberOfStates = 8` on `innovation_flow.settings` for L0 spaces only, leaving `minimumNumberOfStates` at 4.

- Join: `space (level = 0)` → `space."collaborationId"` → `collaboration."innovationFlowId"` → `innovation_flow.settings`.
- Column type is **`jsonb`** in the live DB. The baseline created it as `json`, but migration `1767883714610-convertJsonToJsonb` converted `innovation_flow.settings` (and `innovation_flow_state.settings`) to `jsonb`. So the backfill uses `jsonb_set(settings, '{maximumNumberOfStates}', '8'::jsonb, true)` directly — no `::jsonb` casting needed.
- Precedent: `src/migrations/1780500000000-BackfillInnovationFlowStateVisible.ts` — idempotent JSONB backfill with a reversible `down()`.

**Idempotency**: Only update rows where the current `maximumNumberOfStates` is `4` (the old L0 pin), so re-running is a no-op and any admin-customized value is never clobbered. **Reversibility**: `down()` sets it back to 4 for L0 flows currently at 8 (best-effort; documented inline).

**Rationale**: Without the backfill, existing L0 spaces remain pinned at 4 and cannot gain tabs (FR-014). Filtering by `space.level = 0` naturally excludes templates and subspaces.

## R5. Constants location (FR-010)

**Decision**: Add `src/domain/collaboration/innovation-flow/innovation.flow.constants.ts` exporting:
`L0_MIN_INNOVATION_FLOW_STATES = 4`, `L0_MAX_INNOVATION_FLOW_STATES = 8`, `SUBSPACE_MIN_INNOVATION_FLOW_STATES = 1`, `SUBSPACE_MAX_INNOVATION_FLOW_STATES = 8`, and a derived `L0_FIXED_INNOVATION_FLOW_STATES = 4` (the fixed-phase count == the L0 minimum).

**Rationale**: Removes the four magic numbers in `space.service.ts` and gives the applier overflow guard and the migration a single referenced source. Lives in the innovation-flow domain because the bounds are an InnovationFlow concept; consumed by `space.service.ts` and the applier via path alias `@domain/...`.

**Alternatives rejected**: putting constants in `space` domain — the bounds semantically belong to InnovationFlow; placing them there avoids a space→innovation-flow value dependency inversion.

## R6. Schema-contract impact

**Decision**: No schema change expected. The change is purely in persisted setting values + internal service logic; no GraphQL type/field/mutation is added or altered.

**Verification**: `pnpm run schema:print && pnpm run schema:sort && pnpm run schema:diff` must report zero diff before PR (FR-013). If a diff appears, it indicates an unintended contract change to investigate.

## R7. Test strategy & precedent

**Decision**: Unit tests in `innovation.flow.service.spec.ts` (add-beyond-4, delete-floor against L0 bounds) and `template.applier.service.spec.ts` (L0 preservation, overflow rejection, subspace regression). Use the existing Vitest mocking infra (`defaultMockerFactory`, `repositoryProviderMockFactory`, `vi.mocked`).

**Rationale**: Constitution Principle 6 — risk-based. The bound-guard behavior and the applier-preservation branch carry real regression risk and are the testable invariants; trivial getters are skipped.
