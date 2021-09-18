import { Module } from '@nestjs/common';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { OrganizationService } from './organization.service';
import { OrganizationResolverMutations } from './organization.resolver.mutations';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '@domain/community/organization';
import { OrganizationResolverFields } from './organization.resolver.fields';
import { ProfileModule } from '@domain/community/profile/profile.module';
import { OrganizationResolverQueries } from './organization.resolver.queries';
import { UserModule } from '@domain/community/user/user.module';
import { NamingModule } from '@src/services/domain/naming/naming.module';
import { OrganizationAuthorizationService } from './organization.service.authorization';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { OrganizationVerificationModule } from '../organization-verification/organization.verification.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationEngineModule,
    OrganizationVerificationModule,
    UserModule,
    UserGroupModule,
    TagsetModule,
    NamingModule,
    ProfileModule,
    TypeOrmModule.forFeature([Organization]),
  ],
  providers: [
    OrganizationService,
    OrganizationAuthorizationService,
    OrganizationResolverQueries,
    OrganizationResolverMutations,
    OrganizationResolverFields,
  ],
  exports: [OrganizationService, OrganizationAuthorizationService],
})
export class OrganizationModule {}
