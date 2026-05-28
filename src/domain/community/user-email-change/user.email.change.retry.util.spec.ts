import { describe, expect, it, vi } from 'vitest';
import { retryWithBackoff } from './user.email.change.retry.util';

describe('retryWithBackoff', () => {
  it('returns on first attempt without sleeping', async () => {
    const op = vi.fn().mockResolvedValue('ok');
    const sleep = vi.fn().mockResolvedValue(undefined);
    const result = await retryWithBackoff(op, { sleep });
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries up to three times and succeeds on the third', async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom1'))
      .mockRejectedValueOnce(new Error('boom2'))
      .mockResolvedValueOnce('third-time-lucky');
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await retryWithBackoff(op, { sleep, jitter: 0 });
    expect(result).toBe('third-time-lucky');
    expect(op).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting the attempt budget', async () => {
    const op = vi.fn().mockRejectedValue(new Error('always-fails'));
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(
      retryWithBackoff(op, { sleep, attempts: 3, jitter: 0 })
    ).rejects.toThrow('always-fails');
    expect(op).toHaveBeenCalledTimes(3);
  });

  it('keeps total elapsed budget within the 10s ceiling under simulated clock', async () => {
    const op = vi.fn().mockRejectedValue(new Error('fail'));
    let totalSlept = 0;
    const sleep = vi.fn(async (ms: number) => {
      totalSlept += ms;
    });
    await expect(
      retryWithBackoff(op, {
        sleep,
        attempts: 3,
        schedule: [500, 1500, 3500],
        jitter: 0.2,
      })
    ).rejects.toThrow('fail');
    // 500 + 1500 with up to ±20% jitter ≤ 600 + 1800 = 2400ms. Well under 10s.
    expect(totalSlept).toBeLessThanOrEqual(10_000);
  });

  it('stops retrying when shouldRetry returns false', async () => {
    const op = vi.fn().mockRejectedValue(new Error('not-retryable'));
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(
      retryWithBackoff(op, {
        sleep,
        attempts: 3,
        shouldRetry: () => false,
      })
    ).rejects.toThrow('not-retryable');
    expect(op).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
