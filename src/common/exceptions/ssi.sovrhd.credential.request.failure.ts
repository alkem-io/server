import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class SsiSovrhdCredentialRequestFailure extends BaseException {
  constructor(error: string, context: LogContext) {
    super(
      error,
      context,
      AlkemioErrorStatus.SSI_SOVRHD_CREDENTIAL_REQUEST_FAILURE
    );
  }
}
