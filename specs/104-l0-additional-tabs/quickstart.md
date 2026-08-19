# Quickstart: Adding additional tabs in L0 space

**Feature**: 104-l0-additional-tabs | **Date**: 2026-06-22

## Prerequisites

```bash
pnpm install
pnpm run start:services      # PostgreSQL 17.5, RabbitMQ, Redis, Ory
pnpm run migration:run       # applies the L0 max-states backfill among others
pnpm start:dev               # GraphQL at /graphql, playground at /graphiql
```

## Validate the behavior

1. **Create / pick an L0 space.** A fresh L0 space starts with its 4 fixed phases. Read its InnovationFlow settings — `minimumNumberOfStates` should be `4` and `maximumNumberOfStates` should now be `8`.

2. **Add a 5th tab (US1).** Run `createStateOnInnovationFlow` against the L0 space's InnovationFlow:
   ```graphql
   mutation {
     createStateOnInnovationFlow(innovationFlowData: {
       innovationFlowID: "<L0_FLOW_ID>",
       displayName: "Extra Phase"
     }) { id displayName sortOrder }
   }
   ```
   Expect success; the flow now has 5 states, the new one last by sort order.

3. **Reach the max (US1 scenario 2).** Keep adding until 8 states exist, then add once more — expect a `ValidationException` citing the maximum of 8; no 9th state created.

4. **Try to delete below the floor (US2).** On an L0 space with exactly 4 states, run `deleteStateOnInnovationFlow` — expect a `ValidationException` citing the minimum of 4. On an L0 space with 5 states, delete the added tab — expect success back to 4; any callouts on the deleted state move to a remaining state.

5. **Apply a Space Template (US3).** Apply a template whose InnovationFlow defines extra phases via `updateCollaborationFromSpaceTemplate` against the L0 space's collaboration:
   - Expect the 4 fixed phases preserved (same names, leading order) and template extras appended up to 8.
   - Apply a template that would exceed 8 — expect atomic rejection, space unchanged.

6. **Regression — subspace (US1 scenario 3, FR-011).** Repeat add/delete/apply on an L1 subspace — behavior must be identical to before this feature (min 1, max 8).

## Run the gates

```bash
pnpm test:ci:no:coverage     # unit/integration
pnpm build                   # production build
pnpm lint                    # tsc --noEmit + biome check
pnpm run schema:print && pnpm run schema:sort && pnpm run schema:diff   # expect zero diff
```
