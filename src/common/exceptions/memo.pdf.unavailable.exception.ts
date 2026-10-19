import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

/**
 * Why a memo PDF could not be produced right now. Every reason is retryable;
 * none of them says anything about the memo's content.
 */
export type MemoPdfUnavailableReason =
  | 'busy-actor'
  | 'busy-global'
  | 'deadline'
  | 'crashed'
  | 'launch-failed'
  | 'source-unavailable';

/**
 * Memo PDF rendering is temporarily unavailable. Deliberately not a
 * ValidationException: a capacity or worker condition must never be reported
 * as a problem with the memo.
 */
export class MemoPdfUnavailableException extends BaseException {
  constructor(
    public readonly reason: MemoPdfUnavailableReason,
    message = `Memo PDF rendering is unavailable (${reason})`
  ) {
    super(message, LogContext.MEMOS, AlkemioErrorStatus.MEMO_PDF_UNAVAILABLE, {
      reason,
    });
  }
}
