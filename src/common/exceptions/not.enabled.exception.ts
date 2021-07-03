import { LogContext } from '@common/enums';
import { AlkemioErrorStatus } from '../enums/alkemio.error.status';
import { BaseException } from './base.exception';

export class NotEnabledException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, AlkemioErrorStatus.NOT_ENABLED);
  }
}
