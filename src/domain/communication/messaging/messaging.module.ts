import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { ConversationModule } from '../conversation/conversation.module';
import { ConversationMembershipModule } from '../conversation-membership/conversation.membership.module';
import { Messaging } from './messaging.entity';
import { MessagingResolverMutations } from './messaging.resolver.mutations';
import { MessagingService } from './messaging.service';
import { MessagingAuthorizationService } from './messaging.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    ConversationModule,
    UserLookupModule,
    ConversationMembershipModule,
    SubscriptionServiceModule,
    TypeOrmModule.forFeature([Messaging]),
  ],
  providers: [
    MessagingService,
    MessagingAuthorizationService,
    MessagingResolverMutations,
  ],
  exports: [
    MessagingService,
    MessagingAuthorizationService,
    MessagingResolverMutations,
  ],
})
export class MessagingModule {}
