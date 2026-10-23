import { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { vi } from 'vitest';
import {
  executorConfig,
  WhiteboardExecutorParent,
} from './whiteboard-executor.parent';
import type { ImportInput } from './whiteboard-executor.protocol';

class FakeChild extends EventEmitter {
  pid: number | undefined = 123;
  send = vi.fn();
  kill = vi.fn((signal: NodeJS.Signals = 'SIGTERM') => {
    queueMicrotask(() => this.emit('exit', null, signal));
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
const importInput = (): ImportInput => ({
  scene: {
    type: 'excalidraw',
    version: 2,
    elements: [
      {
        id: 'source',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        angle: 0 as ImportInput['scene']['elements'][number]['angle'],
        strokeColor: '#000000',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roundness: null,
        roughness: 0,
        opacity: 100,
        seed: 1,
        version: 1,
        versionNonce: 1,
        index: 'a0' as ImportInput['scene']['elements'][number]['index'],
        isDeleted: false,
        groupIds: [],
        frameId: null,
        boundElements: null,
        updated: 1,
        link: null,
        locked: false,
      },
    ],
  },
  targetFileIDs: {},
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
  it('global capacity includes media preparation and rejects overflow without a queue', async () => {
    const h = parent(2);
    const input = importInput();
    const settle: (() => void)[] = [];
    const prepare = vi.fn(async () => {
      await new Promise<void>(resolve => settle.push(resolve));
      return input;
    });
    const callbacks = { prepare };
    const active = [randomUUID(), randomUUID()].map(actor =>
      h.execute(
        randomUUID(),
        actor,
        { import: input } as any,
        undefined,
        callbacks
      )
    );
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(
      await h.execute(
        randomUUID(),
        randomUUID(),
        { import: input } as any,
        undefined,
        callbacks
      )
    ).toEqual({ outcome: 'busy' });
    expect(prepare).toHaveBeenCalledTimes(2);
    h.onModuleDestroy();
    settle.forEach(resolve => resolve());
    expect(await Promise.all(active)).toEqual([
      { outcome: 'cancelled-before-go' },
      { outcome: 'cancelled-before-go' },
    ]);
    expect(h.children).toHaveLength(0);
  });
  it.each([
    false,
    true,
  ])('IPC closure without child exit is terminal afterGo=%s', async afterGo => {
    const h = parent();
    const pending = h.execute(randomUUID(), randomUUID(), operations);
    const child = h.children[0];
    progress(child, 'SYNCED');
    if (afterGo)
      progress(child, 'PREPARED', {
        updateDigest: 'a'.repeat(64),
        byteLength: 2,
        summary: [],
      });
    child.emit('disconnect');
    try {
      expect(child.kill).toHaveBeenCalledOnce();
      expect((await pending).outcome).toBe(
        afterGo ? 'indeterminate-after-go' : 'cancelled-before-go'
      );
    } finally {
      h.onModuleDestroy();
      await pending;
    }
  });
  it('preserves a source READ denial as forbidden without spawn', async () => {
    const h = parent();
    const input = importInput();
    const preparation = {
      prepare: vi
        .fn()
        .mockRejectedValue(
          new ForbiddenAuthorizationPolicyException(
            'Source read denied',
            AuthorizationPrivilege.READ,
            randomUUID(),
            randomUUID()
          )
        ),
    };
    expect(
      await h.execute(
        randomUUID(),
        randomUUID(),
        { import: input } as any,
        undefined,
        preparation
      )
    ).toEqual({ outcome: 'forbidden' });
    expect(h.children).toHaveLength(0);
  });
  it('releases admission after preparation failure without spawning or logging the exception', async () => {
    const logger = { log: vi.fn(), warn: vi.fn() };
    parent();
    const h = new Parent({} as any, logger as any);
    const actor = randomUUID();
    const input = importInput();
    const preparation = {
      prepare: vi.fn(async () => {
        throw new Error('PRIVATE_PREPARATION');
      }),
    };
    expect(
      await h.execute(
        randomUUID(),
        actor,
        { import: input } as any,
        undefined,
        preparation
      )
    ).toEqual({ outcome: 'invalid' });
    expect(h.children).toHaveLength(0);
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain('PRIVATE');
    const next = h.execute(randomUUID(), actor, operations);
    h.onModuleDestroy();
    await next;
  });
  it.each([
    'disabled',
    'busy',
    'aborted',
    'invalid',
  ])('import %s never invokes preparation or spawns', async reason => {
    const h = parent();
    const actor = randomUUID();
    const signal = new AbortController();
    const active =
      reason === 'busy'
        ? h.execute(randomUUID(), actor, operations)
        : undefined;
    if (reason === 'aborted') signal.abort();
    const instance =
      reason === 'disabled'
        ? (() => {
            vi.stubEnv('MCP_WHITEBOARD_EXECUTOR_ENABLED', 'false');
            return new Parent({} as any, { log: vi.fn() } as any);
          })()
        : h;
    const preparation = { prepare: vi.fn() };
    const input = {
      import: {
        scene: {
          type: 'excalidraw',
          version: 2,
          elements: [{ type: 'rectangle' }],
        },
        targetFileIDs: {},
      },
    };
    const outcome = await instance.execute(
      reason === 'invalid' ? '' : randomUUID(),
      actor,
      input as any,
      signal.signal,
      preparation
    );
    expect(outcome.outcome).toBe(
      (
        {
          disabled: 'unavailable',
          busy: 'busy',
          aborted: 'cancelled-before-go',
          invalid: 'invalid',
        } as const
      )[reason]
    );
    expect(preparation.prepare).not.toHaveBeenCalled();
    expect(instance.children).toHaveLength(reason === 'busy' ? 1 : 0);
    h.onModuleDestroy();
    await active;
  });
  it.each([
    false,
    true,
  ])('import failure preserves resolved file bindings and phase outcomes afterGo=%s', async afterGo => {
    const h = parent();
    const fresh = randomUUID();
    const input = importInput();
    input.scene.elements = [
      {
        ...input.scene.elements[0],
        type: 'image',
        fileId: 'asset' as Extract<
          ImportInput['scene']['elements'][number],
          { type: 'image' }
        >['fileId'],
        status: 'saved',
        scale: [1, 1],
        crop: null,
      },
    ];
    input.targetFileIDs = { asset: fresh };
    const preparation = {
      prepare: vi.fn(async () => input),
    };
    const pending = h.execute(
      randomUUID(),
      randomUUID(),
      { import: input } as any,
      undefined,
      preparation
    );
    await vi.waitFor(() => expect(h.children).toHaveLength(1));
    const child = h.children[0];
    expect(child.send.mock.calls[0][0].import).toEqual(input);
    expect(child.send.mock.calls[0][0]).not.toHaveProperty('operations');
    progress(child, 'SYNCED');
    if (afterGo)
      progress(child, 'PREPARED', {
        updateDigest: 'a'.repeat(64),
        byteLength: 2,
        summary: [{ op: 'importScene', elementIds: ['fresh'] }],
      });
    child.emit('exit', 1);
    expect((await pending).outcome).toBe(
      afterGo ? 'indeterminate-after-go' : 'resource-exhausted-before-go'
    );
    expect(input.targetFileIDs).toEqual({ asset: fresh });
  });
  it('the deadline aborts media work but waits for settlement before releasing admission', async () => {
    vi.useFakeTimers();
    const h = parent();
    const actor = randomUUID();
    let settle!: () => void;
    let context!: {
      signal: AbortSignal;
      deadlineAt: number;
    };
    const input = importInput();
    const preparation = {
      prepare: vi.fn(async c => {
        context = c;
        await new Promise<void>(resolve => {
          settle = resolve;
        });
        throw new Error('late upload failure');
      }),
    };
    const pending = h.execute(
      randomUUID(),
      actor,
      { import: input } as any,
      undefined,
      preparation
    );
    expect(context.deadlineAt).toBe(Date.now() + 10000);
    await vi.advanceTimersByTimeAsync(10000);
    expect(context.signal.aborted).toBe(true);
    expect(await h.execute(randomUUID(), actor, operations)).toEqual({
      outcome: 'busy',
    });
    settle();
    expect(await pending).toEqual({ outcome: 'timeout-before-go' });
    expect(h.children).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('holds the actor slot through uncancellable materialization after abort and never spawns', async () => {
    const h = parent();
    const actor = randomUUID();
    const controller = new AbortController();
    let settle!: () => void;
    const input = { import: importInput() };
    const prepare = vi.fn(async () => {
      await new Promise<void>(resolve => {
        settle = resolve;
      });
      return input.import;
    });
    const pending = h.execute(
      randomUUID(),
      actor,
      input as any,
      controller.signal,
      { prepare }
    );
    expect(prepare).toHaveBeenCalledOnce();
    controller.abort();
    expect(await h.execute(randomUUID(), actor, operations)).toEqual({
      outcome: 'busy',
    });
    expect(h.children).toHaveLength(0);
    settle();
    expect(await pending).toEqual({ outcome: 'cancelled-before-go' });
    expect(h.children).toHaveLength(0);
    const next = h.execute(randomUUID(), actor, operations);
    h.onModuleDestroy();
    await next;
  });
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
      outcome: 'unavailable',
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
  it.each(
    ['joining', 'synced', 'go', 'published'].flatMap(phase =>
      [
        { code: 0, signal: null },
        { code: 1, signal: null },
        { code: null, signal: 'SIGABRT' },
      ].map(exit => ({ phase, ...exit }))
    )
  )('classifies exit $code/$signal in $phase without replay', async ({
    phase,
    code,
    signal,
  }) => {
    vi.useFakeTimers();
    const h = parent();
    const actor = randomUUID();
    const pending = h.execute(randomUUID(), actor, operations);
    const child = h.children[0];
    if (phase !== 'joining') progress(child, 'SYNCED');
    if (phase === 'go' || phase === 'published')
      progress(child, 'PREPARED', {
        updateDigest: 'a'.repeat(64),
        byteLength: 2,
        summary: [],
      });
    if (phase === 'published') progress(child, 'PUBLISHED');
    child.emit('exit', code, signal);
    expect((await pending).outcome).toBe(
      phase === 'go' || phase === 'published'
        ? 'indeterminate-after-go'
        : code === 0
          ? 'cancelled-before-go'
          : 'resource-exhausted-before-go'
    );
    expect(child.kill).not.toHaveBeenCalled();
    expect(child.eventNames()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    expect(h.children).toHaveLength(1);
    const next = h.execute(randomUUID(), actor, operations);
    expect(h.children).toHaveLength(2);
    h.onModuleDestroy();
    await next;
    expect(vi.getTimerCount()).toBe(0);
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
