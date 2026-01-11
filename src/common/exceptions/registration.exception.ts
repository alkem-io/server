import { GraphQLError } from 'graphql';
import { LogContext, AlkemioErrorStatus } from '@common/enums';

export class UserNotRegisteredException extends GraphQLError {
  private readonly context: LogContext;

  constructor(message = 'User not registered.') {
    super(message, {
      extensions: {
        code: AlkemioErrorStatus.USER_NOT_REGISTERED,
      },
    });
    this.context = LogContext.AUTH;
  }

  getContext(): LogContext {
    return this.context;
  }
}
