# Quickstart: Verify the Office Documents Entitlement End-to-End

**Feature**: 083-collab-entitlement

This quickstart walks through the **Desired Outcome (Definition of Done)** from the spec on a local dev environment. It matches SC-008 one-for-one. The three phases must all pass.

## Prerequisites

```bash
# From server/ root
pnpm install
pnpm run start:services     # Postgres 17.5, RabbitMQ, Redis, Kratos/Oathkeeper
pnpm run migration:run      # includes the new migration added by this feature
pnpm start:dev              # server on :3000, GraphiQL at /graphiql
```

You need:

- A platform admin account (or global admin credentials) to hit the License Issuer
- A target L0 Space to experiment on (create one via the normal create-space flow if needed)
- The Space's ID handy (note it down)

## Phase 1 — Baseline: plan NOT assigned → entitlement NOT enabled

1. Open GraphiQL at `http://localhost:3000/graphiql`.
2. Query the target Space's license entitlements:

   ```graphql
   query SpaceEntitlements($spaceId: UUID!) {
     space(ID: $spaceId) {
       id
       license {
         entitlements { type enabled limit }
       }
       collaboration {
         id
         license {
           entitlements { type enabled limit }
         }
       }
     }
   }
   ```

3. **Expect**: the returned entitlements arrays include exactly one entry with `type: SPACE_FLAG_OFFICE_DOCUMENTS`, and on both the Space license and the Collaboration license that entry reports `limit: 0` (the entitlement is effectively disabled). Take a screenshot or note the shape.

## Phase 2 — Assign the plan via the License Issuer → entitlement enabled

4. Navigate (or use the License Issuer mutation directly) to assign `SPACE_FEATURE_OFFICE_DOCUMENTS` to the Space. The same mutation used for `SPACE_FEATURE_MEMO_MULTI_USER` applies; exact name depends on the admin API but the plan will appear in the available-plans list automatically after migration.
5. Wait for the license policy to re-apply (the assign mutation triggers this synchronously for the Space subtree).
6. Re-run the query from step 2.
7. **Expect**:
   - `SPACE_FLAG_OFFICE_DOCUMENTS` reports `enabled: true`, `limit: 1` on the Space license.
   - `SPACE_FLAG_OFFICE_DOCUMENTS` reports `enabled: true`, `limit: 1` on the contained Collaboration license.
   - If the Space has any sub-spaces, repeat the query on each and confirm the same state. **Every descendant** Space license and Collaboration license must report the entitlement as enabled.

## Phase 3 — Revoke the plan → entitlement returns to disabled

8. Revoke the `SPACE_FEATURE_OFFICE_DOCUMENTS` assignment via the License Issuer.
9. Re-run the query from step 2 on the root Space and every descendant.
10. **Expect**: `SPACE_FLAG_OFFICE_DOCUMENTS` is back to `limit: 0` everywhere. No residual enabled state.

## Migration sanity checks

Independent of the three-phase flow above, verify the migration landed correctly:

```sql
-- Should return exactly one row
SELECT name, "licenseCredential", "sortOrder", type
FROM license_plan
WHERE name = 'SPACE_FEATURE_OFFICE_DOCUMENTS';

-- Should return exactly one credential rule entry matching the new rule
SELECT rule
FROM license_policy lp
CROSS JOIN LATERAL jsonb_array_elements(lp."credentialRules") AS rule
WHERE rule @> '{"credentialType":"space-feature-office-documents"}'::jsonb;
```

## Rollback check

```bash
pnpm run migration:revert
# Verify the license_plan row is gone and the credentialRules entry is gone
# Re-run migration:run and verify the same end state as before
pnpm run migration:run
```

Up + Down + Up must yield identical database state (idempotency check).

## Unit test suites to verify

```bash
pnpm test -- src/domain/space/space/space.service.license.spec.ts
pnpm test -- src/domain/collaboration/collaboration/collaboration.service.license.spec.ts
```

Both should pass with the new case added to their parameterized tests.

## Schema regeneration check

```bash
pnpm run schema:print
pnpm run schema:sort
pnpm run schema:diff    # review change-report.json — should show ADDITIVE-only change
pnpm run schema:validate
```

The diff report must classify the change as non-breaking (additive enum value).

## Pass/fail criteria

All of the following must hold for the quickstart to pass:

- ✅ Phase 1: entitlement reports disabled before assignment
- ✅ Phase 2: entitlement reports enabled on Space, Collaboration, and every descendant after assignment
- ✅ Phase 3: entitlement returns to disabled after revocation
- ✅ Migration up, down, and re-up produce identical DB state
- ✅ Unit test suites pass
- ✅ Schema diff is additive-only (no breaking change markers)

If any step fails, the feature is NOT done (SC-008).
