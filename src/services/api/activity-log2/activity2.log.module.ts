import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { ActivityLog2ResolverQueries } from './activity2.log.resolver.queries';
import { ActivityLog2Service } from './activity2.log.service';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { UserModule } from '@domain/community/user/user.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { AspectModule } from '@domain/collaboration/aspect/aspect.module';
import { CanvasModule } from '@domain/common/canvas/canvas.module';
import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ActivityModule,
    CollaborationModule,
    UserModule,
    CommunityModule,
    CalloutModule,
    AspectModule,
    CanvasModule,
    ChallengeModule,
    OpportunityModule,
  ],
  providers: [ActivityLog2Service, ActivityLog2ResolverQueries],
  exports: [],
})
export class ActivityLog2Module {}
