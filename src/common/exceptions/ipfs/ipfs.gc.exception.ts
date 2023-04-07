import { GraphQLError } from 'graphql';
import { LogContext, AlkemioErrorStatus } from '@common/enums';

export class IpfsGCFailedException extends GraphQLError {
  private context: LogContext;

  constructor(message = 'Ipfs garbage collection failed!') {
    super(message, {
      extensions: {
        code: AlkemioErrorStatus.IPFS_GARBAGE_COLLECTION_FAILED,
      },
    });
    this.context = LogContext.IPFS;
  }

  getContext(): LogContext {
    return this.context;
  }
}
