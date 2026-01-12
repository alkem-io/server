import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ApplicationModule } from '@domain/access/application/application.module';
import { InvitationModule } from '@domain/access/invitation/invitation.module';
import { MeService } from './me.service';
import { MeResolverQueries } from './me.resolver.queries';
import { MeResolverFields } from './me.resolver.fields';
import { SpaceModule } from '@domain/space/space/space.module';
import { RolesModule } from '../roles/roles.module';
import { ActivityLogModule } from '../activity-log/activity.log.module';
import { ActivityModule } from '@platform/activity/activity.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { InAppNotificationModule } from '@platform/in-app-notification/in.app.notification.module';
import { MessagingModule } from '@domain/communication/messaging/messaging.module';
import { MeConversationsResolverFields } from './me.conversations.resolver.fields';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { ConversationMembershipModule } from '@domain/communication/conversation-membership/conversation.membership.module';

@Module({
  imports: [
    AuthorizationModule,
    ApplicationModule,
    InvitationModule,
    UserLookupModule,
    ContributorModule,
    SpaceModule,
    RolesModule,
    ActivityLogModule,
    ActivityModule,
    EntityResolverModule,
    InAppNotificationModule,
    MessagingModule,
    ConversationMembershipModule,
  ],
  providers: [
    MeService,
    MeResolverQueries,
    MeResolverFields,
    MeConversationsResolverFields,
  ],
  exports: [MeService],
})
export class MeModule {}
