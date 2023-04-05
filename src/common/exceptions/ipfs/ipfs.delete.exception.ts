import { GraphQLError } from 'graphql';
import { LogContext, AlkemioErrorStatus } from '@common/enums';

export class IpfsDeleteFailedException extends GraphQLError {
  private context: LogContext;

  constructor(message = 'Ipfs delete file failed!') {
    super(message, {
      extensions: {
        code: AlkemioErrorStatus.IPFS_DELETE_FAILED,
      },
    });
    this.context = LogContext.IPFS;
  }

  getContext(): LogContext {
    return this.context;
  }
}
