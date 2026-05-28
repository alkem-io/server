export interface RetryOptions {
  attempts: number;
  /**
   * Base delays in milliseconds, one per inter-attempt gap. The final attempt
   * is not followed by a delay. If the array is shorter than `attempts - 1`,
   * the last entry is reused.
   */
  schedule: number[];
  /**
   * Jitter as a fraction of the base delay (0..1). Each gap is multiplied by
   * a random factor in `[1 - jitter, 1 + jitter]`. Defaults to 0.2.
   */
  jitter?: number;
  /**
   * Optional sleep implementation — defaults to `setTimeout`. Specs inject a
   * fake clock to assert the elapsed budget.
   */
  sleep?: (ms: number) => Promise<void>;
  /**
   * Optional predicate to decide whether a thrown error should trigger a
   * retry. Defaults to retrying every error.
   */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
}

export const DEFAULT_RETRY_OPTIONS: Required<
  Pick<RetryOptions, 'attempts' | 'schedule'>
> = {
  attempts: 3,
  schedule: [500, 1500, 3500],
};

/**
 * Bounded synchronous retry helper (research.md §R5). 3 attempts, jittered
 * exponential backoff (500ms → 1.5s → 3.5s by default), total elapsed budget
 * ≤ 10s. Used uniformly for forward Kratos / Alkemio writes, Kratos revert,
 * session invalidation, and each notification publish.
 */
export async function retryWithBackoff<T>(
  op: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const attempts = options.attempts ?? DEFAULT_RETRY_OPTIONS.attempts;
  const schedule = options.schedule ?? DEFAULT_RETRY_OPTIONS.schedule;
  const jitter = options.jitter ?? 0.2;
  const sleep = options.sleep ?? defaultSleep;
  const shouldRetry = options.shouldRetry ?? (() => true);

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await op();
    } catch (err) {
      lastError = err;
      if (attempt === attempts || !shouldRetry(err, attempt)) {
        throw err;
      }
      const baseDelay =
        schedule[Math.min(attempt - 1, schedule.length - 1)] ?? 0;
      const factor = 1 + (Math.random() * 2 - 1) * jitter;
      await sleep(Math.max(0, Math.round(baseDelay * factor)));
    }
  }
  // Unreachable; the for-loop always throws or returns. Kept for type narrowing.
  throw lastError;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
