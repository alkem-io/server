import { Module } from '@nestjs/common';
import { LicenseEngineService } from './license.engine.service';

@Module({
  imports: [],
  providers: [LicenseEngineService],
  exports: [LicenseEngineService],
})
export class LicenseEngineModule {}
