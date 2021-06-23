import { Module } from '@nestjs/common';
import { UserGroupService } from './user-group.service';
import { UserGroupResolverMutations } from './user-group.resolver.mutations';
import { UserModule } from '@domain/community/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGroup } from './user-group.entity';
import { ProfileModule } from '@domain/community/profile/profile.module';
import { UserGroupResolverFields } from './user-group.resolver.fields';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { AuthorizationDefinitionModule } from '@domain/common/authorization-definition/authorization.definition.module';

@Module({
  imports: [
    AuthorizationDefinitionModule,
    AuthorizationEngineModule,
    ProfileModule,
    UserModule,
    AgentModule,
    TagsetModule,
    TypeOrmModule.forFeature([UserGroup]),
  ],
  providers: [
    UserGroupService,
    UserGroupResolverMutations,
    UserGroupResolverFields,
  ],
  exports: [UserGroupService],
})
export class UserGroupModule {}
