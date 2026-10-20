import { EventEmitter } from 'node:events';
import { LogContext } from '@common/enums/logging.context';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { MemoPdfUnavailableException } from '@common/exceptions/memo.pdf.unavailable.exception';
import { StorageServiceUnavailableException } from '@services/adapters/file-service-adapter/file.service.adapter.exception';
import {
  MemoPdfExecutor,
  MemoPdfRenderPurpose,
  memoPdfExecutorCapacity,
} from './memo.pdf.executor';
import { ParentMessage } from './memo.pdf.executor.protocol';
import { ResolveMemoImage } from './memo.pdf.render.core';

class FakeChild extends EventEmitter {
  pid: number | undefined = 4242;
  readonly sent: ParentMessage[] = [];
  readonly kill = vi.fn((_signal?: string) => {
    queueMicrotask(() => this.exit(null, 'SIGKILL'));
    return true;
  });
  readonly send = vi.fn(
    (message: ParentMessage, callback?: (error: Error | null) => void) => {
      this.sent.push(message);
      callback?.(null);
      return true;
    }
  );

  get jobId() {
    return this.sent[0]?.jobId;
  }

  // As Node does: 'exit' when the process ends, 'close' once its stdio and
  // IPC channel are drained.
  exit(code: number | null, signal: string | null) {
    this.emit('exit', code, signal);
    this.emit('close', code, signal);
  }

  reply(message: Record<string, unknown>) {
    this.emit('message', { jobId: this.jobId, ...message });
  }
}

const pdf = Buffer.from('%PDF-1.7 fake');
// Every executor a test creates, so that renders a test leaves in flight are
// killed (and their deadline timers cleared) before the next test runs.
const executors: MemoPdfExecutor[] = [];

const setup = (
  pdfExport: Record<string, unknown> = {
    max_concurrent_renders: 2,
    max_concurrent_renders_per_actor: 1,
    heap_mb: 512,
    deadline_ms: 30_000,
  }
) => {
  const children: FakeChild[] = [];
  const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const reservedAtLaunch: number[] = [];
  let launchError: Error | undefined;
  class TestExecutor extends MemoPdfExecutor {
    protected launch() {
      reservedAtLaunch.push((this as any).jobs.size);
      if (launchError) throw launchError;
      const child = new FakeChild();
      children.push(child);
      return child as any;
    }
  }
  const executor = new TestExecutor(
    { get: vi.fn(() => pdfExport) } as any,
    logger as any
  );
  executors.push(executor);
  const resolveImage = vi.fn<ResolveMemoImage>();
  // The purpose is always explicit: downloads and signing previews are
  // admitted by different rules, so neither may be silently the one tested.
  const run = (
    purpose: MemoPdfRenderPurpose,
    actorId = 'actor-1',
    extra: { signal?: AbortSignal; memoId?: string } = {}
  ) => {
    const rendering = executor.run({
      purpose,
      state: Buffer.from('state'),
      resolveImage,
      actorId,
      memoId: 'memo-1',
      ...extra,
    });
    // Renders a test deliberately leaves in flight end at teardown; their
    // rejection is expected and must not surface as unhandled.
    rendering.catch(() => undefined);
    return rendering;
  };
  return {
    executor,
    children,
    logger,
    resolveImage,
    run,
    reservedAtLaunch,
    failLaunch: (error?: Error) => {
      launchError = error;
    },
  };
};

const flush = () => new Promise(resolve => setImmediate(resolve));

