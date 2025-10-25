import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Conversation } from './conversation.entity';
import { RoomModule } from '@domain/communication/room/room.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { ConversationService } from './conversation.service';
import { ConversationAuthorizationService } from './conversation.service.authorization';
import { ConversationResolverFields } from './conversation.resolver.fields';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { ConversationResolverMutations } from './conversation.resolver.mutations';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    RoomModule,
    UserLookupModule,
    VirtualContributorLookupModule,
    AiServerAdapterModule,
    CommunicationAdapterModule,
    TypeOrmModule.forFeature([Conversation]),
  ],
  providers: [
    ConversationService,
    ConversationAuthorizationService,
    ConversationResolverFields,
    ConversationResolverMutations,
  ],
  exports: [ConversationService, ConversationAuthorizationService],
})
export class ConversationModule {}
