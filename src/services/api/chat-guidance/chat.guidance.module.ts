import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { GuidanceEngineAdapterModule } from '@services/adapters/chat-guidance-adapter/guidance.engine.adapter.module';
import { ChatGuidanceService } from './chat.guidance.service';
import { ChatGuidanceResolverMutations } from './chat.guidance.resolver.mutations';
import { GuidanceReporterModule } from '@services/external/elasticsearch/guidance-reporter';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    GuidanceEngineAdapterModule,
    GuidanceReporterModule,
    AiServerAdapterModule,
    CommunicationAdapterModule,
    VirtualContributorModule,
  ],
  providers: [ChatGuidanceService, ChatGuidanceResolverMutations],
  exports: [ChatGuidanceService, ChatGuidanceResolverMutations],
})
export class ChatGuidanceModule {}
