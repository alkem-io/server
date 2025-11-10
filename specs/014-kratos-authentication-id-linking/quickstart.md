# Quickstart – Kratos Authentication ID Linking

## Prerequisites
- Local environment configured per `docs/Running.md` (MySQL 8, Kratos stack, RabbitMQ, Redis).
- Admin credentials for the Kratos Admin API.
- Access to the internal network segment that can reach the REST endpoint.

## Setup Steps
1. **Install dependencies**
   ```bash
   pnpm install
   ```
2. **Generate database migration** (applies to development only; committed migration will be reused in other environments)
   ```bash
   pnpm run migration:generate -n AddAuthenticationIDToUser
   ```
3. **Apply migrations**
   ```bash
   pnpm run migration:run
   ```
4. **Rebuild GraphQL schema artifacts** (only if schema changes accompany the feature)
   ```bash
   pnpm run schema:print && pnpm run schema:sort && pnpm run schema:diff
   ```

## Operating the Backfill Module
1. Deploy the updated server.
2. Authenticate as a platform admin and execute the new GraphQL mutation:
   ```graphql
    mutation BackfillAuthenticationIDs {
       adminBackfillAuthenticationIDs {
       processed
       updated
       skipped
     }
   }
   ```
3. Monitor logs (`LogContext.AUTH`) for batch progress and missing identities.
4. Mutation is idempotent—rerun if Kratos availability issues occur.

## Using the Internal REST Endpoint
1. From a whitelisted host inside the cluster, call:
   ```bash
         curl -X POST \
          -H "Content-Type: application/json" \
             --data '{"authenticationId":"<uuid>"}' \
             https://<server-host>/rest/internal/identity/resolve
   ```
2. The endpoint returns `{ "userId": "<alkemio-user-uuid>" }`.
3. If the user does not exist, the server will link or create the user via the registration service before responding.

## Verification & Rollback
- **Verification:**
  - Confirm `authenticationID` populated for new logins (inspect database or GraphQL query).
  - Verify `adminUserAccountDelete` mutation sets `authenticationID` to `NULL`.
- Run targeted tests: `pnpm run test:ci -- test/integration/identity-resolve` and `pnpm run test:ci -- test/integration/platform-admin`.
- **Rollback:**
  - Revert deployment.
  - Run `pnpm run migration:revert` to drop the column if necessary.
  - Disable the platform-admin module by feature flag or configuration if provided.

## Rollout Notes

- Apply the `authenticationID` migration before enabling the REST endpoint or platform-admin tooling.
- Execute `adminBackfillAuthenticationIDs` and monitor `LogContext.AUTH` logs for progress metrics and missing identities.
- The `/rest/internal/identity/resolve` endpoint logs every request (including caller IP) and rejects malformed UUIDs with HTTP 400.
- Platform-admin mutations that remove Kratos accounts now clear the stored `authenticationID`; no manual cleanup is required.
