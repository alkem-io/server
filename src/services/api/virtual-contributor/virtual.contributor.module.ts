import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { GuidanceEngineAdapterModule } from '@services/adapters/chat-guidance-adapter/guidance.engine.adapter.module';
import { VirtualContributorService } from './virtual.contributor.service';
import { VirtualContributorResolverQueries } from './virtual.contributor.resolver.queries';
import { VirtualContributorResolverMutations } from './virtual.contributor.resolver.mutations';
import { GuidanceReporterModule } from '@services/external/elasticsearch/guidance-reporter';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    GuidanceEngineAdapterModule,
    GuidanceReporterModule,
  ],
  providers: [
    VirtualContributorService,
    VirtualContributorResolverMutations,
    VirtualContributorResolverQueries,
  ],
  exports: [VirtualContributorService, VirtualContributorResolverMutations],
})
export class VirtualContributorModule {}
