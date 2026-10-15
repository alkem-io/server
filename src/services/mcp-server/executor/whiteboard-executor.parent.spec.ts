import { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { vi } from 'vitest';
import {
  executorConfig,
  WhiteboardExecutorParent,
} from './whiteboard-executor.parent';

class FakeChild extends EventEmitter {
  pid: number | undefined = 123;
  send = vi.fn();
  kill = vi.fn(() => {
    queueMicrotask(() => this.emit('exit', 0));
    return true;
  });
}
class Parent extends WhiteboardExecutorParent {
  children: FakeChild[] = [];
  protected launch() {
    const child = new FakeChild();
    this.children.push(child);
    return child as unknown as ChildProcess;
  }
}
function parent(n = 4, p = 1) {
  vi.stubEnv('MCP_WHITEBOARD_EXECUTOR_ENABLED', 'true');
  vi.stubEnv('MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN', String(n));
  vi.stubEnv(
    'MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN_PER_ACTOR',
    String(p)
  );
  vi.stubEnv('MCP_WHITEBOARD_EXECUTOR_HEAP_MB', '256');
  vi.stubEnv('MCP_WHITEBOARD_EXECUTOR_DEADLINE_MS', '10000');
  return new Parent({} as any, { log: vi.fn() } as any);
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
const operations = [{ op: 'addText' as const, text: 'hello' }];
const progress = (child: FakeChild, type: string, more = {}) => {
  const jobId = child.send.mock.calls[0][0].childLaunchGrant.jobId;
  child.emit('message', { type, jobId, generationId: 1, ...more });
};

describe('whiteboard-executor configuration', () => {
  const enabled = {
    MCP_WHITEBOARD_EXECUTOR_ENABLED: 'true',
    MCP_WHITEBOARD_EXECUTOR_HEAP_MB: '256',
    MCP_WHITEBOARD_EXECUTOR_DEADLINE_MS: '10000',
    MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN: '4',
    MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN_PER_ACTOR: '1',
  };
  it.each([
    1, 2, 9,
  ])('starts with valid P=%s and logs derived effective capacity', p => {
    expect(
      executorConfig({
        ...enabled,
        MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN_PER_ACTOR: String(p),
      })
    ).toMatchObject({ n: 4, p, a: Math.min(p, 3) });
  });
  it('is default off even with shared MCP enablement and absent capacity', () => {
    expect(executorConfig({ MCP_ENABLED: 'true' })).toBeUndefined();
  });
  it.each([
    undefined,
    '0',
    '1',
    '2.5',
    'NaN',
  ])('rejects enabled invalid N %s', n => {
    expect(() =>
      executorConfig({
        ...enabled,
        MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN: n,
      })
    ).toThrow();
  });
  it.each([undefined, '0', '-1', '1.5'])('rejects invalid P %s', p => {
    expect(() =>
      executorConfig({
        ...enabled,
        MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN_PER_ACTOR: p,
      })
    ).toThrow();
  });
  it('rejects below-SLO production capacity', () => {
    expect(() =>
      executorConfig({
        ...enabled,
        NODE_ENV: 'production',
        MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN: '3',
      })
    ).toThrow();
  });
});

describe('whiteboard-executor parent admission and lifecycle', () => {
  it.each([
    false,
    true,
  ])('one total deadline is not reset by progress afterGo=%s', async afterGo => {
    vi.useFakeTimers();
    const h = parent();
    const pending = h.execute(randomUUID(), randomUUID(), operations);
    const child = h.children[0];
    await vi.advanceTimersByTimeAsync(9000);
    progress(child, 'SYNCED');
    if (afterGo)
      progress(child, 'PREPARED', {
        updateDigest: 'a'.repeat(64),
        byteLength: 2,
        summary: [],
      });
    await vi.advanceTimersByTimeAsync(1000);
    expect((await pending).outcome).toBe(
      afterGo ? 'indeterminate-after-go' : 'timeout-before-go'
    );
    expect(child.listenerCount('message')).toBe(0);
  });
  it('requires both identities on failure once synchronized', async () => {
    const h = parent();
    const pending = h.execute(randomUUID(), randomUUID(), operations);
    const child = h.children[0];
    progress(child, 'SYNCED');
    child.emit('message', {
      type: 'FAILED',
      generationId: 1,
      typedOutcome: 'forbidden',
    });
    expect((await pending).outcome).toBe('invalid');
  });
  it.each([
    1, 2, 9,
  ])('honors configured actor cap P=%s and fills every remaining global slot', async p => {
    const h = parent(4, p);
    const actor = randomUUID();
    const a = Math.min(p, 3);
    const active = Array.from({ length: a }, () =>
      h.execute(randomUUID(), actor, operations)
    );
    expect(await h.execute(randomUUID(), actor, operations)).toEqual({
      outcome: 'busy',
    });
    for (let i = a; i < 4; i++)
      active.push(h.execute(randomUUID(), randomUUID(), operations));
    expect(h.children).toHaveLength(4);
    expect(await h.execute(randomUUID(), randomUUID(), operations)).toEqual({
      outcome: 'busy',
    });
    h.onModuleDestroy();
    await Promise.all(active);
    const next = h.execute(randomUUID(), actor, operations);
    expect(h.children).toHaveLength(5);
    h.onModuleDestroy();
    await next;
  });
  it('disabled executor and invalid identity/schema spawn no child', async () => {
    vi.stubEnv('MCP_WHITEBOARD_EXECUTOR_ENABLED', 'false');
    const h = new Parent({} as any, { log: vi.fn() } as any);
    expect(await h.execute(randomUUID(), randomUUID(), operations)).toEqual({
      outcome: 'forbidden',
    });
    expect(await h.execute('', randomUUID(), operations)).toEqual({
      outcome: 'invalid',
    });
    expect(h.children).toHaveLength(0);
  });
  it('handles spawn error without exit and releases both capacity counts', async () => {
    const h = parent();
    const actor = randomUUID();
    const pending = h.execute(randomUUID(), actor, operations);
    h.children[0].pid = undefined;
    h.children[0].kill.mockImplementation(() => true);
    h.children[0].emit('error', new Error('ENOENT'));
    expect(await pending).toEqual({ outcome: 'resource-exhausted-before-go' });
    const next = h.execute(randomUUID(), actor, operations);
    expect(h.children).toHaveLength(2);
    h.onModuleDestroy();
    await next;
  });
  it.each([
    'joining',
    'synced',
    'go',
    'published',
  ])('classifies child exit in %s without replay', async phase => {
    const h = parent();
    const pending = h.execute(randomUUID(), randomUUID(), operations);
    const child = h.children[0];
    if (phase !== 'joining') progress(child, 'SYNCED');
    if (phase === 'go' || phase === 'published')
      progress(child, 'PREPARED', {
        updateDigest: 'a'.repeat(64),
        byteLength: 2,
        summary: [],
      });
    if (phase === 'published') progress(child, 'PUBLISHED');
    child.emit('exit', 1);
    expect((await pending).outcome).toBe(
      phase === 'go' || phase === 'published'
        ? 'indeterminate-after-go'
        : 'resource-exhausted-before-go'
    );
    expect(h.children).toHaveLength(1);
  });
  it.each([false, true])('caller cancellation afterGo=%s', async afterGo => {
    const h = parent();
    const controller = new AbortController();
    const pending = h.execute(
      randomUUID(),
      randomUUID(),
      operations,
      controller.signal
    );
    const child = h.children[0];
    progress(child, 'SYNCED');
    if (afterGo)
      progress(child, 'PREPARED', {
        updateDigest: 'a'.repeat(64),
        byteLength: 2,
        summary: [],
      });
    controller.abort();
    if (afterGo) {
      expect(child.kill).not.toHaveBeenCalled();
      progress(child, 'DURABLE', {
        result: { addedElementIds: [], summary: [] },
      });
    }
    expect((await pending).outcome).toBe(
      afterGo ? 'durable-success' : 'cancelled-before-go'
    );
    expect(child.listenerCount('message')).toBe(0);
  });
  it('out-of-order PREPARED and stale generation fail closed without GO', async () => {
    const h = parent();
    const pending = h.execute(randomUUID(), randomUUID(), operations);
    const child = h.children[0];
    progress(child, 'PREPARED', {
      updateDigest: 'a'.repeat(64),
      byteLength: 2,
      summary: [],
    });
    expect((await pending).outcome).toBe('invalid');
    expect(child.send).toHaveBeenCalledOnce();
  });
});
