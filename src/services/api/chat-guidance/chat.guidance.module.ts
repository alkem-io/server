import { Module } from '@nestjs/common';
import { ChatGuidanceService } from './chat.guidance.service';
import { ChatGuidanceResolverMutations } from './chat.guidance.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ChatGuidanceResolverQueries } from './chat.guidance.resolver.queries';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { GuidanceEngineAdapterModule } from '@services/adapters/chat-guidance-adapter/guidance.engine.adapter.module';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    GuidanceEngineAdapterModule,
  ],
  providers: [
    ChatGuidanceService,
    ChatGuidanceResolverMutations,
    ChatGuidanceResolverQueries,
  ],
  exports: [ChatGuidanceService, ChatGuidanceResolverMutations],
})
export class ChatGuidanceModule {}
