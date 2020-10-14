import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeModule } from 'src/domain/challenge/challenge.module';
import { Ecoverse } from 'src/domain/ecoverse/ecoverse.entity';
import { EcoverseModule } from 'src/domain/ecoverse/ecoverse.module';
import { UserGroupModule } from 'src/domain/user-group/user-group.module';
import { UserModule } from 'src/domain/user/user.module';
import { DataManagementController } from './data-management.controller';
import { DataManagementService } from './data-management.service';

@Module({
  imports: [
    ChallengeModule,
    EcoverseModule,
    UserModule,
    TypeOrmModule.forFeature([Ecoverse]),
    UserGroupModule,
  ],
  providers: [DataManagementService],
  controllers: [DataManagementController],
})
export class DataManagementModule {}
