import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { EcoverseModule } from '@domain/challenge/ecoverse/ecoverse.module';
import { ProfileModule } from '@domain/community/profile/profile.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { UserModule } from '@domain/community/user/user.module';
import { BootstrapService } from './bootstrap.service';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';

@Module({
  imports: [
    AgentModule,
    EcoverseModule,
    ProfileModule,
    TagsetModule,
    UserModule,
    AuthorizationModule,
    OrganizationModule,
    TypeOrmModule.forFeature([Ecoverse]),
  ],
  providers: [BootstrapService],
  exports: [BootstrapService],
})
export class BootstrapModule {}
