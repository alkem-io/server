import { ApolloError } from 'apollo-server-express';
import { LogContext, AlkemioErrorStatus } from '@common/enums';

export class IpfsUploadFailedException extends ApolloError {
  private context: LogContext;

  constructor(message = 'Ipfs upload file failed!') {
    super(message, AlkemioErrorStatus.IPFS_UPLOAD_FAILED);
    this.context = LogContext.IPFS;
  }

  getContext(): LogContext {
    return this.context;
  }
}
