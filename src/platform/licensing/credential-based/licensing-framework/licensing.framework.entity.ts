import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { LicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.entity';
import { LicensePolicy } from '@platform/licensing/credential-based/license-policy/license.policy.entity';
import { ILicensingFramework } from './licensing.framework.interface';

export class LicensingFramework
  extends AuthorizableEntity
  implements ILicensingFramework
{
  plans!: LicensePlan[];

  licensePolicy!: LicensePolicy;
}
