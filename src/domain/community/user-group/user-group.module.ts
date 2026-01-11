import { Module } from '@nestjs/common';
import { UserGroupService } from './user-group.service';
import { UserGroupResolverMutations } from './user-group.resolver.mutations';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGroup } from './user-group.entity';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { UserGroupResolverFields } from './user-group.resolver.fields';
import { ActorModule } from '@domain/actor/actor/actor.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserGroupAuthorizationService } from './user-group.service.authorization';
import { UserLookupModule } from '../user-lookup/user.lookup.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    ProfileModule,
    UserLookupModule,
    ActorModule,
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
