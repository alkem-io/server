import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Conversation } from './conversation.entity';
import { ConversationMembershipModule } from '../conversation-membership/conversation.membership.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { ConversationService } from './conversation.service';
import { ConversationAuthorizationService } from './conversation.service.authorization';
import { ConversationResolverFields } from './conversation.resolver.fields';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { ConversationResolverMutations } from './conversation.resolver.mutations';
import { GuidanceReporterModule } from '@services/external/elasticsearch/guidance-reporter/guidance.reporter.module';
import { PlatformWellKnownVirtualContributorsModule } from '@platform/platform.well.known.virtual.contributors';
import { RoomLookupModule } from '../room-lookup/room.lookup.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    RoomModule,
    RoomLookupModule,
    UserLookupModule,
    VirtualContributorLookupModule,
    GuidanceReporterModule,
    PlatformWellKnownVirtualContributorsModule,
    ConversationMembershipModule,
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
