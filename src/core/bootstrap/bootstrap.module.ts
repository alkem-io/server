import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { HubModule } from '@domain/challenge/hub/hub.module';
import { UserModule } from '@domain/community/user/user.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AdminAuthorizationModule } from '@platform/admin/authorization/admin.authorization.module';
import { BootstrapService } from './bootstrap.service';
import { CommunicationModule } from '@domain/communication/communication/communication.module';

@Module({
  imports: [
    AgentModule,
    HubModule,
    UserModule,
    AdminAuthorizationModule,
    CommunicationModule,
    OrganizationModule,
    TypeOrmModule.forFeature([Hub]),
  ],
  providers: [BootstrapService],
  exports: [BootstrapService],
})
export class BootstrapModule {}
