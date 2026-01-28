import { LogContext } from '@common/enums';
import { AlkemioErrorStatus } from '../enums/alkemio.error.status';
import { BaseException } from './base.exception';

export class NotEnabledException extends BaseException {
  constructor(message: string, context: LogContext) {
    super(message, context, AlkemioErrorStatus.NOT_ENABLED);
  }
}
