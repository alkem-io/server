import { Module } from '@nestjs/common';
import { EcoverseModule } from '@domain/challenge/ecoverse/ecoverse.module';
import { BootstrapModule } from '../../core/bootstrap/bootstrap.module';
import { DataManagementController } from './data-management.controller';
import { DataManagementService } from './data-management.service';

@Module({
  imports: [BootstrapModule, EcoverseModule],
  providers: [DataManagementService],
  controllers: [DataManagementController],
  exports: [DataManagementService],
})
export class DataManagementModule {}
