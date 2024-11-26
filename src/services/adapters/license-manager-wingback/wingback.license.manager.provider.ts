import { ClassProvider } from '@nestjs/common';
import { LICENSE_MANAGER } from '@common/constants';
import { WingbackLicenseManager } from './wingback.license.manager';
import { LicensingWingbackSubscriptionManager } from '@core/licensing-wingback-subscription/licensing.wingback.subscription.interface';

export const LicenseManagerProvider: ClassProvider<LicensingWingbackSubscriptionManager> =
  {
    provide: LICENSE_MANAGER,
    useClass: WingbackLicenseManager,
  };
