# `service-clients` — Admin GraphQL surface for OAuth2 `client_credentials`

This module backs spec 004 (`specs/004-service-client-credentials/`).
It exposes the GraphQL surface defined in
`graphql/schema/admin-service-clients.graphql` and the lifecycle services
that drive Hydra `OAuth2Client` registration, rotation, and revocation.

## Trust boundary: `GLOBAL_ADMIN` gating recipe

**Every** mutation and query on this surface is `GLOBAL_ADMIN`-gated
server-side. Non-admin callers MUST receive an authorization error that
is **indistinguishable from "client does not exist"** (FR-006
single-trust-boundary). The recipe below produces that shape for free.

### NO new decorator. NO new guard.

We replicate the standing platform-admin pattern. The canonical
reference is
[`admin.communication.resolver.mutations.ts`](../communication/admin.communication.resolver.mutations.ts).

### The recipe

1. **Constructor builds the policy ONCE.** Use
   `AuthorizationPolicyService.createGlobalRolesAuthorizationPolicy` with
   the `[GLOBAL_ADMIN]` global role and the privilege you intend to
   require on every method:

   ```ts
   import {
     AuthorizationPrivilege,
     AuthorizationRoleGlobal,
   } from '@common/enums';
   import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
   import { AuthorizationService } from '@core/authorization/authorization.service';
   import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';

   @InstrumentResolver()
   @Resolver()
   export class AdminServiceClientsResolverMutations {
     private serviceClientAdminPolicy: IAuthorizationPolicy;

     constructor(
       private authorizationPolicyService: AuthorizationPolicyService,
       private authorizationService: AuthorizationService,
       private adminServiceClientsService: AdminServiceClientsService
     ) {
       this.serviceClientAdminPolicy =
         this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
           [AuthorizationRoleGlobal.GLOBAL_ADMIN],
           [AuthorizationPrivilege.PLATFORM_ADMIN],
           'service-client admin'
         );
     }
     // …
   }
   ```

2. **Every method calls `grantAccessOrFail` BEFORE any existence check.**
   This is load-bearing — checking existence first would let a non-admin
   distinguish "exists but forbidden" from "does not exist" via timing
   or error shape. Calling `grantAccessOrFail` first short-circuits the
   request with the same `FORBIDDEN` error regardless of whether the
   target row exists:

   ```ts
   @Mutation(() => ServiceClientSecretReveal)
   async rotateServiceClientSecret(
     @Args('clientId') clientId: string,
     @CurrentActor() actorContext: ActorContext
   ): Promise<ServiceClientSecretReveal> {
     await this.authorizationService.grantAccessOrFail(
       actorContext,
       this.serviceClientAdminPolicy,
       AuthorizationPrivilege.PLATFORM_ADMIN,
       `rotate service client secret: ${clientId}`
     );
     // ↑ MUST come first. Existence checks, precondition checks, and
     //   Hydra calls all happen below this line.
     return this.adminServiceClientsService.rotateServiceClientSecret(
       clientId,
       actorContext
     );
   }
   ```

3. **Same recipe on queries.** `listServiceClients`,
   `serviceClient(clientId)`, `listPlatformScopes`, `platformScope`, and
   `serviceClientAuditEvents` use the same constructor-built policy and
   the same first-line `grantAccessOrFail` call. There is no separate
   read-only role in v1.

## Why this shape

- The standing pattern (see `admin.communication.*`, `admin.user.*`,
  `admin.organization.*`) already produces the FR-006 indistinguishability
  property for free. Inventing a new decorator or guard would diverge
  from a working pattern that the platform's authorization tests already
  cover.
- The pane in `alkemio-client-web` hides the navigation entry from
  non-admins as a UX nicety (reuses the existing
  `NonPlatformAdminRedirect`). The server-side `grantAccessOrFail` call
  is the **binding** trust boundary — the client gate is a hint, not a
  guarantee.
- The pattern composes cleanly with existing instrumentation
  (`@InstrumentResolver`, `@Profiling.api`) and with the
  `@CurrentActor()` resolver-argument decorator already used across the
  platform.

## Where each FR's gate lands

| FR     | Operation                              | Privilege required        |
|--------|----------------------------------------|---------------------------|
| FR-001 | `registerServiceClient`                | `PLATFORM_ADMIN`          |
| FR-002 | `listServiceClients`, `serviceClient`  | `PLATFORM_ADMIN`          |
| FR-002a| `updateServiceClientScopes`            | `PLATFORM_ADMIN`          |
| FR-002b| `updateServiceClientDescription`       | `PLATFORM_ADMIN`          |
| FR-002c| `reassignServiceClientOwner`           | `PLATFORM_ADMIN`          |
| FR-003 | `rotateServiceClientSecret`            | `PLATFORM_ADMIN`          |
| FR-004 | `revokeServiceClient`                  | `PLATFORM_ADMIN`          |
| FR-004a| `reEnableServiceClient`                | `PLATFORM_ADMIN`          |
| FR-007a| `addPlatformScope`, `removePlatformScope`, `setPlatformScopeBaselineMembership` | `PLATFORM_ADMIN` |
| FR-022a| `serviceClientAuditEvents`             | `PLATFORM_ADMIN`          |

All of them resolve through the **same** constructor-built policy. No
per-method policy variation in v1.

## Related files in this module

- `hydra-admin.client.ts` — thin `@ory/hydra-client` v2 adapter
- `normalize-name.ts` — canonical `name_normalised` key derivation
- `precondition.errors.ts` — FR-003 / FR-004a / FR-007a guard error shapes
- `admin.service-clients.module.ts` — Nest aggregator

The resolver classes themselves land in subsequent Phase-3+ tasks
(T056, T072, …) — this README is the authoritative gating reference for
all of them.
