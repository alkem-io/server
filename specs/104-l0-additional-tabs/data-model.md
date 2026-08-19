# Phase 1 Data Model: Adding additional tabs in L0 space

**Feature**: 104-l0-additional-tabs | **Date**: 2026-06-22

No DDL changes. This feature changes persisted *values* and internal logic only. Below are the entities involved and the invariants that govern them.

## Entities

### Space
- `level: SpaceLevel` (`int` column; `L0 = 0`, `L1 = 1`, `L2 = 2`). Drives the bounds applied at creation.
- `collaborationId: uuid` (`@OneToOne` → Collaboration). Used to resolve a Collaboration's owning Space (and thus its level) in the template-applier.
- `levelZeroSpaceID: uuid`. Unchanged; not modified by this feature.

### Collaboration
- `innovationFlowId: uuid` (`@OneToOne` → InnovationFlow). Join link for the migration and for level resolution.
- `isTemplate: boolean`. Template collaborations are not `space` rows, so they are excluded from the L0 migration and from L0 preservation.

### InnovationFlow
- `states: InnovationFlowState[]` (`@OneToMany`). The tabs.
- `currentStateID: uuid`. Must remain pointing at a live state after add/delete.
- `settings: jsonb` → `IInnovationFlowSettings`. **The only value changed by this feature.**
- `flowStatesTagsetTemplate`. Canonical allowed-values list; kept in sync by existing add/update/delete paths.

### InnovationFlowState
- `displayName`, `description?`, `sortOrder`, `settings` (incl. `visible` from #6138). The first `L0_FIXED_INNOVATION_FLOW_STATES` (4) by `sortOrder` are the L0 "fixed phases".

### InnovationFlowSettings (the value object inside `InnovationFlow.settings`)
- `minimumNumberOfStates: number`
- `maximumNumberOfStates: number`

## Bounds matrix (after this feature)

| Space level | minimumNumberOfStates | maximumNumberOfStates | Change |
|-------------|-----------------------|-----------------------|--------|
| L0 (root)   | 4 (unchanged)         | **8** (was 4)         | max raised; fixed-phase floor preserved |
| L1 / L2     | 1 (unchanged)         | 8 (unchanged)         | none (regression guard) |

Source of truth: `innovation.flow.constants.ts`
- `L0_MIN_INNOVATION_FLOW_STATES = 4`
- `L0_MAX_INNOVATION_FLOW_STATES = 8`
- `L0_FIXED_INNOVATION_FLOW_STATES = 4`
- `SUBSPACE_MIN_INNOVATION_FLOW_STATES = 1`
- `SUBSPACE_MAX_INNOVATION_FLOW_STATES = 8`

## Invariants

- **INV-1**: For an L0 InnovationFlow, `4 <= states.length <= 8` at all times after creation.
- **INV-2**: An L0 InnovationFlow always retains its first 4 fixed states (by leading sort order); they are never deleted (count floor) nor replaced/reordered by template apply.
- **INV-3**: `currentStateID` always references one of `states` after any add/delete/apply.
- **INV-4**: `flowStatesTagsetTemplate.allowedValues` equals the set of live state `displayName`s after any mutation.
- **INV-5**: Subspace (L1/L2) bounds and behavior are unchanged.

## Migration: BackfillL0InnovationFlowMaxStates

**Column type**: `innovation_flow.settings` is **`jsonb`** in the live DB (baseline created it as `json`; migration `1767883714610-convertJsonToJsonb` converted it to `jsonb`, alongside `innovation_flow_state.settings`). So the backfill uses `jsonb_set` directly — no `::jsonb` casting — matching the `BackfillInnovationFlowStateVisible` precedent which ran `jsonb_set` on the same-typed `innovation_flow_state.settings`.

**Transformation (up)**: For every `innovation_flow` whose owning `space.level = 0` and whose current `settings->>'maximumNumberOfStates' = '4'`, set `maximumNumberOfStates = 8`. `minimumNumberOfStates` untouched (stays 4).

```sql
UPDATE innovation_flow AS f
SET settings = jsonb_set(f.settings, '{maximumNumberOfStates}', '8'::jsonb, true)
FROM collaboration AS c
JOIN space AS s ON s."collaborationId" = c.id
WHERE c."innovationFlowId" = f.id
  AND s.level = 0
  AND (f.settings ->> 'maximumNumberOfStates') = '4';
```

**Idempotency**: The `= '4'` guard makes re-runs no-ops and protects any admin-set value.

**Reversibility (down)**: Reverse only rows currently at 8 for L0 flows back to 4 (best-effort; an L0 flow legitimately at 8 by admin action after deploy is indistinguishable, so `down` is documented as a rollback of the backfill default, not a perfect inverse).

```sql
UPDATE innovation_flow AS f
SET settings = jsonb_set(f.settings, '{maximumNumberOfStates}', '4'::jsonb, true)
FROM collaboration AS c
JOIN space AS s ON s."collaborationId" = c.id
WHERE c."innovationFlowId" = f.id
  AND s.level = 0
  AND (f.settings ->> 'maximumNumberOfStates') = '8';
```

**Rollback note**: Reverting after admins have added 5–8 tabs to L0 spaces will leave those spaces holding more states than the restored max of 4 (the `down` only lowers the *bound*, not the data). This is acceptable for a backward rollback because the add-guard simply prevents *new* adds; existing states remain valid. Documented inline in the migration.