describe('MemoPdfExecutor', () => {
  afterEach(async () => {
    vi.useRealTimers();
    for (const executor of executors.splice(0)) executor.onModuleDestroy();
    await flush();
  });

  it('forks one worker per render, starts it with the state and resolves the PDF', async () => {
    const { children, run, executor } = setup();

    const rendering = run('signing');
    expect(children).toHaveLength(1);
    expect(children[0].sent[0]).toEqual({
      type: 'START',
      jobId: expect.any(String),
      state: Buffer.from('state'),
    });
    children[0].reply({ type: 'DONE', pdf, imageCount: 0 });

    await expect(rendering).resolves.toBe(pdf);
    expect(children[0].kill).toHaveBeenCalledWith('SIGKILL');
    expect((executor as any).jobs.size).toBe(0);
  });

  it('refuses a third concurrent render with busy-global and no fork', async () => {
    const { children, run } = setup();

    void run('signing', 'actor-1');
    void run('signing', 'actor-2');
    const error = await run('signing', 'actor-3').catch(caught => caught);

    expect(error).toBeInstanceOf(MemoPdfUnavailableException);
    expect(error.reason).toBe('busy-global');
    expect(children).toHaveLength(2);
  });

  it('refuses a second concurrent render by the same actor with busy-actor and no fork', async () => {
    const { children, run } = setup();

    void run('signing', 'actor-1');
    const error = await run('signing', 'actor-1').catch(caught => caught);

    expect(error).toBeInstanceOf(MemoPdfUnavailableException);
    expect(error.reason).toBe('busy-actor');
    expect(children).toHaveLength(1);
  });

  it('refuses a second concurrent download by the same reader with busy-actor at the default caps', async () => {
    const { children, run } = setup();

    void run('download', 'reader-1');
    const error = await run('download', 'reader-1').catch(caught => caught);

    expect(error).toBeInstanceOf(MemoPdfUnavailableException);
    expect(error.reason).toBe('busy-actor');
    expect(children).toHaveLength(1);
  });

  it('refuses a download by an actor whose signing preview is in flight with busy-actor', async () => {
    const { children, run } = setup();

    void run('signing', 'actor-1');
    const error = await run('download', 'actor-1').catch(caught => caught);

    expect(error.reason).toBe('busy-actor');
    expect(children).toHaveLength(1);
  });

  it('keeps the last slot for the signing preview when downloads fill the rest', async () => {
    const { children, run } = setup({
      max_concurrent_renders: 3,
      max_concurrent_renders_per_actor: 1,
      heap_mb: 512,
      deadline_ms: 30_000,
    });

    void run('download', 'reader-1');
    void run('download', 'reader-2');
    const refused = await run('download', 'reader-3').catch(caught => caught);
    expect(refused).toBeInstanceOf(MemoPdfUnavailableException);
    expect(refused.reason).toBe('busy-global');
    expect(children).toHaveLength(2);

    void run('signing', 'signer-1');
    expect(children).toHaveLength(3);
  });

  it('admits one download at two slots and keeps the other slot for signing', async () => {
    const { children, run } = setup();

    void run('download', 'reader-1');
    const refused = await run('download', 'reader-2').catch(caught => caught);
    expect(refused.reason).toBe('busy-global');

    void run('signing', 'signer-1');
    expect(children).toHaveLength(2);
  });

  it('lets a second actor download while another holds one at the default caps', async () => {
    // No key is configured, so the executor runs on its own defaults.
    const { children, run } = setup({});

    void run('download', 'actor-a');
    void run('download', 'actor-b');
    expect(children).toHaveLength(2);

    const refused = await run('download', 'actor-c').catch(caught => caught);
    expect(refused.reason).toBe('busy-global');

    void run('signing', 'signer-1');
    expect(children).toHaveLength(3);
  });

  it('frees the download share when a download ends', async () => {
    const { children, run } = setup();

    const first = run('download', 'reader-1');
    children[0].reply({ type: 'DONE', pdf, imageCount: 0 });
    await first;

    void run('download', 'reader-2');
    expect(children).toHaveLength(2);
  });

  it('lets downloads use the only slot when the global cap is 1', async () => {
    const { children, run } = setup({
      max_concurrent_renders: 1,
      max_concurrent_renders_per_actor: 1,
      heap_mb: 512,
      deadline_ms: 30_000,
    });

    void run('download', 'reader-1');
    expect(children).toHaveLength(1);
    const refused = await run('signing', 'signer-1').catch(caught => caught);
    expect(refused.reason).toBe('busy-global');
  });

  it('refuses every render when the global cap is 0', async () => {
    const { children, run } = setup({
      max_concurrent_renders: 0,
      max_concurrent_renders_per_actor: 1,
      heap_mb: 512,
      deadline_ms: 30_000,
    });

    const error = await run('signing').catch(caught => caught);

    expect(error.reason).toBe('busy-global');
    expect(children).toHaveLength(0);
  });

  it('reserves the slot before forking', () => {
    const { run, reservedAtLaunch } = setup();

    void run('signing');

    expect(reservedAtLaunch).toEqual([1]);
  });

  it('reports a fork failure as launch-failed and frees the slot', async () => {
    const { run, failLaunch, children } = setup();
    failLaunch(Object.assign(new Error('spawn EAGAIN'), { code: 'EAGAIN' }));

    const error = await run('signing').catch(caught => caught);
    expect(error).toBeInstanceOf(MemoPdfUnavailableException);
    expect(error.reason).toBe('launch-failed');

    failLaunch(undefined);
    void run('signing');
    expect(children).toHaveLength(1);
  });

  it('reports an asynchronous spawn error before a pid as launch-failed', async () => {
    const { run, children } = setup();

    const rendering = run('signing');
    children[0].pid = undefined;
    children[0].kill.mockImplementation(() => true);
    children[0].emit('error', new Error('spawn ENOMEM'));

    const error = await rendering.catch(caught => caught);
    expect(error.reason).toBe('launch-failed');
  });

  it('kills the worker and reports deadline when the render outlives its deadline', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { run, children } = setup({
      max_concurrent_renders: 2,
      max_concurrent_renders_per_actor: 1,
      heap_mb: 512,
      deadline_ms: 5_000,
    });

    const rendering = run('signing').catch(caught => caught);
    vi.advanceTimersByTime(5_000);

    const error = await rendering;
    expect(children[0].kill).toHaveBeenCalledWith('SIGKILL');
    expect(error).toBeInstanceOf(MemoPdfUnavailableException);
    expect(error.reason).toBe('deadline');
  });

  it('does not fork when the request is already aborted', async () => {
    const { run, children } = setup();
    const abort = new AbortController();
    abort.abort();

    await expect(
      run('signing', 'actor-1', { signal: abort.signal })
    ).rejects.toThrow('Memo PDF render cancelled');
    expect(children).toHaveLength(0);
  });

  it('kills the worker on abort, frees the slot and admits the next render by the same actor', async () => {
    const { run, children } = setup();
    const abort = new AbortController();

    const rendering = run('signing', 'actor-1', { signal: abort.signal });
    abort.abort();

    await expect(rendering).rejects.toThrow('Memo PDF render cancelled');
    expect(children[0].kill).toHaveBeenCalledWith('SIGKILL');
    void run('signing', 'actor-1');
    expect(children).toHaveLength(2);
  });

  it('resolves each requested image in the parent and answers the worker', async () => {
    const { run, children, resolveImage } = setup();
    const outcome = {
      kind: 'data' as const,
      jpeg: Buffer.from([0xff, 0xd8]),
      width: 2,
      height: 2,
    };
    resolveImage.mockResolvedValue(outcome);

    const rendering = run('signing');
    children[0].reply({
      type: 'RESOLVE_IMAGE',
      index: 0,
      src: 'https://alkem.io/x',
    });
    await flush();

    expect(resolveImage).toHaveBeenCalledWith('https://alkem.io/x', 0);
    expect(children[0].sent[1]).toEqual({
      type: 'IMAGE',
      jobId: children[0].jobId,
      index: 0,
      outcome,
    });
    children[0].reply({ type: 'DONE', pdf, imageCount: 1 });
    await expect(rendering).resolves.toBe(pdf);
  });

  it('kills the worker and rethrows the resolver error unchanged', async () => {
    const { run, children, resolveImage } = setup();
    const denied = new ForbiddenException('denied', LogContext.MEMOS);
    resolveImage.mockRejectedValue(denied);

    const rendering = run('signing').catch(caught => caught);
    children[0].reply({ type: 'RESOLVE_IMAGE', index: 0, src: 'https://x' });

    expect(await rendering).toBe(denied);
    expect(children[0].kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('reports crashed, not the raw error, when the file service fails an image read', async () => {
    const { run, children, resolveImage, logger } = setup();
    const outage = new StorageServiceUnavailableException(
      'File service unavailable'
    );
    resolveImage.mockRejectedValue(outage);

    const rendering = run('download').catch(caught => caught);
    children[0].reply({ type: 'RESOLVE_IMAGE', index: 0, src: 'https://x' });

    const error = await rendering;
    expect(error).toBeInstanceOf(MemoPdfUnavailableException);
    expect(error.reason).toBe('crashed');
    expect(children[0].kill).toHaveBeenCalledWith('SIGKILL');
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'crashed' }),
      outage.stack,
      LogContext.MEMOS
    );
  });

  it('turns FAILED invalid into a ValidationException with the worker message', async () => {
    const { run, children } = setup();

    const rendering = run('signing').catch(caught => caught);
    children[0].reply({
      type: 'FAILED',
      kind: 'invalid',
      message: 'Memo PDF supports at most 20 images',
    });

    const error = await rendering;
    expect(error).toBeInstanceOf(ValidationException);
    expect(error.message).toBe('Memo PDF supports at most 20 images');
  });

  it.each([
    ['a malformed message', { type: 'DONE', pdf: 'not a buffer' }],
    ['an unknown message', { type: 'HELLO' }],
    [
      'FAILED crashed',
      { type: 'FAILED', kind: 'crashed', message: 'TypeError' },
    ],
    [
      'an out-of-order image request',
      { type: 'RESOLVE_IMAGE', index: 1, src: 'https://x' },
    ],
  ])('kills the worker and reports crashed on %s', async (_label, message) => {
    const { run, children } = setup();

    const rendering = run('signing').catch(caught => caught);
    children[0].reply(message);

    const error = await rendering;
    expect(children[0].kill).toHaveBeenCalledWith('SIGKILL');
    expect(error).toBeInstanceOf(MemoPdfUnavailableException);
    expect(error.reason).toBe('crashed');
  });

  it('kills the worker and reports crashed on a message for another job', async () => {
    const { run, children } = setup();

    const rendering = run('signing').catch(caught => caught);
    children[0].emit('message', {
      type: 'DONE',
      jobId: 'another-job',
      pdf,
      imageCount: 0,
    });

    expect((await rendering).reason).toBe('crashed');
  });

  it('reports crashed when the worker exits before answering', async () => {
    const { run, children, executor } = setup();

    const rendering = run('signing').catch(caught => caught);
    children[0].exit(1, null);

    expect((await rendering).reason).toBe('crashed');
    expect((executor as any).jobs.size).toBe(0);
  });

  it('resolves a DONE whose message arrives after the worker exit event', async () => {
    const { run, children } = setup();

    const rendering = run('signing');
    // A worker sends DONE and exits at once; Node may report the exit before
    // it reads the IPC message, and only 'close' follows the drained channel.
    children[0].emit('exit', 0, null);
    children[0].reply({ type: 'DONE', pdf, imageCount: 0 });
    children[0].emit('close', 0, null);

    await expect(rendering).resolves.toBe(pdf);
  });

  it('kills every live worker on module destroy', async () => {
    const { run, children, executor } = setup();

    const first = run('signing', 'actor-1').catch(caught => caught);
    const second = run('signing', 'actor-2').catch(caught => caught);
    executor.onModuleDestroy();

    for (const child of children)
      expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    expect((await first).message).toBe('Memo PDF render cancelled');
    expect((await second).message).toBe('Memo PDF render cancelled');
  });

  it('writes one log line per render with ids, outcome and sizes only', async () => {
    const { run, children, logger } = setup();

    const rendering = run('signing', 'actor-1', { memoId: 'memo-9' });
    children[0].reply({ type: 'DONE', pdf, imageCount: 3 });
    await rendering;

    expect(logger.log).toHaveBeenCalledOnce();
    const [line, context] = logger.log.mock.calls[0];
    expect(context).toBe(LogContext.MEMOS);
    expect(Object.keys(line).sort()).toEqual(
      [
        'actorId',
        'durationMs',
        'imageCount',
        'jobId',
        'memoId',
        'message',
        'outcome',
        'pdfBytes',
        'purpose',
      ].sort()
    );
    expect(line).toMatchObject({
      message: 'Memo PDF render completed',
      jobId: children[0].jobId,
      memoId: 'memo-9',
      actorId: 'actor-1',
      purpose: 'signing',
      outcome: 'ok',
      pdfBytes: pdf.length,
      imageCount: 3,
    });
  });

  it('logs a worker crash with its exit code and signal', async () => {
    const { run, children, logger } = setup();

    const rendering = run('signing').catch(caught => caught);
    children[0].exit(null, 'SIGABRT');

    expect((await rendering).reason).toBe('crashed');
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'crashed',
        exitCode: null,
        signal: 'SIGABRT',
      }),
      undefined,
      LogContext.MEMOS
    );
  });

  it('logs the error name a worker reports for a crashed render', async () => {
    const { run, children, logger } = setup();

    const rendering = run('signing').catch(caught => caught);
    children[0].reply({
      type: 'FAILED',
      kind: 'crashed',
      message: 'RangeError',
    });

    expect((await rendering).reason).toBe('crashed');
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'crashed',
        workerError: 'RangeError',
        signal: 'SIGKILL',
      }),
      undefined,
      LogContext.MEMOS
    );
  });

  it('logs the code and message of a synchronous fork failure', async () => {
    const { run, failLaunch, logger } = setup();
    failLaunch(Object.assign(new Error('spawn EAGAIN'), { code: 'EAGAIN' }));

    await run('signing').catch(() => undefined);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'launch-failed',
        errorCode: 'EAGAIN',
        errorMessage: 'spawn EAGAIN',
      }),
      expect.any(String),
      LogContext.MEMOS
    );
  });

  it('logs the code and message of an asynchronous spawn error', async () => {
    const { run, children, logger } = setup();

    const rendering = run('signing').catch(caught => caught);
    children[0].pid = undefined;
    children[0].kill.mockImplementation(() => true);
    children[0].emit(
      'error',
      Object.assign(new Error('spawn ENOMEM'), { code: 'ENOMEM' })
    );

    expect((await rendering).reason).toBe('launch-failed');
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'launch-failed',
        errorCode: 'ENOMEM',
        errorMessage: 'spawn ENOMEM',
      }),
      expect.any(String),
      LogContext.MEMOS
    );
  });

  it('logs refusals and cancellations as warnings and crashes as errors', async () => {
    const { run, children, logger } = setup();

    const first = run('signing', 'actor-1').catch(caught => caught);
    await run('signing', 'actor-1').catch(() => undefined);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'busy-actor', durationMs: 0 }),
      LogContext.MEMOS
    );

    children[0].exit(1, null);
    expect((await first).reason).toBe('crashed');
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'crashed' }),
      undefined,
      LogContext.MEMOS
    );
  });
});

