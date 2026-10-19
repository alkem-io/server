import { vi } from 'vitest';

const { launchMock } = vi.hoisted(() => ({ launchMock: vi.fn() }));
vi.mock('node:child_process', async importOriginal => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  fork: launchMock,
}));

describe('memo PDF executor launch', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('forks the compiled entry with an explicit heap, binary IPC and an environment allowlist only', async () => {
    vi.resetModules();
    const { MemoPdfExecutor } = await import('./memo.pdf.executor');
    vi.stubEnv('DATABASE_PASSWORD', 'must-not-inherit');
    vi.stubEnv('NODE_OPTIONS', '--inspect');
    const executor = new MemoPdfExecutor(
      {
        get: () => ({
          max_concurrent_renders: 2,
          max_concurrent_renders_per_actor: 1,
          heap_mb: 384,
          deadline_ms: 30_000,
        }),
      } as any,
      { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as any
    );

    (executor as any).launch();

    expect(launchMock).toHaveBeenCalledOnce();
    const [entry, args, options] = launchMock.mock.calls[0];
    expect(entry).toMatch(/\/memo\/memo\.pdf\.executor\.entry\.js$/);
    expect(args).toEqual([]);
    expect(options).toEqual({
      execPath: process.execPath,
      execArgv: ['--max-old-space-size=384'],
      env: { LANG: 'en_US.UTF-8' },
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      serialization: 'advanced',
    });
    expect(options.env).not.toHaveProperty('DATABASE_PASSWORD');
    expect(options.env).not.toHaveProperty('NODE_OPTIONS');
  });
});
