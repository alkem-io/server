import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeModule } from '../../domain/challenge/challenge.module';
import { Ecoverse } from '../../domain/ecoverse/ecoverse.entity';
import { EcoverseModule } from '../../domain/ecoverse/ecoverse.module';
import { UserGroupModule } from '../../domain/user-group/user-group.module';
import { UserModule } from '../../domain/user/user.module';
import { BootstrapModule } from '../bootstrap/bootstrap.module';
import { DataManagementController } from './data-management.controller';
import { DataManagementService } from './data-management.service';

@Module({
  imports: [
    BootstrapModule,
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
