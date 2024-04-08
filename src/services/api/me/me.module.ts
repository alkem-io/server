import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { InvitationModule } from '@domain/community/invitation/invitation.module';
import { UserModule } from '@domain/community/user/user.module';
import { MeService } from './me.service';
import { MeResolverQueries } from './me.resolver.queries';
import { MeResolverFields } from './me.resolver.fields';
import { SpaceModule } from '@domain/space/space/space.module';
import { RolesModule } from '../roles/roles.module';
import { ActivityLogModule } from '../activity-log/activity.log.module';
import { ActivityModule } from '@platform/activity/activity.module';

@Module({
  imports: [
    AuthorizationModule,
    ApplicationModule,
    InvitationModule,
    UserModule,
    SpaceModule,
    RolesModule,
    ActivityLogModule,
    ActivityModule,
  ],
  providers: [MeService, MeResolverQueries, MeResolverFields],
  exports: [MeService],
})
export class MeModule {}
