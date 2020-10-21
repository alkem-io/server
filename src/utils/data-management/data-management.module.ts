import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeModule } from 'src/domain/challenge/challenge.module';
import { Ecoverse } from 'src/domain/ecoverse/ecoverse.entity';
import { EcoverseModule } from 'src/domain/ecoverse/ecoverse.module';
import { ProfileModule } from 'src/domain/profile/profile.module';
import { TagsetModule } from 'src/domain/tagset/tagset.module';
import { UserGroupModule } from 'src/domain/user-group/user-group.module';
import { UserModule } from 'src/domain/user/user.module';
import { BootstrapModule } from '../bootstrap/bootstrap.module';
import { DataManagementController } from './data-management.controller';
import { DataManagementService } from './data-management.service';

@Module({
  imports: [
    BootstrapModule,
    ChallengeModule,
    EcoverseModule,
    UserModule,
    TagsetModule,
    ProfileModule,
    TypeOrmModule.forFeature([Ecoverse]),
    UserGroupModule,
  ],
  providers: [DataManagementService],
  controllers: [DataManagementController],
})
export class DataManagementModule {}
