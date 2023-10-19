import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';

export class StorageAggregatorNotFoundException extends BaseException {
  constructor(error: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(error, context, code ?? AlkemioErrorStatus.STORAGE_BUCKET_NOT_FOUND);
  }
}
