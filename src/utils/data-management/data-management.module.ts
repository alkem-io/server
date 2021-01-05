import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActorGroupModule } from '@domain/actor-group/actor-group.module';
import { ChallengeModule } from '@domain/challenge/challenge.module';
import { Ecoverse } from '@domain/ecoverse/ecoverse.entity';
import { EcoverseModule } from '@domain/ecoverse/ecoverse.module';
import { OpportunityModule } from '@domain/opportunity/opportunity.module';
import { ProfileModule } from '@domain/profile/profile.module';
import { ProjectModule } from '@domain/project/project.module';
import { TagsetModule } from '@domain/tagset/tagset.module';
import { UserGroupModule } from '@domain/user-group/user-group.module';
import { UserModule } from '@domain/user/user.module';
import { BootstrapModule } from '../bootstrap/bootstrap.module';
import { DataManagementController } from './data-management.controller';
import { DataManagementService } from './data-management.service';
import { TestDataService } from './test-data.service';

@Module({
  imports: [
    BootstrapModule,
    ChallengeModule,
    OpportunityModule,
    ActorGroupModule,
    ProjectModule,
    EcoverseModule,
    UserModule,
    TagsetModule,
    ProfileModule,
    TypeOrmModule.forFeature([Ecoverse]),
    UserGroupModule,
  ],
  providers: [DataManagementService, TestDataService],
  controllers: [DataManagementController],
  exports: [DataManagementService, TestDataService],
})
export class DataManagementModule {}
