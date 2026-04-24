import { LoggerService } from '@nestjs/common';

/**
 * Run a cleanup/rollback action and swallow any error. Used when the original
 * operation has already failed (or completed) and we want to best-effort
 * undo a side effect without masking the primary failure.
 *
 * The `failureLabel` is the full warn-log message (caller controls wording).
 */
export async function tryRollback(
  action: () => Promise<unknown>,
  failureLabel: string,
  logger: LoggerService,
  logContext: string
): Promise<void> {
  try {
    await action();
  } catch {
    logger.warn?.(failureLabel, logContext);
  }
}
