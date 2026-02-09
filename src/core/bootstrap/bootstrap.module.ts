import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/agent.info.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { MessagingModule } from '@domain/communication/messaging/messaging.module';
import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { UserModule } from '@domain/community/user/user.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { AccountModule } from '@domain/space/account/account.module';
import { Space } from '@domain/space/space/space.entity';
import { SpaceModule } from '@domain/space/space/space.module';
import { TemplateDefaultModule } from '@domain/template/template-default/template.default.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { TemplatesSetModule } from '@domain/template/templates-set/templates.set.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { LicensePlanModule } from '@platform/licensing/credential-based/license-plan/license.plan.module';
import { LicensingFrameworkModule } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.module';
import { PlatformModule } from '@platform/platform/platform.module';
import { PlatformWellKnownVirtualContributorsModule } from '@platform/platform.well.known.virtual.contributors/platform.well.known.virtual.contributors.module';
import { PlatformTemplatesModule } from '@platform/platform-templates/platform.templates.module';
import { AiPersonaModule } from '@services/ai-server/ai-persona';
import { AiServerModule } from '@services/ai-server/ai-server/ai.server.module';
import { SearchIngestModule } from '@services/api/search/ingest';
import { AdminAuthorizationModule } from '@src/platform-admin/domain/authorization/admin.authorization.module';
import { BootstrapService } from './bootstrap.service';

@Module({
  imports: [
    AiServerModule,
    AiPersonaModule,
    AgentModule,
    AuthenticationAgentInfoModule,
    AuthorizationPolicyModule,
    LicenseModule,
    ContributorModule,
    SpaceModule,
    OrganizationModule,
    OrganizationLookupModule,
    AccountModule,
    SpaceModule,
    UserModule,
    UserLookupModule,
    AdminAuthorizationModule,
    PlatformModule,
    PlatformAuthorizationPolicyModule,
    CommunicationModule,
    TypeOrmModule.forFeature([Space]),
    SearchIngestModule,
    TemplatesSetModule,
    TemplatesManagerModule,
    PlatformTemplatesModule,
    TemplateDefaultModule,
    LicensingFrameworkModule,
    LicensePlanModule,
    MessagingModule,
    PlatformWellKnownVirtualContributorsModule,
    RoleSetModule,
  ],
  providers: [BootstrapService],
  exports: [BootstrapService],
})
export class BootstrapModule {}
