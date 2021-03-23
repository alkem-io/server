import { ApolloError } from 'apollo-server-express';
import { LogContext, CherrytwistErrorStatus } from '@common/enums';

export class UserNotRegisteredException extends ApolloError {
  private context: LogContext;

  constructor(message = 'User not registered.') {
    super(message, CherrytwistErrorStatus.USER_NOT_REGISTERED);
    this.context = LogContext.AUTH;
  }

  getContext(): LogContext {
    return this.context;
  }
}
