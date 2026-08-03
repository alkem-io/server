import { TaskStatus } from '@domain/task/dto/task.status.enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { LoggerService } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager, MockWinstonProvider } from '@test/mocks';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { Mock } from 'vitest';
import type { Task } from './task.interface';
import { TASK_LIST_CACHE_KEY } from './task.list.key';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let service: TaskService;
  let cacheManager: Cache;
  let logger: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskService, MockCacheManager, MockWinstonProvider],
    }).compile();

    service = module.get<TaskService>(TaskService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    logger = module.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTaskList', () => {
    it('should return the cached list when it exists', async () => {
      const cachedList = ['task-1', 'task-2'];
      (cacheManager.get as Mock).mockResolvedValueOnce(cachedList);

      const result = await service.getTaskList();

      expect(result).toEqual(cachedList);
      expect(cacheManager.get).toHaveBeenCalledWith(TASK_LIST_CACHE_KEY);
    });

    it('should create and return a new empty list when cache is empty', async () => {
      (cacheManager.get as Mock).mockResolvedValueOnce(undefined);
      (cacheManager.set as Mock).mockResolvedValueOnce('ok');

      const result = await service.getTaskList();

      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(TASK_LIST_CACHE_KEY, [], {
        ttl: 3600,
      });
    });
  });

  describe('getAll', () => {
    it('should return tasks filtered by IN_PROGRESS status by default', async () => {
      const taskInProgress = createMockTask({
        status: TaskStatus.IN_PROGRESS,
      });
      const taskCompleted = createMockTask({ status: TaskStatus.COMPLETED });

      (cacheManager.get as Mock)
        .mockResolvedValueOnce([taskInProgress.id, taskCompleted.id]) // getTaskList
        .mockResolvedValueOnce(taskInProgress) // get task 1
        .mockResolvedValueOnce(taskCompleted); // get task 2

      const result = await service.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should return tasks filtered by the given status', async () => {
      const taskCompleted = createMockTask({ status: TaskStatus.COMPLETED });

      (cacheManager.get as Mock)
        .mockResolvedValueOnce([taskCompleted.id]) // getTaskList
        .mockResolvedValueOnce(taskCompleted); // get task

      const result = await service.getAll(TaskStatus.COMPLETED);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(TaskStatus.COMPLETED);
    });

    it('should handle empty task list', async () => {
      (cacheManager.get as Mock).mockResolvedValueOnce([]);

      const result = await service.getAll();

      expect(result).toEqual([]);
    });

    it('should filter out undefined tasks (cache misses)', async () => {
      (cacheManager.get as Mock)
        .mockResolvedValueOnce(['missing-id']) // getTaskList
        .mockResolvedValueOnce(undefined); // get returns undefined

      const result = await service.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('get', () => {
    it('should delegate to cacheManager.get', async () => {
      const task = createMockTask();
      (cacheManager.get as Mock).mockResolvedValueOnce(task);

      const result = await service.get('some-id');

      expect(result).toEqual(task);
      expect(cacheManager.get).toHaveBeenCalledWith('some-id');
    });

    it('should return undefined when task does not exist', async () => {
      (cacheManager.get as Mock).mockResolvedValueOnce(undefined);

      const result = await service.get('missing-id');

      expect(result).toBeUndefined();
    });
  });

  describe('getOrFail', () => {
    it('should return the task when found', async () => {
      const task = createMockTask();
      (cacheManager.get as Mock).mockResolvedValueOnce(task);

      const result = await service.getOrFail(task.id);

      expect(result).toEqual(task);
    });

    it('should throw an Error when task is not found', async () => {
      (cacheManager.get as Mock).mockResolvedValueOnce(undefined);

      await expect(service.getOrFail('missing-id')).rejects.toThrow(
        "Task 'missing-id' not found"
      );
    });
  });

  describe('create', () => {
    it('should create a task with itemsCount and itemsDone=0', async () => {
      // getTaskList returns empty list
      (cacheManager.get as Mock).mockResolvedValueOnce([]);
      // set calls resolve
      (cacheManager.set as Mock).mockResolvedValue('ok');

      const result = await service.create(5);

      expect(result.id).toBeDefined();
      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
      expect(result.action).toBe('auth-reset');
      expect(result.itemsCount).toBe(5);
      expect(result.itemsDone).toBe(0);
      expect(result.results).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.created).toBeGreaterThan(0);
      expect(result.start).toBeGreaterThan(0);
    });

    it('should create a task without itemsCount (itemsDone is undefined)', async () => {
      (cacheManager.get as Mock).mockResolvedValueOnce([]);
      (cacheManager.set as Mock).mockResolvedValue('ok');

      const result = await service.create();

      expect(result.itemsCount).toBeUndefined();
      expect(result.itemsDone).toBeUndefined();
    });

    it('should store the task in cache and add it to the task list', async () => {
      const taskList: string[] = [];
      (cacheManager.get as Mock).mockResolvedValueOnce(taskList);
      (cacheManager.set as Mock).mockResolvedValue('ok');

      const result = await service.create(3);

      // First set: the task itself
      expect(cacheManager.set).toHaveBeenCalledWith(
        result.id,
        expect.objectContaining({ id: result.id }),
        { ttl: 3600 }
      );
      // Second set (inside addTaskToList -> getTaskList creates new list)
      // or set for the task list
      expect(cacheManager.set).toHaveBeenCalledWith(
        TASK_LIST_CACHE_KEY,
        expect.arrayContaining([result.id]),
        { ttl: 3600 }
      );
    });
  });

  describe('updateTaskResults', () => {
    it('should add result and increment itemsDone', async () => {
      const task = createMockTask({
        itemsCount: 3,
        itemsDone: 0,
      });
      (cacheManager.get as Mock).mockResolvedValueOnce(task);
      (cacheManager.set as Mock).mockResolvedValueOnce('ok');

      await service.updateTaskResults(task.id, 'result-1');

      expect(task.itemsDone).toBe(1);
      expect(task.results).toHaveLength(1);
      expect(task.results[0]).toContain('result-1');
      expect(cacheManager.set).toHaveBeenCalledWith(task.id, task, {
        ttl: 3600,
      });
    });

    it('should set status to COMPLETED when all items are done', async () => {
      const task = createMockTask({
        itemsCount: 1,
        itemsDone: 0,
      });
      (cacheManager.get as Mock).mockResolvedValueOnce(task);
      (cacheManager.set as Mock).mockResolvedValueOnce('ok');

      await service.updateTaskResults(task.id, 'last-result');

      expect(task.itemsDone).toBe(1);
      expect(task.status).toBe(TaskStatus.COMPLETED);
    });

    it('should not increment itemsDone when completeItem is false', async () => {
      const task = createMockTask({
        itemsCount: 3,
        itemsDone: 0,
      });
      (cacheManager.get as Mock).mockResolvedValueOnce(task);
      (cacheManager.set as Mock).mockResolvedValueOnce('ok');

      await service.updateTaskResults(task.id, 'partial-result', false);

      expect(task.itemsDone).toBe(0);
      expect(task.results).toHaveLength(1);
    });

    it('should not increment itemsDone when itemsDone is undefined', async () => {
      const task = createMockTask({
        itemsCount: undefined,
        itemsDone: undefined,
      });
      (cacheManager.get as Mock).mockResolvedValueOnce(task);
      (cacheManager.set as Mock).mockResolvedValueOnce('ok');

      await service.updateTaskResults(task.id, 'some-result');

      expect(task.itemsDone).toBeUndefined();
    });

    it('should throw when task is not found', async () => {
      (cacheManager.get as Mock).mockResolvedValueOnce(undefined);

      await expect(
        service.updateTaskResults('missing', 'result')
      ).rejects.toThrow("Task 'missing' not found");
    });
  });

  describe('updateTaskErrors', () => {
    it('should add error and increment itemsDone', async () => {
      const task = createMockTask({
        itemsCount: 3,
        itemsDone: 0,
      });
      (cacheManager.get as Mock).mockResolvedValueOnce(task);
      (cacheManager.set as Mock).mockResolvedValueOnce('ok');

      await service.updateTaskErrors(task.id, 'error-msg');

      expect(task.itemsDone).toBe(1);
      expect(task.errors).toHaveLength(1);
      expect(task.errors[0]).toBe('error-msg');
      expect(cacheManager.set).toHaveBeenCalledWith(task.id, task, {
        ttl: 3600,
      });
    });

    it('should set status to ERRORED when all items are done', async () => {
      const task = createMockTask({
        itemsCount: 1,
        itemsDone: 0,
      });
      (cacheManager.get as Mock).mockResolvedValueOnce(task);
      (cacheManager.set as Mock).mockResolvedValueOnce('ok');

      await service.updateTaskErrors(task.id, 'final-error');

      expect(task.itemsDone).toBe(1);
      // A run that lost items is not a successful run.
      expect(task.status).toBe(TaskStatus.ERRORED);
    });

    it('should not increment itemsDone when completeItem is false', async () => {
      const task = createMockTask({
        itemsCount: 3,
        itemsDone: 0,
      });
      (cacheManager.get as Mock).mockResolvedValueOnce(task);
      (cacheManager.set as Mock).mockResolvedValueOnce('ok');

      await service.updateTaskErrors(task.id, 'error', false);

      expect(task.itemsDone).toBe(0);
      expect(task.errors).toHaveLength(1);
    });

    it('should throw when task is not found', async () => {
      (cacheManager.get as Mock).mockResolvedValueOnce(undefined);

      await expect(
        service.updateTaskErrors('missing', 'error')
      ).rejects.toThrow("Task 'missing' not found");
    });
  });

  // Regression coverage for #6310: `authorizationPolicyResetAll` handed back a
  // task that could never reach COMPLETED, while the error path completed it on
  // the first failure. The two update paths must agree on when a task is done.
  describe('terminal status (issue #6310)', () => {
    const primeTask = (task: Task) => {
      (cacheManager.get as Mock).mockResolvedValue(task);
      (cacheManager.set as Mock).mockResolvedValue('ok');
    };

    it('should NOT complete an uncounted task on an error', async () => {
      // The exact shape `create()` produces with no itemsCount — where
      // `undefined === undefined` used to be read as "all items are done".
      const task = createMockTask({
        itemsCount: undefined,
        itemsDone: undefined,
      });
      primeTask(task);

      await service.updateTaskErrors(task.id, 'boom');

      expect(task.status).toBe(TaskStatus.IN_PROGRESS);
      expect(task.end).toBeUndefined();
      expect(task.errors).toHaveLength(1);
    });

    it('should NOT complete an uncounted task after many errors', async () => {
      const task = createMockTask({
        itemsCount: undefined,
        itemsDone: undefined,
      });
      primeTask(task);

      await service.updateTaskErrors(task.id, 'boom-1');
      await service.updateTaskErrors(task.id, 'boom-2');
      await service.updateTaskErrors(task.id, 'boom-3');

      expect(task.status).toBe(TaskStatus.IN_PROGRESS);
      // An uncounted task is only ever terminated explicitly.
      await service.complete(task.id, TaskStatus.ERRORED);
      expect(task.status).toBe(TaskStatus.ERRORED);
    });

    it('should NOT complete an uncounted task on a result either', async () => {
      const task = createMockTask({
        itemsCount: undefined,
        itemsDone: undefined,
      });
      primeTask(task);

      await service.updateTaskResults(task.id, 'ok');

      expect(task.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should reach COMPLETED when itemsDone reaches itemsCount', async () => {
      const task = createMockTask({ itemsCount: 3, itemsDone: 0 });
      primeTask(task);

      await service.updateTaskResults(task.id, 'item-1');
      expect(task.status).toBe(TaskStatus.IN_PROGRESS);

      await service.updateTaskResults(task.id, 'item-2');
      expect(task.status).toBe(TaskStatus.IN_PROGRESS);

      await service.updateTaskResults(task.id, 'item-3');

      expect(task.itemsDone).toBe(3);
      expect(task.status).toBe(TaskStatus.COMPLETED);
      expect(task.end).toBeGreaterThan(0);
    });

    it('should stay IN_PROGRESS when an early item errors, then end ERRORED', async () => {
      const task = createMockTask({ itemsCount: 3, itemsDone: 0 });
      primeTask(task);

      // The inverted path: the first error used to flip status to COMPLETED.
      await service.updateTaskErrors(task.id, 'item-1 failed');
      expect(task.status).toBe(TaskStatus.IN_PROGRESS);

      await service.updateTaskResults(task.id, 'item-2 ok');
      expect(task.status).toBe(TaskStatus.IN_PROGRESS);

      // Last item lands on the SUCCESS path, but the run lost an item.
      await service.updateTaskResults(task.id, 'item-3 ok');

      expect(task.itemsDone).toBe(3);
      expect(task.status).toBe(TaskStatus.ERRORED);
      expect(task.end).toBeGreaterThan(0);
    });

    it('should end ERRORED when the last item is the failing one', async () => {
      const task = createMockTask({ itemsCount: 2, itemsDone: 0 });
      primeTask(task);

      await service.updateTaskResults(task.id, 'item-1 ok');
      expect(task.status).toBe(TaskStatus.IN_PROGRESS);

      await service.updateTaskErrors(task.id, 'item-2 failed');

      expect(task.itemsDone).toBe(2);
      expect(task.status).toBe(TaskStatus.ERRORED);
    });

    it('should still terminate if the counter overshoots itemsCount', async () => {
      const task = createMockTask({ itemsCount: 1, itemsDone: 2 });
      primeTask(task);

      await service.updateTaskResults(task.id, 'stray item');

      // `>=`, not `===` — an overshoot must not step over the terminal check.
      expect(task.status).toBe(TaskStatus.COMPLETED);
    });

    it('should create a zero-item task already COMPLETED', async () => {
      (cacheManager.get as Mock).mockResolvedValueOnce([]);
      (cacheManager.set as Mock).mockResolvedValue('ok');

      // Nothing to reset means no item update will ever arrive to move it out
      // of IN_PROGRESS.
      const result = await service.create(0);

      expect(result.itemsCount).toBe(0);
      expect(result.itemsDone).toBe(0);
      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.end).toBeGreaterThan(0);
    });
  });

  describe('complete', () => {
    it('should set status to COMPLETED and add end timestamp', async () => {
      const task = createMockTask();
      (cacheManager.get as Mock).mockResolvedValueOnce(task);
      (cacheManager.set as Mock).mockResolvedValueOnce('ok');

      await service.complete(task.id);

      expect(task.status).toBe(TaskStatus.COMPLETED);
      expect(task.end).toBeGreaterThan(0);
      expect(cacheManager.set).toHaveBeenCalledWith(task.id, task, {
        ttl: 3600,
      });
    });

    it('should set status to ERRORED when specified', async () => {
      const task = createMockTask();
      (cacheManager.get as Mock).mockResolvedValueOnce(task);
      (cacheManager.set as Mock).mockResolvedValueOnce('ok');

      await service.complete(task.id, TaskStatus.ERRORED);

      expect(task.status).toBe(TaskStatus.ERRORED);
      expect(task.end).toBeGreaterThan(0);
    });

    it('should throw when task is not found', async () => {
      (cacheManager.get as Mock).mockResolvedValueOnce(undefined);

      await expect(service.complete('missing')).rejects.toThrow(
        "Task 'missing' not found"
      );
    });
  });

  describe('completeWithError', () => {
    it('should add error, set status to ERRORED, and add end timestamp', async () => {
      const task = createMockTask();
      (cacheManager.get as Mock).mockResolvedValueOnce(task);
      (cacheManager.set as Mock).mockResolvedValueOnce('ok');

      await service.completeWithError(task.id, 'fatal error');

      expect(task.errors[0]).toBe('fatal error');
      expect(task.status).toBe(TaskStatus.ERRORED);
      expect(task.end).toBeGreaterThan(0);
      expect(cacheManager.set).toHaveBeenCalledWith(task.id, task, {
        ttl: 3600,
      });
    });

    it('should throw when task is not found', async () => {
      (cacheManager.get as Mock).mockResolvedValueOnce(undefined);

      await expect(
        service.completeWithError('missing', 'error')
      ).rejects.toThrow("Task 'missing' not found");
    });
  });

  describe('addTaskToList (private, tested via create)', () => {
    it('should log error and return false when getTaskList returns null-ish list', async () => {
      // First call: set for the task itself
      (cacheManager.set as Mock).mockResolvedValue('ok');
      // getTaskList: return null (simulating null from cache)
      // Since getTaskList always returns [] when cache returns falsy,
      // we need to spy on getTaskList to return null-like value
      // Actually, addTaskToList calls getTaskList which will always return an array.
      // The null branch in addTaskToList is unreachable in normal flow.
      // We'll test the error path where set rejects.

      // Simulate: getTaskList returns list, but set for task list rejects
      (cacheManager.get as Mock).mockResolvedValueOnce([]); // getTaskList
      (cacheManager.set as Mock)
        .mockResolvedValueOnce('ok') // set task
        .mockRejectedValueOnce(new Error('cache failure')); // set task list fails

      const result = await service.create(1);

      // The task is still returned (addTaskToList failure doesn't prevent create from returning)
      expect(result).toBeDefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});

/**
 * Competing consumers (issue #6310, round 2).
 *
 * The auth-reset queue is consumed by up to 10 pods at once (prefetchCount: 1
 * in main.worker.ts, REPLICAS=10 in the infra-ops autoscaler), all sharing one
 * Redis. These tests model that: every `get` hands back its OWN deserialized
 * copy of the task, and all consumers read before any of them write — which is
 * exactly what makes a read-modify-write lose increments.
 *
 * With `task.itemsDone += 1` the counter lands on 1 instead of 10, the target
 * is never reached, and the task hangs forever — the very bug being fixed.
 * These pass only because the counter is an atomic Redis INCR.
 */
describe('TaskService — concurrent consumers', () => {
  let service: TaskService;
  let counters: Map<string, string>;
  let sets: Map<string, Set<string>>;
  let store: Map<string, any>;

  /** A cacheManager whose reads are isolated copies, like real deserialization. */
  const makeSharedCache = () => ({
    get: vi.fn(async (key: string) => {
      // Snapshot FIRST, then yield. This is the order that matters: every
      // consumer reads the same state before any of them gets to write, which
      // is exactly how a read-modify-write loses increments in production.
      // (Yielding before the read would let each consumer run to completion in
      // its own microtask drain — no overlap, and the test would pass against
      // the very bug it is supposed to catch.)
      const value = store.get(key);
      await new Promise(resolve => setTimeout(resolve, 0));
      return value === undefined ? undefined : structuredClone(value);
    }),
    set: vi.fn(async (key: string, value: any) => {
      store.set(key, structuredClone(value));
      return 'OK';
    }),
    del: vi.fn(),
    reset: vi.fn(),
    wrap: vi.fn(),
    // The bit that matters: a real atomic INCR behind cacheManager.store.
    store: {
      name: 'redis',
      getClient: () => ({
        // Redis values are strings, so the fake stores strings too — coercing
        // to Number here would turn a terminal status like 'errored' into NaN
        // and quietly hide the very clobber these tests check for.
        incr: (key: string, cb: (e: null, v: number) => void) => {
          const next = Number(counters.get(key) ?? 0) + 1;
          counters.set(key, String(next));
          cb(null, next);
        },
        get: (key: string, cb: (e: null, v: string | null) => void) =>
          cb(null, counters.has(key) ? (counters.get(key) as string) : null),
        sadd: (
          key: string,
          member: string,
          cb: (e: null, v: number) => void
        ) => {
          const set = sets.get(key) ?? new Set<string>();
          sets.set(key, set);
          const isNew = !set.has(member);
          set.add(member);
          cb(null, isNew ? 1 : 0);
        },
        setnx: (
          key: string,
          value: string,
          cb: (e: null, v: number) => void
        ) => {
          if (counters.has(key)) {
            cb(null, 0);
            return;
          }
          counters.set(key, value);
          cb(null, 1);
        },
        expire: (_k: string, _s: number, cb: (e: null, v: number) => void) =>
          cb(null, 1),
        quit: vi.fn(),
      }),
    },
  });

  beforeEach(async () => {
    counters = new Map();
    sets = new Map();
    store = new Map();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: CACHE_MANAGER, useValue: makeSharedCache() },
        MockWinstonProvider,
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  it('does not lose increments when 10 consumers finish at once', async () => {
    const task = await service.create(10);

    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        service.updateTaskResults(task.id, `reset ${i}` as any)
      )
    );

    const settled = await service.getOrFail(task.id);

    expect(settled.itemsDone).toBe(10);
    expect(settled.status).toBe(TaskStatus.COMPLETED);
  });

  it('reports COMPLETED even if a stale consumer clobbers the stored status', async () => {
    const task = await service.create(2);

    await Promise.all([
      service.updateTaskResults(task.id, 'a' as any),
      service.updateTaskResults(task.id, 'b' as any),
    ]);

    // Simulate the lost update the counters exist to survive: a slow pod writes
    // its stale IN_PROGRESS copy back over the terminal one.
    store.set(task.id, {
      ...structuredClone(store.get(task.id)),
      status: TaskStatus.IN_PROGRESS,
      itemsDone: 1,
    });

    const resolved = await service.getOrFail(task.id);

    // The Redis counter cannot be clobbered, so it — not the stored field —
    // decides.
    expect(resolved.itemsDone).toBe(2);
    expect(resolved.status).toBe(TaskStatus.COMPLETED);
  });

  it('settles as ERRORED when any item failed, not COMPLETED', async () => {
    const task = await service.create(3);

    await Promise.all([
      service.updateTaskResults(task.id, 'ok' as any),
      service.updateTaskErrors(task.id, 'boom' as any),
      service.updateTaskResults(task.id, 'ok' as any),
    ]);

    const settled = await service.getOrFail(task.id);

    expect(settled.itemsDone).toBe(3);
    expect(settled.status).toBe(TaskStatus.ERRORED);
  });

  it('ignores a redelivered item after the task has settled', async () => {
    const task = await service.create(1);

    await service.updateTaskResults(task.id, 'ok' as any);
    expect((await service.getOrFail(task.id)).status).toBe(
      TaskStatus.COMPLETED
    );

    // RabbitMQ is at-least-once: handleReset publishes its retry before acking
    // the original, so a pod dying in between gets the item redelivered. That
    // must not resurrect a settled task or re-stamp its `end`.
    const endBefore = (await service.getOrFail(task.id)).end;
    await service.updateTaskErrors(task.id, 'late duplicate' as any);

    const after = await service.getOrFail(task.id);
    expect(after.status).toBe(TaskStatus.COMPLETED);
    expect(after.end).toBe(endBefore);
  });

  it('stamps a count onto an externally created task', async () => {
    const task = await service.create(); // uncounted, as external callers make it
    expect(task.itemsCount).toBeUndefined();

    await service.setItemsCount(task.id, 2);

    await Promise.all([
      service.updateTaskResults(task.id, 'a' as any),
      service.updateTaskResults(task.id, 'b' as any),
    ]);

    expect((await service.getOrFail(task.id)).status).toBe(
      TaskStatus.COMPLETED
    );
  });

  it('does not let a redelivered item settle the task early', async () => {
    const task = await service.create(3);

    // RMQ at-least-once: item A is delivered twice while B and C are still
    // queued. Counting the duplicate would push itemsDone to 3, settle the
    // task, and cause every later genuine update to be dropped.
    await service.updateTaskResults(task.id, 'A' as any, true, 'reset:A');
    await service.updateTaskResults(task.id, 'A again' as any, true, 'reset:A');
    await service.updateTaskResults(task.id, 'B' as any, true, 'reset:B');

    const midRun = await service.getOrFail(task.id);
    expect(midRun.itemsDone).toBe(2);
    expect(midRun.status).toBe(TaskStatus.IN_PROGRESS);

    // The genuinely-last item still lands, and its failure is still honoured.
    await service.updateTaskErrors(task.id, 'C failed' as any, true, 'reset:C');

    const settled = await service.getOrFail(task.id);
    expect(settled.itemsDone).toBe(3);
    expect(settled.status).toBe(TaskStatus.ERRORED);
  });

  it('never lets the counter regress when Redis returns mid-run', async () => {
    const task = await service.create(2);

    // Two increments land in-object only (Redis unreachable), then Redis comes
    // back and INCR starts from 1 — below what the task already recorded.
    // A plain assignment would undercount and strand the task IN_PROGRESS.
    const stored = store.get(task.id);
    store.set(task.id, { ...stored, itemsDone: 2 });

    await service.updateTaskResults(task.id, 'reconnected' as any);

    const after = await service.getOrFail(task.id);
    expect(after.itemsDone).toBeGreaterThanOrEqual(2);
    expect(after.status).toBe(TaskStatus.COMPLETED);
  });

  it('keeps the end timestamp when a stale consumer writes over it', async () => {
    const task = await service.create(1);

    await service.updateTaskResults(task.id, 'done' as any);
    const settled = await service.getOrFail(task.id);
    expect(settled.status).toBe(TaskStatus.COMPLETED);
    expect(settled.end).toBeDefined();

    // A slower consumer writes back a copy taken before the task settled, in
    // which `end` is still undefined — erasing the stamp in the cached object.
    store.set(task.id, {
      ...structuredClone(store.get(task.id)),
      end: undefined,
    });

    // The SETNX stamp survives outside the object, so readers still see it.
    const after = await service.getOrFail(task.id);
    expect(after.end).toBe(settled.end);
    expect(after.status).toBe(TaskStatus.COMPLETED);
  });

  it('keeps an explicit terminal state when a stale consumer writes over it', async () => {
    // publishResetAll emitted some events, then threw — so it fails the task
    // explicitly. The counter can NEVER reach itemsCount (the rest were never
    // emitted), so the counter-derived path cannot repair a clobber here.
    const task = await service.create(10);
    await service.updateTaskResults(task.id, 'one item got through' as any);
    await service.completeWithError(task.id, 'publishing failed');

    expect((await service.getOrFail(task.id)).status).toBe(TaskStatus.ERRORED);

    // A consumer that read the task before it was failed writes its stale
    // IN_PROGRESS copy back.
    store.set(task.id, {
      ...structuredClone(store.get(task.id)),
      status: TaskStatus.IN_PROGRESS,
      end: undefined,
    });

    const after = await service.getOrFail(task.id);
    expect(after.status).toBe(TaskStatus.ERRORED);
    expect(after.end).toBeDefined();
  });

  it('rejects an unreachable itemsCount', async () => {
    const task = await service.create();

    // -1 would satisfy `itemsDone >= itemsCount` on the very first read, so the
    // task would report finished having processed nothing.
    await expect(service.setItemsCount(task.id, -1)).rejects.toThrow(
      /non-negative integer/
    );
    await expect(service.setItemsCount(task.id, 2.5)).rejects.toThrow(
      /non-negative integer/
    );

    expect((await service.getOrFail(task.id)).status).toBe(
      TaskStatus.IN_PROGRESS
    );
  });

  it('refuses to re-count a task that already has a count', async () => {
    const task = await service.create(5);
    await service.updateTaskResults(task.id, 'first item' as any);

    // Re-stamping would reset itemsDone to 0 under a consumer that has already
    // reported progress — corrupting the counter the terminal status is
    // derived from.
    await expect(service.setItemsCount(task.id, 99)).rejects.toThrow(
      /already has an itemsCount/
    );

    expect((await service.getOrFail(task.id)).itemsCount).toBe(5);
  });
});

/**
 * Redis outage behaviour — alkem-io/server#6330.
 *
 * The counter path reaches past the cache interface to issue server-side atomic
 * commands, so it has to survive an outage on its own terms: keep working (via
 * the in-object fallback), never throw, and — the part that is new — stop
 * logging once per failed operation, because the auth-reset worker drives these
 * in a loop across up to 10 replicas.
 */
describe('TaskService — cache connection down', () => {
  let outageService: TaskService;
  let outageLogger: LoggerService;

  /** A client whose every command fails, as it does with the connection lost. */
  const failingClient = () => ({
    incr: (_k: string, cb: (e: Error) => void) =>
      cb(new Error("INCR can't be processed. Stream not writeable.")),
    get: (_k: string, cb: (e: Error) => void) =>
      cb(new Error("GET can't be processed. Stream not writeable.")),
    sadd: (_k: string, _m: string, cb: (e: Error) => void) =>
      cb(new Error("SADD can't be processed. Stream not writeable.")),
    setnx: (_k: string, _v: string, cb: (e: Error) => void) =>
      cb(new Error("SETNX can't be processed. Stream not writeable.")),
    expire: (_k: string, _s: number, cb: (e: Error) => void) =>
      cb(new Error("EXPIRE can't be processed. Stream not writeable.")),
    quit: vi.fn(),
  });

  const buildService = async (isDown: boolean) => {
    const objects = new Map<string, any>();

    const cache = {
      get: vi.fn(async (key: string) => objects.get(key)),
      set: vi.fn(async (key: string, value: any) => {
        objects.set(key, structuredClone(value));
      }),
      del: vi.fn(),
      reset: vi.fn(),
      wrap: vi.fn(),
      store: {
        name: 'redis',
        getClient: failingClient,
        // What the shared factory publishes on the store.
        connectionSignal: { isDown },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: CACHE_MANAGER, useValue: cache },
        MockWinstonProvider,
      ],
    }).compile();

    outageService = module.get<TaskService>(TaskService);
    outageLogger = module.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('still completes task work when every Redis command fails', async () => {
    await buildService(true);

    const task = await outageService.create(2);

    // The behavioural guarantee: falls back to the in-object counter rather
    // than throwing. Without it a Redis outage would take the worker down too.
    await expect(
      outageService.updateTaskResults(task.id, 'reset 1' as any)
    ).resolves.not.toThrow();

    await expect(outageService.getOrFail(task.id)).resolves.toBeDefined();
  });

  it('does not log per failed counter operation while the connection is down', async () => {
    await buildService(true);

    const task = await outageService.create(10);
    for (let i = 0; i < 10; i++) {
      await outageService.updateTaskResults(task.id, `reset ${i}` as any);
    }

    // The shared reporter has already emitted exactly one record for the
    // connection loss. Ten more per replica is a second incident, not a signal.
    expect(outageLogger.error).not.toHaveBeenCalled();
  });

  it('does not log per failed item claim while the connection is down', async () => {
    // The claim runs once per ITEM, not once per task, so it is the highest
    // -frequency counter operation of the lot — an auth-reset over tens of
    // thousands of items would emit that many records per replica. Note the
    // itemKey: without one `claimItem` short-circuits and never reaches SADD,
    // which is exactly why this path was missed.
    await buildService(true);

    const task = await outageService.create(10);
    for (let i = 0; i < 10; i++) {
      await outageService.updateTaskResults(
        task.id,
        `reset ${i}` as any,
        true,
        `item-${i}`
      );
    }

    expect(outageLogger.error).not.toHaveBeenCalled();
  });

  it('still logs when there is no outage signal', async () => {
    // No suppression signal => no information => log exactly as before. A
    // blanket silence here would hide genuine, non-connectivity Redis errors.
    await buildService(false);

    const task = await outageService.create(2);
    await outageService.updateTaskResults(task.id, 'reset 1' as any);

    expect(outageLogger.error).toHaveBeenCalled();
  });
});

function createMockTask(overrides?: Partial<Task>): Task {
  const now = Date.now();
  return {
    id: `test-task-${now}-${Math.random().toString(36).slice(2, 8)}`,
    created: now,
    start: now,
    status: TaskStatus.IN_PROGRESS,
    action: 'auth-reset',
    results: [],
    errors: [],
    ...overrides,
  };
}
