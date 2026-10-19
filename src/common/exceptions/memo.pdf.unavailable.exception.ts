import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

/**
 * Why a memo PDF could not be produced right now. Every reason is retryable;
 * none of them says anything about the memo's content.
 */
export type MemoPdfUnavailableReason =
  | 'busy-actor'
  | 'busy-global'
  | 'rate-limited'
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
  /** When known, how long the caller should wait before retrying. */
  public readonly retryAfterSeconds?: number;

  constructor(
    public readonly reason: MemoPdfUnavailableReason,
    options: { retryAfterSeconds?: number } = {}
  ) {
    super(
      `Memo PDF rendering is unavailable (${reason})`,
      LogContext.MEMOS,
      AlkemioErrorStatus.MEMO_PDF_UNAVAILABLE,
      { reason }
    );
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}
