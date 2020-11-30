import { AuthenticationError } from 'apollo-server-express';
import { LogContext } from '../../logging/logging.contexts';
import { CherrytwistErrorStatus } from '../enums/cherrytwist.error.status';
import { BaseException } from './base.exception';

export class TokenException extends BaseException {
  constructor(error: string, code?: CherrytwistErrorStatus) {
    super(
      error,
      LogContext.AUTH_TOKEN,
      code ?? CherrytwistErrorStatus.INVALID_TOKEN
    );
  }
}
