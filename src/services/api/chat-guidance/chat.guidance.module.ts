import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { GuidanceEngineAdapterModule } from '@services/adapters/chat-guidance-adapter/guidance.engine.adapter.module';
import { ChatGuidanceLogModule } from '@services/api/chat-guidance/chat.guidance.log.module';
import { ChatGuidanceService } from './chat.guidance.service';
import { ChatGuidanceResolverQueries } from './chat.guidance.resolver.queries';
import { ChatGuidanceResolverMutations } from './chat.guidance.resolver.mutations';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    GuidanceEngineAdapterModule,
    ChatGuidanceLogModule,
  ],
  providers: [
    ChatGuidanceService,
    ChatGuidanceResolverMutations,
    ChatGuidanceResolverQueries,
  ],
  exports: [ChatGuidanceService, ChatGuidanceResolverMutations],
})
export class ChatGuidanceModule {}
