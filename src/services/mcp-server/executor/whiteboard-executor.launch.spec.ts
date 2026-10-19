import { vi } from 'vitest';

const { launchMock } = vi.hoisted(() => ({ launchMock: vi.fn() }));
vi.mock('node:child_process', async importOriginal => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  fork: launchMock,
}));

describe('whiteboard-executor constant direct launch', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('uses a source-controlled entry, explicit heap, and an environment allowlist only', async () => {
    vi.resetModules();
    const { WhiteboardExecutorParent } = await import(
      './whiteboard-executor.parent'
    );
    for (const [key, value] of Object.entries({
      MCP_WHITEBOARD_EXECUTOR_ENABLED: 'true',
      MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN: '4',
      MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN_PER_ACTOR: '1',
      MCP_WHITEBOARD_EXECUTOR_HEAP_MB: '256',
      MCP_WHITEBOARD_EXECUTOR_DEADLINE_MS: '10000',
      DATABASE_PASSWORD: 'must-not-inherit',
      NODE_OPTIONS: '--inspect',
    }))
      vi.stubEnv(key, value);
    const parent = new WhiteboardExecutorParent(
      {
        getOrThrow: (key: string) =>
          key.endsWith('.url')
            ? 'ws://collaboration-service:4006'
            : 'X-Alkemio-Actor-Id',
      } as any,
      { log: vi.fn() } as any
    );
    (parent as any).launch();
    expect(launchMock).toHaveBeenCalledOnce();
    const [entry, args, options] = launchMock.mock.calls[0];
    expect(entry).toMatch(/\/executor\/whiteboard-executor.entry.js$/);
    expect(args).toEqual([]);
    expect(options).toEqual({
      execPath: process.execPath,
      execArgv: ['--max-old-space-size=256'],
      env: {
        LANG: 'en_US.UTF-8',
        MCP_EXECUTOR_COLLAB_URL: 'ws://collaboration-service:4006',
        MCP_EXECUTOR_ACTOR_HEADER: 'X-Alkemio-Actor-Id',
      },
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
  });
});
