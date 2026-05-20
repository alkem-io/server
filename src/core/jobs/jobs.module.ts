import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ServiceClientLifecycleAudit } from '@src/platform-admin/domain/service-clients/audit/service-client-lifecycle.audit';
import { HydraAdminClient } from '@src/platform-admin/domain/service-clients/hydra-admin.client';

import { CascadeRevokeHydraCleanupProcessor } from './cascade-revoke-hydra-cleanup.processor';

/**
 * 004 T035 — minimal Nest wrapper around the BullMQ workers. Kept
 * intentionally thin: no `@nestjs/bullmq` integration is pulled in
 * because the v1 surface is exactly one queue + one processor.
 *
 * The processor owns its own `Queue` and `Worker` instances (initialised
 * in its constructor against the Redis connection in
 * `ConfigService.storage.redis`) and exposes `enqueue()` to callers.
 * If the surface grows beyond one queue, swap this in for the
 * `BullMQModule.forRootAsync` wiring.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    HydraAdminClient,
    ServiceClientLifecycleAudit,
    CascadeRevokeHydraCleanupProcessor,
  ],
  exports: [CascadeRevokeHydraCleanupProcessor],
})
export class JobsModule {}
