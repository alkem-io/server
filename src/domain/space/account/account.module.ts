import { OrganizationModule } from '@domain/community/organization/organization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '@domain/space/account/account.entity';
import { AccountService } from '@domain/space/account/account.service';
import { AccountResolverFields } from '@domain/space/account/account.resolver.fields';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { TemplatesSetModule } from '@domain/template/templates-set/templates.set.module';
import { LicenseModule } from '@domain/license/license/license.module';
import { SpaceDefaultsModule } from '../space.defaults/space.defaults.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AccountResolverMutations } from './account.resolver.mutations';
import { SpaceModule } from '../space/space.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { NameReporterModule } from '@services/external/elasticsearch/name-reporter/name.reporter.module';
import { InnovationFlowTemplateModule } from '@domain/template/innovation-flow-template/innovation.flow.template.module';
import { AccountResolverQueries } from './account.resolver.queries';
import { NamingModule } from '@services/infrastructure/naming/naming.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    OrganizationModule,
    TemplatesSetModule,
    SpaceModule,
    SpaceDefaultsModule,
    PlatformAuthorizationPolicyModule,
    InnovationFlowTemplateModule,
    LicenseModule,
    NamingModule,
    NameReporterModule,
    TypeOrmModule.forFeature([Account]),
  ],
  providers: [
    AccountService,
    AccountAuthorizationService,
    AccountResolverFields,
    AccountResolverMutations,
    AccountResolverQueries,
  ],
  exports: [AccountService, AccountAuthorizationService],
})
export class AccountModule {}
