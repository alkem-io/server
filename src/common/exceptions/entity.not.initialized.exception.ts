import { LogContext } from '@common/enums';
import { CherrytwistErrorStatus } from '../enums/cherrytwist.error.status';
import { BaseException } from './base.exception';

export class EntityNotInitializedException extends BaseException {
  constructor(error: string, context: LogContext) {
    super(error, context, CherrytwistErrorStatus.ENTITY_NOT_INITIALIZED);
  }
}
