import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class LicenseEntitlementNotSupportedException extends BaseException {
  constructor(error: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(
      error,
      context,
      code ?? AlkemioErrorStatus.LICENSE_ENTITLEMENT_NOT_SUPPORTED
    );
  }
}
