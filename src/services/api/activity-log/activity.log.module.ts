import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { ActivityLogResolverQueries } from './activity.log.resolver.queries';
import { ActivityLogService } from './activity.log.service';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ActivityModule,
    CollaborationModule,
  ],
  providers: [ActivityLogService, ActivityLogResolverQueries],
  exports: [],
})
export class ActivityLogModule {}
