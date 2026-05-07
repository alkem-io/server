import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { HttpStatus } from '@nestjs/common';
import { BaseHttpException } from './base.http.exception';

// FR-024b — distinct from ForbiddenHttpException so RestGuard can map
// "credentials present but invalid" to 401 (not 403). Forbidden = authn ok,
// authz denied. Unauthenticated = authn failed.
export class UnauthenticatedHttpException extends BaseHttpException {
  constructor(message: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(
      message,
      HttpStatus.UNAUTHORIZED,
      context,
      code ?? AlkemioErrorStatus.UNAUTHENTICATED
    );
  }
}
