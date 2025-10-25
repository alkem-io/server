import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationModule } from '../conversation/conversation.module';
import { ConversationsSet } from './conversations.set.entity';
import { ConversationsSetAuthorizationService } from './conversations.set.service.authorization';
import { ConversationsSetResolverMutations } from './conversations.set.resolver.mutations';
import { ConversationsSetResolverFields } from './conversations.set.resolver.fields';
import { ConversationsSetService } from './conversations.set.service';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    ConversationModule,
    TypeOrmModule.forFeature([ConversationsSet]),
  ],
  providers: [
    ConversationsSetService,
    ConversationsSetAuthorizationService,
    ConversationsSetResolverMutations,
    ConversationsSetResolverFields,
  ],
  exports: [
    ConversationsSetService,
    ConversationsSetAuthorizationService,
    ConversationsSetResolverMutations,
    ConversationsSetResolverFields,
  ],
})
export class ConversationsSetModule {}