describe('memoPdfExecutorCapacity', () => {
  const valid = {
    max_concurrent_renders: 3,
    max_concurrent_renders_per_actor: 2,
    heap_mb: 256,
    deadline_ms: 10_000,
  };

  it('reads valid values as they are', () => {
    const warn = vi.fn();
    expect(memoPdfExecutorCapacity(valid, warn)).toEqual({
      maxConcurrent: 3,
      maxConcurrentDownloads: 2,
      maxPerActor: 2,
      heapMb: 256,
      deadlineMs: 10_000,
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('accepts 0 for the global cap', () => {
    const warn = vi.fn();
    const capacity = memoPdfExecutorCapacity(
      { ...valid, max_concurrent_renders: 0 },
      warn
    );
    expect(capacity.maxConcurrent).toBe(0);
    expect(capacity.maxConcurrentDownloads).toBe(0);
    expect(warn).not.toHaveBeenCalled();
  });

  it('rejects 0 for the per-actor cap, which would refuse every render as busy-actor', () => {
    const warn = vi.fn();
    const capacity = memoPdfExecutorCapacity(
      { ...valid, max_concurrent_renders_per_actor: 0 },
      warn
    );
    expect(capacity.maxPerActor).toBe(1);
    expect(warn.mock.calls).toEqual([['max_concurrent_renders_per_actor']]);
  });

  it.each([
    'abc',
    -1,
    1.5,
    Number.NaN,
    undefined,
  ])('falls back to the defaults with one warning per key for %s', value => {
    const warn = vi.fn();
    expect(
      memoPdfExecutorCapacity(
        {
          max_concurrent_renders: value,
          max_concurrent_renders_per_actor: value,
          heap_mb: value,
          deadline_ms: value,
        },
        warn
      )
    ).toEqual({
      maxConcurrent: 3,
      maxConcurrentDownloads: 2,
      maxPerActor: 1,
      heapMb: 512,
      deadlineMs: 30_000,
    });
    expect(warn.mock.calls).toEqual([
      ['max_concurrent_renders'],
      ['max_concurrent_renders_per_actor'],
      ['heap_mb'],
      ['deadline_ms'],
    ]);
  });

  it('reserves nothing for signing when there is a single slot', () => {
    expect(
      memoPdfExecutorCapacity({ ...valid, max_concurrent_renders: 1 }, vi.fn())
    ).toMatchObject({ maxConcurrent: 1, maxConcurrentDownloads: 1 });
  });

  it('rejects 0 for the heap and the deadline', () => {
    const warn = vi.fn();
    const capacity = memoPdfExecutorCapacity(
      { ...valid, heap_mb: 0, deadline_ms: 0 },
      warn
    );
    expect(capacity).toMatchObject({ heapMb: 512, deadlineMs: 30_000 });
    expect(warn.mock.calls).toEqual([['heap_mb'], ['deadline_ms']]);
  });
});
