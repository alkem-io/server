# Quickstart: Whiteboard Guest Access Toggle

## Prerequisites

- Server dependencies running via `pnpm run start:services`
- API started locally (`pnpm start:dev`) or against staging environment with matching schema
- Account holding the PUBLIC_SHARE privilege for the target whiteboard/space

## Enabling Guest Access

1. Collect a whiteboard ID and confirm its space has `allowGuestContribution = true` and that your account retains the PUBLIC_SHARE privilege.
2. Execute the GraphQL mutation in GraphiQL or via curl:
   ```graphql
   mutation EnableGuest($id: UUID!, $enabled: Boolean!) {
     updateWhiteboardGuestAccess(
       input: { whiteboardId: $id, guestAccessEnabled: $enabled }
     ) {
       success
       whiteboard {
         id
         guestContributionsAllowed
         authorization {
           credentialRules {
             name
             grantedPrivileges
           }
         }
       }
       errors {
         code
         message
       }
     }
   }
   ```
   ```json
   {
     "id": "<whiteboard-uuid>",
     "enabled": true
   }
   ```
3. Verify the response reports `guestContributionsAllowed: true` and includes GLOBAL_GUEST permissions.
4. Open the guest route in an incognito browser: `https://app.localhost/guest/whiteboards/<whiteboard-uuid>` and confirm read/write access without authentication.

## Disabling Guest Access

1. Re-run the mutation with `guestAccessEnabled: false`.
2. Confirm the response shows `success: true`, `guestContributionsAllowed: false`, and the authorization payload no longer lists GLOBAL_GUEST privileges.
3. Reload the guest route and expect a 404/authorization failure.

## Validation & Instrumentation

- Check service logs for entries tagged `guestAccess.toggle` to confirm success or authorization failures.
- Run targeted automated suites:
  - `pnpm test -- toggle-guest-access` (placeholder script; replace with actual path once implemented)
  - `pnpm run test:ci test/contract/schema.contract.spec.ts` to ensure schema diff remains compliant.

## Rollback

- Re-run the mutation with `guestAccessEnabled: false` for all impacted whiteboards.
- Restore any cached authorization data if additional layers (e.g., Redis) are introduced.
