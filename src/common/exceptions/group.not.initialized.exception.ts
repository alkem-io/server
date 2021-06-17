import { LogContext, CherrytwistErrorStatus } from '@common/enums';
import { BaseException } from '@common/exceptions';

export class GroupNotInitializedException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, CherrytwistErrorStatus.GROUP_NOT_INITIALIZED);
  }
}
