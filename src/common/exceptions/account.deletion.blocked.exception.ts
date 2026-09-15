import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { ExceptionDetails } from '@common/exceptions/exception.details';
import { BaseException } from './base.exception';

/**
 * Refusal thrown on the self branch of account deletion when the account
 * still holds a blocking resource, or is the sole owner of an organization.
 * The client re-runs the pre-flight read on this code and renders the
 * itemized blocked dialog from the fresh, server-computed answer — never
 * from a stale client-side check.
 */
export class AccountDeletionBlockedException extends BaseException {
  constructor(
    message: string,
    context: LogContext,
    details?: ExceptionDetails
  ) {
    super(
      message,
      context,
      AlkemioErrorStatus.ACCOUNT_DELETION_BLOCKED,
      details
    );
  }
}
