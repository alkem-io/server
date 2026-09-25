import { Module } from '@nestjs/common';
import { MessagingRedisModule } from '@services/infrastructure/redis-client/messaging-redis.module';
import { ProxySurfaceUsageReadService } from './proxy.surface.usage.read.service';
import { ProxySurfaceUsageService } from './proxy.surface.usage.service';

/**
 * Classification of message-related API surfaces and the usage ledger that
 * counts calls on the proxy ones. Nest deduplicates the module, so every
 * importer shares one aggregator (one flush timer per process).
 */
@Module({
  imports: [MessagingRedisModule],
  providers: [ProxySurfaceUsageService, ProxySurfaceUsageReadService],
  exports: [ProxySurfaceUsageService, ProxySurfaceUsageReadService],
})
export class ProxySurfaceModule {}
