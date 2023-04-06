import { GraphQLError } from 'graphql';
import { LogContext, AlkemioErrorStatus } from '@common/enums';

export class IpfsUploadFailedException extends GraphQLError {
  private context: LogContext;

  constructor(message = 'Ipfs upload file failed!') {
    super(message, {
      extensions: {
        code: AlkemioErrorStatus.IPFS_UPLOAD_FAILED,
      },
    });
    this.context = LogContext.IPFS;
  }

  getContext(): LogContext {
    return this.context;
  }
}
