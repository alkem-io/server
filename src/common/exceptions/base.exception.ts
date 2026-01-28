import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { randomUUID } from 'crypto';
import { GraphQLError } from 'graphql';
import { getErrorCodeEntry } from './error.code.registry';
import { ExceptionDetails } from './exception.details';

export class BaseException extends GraphQLError {
  private readonly exceptionName = this.constructor.name;
  constructor(
    public message: string,
    public context: LogContext,
    public code: AlkemioErrorStatus,
    public details?: ExceptionDetails,
    public errorId: string = randomUUID()
  ) {
    const entry =
      getErrorCodeEntry(code) ??
      getErrorCodeEntry(AlkemioErrorStatus.UNSPECIFIED)!;
    super(message, {
      extensions: {
        // this needs to be set, since graphql automatically chooses a default code
        code: String(code),
        numericCode: entry.numericCode,
        userMessage: entry.userMessage,
        errorId,
        details,
      },
    });
    this.name = this.constructor.name;
  }
}
