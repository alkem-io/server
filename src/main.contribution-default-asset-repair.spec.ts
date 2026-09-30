import { describe, expect, it, vi } from 'vitest';
import { main } from './main.contribution-default-asset-repair';

describe('contribution default asset repair entrypoint', () => {
  it('writes one fixed allowlisted JSON line when execution fails', async () => {
    const write = vi.fn();
    const previousExitCode = process.exitCode;

    await main(
      async () => {
        throw new Error('private failure detail');
      },
      { write }
    );

    expect(write).toHaveBeenCalledExactlyOnceWith(
      '{"ok":false,"reason":"failed"}\n'
    );
    expect(process.exitCode).toBe(1);
    process.exitCode = previousExitCode;
  });
});
