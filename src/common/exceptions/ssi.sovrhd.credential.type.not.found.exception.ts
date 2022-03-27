import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class SsiSovrhdCredentialTypeNotFoundException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, AlkemioErrorStatus.SSI_CREDENTIAL_TYPE_NOT_SUPPORTED);
  }
}
