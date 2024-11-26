import { Module } from '@nestjs/common';
import { WingbackLicenseManagerModule } from '@services/external/wingback';
import { LicensingWingbackSubscriptionService } from './licensing.wingback.subscription.service';

@Module({
  imports: [WingbackLicenseManagerModule],
  providers: [LicensingWingbackSubscriptionService],
  exports: [LicensingWingbackSubscriptionService],
})
export class LicenseManagerModule {}
