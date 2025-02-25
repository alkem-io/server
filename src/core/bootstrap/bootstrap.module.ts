import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpaceModule } from '@domain/space/space/space.module';
import { UserModule } from '@domain/community/user/user.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AdminAuthorizationModule } from '@platform/admin/authorization/admin.authorization.module';
import { BootstrapService } from './bootstrap.service';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { PlatformModule } from '@platform/platform/platform.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { NameReporterModule } from '@services/external/elasticsearch/name-reporter/name.reporter.module';
import { AccountModule } from '@domain/space/account/account.module';
import { SearchIngestModule } from '@services/api/search/ingest';
import { AiServerModule } from '@services/ai-server/ai-server/ai.server.module';
import { Space } from '@domain/space/space/space.entity';
import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { TemplatesSetModule } from '@domain/template/templates-set/templates.set.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { TemplateDefaultModule } from '@domain/template/template-default/template.default.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { AiPersonaServiceModule } from '@services/ai-server/ai-persona-service/ai.persona.service.module';
import { LicensingFrameworkModule } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.module';
import { LicensePlanModule } from '@platform/licensing/credential-based/license-plan/license.plan.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';

@Module({
  imports: [
    AiServerModule,
    AiPersonaServiceModule,
    AgentModule,
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
    NameReporterModule,
    SearchIngestModule,
    TemplatesSetModule,
    TemplatesManagerModule,
    TemplateDefaultModule,
    LicensingFrameworkModule,
    LicensePlanModule,
  ],
  providers: [BootstrapService],
  exports: [BootstrapService],
})
export class BootstrapModule {}
