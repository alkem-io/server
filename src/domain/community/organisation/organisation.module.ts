import { Module } from '@nestjs/common';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { OrganisationService } from './organisation.service';
import { OrganisationResolverMutations } from './organisation.resolver.mutations';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organisation } from '@domain/community/organisation';
import { OrganisationResolverFields } from './organisation.resolver.fields';
import { ProfileModule } from '@domain/community/profile/profile.module';
import { OrganisationResolverQueries } from './organisation.resolver.queries';
import { UserModule } from '@domain/community/user/user.module';
import { NamingModule } from '@src/services/domain/naming/naming.module';
import { OrganisationAuthorizationService } from './organisation.service.authorization';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationEngineModule,
    UserModule,
    UserGroupModule,
    TagsetModule,
    NamingModule,
    ProfileModule,
    TypeOrmModule.forFeature([Organisation]),
  ],
  providers: [
    OrganisationService,
    OrganisationAuthorizationService,
    OrganisationResolverQueries,
    OrganisationResolverMutations,
    OrganisationResolverFields,
  ],
  exports: [OrganisationService, OrganisationAuthorizationService],
})
export class OrganisationModule {}
