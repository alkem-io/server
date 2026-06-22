# GraphQL Contract Notes: Adding additional tabs in L0 space

**Feature**: 104-l0-additional-tabs | **Date**: 2026-06-22

## Summary

**No schema change.** This feature reuses the existing InnovationFlow mutations unchanged. The only differences are (a) the persisted bound values on L0 InnovationFlows and (b) internal service logic in the template applier. The `pnpm run schema:diff` gate MUST report zero diff (FR-013).

## Reused mutations (unchanged contract)

### `createStateOnInnovationFlow(innovationFlowData: CreateInnovationFlowStateOnInnovationFlowInput!): InnovationFlowState!`
- Adds a tab to an InnovationFlow. Already enforces `maximumNumberOfStates` generically.
- **Behavioral change (not contract change)**: for L0 flows the effective max is now 8 (was 4), so adds beyond the 4th now succeed up to 8.
- Authorization: existing UPDATE privilege on the InnovationFlow / Collaboration. Unchanged.

### `deleteStateOnInnovationFlow(deleteData: DeleteStateOnInnovationFlowInput!): InnovationFlowState!`
- Removes a tab. Already enforces `minimumNumberOfStates` generically.
- **Behavioral guarantee**: for L0 the min stays 4, so deletes below 4 remain rejected. Callout reassignment from the deleted state is unchanged.

### `updateCollaborationFromSpaceTemplate(updateData: UpdateCollaborationFromSpaceTemplateInput!): Collaboration!`
- Applies a Space Template to a Collaboration.
- **Behavioral change (not contract change)**: when the target Collaboration belongs to an L0 Space, the first 4 fixed states are preserved (not replaced); template states are appended up to the L0 max; an apply that would exceed the L0 max is rejected with a `ValidationException`. Subspace behavior is unchanged.

## Field reads (unchanged)

- `InnovationFlow.settings.minimumNumberOfStates` / `.maximumNumberOfStates` continue to be exposed as today; clients (client-web#9857) read them to gate the add/delete UI. The L0 values they read change from 4/4 to 4/8.

## Verification

```bash
pnpm run schema:print && pnpm run schema:sort && pnpm run schema:diff
# Expected: no diff (change-report.json shows zero changes)
```
