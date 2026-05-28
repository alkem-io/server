import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';
import { ExceptionDetails } from './exception.details';

export class LicenseEntitlementUnevaluableException extends BaseException {
  constructor(
    message: string,
    context: LogContext,
    details?: ExceptionDetails,
    code?: AlkemioErrorStatus
  ) {
    super(
      message,
      context,
      code ?? AlkemioErrorStatus.LICENSE_ENTITLEMENT_UNEVALUABLE,
      details
    );
  }
}
