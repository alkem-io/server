import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeModule } from 'src/domain/challenge/challenge.module';
import { ChallengeService } from 'src/domain/challenge/challenge.service';
import { ContextModule } from 'src/domain/context/context.module';
import { ContextService } from 'src/domain/context/context.service';
import { Ecoverse } from 'src/domain/ecoverse/ecoverse.entity';
import { EcoverseModule } from 'src/domain/ecoverse/ecoverse.module';
import { EcoverseService } from 'src/domain/ecoverse/ecoverse.service';
import { ProfileModule } from 'src/domain/profile/profile.module';
import { ProfileService } from 'src/domain/profile/profile.service';
import { ReferenceModule } from 'src/domain/reference/reference.module';
import { ReferenceService } from 'src/domain/reference/reference.service';
import { TagsetModule } from 'src/domain/tagset/tagset.module';
import { TagsetService } from 'src/domain/tagset/tagset.service';
import { UserGroupModule } from 'src/domain/user-group/user-group.module';
import { UserGroupService } from 'src/domain/user-group/user-group.service';
import { UserModule } from 'src/domain/user/user.module';
import { UserService } from 'src/domain/user/user.service';
import { DataManagementController } from './data-management.controller';
import { DataManagementService } from './data-management.service';

@Module({
  imports: [
    ChallengeModule,
    ContextModule,
    EcoverseModule,
    ProfileModule,
    ReferenceModule,
    TagsetModule,
    UserModule,
    UserGroupModule,
    TypeOrmModule.forFeature([Ecoverse]),
  ],
  providers: [
    ChallengeService,
    ContextService,
    DataManagementService,
    EcoverseService,
    ProfileService,
    ReferenceService,
    TagsetService,
    UserService,
    UserGroupService,
  ],
  controllers: [DataManagementController],
})
export class DataManagementModule {}
