import { Module } from '@nestjs/common';
import { EcoverseModule } from '@domain/challenge/ecoverse/ecoverse.module';
import { DataManagementController } from './data-management.controller';
import { DataManagementService } from './data-management.service';
import { BootstrapModule } from '@core/bootstrap/bootstrap.module';

@Module({
  imports: [BootstrapModule, EcoverseModule],
  providers: [DataManagementService],
  controllers: [DataManagementController],
  exports: [DataManagementService],
})
export class DataManagementModule {}
