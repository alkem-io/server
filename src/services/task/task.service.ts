import { LogContext } from '@common/enums';
import {
  RedisCache,
  RedisClientLike,
  RedisStore,
} from '@common/interfaces/redis.interfaces';
import { TaskStatus } from '@domain/task/dto/task.status.enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { TaskError, TaskResult } from '@services/task/types';
import { Cache } from 'cache-manager';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Task } from './task.interface';
import { TASK_LIST_CACHE_KEY } from './task.list.key';

const TTL = 3600;

@Injectable()
export class TaskService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  // ------------------------------------------------------------- counters
  //
  // The item counters CANNOT live in the cached Task object alone.
  //
  // The auth-reset queue is consumed by competing consumers across pods:
  // `main.worker.ts` sets `prefetchCount: 1` precisely so "work is spread
  // across pods", and infrastructure-operations'
  // `41-auth-reset-worker-autoscaler.yml` scales the deployment to 10 replicas
  // the moment the queue is non-empty. They all share one Redis.
  //
  // `get(id) -> task.itemsDone += 1 -> set(id, task)` is a read-modify-write.
  // Two pods finishing at the same moment both read `k` and both write `k + 1`
  // — one increment is silently lost. That was harmless while `itemsCount` was
  // undefined and the counter purely decorative. It is NOT harmless now that
  // the terminal status is derived from the counter reaching its target: a
  // single lost increment undershoots the target forever and the task hangs,
  // which is precisely the defect (#6310) this service is being fixed for.
  // Note `>=` does not rescue it — lost updates undercount, never overcount.
  //
  // So the counters live in dedicated Redis keys mutated with INCR, which is
  // atomic. Where no Redis client is reachable (unit tests, or any non-redis
  // cache store) we fall back to the in-object counter, which is correct for
  // the single process those environments actually are.
  private readonly doneKey = (id: string) => `task:${id}:itemsDone`;
  private readonly errorsKey = (id: string) => `task:${id}:errorCount`;

  private redisClient(): RedisClientLike | undefined {
    const store = (this.cacheManager as Partial<RedisCache>).store as
      | Partial<RedisStore>
      | undefined;

    if (typeof store?.getClient !== 'function') {
      return undefined;
    }

    try {
      return store.getClient();
    } catch (error: any) {
      this.logger.warn?.(
        `Task counters: no Redis client available, falling back to in-object counters. ${error}`,
        LogContext.TASKS
      );
      return undefined;
    }
  }

  /**
   * Atomically increment a counter key and return its NEW value. The TTL is
   * refreshed on every increment so a long-running reset cannot outlive its
   * own counter and silently restart from zero.
   *
   * Returns undefined when there is no Redis to be atomic against — callers
   * fall back to the in-object counter.
   */
  private async incrementCounter(key: string): Promise<number | undefined> {
    const client = this.redisClient();

    if (!client) {
      return undefined;
    }

    return new Promise<number | undefined>(resolve => {
      client.incr(key, (err, value) => {
        if (err) {
          this.logger.error(
            `Failed to increment task counter '${key}': ${err}`,
            err?.stack,
            LogContext.TASKS
          );
          resolve(undefined);
          return;
        }
        // Best-effort TTL refresh; the counter value is already committed.
        client.expire(key, TTL, () => resolve(value));
      });
    });
  }

  /** Read a counter key, or undefined when unset / no Redis. */
  private async readCounter(key: string): Promise<number | undefined> {
    const client = this.redisClient();

    if (!client) {
      return undefined;
    }

    return new Promise<number | undefined>(resolve => {
      client.get(key, (err, value) => {
        if (err || value === null || value === undefined) {
          resolve(undefined);
          return;
        }
        const parsed = Number(value);
        resolve(Number.isFinite(parsed) ? parsed : undefined);
      });
    });
  }

  public async getTaskList() {
    const list =
      await this.cacheManager.get<Array<string>>(TASK_LIST_CACHE_KEY);

    if (list) {
      return list;
    }

    this.logger.warn?.(
      'Task list not found. Creating a new one...',
      LogContext.TASKS
    );
    await this.cacheManager.set<Array<string>>(TASK_LIST_CACHE_KEY, [], {
      ttl: TTL,
    });
    return []; // set returns 'ok'
  }

  public async getAll(status = TaskStatus.IN_PROGRESS) {
    const list = await this.getTaskList();

    const resolved = await Promise.all(list.map(taskId => this.get(taskId)));

    let result = resolved.filter((x): x is Task => !!x);

    if (status) {
      result = result.filter(x => x.status === status);
    }

    return result;
  }

  public async get(id: string) {
    const task = await this.cacheManager.get<Task>(id);

    return task ? this.withAuthoritativeCounters(task) : task;
  }

  public async getOrFail(id: string) {
    const task = await this.get(id);

    if (!task) {
      throw new Error(`Task '${id}' not found`);
    }

    return task;
  }

  /**
   * Overlay the atomic counters onto a cached Task.
   *
   * The whole Task object is written back by every consumer, so the *stored*
   * `status` and `itemsDone` are themselves subject to a lost update: the pod
   * that observes the final increment writes COMPLETED, and a slower pod
   * holding a slightly stale copy can write IN_PROGRESS straight back over it.
   * The Redis counters cannot be clobbered that way, so they — not the stored
   * fields — are the source of truth for progress, and for whether a counted
   * task has finished.
   *
   * `end` is deliberately NOT fabricated here: it is stamped by whichever
   * consumer saw the last item, and a derived value would differ on every
   * read.
   */
  private async withAuthoritativeCounters(task: Task): Promise<Task> {
    // An uncounted task has no target to reach — it is terminated explicitly
    // via complete()/completeWithError(), so there is nothing to derive.
    if (task.itemsCount === undefined) {
      return task;
    }

    const [done, errorCount] = await Promise.all([
      this.readCounter(this.doneKey(task.id)),
      this.readCounter(this.errorsKey(task.id)),
    ]);

    // No Redis (or no increments yet): the in-object counter is all there is.
    if (done === undefined) {
      return task;
    }

    const resolved: Task = { ...task, itemsDone: done };

    if (done >= task.itemsCount && resolved.status === TaskStatus.IN_PROGRESS) {
      resolved.status =
        (errorCount ?? resolved.errors.length) > 0
          ? TaskStatus.ERRORED
          : TaskStatus.COMPLETED;
    }

    return resolved;
  }

  public async create(itemsCount?: number) {
    const now = new Date().getTime();
    const task: Task = {
      id: randomUUID(),
      created: now,
      start: now, // has to change
      action: 'auth-reset',
      status: TaskStatus.IN_PROGRESS, // may not be accurate atm,
      itemsCount,
      // An explicit count opts the task into progress tracking, so it starts at
      // zero. Without a count the task is unbounded and `itemsDone` stays
      // undefined — such a task is terminated explicitly via `complete()` /
      // `completeWithError()`, never by the counters.
      // NB: this used to read `itemsCount && 0`, which returns the *left*
      // operand when it is falsy — correct only by accident, and unreadable.
      itemsDone: itemsCount === undefined ? undefined : 0,
      results: [],
      errors: [],
    };

    // A counted task with nothing to do is already finished: no item update
    // will ever arrive to move it out of IN_PROGRESS.
    if (itemsCount === 0) {
      task.status = TaskStatus.COMPLETED;
      task.end = now;
    }

    await this.cacheManager.set<Task>(task.id, task, {
      ttl: TTL,
    });
    await this.addTaskToList(task);
    return task;
  }

  /**
   * Whether every item this task was created for has been accounted for —
   * i.e. it is a *counted* task and its counter has reached the target.
   *
   * An uncounted task (no `itemsCount`) is never "finished" by this rule: it
   * has no target to reach, so it can only be terminated explicitly. This is
   * the guard that must be applied identically on the success and the error
   * path — omitting it on one of them made `undefined === undefined` true and
   * completed an uncounted task on its very first error.
   */
  private isFullyAccountedFor(task: Task): boolean {
    return (
      task.itemsCount !== undefined &&
      task.itemsDone !== undefined &&
      // `>=` rather than `===` so an over-count (a racing extra item) still
      // terminates the task instead of stepping over the equality and hanging.
      task.itemsDone >= task.itemsCount
    );
  }

  /** Move a fully-accounted-for task into its terminal state. */
  private finish(
    task: Task,
    status: TaskStatus.COMPLETED | TaskStatus.ERRORED
  ) {
    task.status = status;
    task.end = new Date().getTime();
  }

  /**
   * Account for one processed item, atomically where possible, and write the
   * authoritative count back onto the task. No-op for an uncounted task.
   */
  private async accountForItem(task: Task, completeItem: boolean) {
    if (task.itemsDone === undefined || !completeItem) {
      return;
    }

    const atomic = await this.incrementCounter(this.doneKey(task.id));

    // `atomic` is undefined only when there is no Redis to be atomic against —
    // a single-process environment, where the in-object increment is exact.
    task.itemsDone = atomic ?? task.itemsDone + 1;
  }

  /**
   *
   * @param id
   * @param result
   * @param completeItem Increase the itemsDone counter
   */
  public async updateTaskResults(
    id: string,
    result: TaskResult,
    completeItem = true
  ) {
    const task = await this.getOrFail(id);

    // Already settled. RabbitMQ is at-least-once and `handleReset` publishes
    // its retry BEFORE acking the original, so a pod killed between those two
    // lines gets the same item redelivered. Without this guard a late
    // duplicate flips a COMPLETED task to ERRORED and rewrites `end` — two
    // pollers reading a minute apart would disagree about the same run.
    if (task.status !== TaskStatus.IN_PROGRESS) {
      return;
    }

    await this.accountForItem(task, completeItem);

    task.results.unshift(`[${new Date().toISOString()}]::${result}`);

    if (this.isFullyAccountedFor(task)) {
      // Every item is in, but some of them failed — a run that lost items is
      // not a successful run, so it settles as ERRORED. The error tally is
      // read from the atomic counter for the same reason `itemsDone` is: the
      // `errors` array is written non-atomically and can lose entries.
      const errorCount =
        (await this.readCounter(this.errorsKey(id))) ?? task.errors.length;

      this.finish(
        task,
        errorCount > 0 ? TaskStatus.ERRORED : TaskStatus.COMPLETED
      );
    }

    await this.cacheManager.set(task.id, task, {
      ttl: TTL,
    });
  }

  public async updateTaskErrors(
    id: string,
    error: TaskError,
    completeItem = true
  ) {
    const task = await this.getOrFail(id);

    // See updateTaskResults — a redelivered failure must not re-stamp a task
    // that has already settled.
    if (task.status !== TaskStatus.IN_PROGRESS) {
      return;
    }

    // Tally the error atomically so the success path can trust it when it
    // decides between COMPLETED and ERRORED.
    await this.incrementCounter(this.errorsKey(id));
    await this.accountForItem(task, completeItem);

    task.errors.unshift(error);

    // Only once the LAST item is accounted for — an error on item 1 of N must
    // not terminate the task; the remaining items are still being processed.
    if (this.isFullyAccountedFor(task)) {
      this.finish(task, TaskStatus.ERRORED);
    }

    await this.cacheManager.set(task.id, task, {
      ttl: TTL,
    });
  }

  /**
   * Attach an item count to an EXISTING task, so a caller that created its own
   * (necessarily uncounted) task id can still hand it to a producer that knows
   * the real total.
   *
   * Without this, passing a pre-made task id into a counted run silently
   * discarded the computed count and left the task with no target to reach —
   * i.e. #6310 all over again, just via a different door.
   */
  public async setItemsCount(id: string, itemsCount: number) {
    const existing = await this.getOrFail(id);

    // `itemsCount` is readonly on the interface, so rebuild rather than cast
    // the guarantee away.
    const task: Task = {
      ...existing,
      itemsCount,
      itemsDone: 0,
      ...(itemsCount === 0
        ? { status: TaskStatus.COMPLETED, end: new Date().getTime() }
        : {}),
    };

    await this.cacheManager.set(task.id, task, {
      ttl: TTL,
    });

    return task;
  }

  public async complete(
    id: string,
    status: TaskStatus.COMPLETED | TaskStatus.ERRORED = TaskStatus.COMPLETED
  ) {
    const task = await this.getOrFail(id);

    task.status = status;
    task.end = new Date().getTime();

    await this.cacheManager.set(task.id, task, {
      ttl: TTL,
    });
  }

  public async completeWithError(id: string, error: string) {
    const task = await this.getOrFail(id);

    task.errors.unshift(error);
    task.status = TaskStatus.ERRORED;
    task.end = new Date().getTime();

    await this.cacheManager.set(task.id, task, {
      ttl: TTL,
    });
  }

  private async addTaskToList(task: Task) {
    const list = await this.getTaskList();

    if (!list) {
      this.logger.error(
        'Could not add task to list. List not found.',
        undefined,
        LogContext.TASKS
      );
      return false;
    }

    list.push(task.id);

    return this.cacheManager
      .set(TASK_LIST_CACHE_KEY, list, { ttl: TTL })
      .then(
        () => true,
        reason => {
          this.logger.error(
            `Could not add task to list. ${reason}`,
            reason?.stack,
            LogContext.TASKS
          );
          return false;
        }
      )
      .catch(error => {
        this.logger.error(
          `Could not add task to list. ${error}`,
          error?.stack,
          LogContext.TASKS
        );
        return false;
      });
  }
}
