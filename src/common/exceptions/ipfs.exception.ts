import { ApolloError } from 'apollo-server-express';
import { LogContext, CherrytwistErrorStatus } from '@common/enums';

export class IpfsUploadFailedException extends ApolloError {
  private context: LogContext;

  constructor(message = 'User not registered.') {
    super(message, CherrytwistErrorStatus.IPFS_UPLOAD_FAILED);
    this.context = LogContext.IPFS;
  }

  getContext(): LogContext {
    return this.context;
  }
}
