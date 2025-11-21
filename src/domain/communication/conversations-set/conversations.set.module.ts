import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationModule } from '../conversation/conversation.module';
import { ConversationsSet } from './conversations.set.entity';
import { ConversationsSetAuthorizationService } from './conversations.set.service.authorization';
import { ConversationsSetResolverMutations } from './conversations.set.resolver.mutations';
import { ConversationsSetService } from './conversations.set.service';
import { PlatformWellKnownVirtualContributorsModule } from '@platform/platform.well.known.virtual.contributors';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    ConversationModule,
    UserLookupModule,
    PlatformWellKnownVirtualContributorsModule,
    TypeOrmModule.forFeature([ConversationsSet]),
  ],
  providers: [
    ConversationsSetService,
    ConversationsSetAuthorizationService,
    ConversationsSetResolverMutations,
  ],
  exports: [
    ConversationsSetService,
    ConversationsSetAuthorizationService,
    ConversationsSetResolverMutations,
  ],
})
export class ConversationsSetModule {}
