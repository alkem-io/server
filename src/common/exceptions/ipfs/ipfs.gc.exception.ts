import { ApolloError } from 'apollo-server-express';
import { LogContext, AlkemioErrorStatus } from '@common/enums';

export class IpfsGCFailedException extends ApolloError {
  private context: LogContext;

  constructor(message = 'Ipfs garbage collection failed!') {
    super(message, AlkemioErrorStatus.IPFS_GARBAGE_COLLECTION_FAILED);
    this.context = LogContext.IPFS;
  }

  getContext(): LogContext {
    return this.context;
  }
}
