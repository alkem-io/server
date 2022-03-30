import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class SsiWalletManagerCommandFailed extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, AlkemioErrorStatus.SSI_WALLET_MANAGER_COMMAND_FAILED);
  }
}
