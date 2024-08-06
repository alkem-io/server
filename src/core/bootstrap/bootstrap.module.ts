import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpaceModule } from '@domain/space/space/space.module';
import { UserModule } from '@domain/community/user/user.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AdminAuthorizationModule } from '@platform/admin/authorization/admin.authorization.module';
import { BootstrapService } from './bootstrap.service';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { PlatformModule } from '@platform/platfrom/platform.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InnovationHubModule } from '@domain/innovation-hub';
import { NameReporterModule } from '@services/external/elasticsearch/name-reporter/name.reporter.module';
import { AccountModule } from '@domain/space/account/account.module';
import { Account } from '@domain/space/account/account.entity';
import { SearchIngestModule } from '@services/api/search/v2/ingest';
import { AccountHostModule } from '@domain/space/account.host/account.host.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    SpaceModule,
    AccountModule,
    AccountHostModule,
    UserModule,
    AdminAuthorizationModule,
    PlatformModule,
    PlatformAuthorizationPolicyModule,
    CommunicationModule,
    OrganizationModule,
    TypeOrmModule.forFeature([Account]),
    InnovationHubModule,
    NameReporterModule,
    SearchIngestModule,
  ],
  providers: [BootstrapService],
  exports: [BootstrapService],
})
export class BootstrapModule {}
