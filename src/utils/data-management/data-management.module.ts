import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeModule } from 'src/domain/challenge/challenge.module';
import { ChallengeService } from 'src/domain/challenge/challenge.service';
import { Ecoverse } from 'src/domain/ecoverse/ecoverse.entity';
import { EcoverseModule } from 'src/domain/ecoverse/ecoverse.module';
import { EcoverseService } from 'src/domain/ecoverse/ecoverse.service';
import { TagsetModule } from 'src/domain/tagset/tagset.module';
import { TagsetService } from 'src/domain/tagset/tagset.service';
import { UserGroupModule } from 'src/domain/user-group/user-group.module';
import { UserGroupService } from 'src/domain/user-group/user-group.service';
import { UserModule } from 'src/domain/user/user.module';
import { UserService } from 'src/domain/user/user.service';
import { DataManagementController } from './data-management.controller';
import { DataManagementService } from './data-management.service';

@Module({
  providers: [DataManagementService, EcoverseService, UserService, UserGroupService, TagsetService, ChallengeService],
  imports: [EcoverseModule, UserModule, UserGroupModule, TagsetModule, ChallengeModule, TypeOrmModule.forFeature([Ecoverse])],
  controllers: [DataManagementController]
})
export class DataManagementModule {}
