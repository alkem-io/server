import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from '../base.exception';

export class UnableToSubscribeException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, AlkemioErrorStatus.BAD_USER_INPUT);
  }
}
