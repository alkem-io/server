import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { SpaceModule } from '@domain/challenge/space/space.module';
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

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    SpaceModule,
    UserModule,
    AdminAuthorizationModule,
    PlatformModule,
    PlatformAuthorizationPolicyModule,
    CommunicationModule,
    OrganizationModule,
    TypeOrmModule.forFeature([Space]),
    InnovationHubModule,
    NameReporterModule,
  ],
  providers: [BootstrapService],
  exports: [BootstrapService],
})
export class BootstrapModule {}
