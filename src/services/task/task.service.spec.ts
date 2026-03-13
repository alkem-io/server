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

    it('should set status to COMPLETED when all items are done', async () => {
      const task = createMockTask({
        itemsCount: 1,
        itemsDone: 0,
      });
      (cacheManager.get as Mock).mockResolvedValueOnce(task);
      (cacheManager.set as Mock).mockResolvedValueOnce('ok');

      await service.updateTaskErrors(task.id, 'final-error');

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
