import { Module } from '@nestjs/common';
import { ChatGuidanceService } from './chat.guidance.service';
import { ChatGuidanceResolverMutations } from './chat.guidance.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ChatGuidanceAdapterModule } from '@services/adapters/chat-guidance-adapter/chat.guidance.adapter.module';
import { ChatGuidanceResolverQueries } from './chat.guidance.resolver.queries';

@Module({
  imports: [AuthorizationModule, ChatGuidanceAdapterModule],
  providers: [
    ChatGuidanceService,
    ChatGuidanceResolverMutations,
    ChatGuidanceResolverQueries,
  ],
  exports: [ChatGuidanceService, ChatGuidanceResolverMutations],
})
export class ChatGuidanceModule {}
