import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { UserLookupModule } from '../user-lookup/user.lookup.module';
import { UserGroupResolverFields } from './user-group.resolver.fields';
import { UserGroupResolverMutations } from './user-group.resolver.mutations';
import { UserGroupService } from './user-group.service';
import { UserGroupAuthorizationService } from './user-group.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    ProfileModule,
    UserLookupModule,
    AgentModule,
  ],
  providers: [
    UserGroupService,
    UserGroupAuthorizationService,
    UserGroupResolverMutations,
    UserGroupResolverFields,
  ],
  exports: [UserGroupService, UserGroupAuthorizationService],
})
export class UserGroupModule {}
