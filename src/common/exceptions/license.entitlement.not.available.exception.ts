import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

export class LicenseEntitlementNotAvailableException extends BaseException {
  constructor(error: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(
      error,
      context,
      code ?? AlkemioErrorStatus.LICENSE_ENTITLEMENT_NOT_AVAILABLE
    );
  }
}
