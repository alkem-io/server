import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { BaseException } from './base.exception';

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
