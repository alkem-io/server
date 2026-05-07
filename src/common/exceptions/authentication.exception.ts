import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { ExceptionDetails } from '@common/exceptions/exception.details';
import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class AuthenticationException extends BaseException {
  constructor(
    message: string,
    context: LogContext,
    details?: ExceptionDetails,
    errorCode?: string
  ) {
    super(message, context, AlkemioErrorStatus.UNAUTHENTICATED, details);
    // Apollo Server v4 reads `extensions.http.status` to override the wire
    // HTTP status. Without it Apollo defaults to 200 + errors envelope, which
    // collapses FR-024b's wire-level distinction between authn (401), authz
    // (403) and system (500). Stage-1 exit log finding G.
    const ext = this.extensions as Record<string, unknown> | undefined;
    if (ext) {
      ext.http = { status: HttpStatus.UNAUTHORIZED };
      if (errorCode) {
        ext.error_code = errorCode;
      }
    }
  }
}
