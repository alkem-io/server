import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LicenseManagerProvider } from './wingback.license.manager.provider';

@Module({
  imports: [HttpModule],
  providers: [LicenseManagerProvider],
  exports: [LicenseManagerProvider],
})
export class WingbackLicenseManagerModule {}
