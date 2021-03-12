import { Module } from '@nestjs/common';
import { ActorGroupModule } from '@domain/context/actor-group/actor-group.module';
import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { EcoverseModule } from '@domain/challenge/ecoverse/ecoverse.module';
import { OpportunityModule } from '@domain/challenge/opportunity/opportunity.module';
import { ProjectModule } from '@domain/collaboration/project/project.module';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { UserModule } from '@domain/community/user/user.module';
import { BootstrapModule } from '../../core/bootstrap/bootstrap.module';
import { DataManagementController } from './data-management.controller';
import { DataManagementService } from './data-management.service';
import { TestDataService } from './test-data.service';
import { CommunityModule } from '@domain/community/community/community.module';

@Module({
  imports: [
    BootstrapModule,
    ChallengeModule,
    CommunityModule,
    OpportunityModule,
    ActorGroupModule,
    ProjectModule,
    EcoverseModule,
    UserModule,
    UserGroupModule,
  ],
  providers: [DataManagementService, TestDataService],
  controllers: [DataManagementController],
  exports: [DataManagementService, TestDataService],
})
export class DataManagementModule {}
