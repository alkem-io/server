import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';
import { LicensePrivilege } from '@common/enums/license.privilege';

export class ForbiddenLicensePolicyException extends BaseException {
  constructor(
    error: string,
    public checkedPrivilege: LicensePrivilege,
    public licensePolicyId: string,
    public licenseId: string
  ) {
    super(error, LogContext.AUTH, AlkemioErrorStatus.FORBIDDEN_POLICY);
  }
}
