import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { ExceptionDetails } from '@common/exceptions/exception.details';
import { BaseException } from './base.exception';

/**
 * Refusal thrown on the self branch of account deletion when the calling
 * session was not issued within the privileged window (or its issue time is
 * missing, zero, or unparseable — a fail-closed refusal, not a fail-open
 * one). Carries a distinct `extensions.code` so the client routes to the
 * re-authentication round trip instead of a generic error.
 */
export class SessionRefreshRequiredException extends BaseException {
  constructor(
    message: string,
    context: LogContext,
    details?: ExceptionDetails
  ) {
    super(
      message,
      context,
      AlkemioErrorStatus.SESSION_REFRESH_REQUIRED,
      details
    );
  }
}
