# Quickstart: User Design Version Setting

**Feature**: `096-user-design-version` | **Date**: 2026-05-12

This guide walks through verifying the feature end-to-end against a local Alkemio server. It covers the three user stories from the spec: new-user default, switching via mutation, and reading via existing queries.

## Prerequisites

1. Local dependencies running: `pnpm run start:services`
2. Migrations applied (the new feature migration must be present): `pnpm run migration:run`
3. Server running: `pnpm start:dev`
4. GraphQL Playground accessible at `http://localhost:3000/graphiql`
5. A valid Kratos session for an authenticated user (use `/register-user` skill for a fresh user, or `/non-interactive-login` / `/interactive-login` for an existing one)

## Story 1 — New user gets `designVersion: 1`

1. Register a new user (e.g., via the `/register-user` skill or your usual signup flow).
2. Query the freshly-created user's settings:

   ```graphql
   query MyDesignVersion {
     me {
       user {
         id
         settings {
           designVersion
         }
       }
     }
   }
   ```

3. **Expected**: `me.user.settings.designVersion === 1`.

This validates **FR-002, FR-003, FR-008** and **Story 1** acceptance scenarios 1 + 2.

## Story 1 (continued) — Existing user surfaces `designVersion: 1`

1. Log in as a user that existed **before** the migration ran (any account from `restore-dbs` or a long-lived dev account).
2. Run the same query as above.
3. **Expected**: `me.user.settings.designVersion === 1` — the migration's `NOT NULL DEFAULT 1` backfilled every pre-existing row.

This validates **FR-009** and **Story 1** acceptance scenario 3.

## Story 2 — Switch design version

1. As an authenticated user with `UPDATE` privilege on their own account, opt in to the new design:

   ```graphql
   mutation SetToNewDesign($userId: UUID!) {
     updateUserSettings(
       settingsData: { userID: $userId, settings: { designVersion: 2 } }
     ) {
       id
       settings {
         designVersion
       }
     }
   }
   ```

   Variables:

   ```json
   { "userId": "<your-user-id>" }
   ```

2. **Expected**: the mutation returns the user with `settings.designVersion === 2`.
3. Re-run the `MyDesignVersion` query — value persists across calls/sessions.
4. Repeat with `designVersion: 3` (future-version case) — expect the mutation to succeed and the value to round-trip as `3`.
5. Repeat with `designVersion: 0`, `designVersion: -1` — expect both to be accepted (FR-004: no restrictions).

This validates **FR-004, FR-006, FR-007** and **Story 2** acceptance scenarios 1 + 2.

## Story 2 — Authorization

1. Authenticate as a non-admin user `A`.
2. Attempt to set `designVersion` on a different user `B`'s account:

   ```graphql
   mutation SetSomeoneElses {
     updateUserSettings(
       settingsData: {
         userID: "<user-B-id>"
         settings: { designVersion: 2 }
       }
     ) {
       id
     }
   }
   ```

3. **Expected**: the request is rejected by the existing user-settings authorization check (privilege `UPDATE` on the target user's `authorization` policy) — same behavior as today's homeSpace/privacy updates.

This validates **FR-006** and **Story 2** acceptance scenario 3.

## Edge cases

| Case | Request | Expected result |
| ---- | ------- | --------------- |
| Non-integer (string) | `designVersion: "two"` (or send via Variables typed as string) | DTO validation error (`@IsInt()` rejects); HTTP 400-class GraphQL error before reaching the domain. |
| Decimal | `designVersion: 2.5` | Rejected by `@IsInt()`. |
| Boolean | `designVersion: true` | Rejected by GraphQL `Int` coercion. |
| Negative | `designVersion: -1` | Accepted and persisted (FR-004). |
| Zero | `designVersion: 0` | Accepted and persisted. |
| Omitted from update | `settings: { privacy: { ... } }` only | Existing value untouched (FR-007 — partial update semantics). |

## Regression checks (Story 3 / SC-005)

Sanity-check that the other UserSettings sub-objects still round-trip:

```graphql
query FullSettings {
  me {
    user {
      settings {
        designVersion
        homeSpace { spaceID autoRedirect }
        privacy { contributionRolesPubliclyVisible }
        communication { allowOtherUsersToSendMessages }
        notification { user { mentioned { email inApp push } } }
      }
    }
  }
}
```

All sibling fields should return their previously-persisted values; only `designVersion` is new.

## Cleanup

To roll back during local testing:

```bash
pnpm run migration:revert
```

The down migration drops the `designVersion` column. Re-running `migration:run` re-creates it with the default `1`.

## Test plan summary

| Spec ref | Verified by |
| -------- | ----------- |
| FR-001, FR-008 | Story 1 query, Regression query |
| FR-002, FR-009 | Existing-user query (Story 1 continued) |
| FR-003 | New-user query (Story 1) |
| FR-004, FR-005 | Edge cases table |
| FR-006, FR-010 | Story 2 + Authorization sections |
| FR-007 | Story 2 round-trip + "omitted from update" edge case |
| SC-001, SC-002 | Stories 1 and 1-continued |
| SC-003 | Story 2 round-trip (sub-second under local load) |
| SC-004 | `designVersion: 3` test (no schema change needed) |
| SC-005 | Regression query |
