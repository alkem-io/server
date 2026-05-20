import { Module } from '@nestjs/common';
import { ServiceClientLifecycleAudit } from './audit/service-client-lifecycle.audit';
import { HydraAdminClient } from './hydra-admin.client';
import { ServiceClientCacheModule } from './service-client-cache/service-client-cache.module';

/**
 * `AdminServiceClientsModule` — aggregates the service-client lifecycle
 * surface (FR-001..FR-007, FR-020) backing the admin GraphQL surface
 * defined in `graphql/schema/admin-service-clients.graphql`.
 *
 * GLOBAL_ADMIN gating recipe (see ./README.md) is applied per-resolver,
 * NOT via a module-level decorator/guard.
 *
 * 004 T029 — re-exports `ServiceClientCacheModule` (admission cache +
 * revoked-bearer blocklist) so consumers depending on
 * `AdminServiceClientsModule` (OIDC strategy module, lifecycle
 * resolvers) get the cache providers transitively without each having
 * to import the cache module directly.
 */
@Module({
  imports: [ServiceClientCacheModule],
  providers: [HydraAdminClient, ServiceClientLifecycleAudit],
  exports: [
    HydraAdminClient,
    ServiceClientLifecycleAudit,
    ServiceClientCacheModule,
  ],
})
export class AdminServiceClientsModule {}
