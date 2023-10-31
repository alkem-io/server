import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { GuidanceEngineAdapterModule } from '@services/adapters/chat-guidance-adapter/guidance.engine.adapter.module';
import { ChatGuidanceService } from './chat.guidance.service';
import { ChatGuidanceResolverQueries } from './chat.guidance.resolver.queries';
import { ChatGuidanceResolverMutations } from './chat.guidance.resolver.mutations';
import { GuidanceReporterModule } from '@services/external/elasticsearch/guidance-reporter';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    GuidanceEngineAdapterModule,
    GuidanceReporterModule,
  ],
  providers: [
    ChatGuidanceService,
    ChatGuidanceResolverMutations,
    ChatGuidanceResolverQueries,
  ],
  exports: [ChatGuidanceService, ChatGuidanceResolverMutations],
})
export class ChatGuidanceModule {}
