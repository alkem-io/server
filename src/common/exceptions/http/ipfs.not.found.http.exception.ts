import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseHttpException } from './base.http.exception';
import { HttpStatus } from '@nestjs/common';

export class IpfsNotFoundHttpException extends BaseHttpException {
  constructor(message: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(
      message,
      HttpStatus.NOT_FOUND,
      context,
      code ?? AlkemioErrorStatus.IPFS_NOT_FOUND
    );
  }
}
