# Contract: InnovationFlow State Visibility (GraphQL, server side)

This is the server-side contract that fulfils the external dependency declared in the client spec
`client-web/specs/106-hiding-tabs-phases/contracts/innovation-flow-state-visibility.graphql.md`.

## Output type — `InnovationFlowStateSettings`

```graphql
type InnovationFlowStateSettings {
  allowNewCallouts: Boolean!
  "Whether this state/phase is shown in the member-facing navigation. Default true."
  visible: Boolean!
}
```

- `visible` is **non-nullable**. Guaranteed by the create default + backfill migration; resolver coerces absent → `true`.
- `visible` is a navigation hint only. It does NOT affect authorization or content access.

## Input types

```graphql
input UpdateInnovationFlowStateSettingsInput {
  "The flag to set."
  allowNewCallouts: Boolean!
  "Optional. When provided, sets whether the phase is shown in member navigation. When omitted, the stored value is unchanged."
  visible: Boolean
}

input CreateInnovationFlowStateSettingsData {
  "The flag to set."
  allowNewCallouts: Boolean!
  "Optional. Defaults to true when omitted."
  visible: Boolean
}
```

## Mutation surface (unchanged shape)

`updateInnovationFlowState(stateData: UpdateInnovationFlowStateInput)` already carries
`settings: UpdateInnovationFlowStateSettingsInput`. No new mutation is added; `visible` flows through
the existing nested `settings` input.

```graphql
mutation UpdateInnovationFlowState(
  $innovationFlowStateId: UUID!
  $displayName: String!
  $description: Markdown!
  $settings: UpdateInnovationFlowStateSettingsInput
) {
  updateInnovationFlowState(
    stateData: {
      innovationFlowStateID: $innovationFlowStateId
      displayName: $displayName
      description: $description
      settings: $settings
    }
  ) {
    id
    settings { allowNewCallouts visible }
  }
}
```

## Authorization contract

- Changing `visible` requires the **existing `Update` privilege on the innovation flow** — the same gate already enforced on `updateInnovationFlowState`. No new privilege.
- Reading `visible` requires whatever already gates reading the state's settings (unchanged).

## Behavioral contract

| Scenario | Expected |
|----------|----------|
| Read a state created before this change (after backfill) | `settings.visible == true` |
| Read a newly created state (no visibility supplied) | `settings.visible == true` |
| Update settings with `visible: false` as admin | stored `visible` becomes `false`, returned to all users |
| Update settings omitting `visible` | stored `visible` unchanged |
| Non-privileged user attempts the update | denied by existing authorization layer |
| Fetch hidden state's content by direct id | succeeds exactly as before (no access change) |

## Schema-contract classification

Additive / **non-breaking**: a new output field + a new optional input field. No `BREAKING-APPROVED`
required. The regenerated `schema.graphql` MUST be committed in the same PR.
