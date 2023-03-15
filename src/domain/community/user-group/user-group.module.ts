import { Module } from '@nestjs/common';
import { UserGroupService } from './user-group.service';
import { UserGroupResolverMutations } from './user-group.resolver.mutations';
import { UserModule } from '@domain/community/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGroup } from './user-group.entity';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { UserGroupResolverFields } from './user-group.resolver.fields';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserGroupAuthorizationService } from './user-group.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    ProfileModule,
    UserModule,
    AgentModule,
    TagsetModule,
    TypeOrmModule.forFeature([UserGroup]),
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
