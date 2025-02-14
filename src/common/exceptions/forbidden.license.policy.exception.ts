import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';

export class ForbiddenLicensePolicyException extends BaseException {
  constructor(
    error: string,
    public checkedEntitlement: LicenseEntitlementType,
    public licensePolicyId: string,
    public licenseId: string
  ) {
    super(error, LogContext.AUTH, AlkemioErrorStatus.FORBIDDEN_POLICY);
  }
}
