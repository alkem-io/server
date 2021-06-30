import { ApolloError } from 'apollo-server-express';
import { LogContext, AlkemioErrorStatus } from '@common/enums';

export class UserNotRegisteredException extends ApolloError {
  private context: LogContext;

  constructor(message = 'User not registered.') {
    super(message, AlkemioErrorStatus.USER_NOT_REGISTERED);
    this.context = LogContext.AUTH;
  }

  getContext(): LogContext {
    return this.context;
  }
}
