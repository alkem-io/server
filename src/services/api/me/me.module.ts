import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ApplicationModule } from '@domain/access/application/application.module';
import { InvitationModule } from '@domain/access/invitation/invitation.module';
import { ActorModule } from '@domain/actor/actor/actor.module';
import { MessagingModule } from '@domain/communication/messaging/messaging.module';
import { AccountDeletionModule } from '@domain/community/user/account-deletion/account.deletion.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { Module } from '@nestjs/common';
import { ActivityModule } from '@platform/activity/activity.module';
import { InAppNotificationModule } from '@platform/in-app-notification/in.app.notification.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { McpServerModule } from '@services/mcp-server/mcp-server.module';
import { ActivityLogModule } from '../activity-log/activity.log.module';
import { RolesModule } from '../roles/roles.module';
import { MeConversationsResolverFields } from './me.conversations.resolver.fields';
import { MeResolverFields } from './me.resolver.fields';
import { MeResolverQueries } from './me.resolver.queries';
import { MeService } from './me.service';

@Module({
  imports: [
    AuthorizationModule,
    ApplicationModule,
    InvitationModule,
    UserLookupModule,
    ActorModule,
    SpaceModule,
    RolesModule,
    ActivityLogModule,
    ActivityModule,
    EntityResolverModule,
    InAppNotificationModule,
    MessagingModule,
    McpServerModule,
    AccountDeletionModule,
    AccountLookupModule,
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
