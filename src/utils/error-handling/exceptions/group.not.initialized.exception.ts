import { LogContext } from '@utils/logging/logging.contexts';
import { CherrytwistErrorStatus } from '../enums/cherrytwist.error.status';
import { BaseException } from './base.exception';

export class GroupNotInitializedException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, CherrytwistErrorStatus.GROUP_NOT_INITIALIZED);
  }
}
