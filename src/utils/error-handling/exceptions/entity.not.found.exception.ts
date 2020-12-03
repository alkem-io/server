import { LogContext } from '../../logging/logging.contexts';
import { CherrytwistErrorStatus } from '../enums/cherrytwist.error.status';
import { BaseException } from './base.exception';

export class EntityNotFoundException extends BaseException {
  constructor(
    error: string,
    context: LogContext,
    code?: CherrytwistErrorStatus
  ) {
    super(error, context, code ?? CherrytwistErrorStatus.ENTITY_NOT_FOUND);
  }
}
