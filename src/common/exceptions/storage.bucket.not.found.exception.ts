import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

export class StorageBucketNotFoundException extends BaseException {
  constructor(message: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(
      message,
      context,
      code ?? AlkemioErrorStatus.STORAGE_BUCKET_NOT_FOUND
    );
  }
}
