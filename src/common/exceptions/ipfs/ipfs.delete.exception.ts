import { ApolloError } from 'apollo-server-express';
import { LogContext, AlkemioErrorStatus } from '@common/enums';

export class IpfsDeleteFailedException extends ApolloError {
  private context: LogContext;

  constructor(message = 'Ipfs delete file failed!') {
    super(message, AlkemioErrorStatus.IPFS_DELETE_FAILED);
    this.context = LogContext.IPFS;
  }

  getContext(): LogContext {
    return this.context;
  }
}
