# Phase 1 Data Model: Persist Phase/Tab Visibility

## Entity: InnovationFlowStateSettings (value object, persisted in JSONB)

Persisted inside `innovation_flow_state.settings` (a single JSONB column on each state row). Represented in code by `IInnovationFlowStateSettings`.

| Field | Type | Existing? | Change | Notes |
|-------|------|-----------|--------|-------|
| `allowNewCallouts` | `boolean` | yes | unchanged | Whether new callouts can be added to this state. |
| `visible` | `boolean` | NO | **ADDED** | Whether the phase/tab is shown in member-facing navigation. Default `true`. Navigation hint only — no authorization meaning. |

**Validation / invariants**:
- `visible` is non-null in the GraphQL output type (`Boolean!`); the resolver coerces a missing stored value to `true`.
- `visible` is independent of `allowNewCallouts` and of the innovation flow's current/active state.
- `visible` MUST NOT participate in authorization-policy computation or content-fetch filtering.

## Entity: InnovationFlowState (`innovation_flow_state` table)

Unchanged at the table level. No new column. The only change is the shape of the JSONB `settings` value object (above).

| Column | Type | Change |
|--------|------|--------|
| `id`, `displayName`, `description`, `sortOrder`, `innovationFlowId`, `defaultCalloutTemplateId`, authorization… | various | unchanged |
| `settings` | `jsonb` | unchanged column; value now also carries `visible` |

## GraphQL types

### Output: `InnovationFlowStateSettings`
```graphql
type InnovationFlowStateSettings {
  allowNewCallouts: Boolean!
  "Whether this state/phase is shown in member-facing navigation. Default true."
  visible: Boolean!   # NEW
}
```

### Input: `UpdateInnovationFlowStateSettingsInput`
```graphql
input UpdateInnovationFlowStateSettingsInput {
  allowNewCallouts: Boolean!
  visible: Boolean    # NEW — optional; omission leaves the stored value unchanged
}
```

### Input: `CreateInnovationFlowStateSettingsData` (`CreateInnovationFlowStateSettingsInput`)
```graphql
input CreateInnovationFlowStateSettingsData {
  allowNewCallouts: Boolean!
  visible: Boolean    # NEW — optional; defaults to true server-side when omitted
}
```

## State transitions (visibility)

| From | Action (admin, holds Update privilege) | To | Persisted via |
|------|----------------------------------------|----|---------------|
| visible (`true` / absent) | set `visible: false` on settings update | hidden (`false`) | `updateInnovationFlowState` → `InnovationFlowStateService.update` |
| hidden (`false`) | set `visible: true` on settings update | visible (`true`) | same |
| any | settings update omitting `visible` | unchanged | same (no-op on the flag) |

## Data migration

- **Forward (`up`)**: for every `innovation_flow_state` row whose `settings -> 'visible'` is NULL, set `settings = jsonb_set(settings, '{visible}', 'true', true)`. Idempotent; never overwrites an existing value.
- **Backward (`down`)**: remove the key — `settings = settings #- '{visible}'` for rows that carry it.
- Targets only rows with a non-null `settings` object (all current rows, since `allowNewCallouts` is already mandatory).

## Persistence path

Create: `InnovationFlowStateService.createInnovationFlowState` currently hardcodes `settings = { allowNewCallouts: true }` and does not read `stateData.settings`. This feature extends it to `settings = { allowNewCallouts: true, visible: stateData.settings?.visible ?? true }` — defaulting `visible` to `true`, honoring an explicit create-time `visible: false`, and leaving the existing `allowNewCallouts: true` default unchanged (consuming create-time `allowNewCallouts` is out of scope).

Update: `InnovationFlowStateService.update` — `if (updateData.settings)`: assign `allowNewCallouts` as today, and `if (updateData.settings.visible !== undefined) settings.visible = updateData.settings.visible`.
