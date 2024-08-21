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
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { CommunityRoleModule } from '@domain/community/community-role/community.role.module';
import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { AccountHostModule } from '@domain/space/account.host/account.host.module';

@Module({
  imports: [
    AuthorizationModule,
    ApplicationModule,
    AccountHostModule,
    InvitationModule,
    UserModule,
    ContributorModule,
    SpaceModule,
    RolesModule,
    ActivityLogModule,
    ActivityModule,
    CommunityRoleModule,
    EntityResolverModule,
  ],
  providers: [MeService, MeResolverQueries, MeResolverFields],
  exports: [MeService],
})
export class MeModule {}
