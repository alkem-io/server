# Quickstart: Whiteboard Guest Access Toggle

## Prerequisites

- Platform dependencies running via `pnpm run start:services`
- API started locally (`pnpm start:dev`) or use any environment running the same schema revision
- An account that holds the `PUBLIC_SHARE` privilege for the whiteboard and access to a space with `allowGuestContributions = true`
- Optional: tail server logs (`pnpm run start:dev | bunyan`) so you can see the structured correlation output

## Enabling Guest Access

1. Collect a whiteboard ID and confirm its parent space allows guest contributions and that your account still holds the `PUBLIC_SHARE` privilege.
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
3. Verify the response reports `success: true`, `guestContributionsAllowed: true`, and `authorization.credentialRules` now include a `GLOBAL_GUEST` entry with READ/UPDATE_CONTENT/CONTRIBUTE.
4. Tail the API logs: look for debug statements named `Whiteboard guest access toggle resolved` with the same `whiteboardId`, `userId`, and `correlationId` as your request.
5. Open the guest route in an incognito browser: `https://app.localhost/guest/whiteboards/<whiteboard-uuid>` and confirm the board renders without authentication.

## Disabling Guest Access

1. Re-run the mutation with `guestAccessEnabled: false` using the same shape as above.
2. Confirm the response shows `success: true`, `guestContributionsAllowed: false`, and the authorization payload no longer lists `GLOBAL_GUEST` privileges.
3. Tail logs again: the `Whiteboard guest access toggle resolved` message now reports `guestAccessActive: false` for the same `correlationId`.
4. Reload the guest route and expect a 404/authorization failure in the browser or API client.

## Validation & Instrumentation

- **Structured logs**: Every toggle emits debug entries (`Whiteboard guest access toggle requested/persisted/resolved`). Each log contains `correlationId`, `whiteboardId`, `userId`, and the requested state, so you can trace failures without enabling verbose logging globally.
- **Targeted automated suites** (no coverage gating):
  ```bash
  pnpm run test:ci:no:coverage -- test/unit/domain/common/whiteboard/whiteboard.guest-access.service.spec.ts test/unit/domain/common/whiteboard/whiteboard.resolver.mutations.spec.ts
  ```
- **Schema guardrails**: Run `pnpm run schema:print && pnpm run schema:sort && pnpm run schema:diff` before publishing to ensure the GraphQL contract matches expectations.

## Rollback

- Re-run the mutation with `guestAccessEnabled: false` for all impacted whiteboards.
- Restore any cached authorization data if additional layers (e.g., Redis) are introduced.
- Cross-check logs for `persisted: true` to ensure the authorization policy actually flipped back to PRIVATE-only access.
