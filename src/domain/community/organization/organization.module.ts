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
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { OrganizationAuthorizationService } from './organization.service.authorization';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { OrganizationVerificationModule } from '../organization-verification/organization.verification.module';
import { PreferenceModule } from '@domain/common/preference';
import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { OrganizationDataloaderService } from './organization.dataloader.service';
import { PlatformAuthorizationModule } from '@src/platform/authorization/platform.authorization.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    OrganizationVerificationModule,
    UserModule,
    UserGroupModule,
    TagsetModule,
    NamingModule,
    PlatformAuthorizationModule,
    ProfileModule,
    PreferenceModule,
    PreferenceSetModule,
    TypeOrmModule.forFeature([Organization]),
  ],
  providers: [
    OrganizationService,
    OrganizationDataloaderService,
    OrganizationAuthorizationService,
    OrganizationResolverQueries,
    OrganizationResolverMutations,
    OrganizationResolverFields,
  ],
  exports: [
    OrganizationService,
    OrganizationDataloaderService,
    OrganizationAuthorizationService,
  ],
})
export class OrganizationModule {}
