import { Module } from '@nestjs/common';
import { WingbackLicenseManagerModule } from '@services/adapters/license-manager-wingback';
import { LicenseManagerService } from './license.manager.service';

@Module({
  imports: [WingbackLicenseManagerModule],
  providers: [LicenseManagerService],
  exports: [LicenseManagerService],
})
export class LicenseManagerModule {}
