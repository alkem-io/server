import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { InvitationModule } from '@domain/community/invitation/invitation.module';
import { UserModule } from '@domain/community/user/user.module';
import { MeService } from './me.service';
import { MeResolverQueries } from './me.resolver.queries';
import { MeResolverFields } from './me.resolver.fields';
import { SpaceModule } from '@domain/challenge/space/space.module';
import { RolesModule } from '../roles/roles.module';
import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { ActivityLogModule } from '../activity-log/activity.log.module';
import { ActivityModule } from '@platform/activity/activity.module';

@Module({
  imports: [
    AuthorizationModule,
    ApplicationModule,
    InvitationModule,
    UserModule,
    SpaceModule,
    ChallengeModule,
    OpportunityModule,
    RolesModule,
    ActivityLogModule,
    ActivityModule,
  ],
  providers: [MeService, MeResolverQueries, MeResolverFields],
  exports: [MeService],
})
export class MeModule {}
