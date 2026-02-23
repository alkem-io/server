import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { randomUUID } from 'crypto';
import { GraphQLError } from 'graphql';
import {
  computeNumericCode,
  getMetadataForStatus,
} from './error.status.metadata';
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
    const metadata = getMetadataForStatus(code);
    const numericCode = computeNumericCode(metadata);

    super(message, {
      extensions: {
        // this needs to be set, since graphql automatically chooses a default code
        code: String(code),
        numericCode,
        userMessage: metadata.userMessage,
        errorId,
        details,
      },
    });
    this.name = this.constructor.name;
  }
}
