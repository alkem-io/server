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
import { NameReporterModule } from '@services/external/elasticsearch/name-reporter/name.reporter.module';
import { AccountModule } from '@domain/space/account/account.module';
import { SearchIngestModule } from '@services/api/search/v2/ingest';
import { AiServerModule } from '@services/ai-server/ai-server/ai.server.module';
import { Space } from '@domain/space/space/space.entity';
import { ContributorModule } from '@domain/community/contributor/contributor.module';

@Module({
  imports: [
    AiServerModule,
    AgentModule,
    AuthorizationPolicyModule,
    ContributorModule,
    SpaceModule,
    OrganizationModule,
    AccountModule,
    SpaceModule,
    UserModule,
    AdminAuthorizationModule,
    PlatformModule,
    PlatformAuthorizationPolicyModule,
    CommunicationModule,
    TypeOrmModule.forFeature([Space]),
    NameReporterModule,
    SearchIngestModule,
  ],
  providers: [BootstrapService],
  exports: [BootstrapService],
})
export class BootstrapModule {}
