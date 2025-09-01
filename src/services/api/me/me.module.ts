import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ApplicationModule } from '@domain/access/application/application.module';
import { InvitationModule } from '@domain/access/invitation/invitation.module';
import { UserModule } from '@domain/community/user/user.module';
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

@Module({
  imports: [
    AuthorizationModule,
    ApplicationModule,
    InvitationModule,
    UserModule,
    ContributorModule,
    SpaceModule,
    RolesModule,
    ActivityLogModule,
    ActivityModule,
    EntityResolverModule,
    InAppNotificationModule,
  ],
  providers: [MeService, MeResolverQueries, MeResolverFields],
  exports: [MeService],
})
export class MeModule {}
