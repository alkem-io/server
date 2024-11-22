import { ClassProvider } from '@nestjs/common';
import { LicenseManager } from '@core/licensing-wingback-subscription';
import { LICENSE_MANAGER } from '@common/constants';
import { WingbackLicenseManager } from './wingback.license.manager';

export const LicenseManagerProvider: ClassProvider<LicenseManager> = {
  provide: LICENSE_MANAGER,
  useClass: WingbackLicenseManager,
};
